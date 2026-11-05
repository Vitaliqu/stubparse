import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { extractPaystub, NotAPaystubError, type ExtractInput } from "@/lib/ai-extractor";
import { mapBackendResult } from "@/lib/parse-client";
import { reconcile } from "@/lib/reconcile";
import { analyzeStub, riskLevel } from "@/lib/integrity";
import { authenticateApiKey } from "@/lib/server/api-keys";
import { assertCanParse, consumeDocument, HttpError, refundDocument, requireFeature } from "@/lib/server/account";
import { apiLimit } from "@/lib/server/ratelimit";
import { reportError } from "@/lib/server/monitoring";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_B64 = 4_000_000; // keeps requests under the 4.5 MB platform body limit
const MAX_TEXT = 200_000;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

/** Human-readable size of a base64 payload's original bytes. */
const sizeOf = (b64Len: number) => `${((b64Len * 3) / 4 / 1024 / 1024).toFixed(1)} MB`;
const tooLarge = (what: string, b64Len: number) =>
  `${what} is ${sizeOf(b64Len)}; the limit is 3 MB per request. Compress the PDF, lower the scan resolution, or send extracted text with "text".`;

const fail = (status: number, code: string, message: string, headers?: Record<string, string>) =>
  NextResponse.json({ error: { code, message } }, { status, headers });

/**
 * POST /api/v1/parse
 * Authorization: Bearer sp_live_...
 * Body (JSON): { "pdf": "<base64>" } | { "image": { "data": "<base64>", "mediaType": "image/png" } } | { "text": "..." }
 *   or multipart/form-data with a "file" field (PDF, PNG, JPG, WEBP).
 * Optional: "fileName".
 */
export async function POST(req: Request) {
  let uid: string;
  try {
    ({ uid } = await authenticateApiKey(req));
    const rl = await apiLimit(uid);
    if (!rl.ok) return fail(429, "rate_limited", `Rate limit exceeded. Retry in ${rl.retryAfter}s.`, { "Retry-After": String(rl.retryAfter) });
    const user = { uid, email: null };
    await requireFeature(user, "api");
    await assertCanParse(user);
    if (!process.env.ANTHROPIC_API_KEY) return fail(503, "unavailable", "Extraction is temporarily unavailable.");
  } catch (err) {
    if (err instanceof HttpError) return fail(err.status, err.code ?? "error", err.message);
    reportError(err, { where: "api-v1-auth" });
    return fail(500, "server_error", "Something went wrong.");
  }

  let input: ExtractInput;
  let fileName = "document";
  try {
    const type = req.headers.get("content-type") ?? "";
    if (type.startsWith("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return fail(422, "invalid_request", 'Send the document in a "file" field.');
      fileName = file.name || fileName;
      const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
      if (b64.length > MAX_B64) return fail(413, "too_large", tooLarge("The file", b64.length));
      if (file.type === "application/pdf") input = { pdf: b64 };
      else if (IMAGE_TYPES.has(file.type)) input = { image: { data: b64, mediaType: file.type as "image/png" } };
      else return fail(415, "unsupported_type", "Use a PDF, PNG, JPG, or WEBP file.");
    } else {
      const body = await req.json().catch(() => null);
      if (!body) return fail(400, "invalid_request", "Send JSON or multipart/form-data.");
      if (typeof body.fileName === "string") fileName = body.fileName.slice(0, 200);
      if (typeof body.pdf === "string") {
        if (body.pdf.length > MAX_B64) return fail(413, "too_large", tooLarge("The PDF", body.pdf.length));
        input = { pdf: body.pdf };
      } else if (typeof body.image?.data === "string" && IMAGE_TYPES.has(body.image.mediaType)) {
        if (body.image.data.length > MAX_B64) return fail(413, "too_large", tooLarge("The image", body.image.data.length));
        input = { image: { data: body.image.data, mediaType: body.image.mediaType } };
      } else if (typeof body.text === "string" && body.text.trim()) {
        if (body.text.length > MAX_TEXT) return fail(413, "too_large", "Text is too large.");
        input = { text: body.text };
      } else {
        return fail(422, "invalid_request", 'Provide "pdf", "image", or "text".');
      }
    }
  } catch {
    return fail(400, "invalid_request", "Couldn't read the request body.");
  }

  try {
    // Reserve first (atomic), refund on failure: parallel calls can't overspend the plan.
    const account = await consumeDocument({ uid, email: null });
    let raw;
    try {
      raw = await extractPaystub(input);
    } catch (err) {
      await refundDocument(uid).catch(() => {});
      throw err;
    }
    const data = mapBackendResult(raw, fileName);
    const signals = analyzeStub(data, null);
    return NextResponse.json({
      object: "paystub",
      file_name: fileName,
      model: raw.model_used,
      data,
      checks: reconcile(data),
      integrity: { risk: riskLevel(signals), signals },
      extracted: raw.extracted_data,
      usage: { documents_used: account.docsUsed },
    });
  } catch (err) {
    if (err instanceof NotAPaystubError) return fail(422, "not_a_paystub", err.message);
    if (err instanceof HttpError) return fail(err.status, err.code ?? "error", err.message);
    if (err instanceof Anthropic.RateLimitError) return fail(503, "busy", "Extraction is busy. Retry shortly.", { "Retry-After": "10" });
    reportError(err, { where: "api-v1-parse", uid });
    return fail(502, "extraction_failed", "Extraction failed. Retry, or contact support if it continues.");
  }
}
