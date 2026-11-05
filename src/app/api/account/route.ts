import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { errorResponse, getOrCreateAccount, requireUser, usersCol } from "@/lib/server/account";
import { deleteAllApiKeys } from "@/lib/server/api-keys";
import { deleteTeam, leaveTeam } from "@/lib/server/team";
import { stripe } from "@/lib/server/stripe";
import { sendLifecycleEmail } from "@/lib/server/email";
import { reportError } from "@/lib/server/monitoring";
import { summarize } from "@/lib/plan";

export const runtime = "nodejs";

/** Returns the signed-in user's plan and usage, creating the account (and sending the welcome email) on first visit. */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const account = await getOrCreateAccount(user);
    if (account.created && user.email) {
      sendLifecycleEmail(user.uid, user.email, "welcome").catch((err) => reportError(err, { where: "welcome-email" }));
    }
    return NextResponse.json(summarize(account));
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * Permanently deletes the account: cancels any subscription immediately, deletes saved history,
 * API keys, preferences, and the account record, then removes the sign-in.
 * Stripe keeps its own invoice records, as payment law requires.
 */
export async function DELETE(req: Request) {
  try {
    const user = await requireUser(req);
    const account = await getOrCreateAccount(user);

    if (account.stripeCustomerId) {
      const subs = await stripe().subscriptions.list({ customer: account.stripeCustomerId, status: "all", limit: 20 });
      await Promise.all(
        subs.data
          .filter((s) => !["canceled", "incomplete_expired"].includes(s.status))
          .map((s) => stripe().subscriptions.cancel(s.id)),
      );
    }

    if (account.team?.role === "owner") await deleteTeam(user.uid, account.team.id);
    else if (account.team) await leaveTeam(user);

    await deleteAllApiKeys(user.uid);
    await adminDb().recursiveDelete(usersCol().doc(user.uid)); // account doc + history + settings
    await adminAuth().deleteUser(user.uid);

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return errorResponse(err);
  }
}
