import { NextResponse } from "next/server";
import { errorResponse, getOrCreateAccount, HttpError, requireFeature, requireUser } from "@/lib/server/account";
import { createTeam, deleteTeam, getTeam } from "@/lib/server/team";

export const runtime = "nodejs";

/** The signed-in user's team, or null. */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    return NextResponse.json({ team: await getTeam(user) });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Creates a team owned by the signed-in Business subscriber. Body: { name }. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    await requireFeature(user, "team");
    const body = await req.json().catch(() => ({}));
    await createTeam(user, typeof body?.name === "string" ? body.name : "");
    return NextResponse.json({ team: await getTeam(user) });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Deletes the team (owner only), including its shared history. */
export async function DELETE(req: Request) {
  try {
    const user = await requireUser(req);
    const account = await getOrCreateAccount(user);
    if (!account.team) throw new HttpError(404, "No team.", "not_found");
    if (account.team.role !== "owner") throw new HttpError(403, "Only the owner can delete the team.", "forbidden");
    await deleteTeam(user.uid, account.team.id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return errorResponse(err);
  }
}
