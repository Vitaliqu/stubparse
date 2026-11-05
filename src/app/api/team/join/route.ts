import { NextResponse } from "next/server";
import { errorResponse, HttpError, requireUser } from "@/lib/server/account";
import { joinTeam } from "@/lib/server/team";

export const runtime = "nodejs";

/** Accepts an invite. Body: { team, token }. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    if (typeof body?.team !== "string" || typeof body?.token !== "string") throw new HttpError(400, "This invite link is incomplete.", "invite_invalid");
    const membership = await joinTeam(user, body.team, body.token);
    return NextResponse.json({ membership });
  } catch (err) {
    return errorResponse(err);
  }
}
