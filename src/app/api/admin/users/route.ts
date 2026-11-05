import { NextResponse } from "next/server";
import { errorResponse, HttpError } from "@/lib/server/account";
import { requireAdmin, resolveUser, runAdminAction, userReport, type AdminAction } from "@/lib/server/admin";

export const runtime = "nodejs";

/** GET /api/admin/users?q=<email | uid | cus_...> */
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const q = new URL(req.url).searchParams.get("q") ?? "";
    const uid = await resolveUser(q);
    if (!uid) throw new HttpError(404, `No user found for "${q}".`, "not_found");
    return NextResponse.json(await userReport(uid));
  } catch (err) {
    return errorResponse(err);
  }
}

/** POST { uid, action, amount? } — support actions, each recorded in adminLog. */
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    if (typeof body?.uid !== "string" || typeof body?.action !== "string") throw new HttpError(400, "Missing uid or action.");
    await runAdminAction(admin, body.uid, body as AdminAction);
    return NextResponse.json(await userReport(body.uid));
  } catch (err) {
    return errorResponse(err);
  }
}
