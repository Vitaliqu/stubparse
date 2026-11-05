import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { extractPaystub, NotAPaystubError, type ExtractInput } from "@/lib/ai-extractor";
import { aiParseLimit } from "@/lib/server/ratelimit";
import { reportError } from "@/lib/server/monitoring";
import { assertCanParse, consumeDocument, errorResponse, HttpError, refundDocument, requireUser, type AuthedUser } from "@/lib/server/account";

// Fits the Vercel Hobby plan (function duration cap 60 s, request body cap 4.5 MB).
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TEXT_CHARS   = 200_000;
const MAX_IMAGE_B64    = 4_000_000;
const IMAGE_TYPES      = new Set(["image/png", "image/jpeg", "image/webp"]);

const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });

export async function POST(req: NextRequest) {
  let user: AuthedUser;
  try {
    user = await requireUser(req);
    const rl = await aiParseLimit(user.uid);
    if (!rl.ok) throw new HttpError(429, `Too many requests. Try again in ${rl.retryAfter} seconds.`, "rate_limited");
    if (!process.env.ANTHROPIC_API_KEY) throw new HttpError(503, "AI mode is not configured on this server.");
    await assertCanParse(user);
  } catch (err) {
    return errorResponse(err);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body.", 400);
  }

  let input: ExtractInput;
  if (typeof body?.text === "string" && body.text.trim()) {
    if (body.text.length > MAX_TEXT_CHARS) return error("Extracted text is too large.", 413);
    input = { text: body.text };
  } else if (Array.isArray(body?.images) && body.images.length > 0) {
    if (body.images.length > 5) return error("Send at most 5 pages per stub.", 413);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ok = body.images.every((im: any) => typeof im?.data === "string" && IMAGE_TYPES.has(im.mediaType));
    if (!ok) return error("Images must be PNG, JPEG, or WEBP.", 422);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (body.images.reduce((n: number, im: any) => n + im.data.length, 0) > MAX_IMAGE_B64) return error("These pages are too large together. Try a smaller scan.", 413);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    input = { images: body.images.map((im: any) => ({ data: im.data, mediaType: im.mediaType })) };
  } else if (typeof body?.image?.data === "string" && IMAGE_TYPES.has(body.image.mediaType)) {
    if (body.image.data.length > MAX_IMAGE_B64) return error("Image is too large.", 413);
    input = { image: { data: body.image.data, mediaType: body.image.mediaType } };
  } else {
    return error("Provide either 'text' or 'image'.", 422);
  }

  try {
    // Reserve the document first so parallel requests can't overspend; give it back if extraction fails.
    const account = await consumeDocument(user);
    try {
      const result = await extractPaystub(input);
      return NextResponse.json({ ...result, account });
    } catch (err) {
      await refundDocument(user.uid).catch(() => {});
      throw err;
    }
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err);
    if (err instanceof NotAPaystubError) return error(err.message, 422);
    if (err instanceof Anthropic.RateLimitError) return error("AI service is busy. Try again shortly.", 503);
    if (err instanceof Anthropic.APIError) {
      console.error("[ai-parse] Anthropic API error", err.status, err.message);
      return error("AI service error.", 502);
    }
    reportError(err, { where: "ai-parse", uid: user.uid });
    return error(err instanceof Error ? err.message : "AI extraction failed.", 500);
  }
}
