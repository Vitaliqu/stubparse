import { NextResponse } from "next/server";
import { errorResponse, HttpError, requireUser } from "@/lib/server/account";
import { getTeam, inviteMember, revokeInvite } from "@/lib/server/team";
import { sendInviteEmail } from "@/lib/server/email";
import { appOrigin } from "@/lib/server/stripe";
import { reportError } from "@/lib/server/monitoring";

export const runtime = "nodejs";

/** Invites someone by email. Returns the join link so the owner can share it directly. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    if (typeof body?.email !== "string") throw new HttpError(400, "Enter an email address.");
    const inv = await inviteMember(user, body.email);
    const link = `${appOrigin(req)}/app/join?team=${encodeURIComponent(inv.teamId)}&token=${encodeURIComponent(inv.token)}`;
    const emailed = await sendInviteEmail(inv.email, inv.teamName, user.email, link).catch((err) => {
      reportError(err, { where: "invite-email", uid: user.uid });
      return false;
    });
    return NextResponse.json({ link, emailed, team: await getTeam(user) });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Revokes a pending invite: DELETE /api/team/invites?id=<inviteId>. */
export async function DELETE(req: Request) {
  try {
    const user = await requireUser(req);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw new HttpError(400, "Missing invite id.");
    await revokeInvite(user, id);
    return NextResponse.json({ team: await getTeam(user) });
  } catch (err) {
    return errorResponse(err);
  }
}
