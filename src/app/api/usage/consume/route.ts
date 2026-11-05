import { NextResponse } from "next/server";
import { consumeDocument, errorResponse, HttpError, requireUser } from "@/lib/server/account";
import { consumeLimit } from "@/lib/server/ratelimit";

export const runtime = "nodejs";

/** Records one document parsed in Basic mode (AI mode is metered inside /api/ai-parse). */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const rl = await consumeLimit(user.uid);
    if (!rl.ok) throw new HttpError(429, `Too many requests. Try again in ${rl.retryAfter} seconds.`, "rate_limited");
    return NextResponse.json(await consumeDocument(user));
  } catch (err) {
    return errorResponse(err);
  }
}
