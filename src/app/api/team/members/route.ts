import { NextResponse } from "next/server";
import { errorResponse, requireUser } from "@/lib/server/account";
import { getTeam, leaveTeam, removeMember } from "@/lib/server/team";

export const runtime = "nodejs";

/** DELETE /api/team/members?uid=<member> removes a member (owner); without uid, the caller leaves the team. */
export async function DELETE(req: Request) {
  try {
    const user = await requireUser(req);
    const uid = new URL(req.url).searchParams.get("uid");
    if (uid && uid !== user.uid) {
      await removeMember(user, uid);
      return NextResponse.json({ team: await getTeam(user) });
    }
    await leaveTeam(user);
    return NextResponse.json({ team: null });
  } catch (err) {
    return errorResponse(err);
  }
}
