import { NextResponse } from "next/server";
import { errorResponse, HttpError, requireFeature, requireUser } from "@/lib/server/account";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/server/api-keys";

export const runtime = "nodejs";

/** Lists the user's API keys (never the keys themselves). */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    return NextResponse.json({ keys: await listApiKeys(user.uid) });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Creates a key. The plaintext key is returned once and never stored. Business only. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    await requireFeature(user, "api");
    const body = await req.json().catch(() => ({}));
    const { key, record } = await createApiKey(user.uid, typeof body?.name === "string" ? body.name : "");
    return NextResponse.json({ key, record });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Revokes a key: DELETE /api/keys?id=<key id>. */
export async function DELETE(req: Request) {
  try {
    const user = await requireUser(req);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw new HttpError(400, "Missing key id.");
    await revokeApiKey(user.uid, id);
    return NextResponse.json({ revoked: true });
  } catch (err) {
    return errorResponse(err);
  }
}
