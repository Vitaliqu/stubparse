// Internal admin: access is limited to verified emails listed in ADMIN_EMAILS (comma-separated).

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { findUidByCustomer, HttpError, syncCustomer, usersCol } from "@/lib/server/account";
import { summarize, type AccountDoc } from "@/lib/plan";

const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export async function requireAdmin(req: Request): Promise<{ uid: string; email: string }> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new HttpError(401, "Sign in to continue.", "unauthenticated");
  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(token);
  } catch {
    throw new HttpError(401, "Your session expired. Sign in again.", "unauthenticated");
  }
  const email = decoded.email?.toLowerCase();
  if (!email || !decoded.email_verified || !adminEmails().includes(email)) throw new HttpError(403, "Not allowed.", "forbidden");
  return { uid: decoded.uid, email };
}

/** Finds a user by email, uid, or Stripe customer id. */
export async function resolveUser(q: string): Promise<string | null> {
  const query = q.trim();
  if (!query) return null;
  try {
    if (query.includes("@")) return (await adminAuth().getUserByEmail(query)).uid;
    if (query.startsWith("cus_")) return await findUidByCustomer(query);
    return (await adminAuth().getUser(query)).uid;
  } catch {
    return null;
  }
}

export async function userReport(uid: string) {
  const db = adminDb();
  const [auth, accountSnap, keys, errors, log] = await Promise.all([
    adminAuth().getUser(uid),
    usersCol().doc(uid).get(),
    db.collection("apiKeys").where("uid", "==", uid).count().get(),
    db.collection("errorLog").where("uid", "==", uid).limit(50).get(),
    db.collection("adminLog").where("uid", "==", uid).limit(50).get(),
  ]);
  const account = (accountSnap.data() as AccountDoc | undefined) ?? null;
  const historyScope = account?.team ? db.collection("teams").doc(account.team.id) : usersCol().doc(uid);
  const history = await historyScope.collection("documents").count().get();

  return {
    auth: {
      uid: auth.uid,
      email: auth.email ?? null,
      emailVerified: auth.emailVerified,
      disabled: auth.disabled,
      providers: auth.providerData.map((p) => p.providerId),
      createdAt: auth.metadata.creationTime,
      lastSignInAt: auth.metadata.lastSignInTime,
    },
    account,
    summary: summarize(account),
    stripeDashboard: account?.stripeCustomerId
      ? `https://dashboard.stripe.com/${(process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_") ? "test/" : ""}customers/${account.stripeCustomerId}`
      : null,
    counts: { apiKeys: keys.data().count, savedStubs: history.data().count, historyScope: account?.team ? "team" : "personal" },
    errors: errors.docs.map((d) => d.data()).sort((a, b) => b.at - a.at).slice(0, 20),
    adminLog: log.docs.map((d) => d.data()).sort((a, b) => b.at - a.at).slice(0, 20),
  };
}

export type AdminAction =
  | { action: "grant_docs"; amount: number }
  | { action: "reset_month" }
  | { action: "disable" }
  | { action: "enable" }
  | { action: "sync_billing" };

export async function runAdminAction(admin: { uid: string; email: string }, uid: string, a: AdminAction) {
  const ref = usersCol().doc(uid);
  let detail: Record<string, unknown> = {};
  switch (a.action) {
    case "grant_docs": {
      const amount = Math.trunc(a.amount);
      if (!Number.isFinite(amount) || amount < -100 || amount > 1000 || amount === 0) throw new HttpError(400, "Amount must be between -100 and 1000.");
      await adminDb().runTransaction(async (tx) => {
        const doc = (await tx.get(ref)).data() as AccountDoc | undefined;
        const next = Math.max(0, (doc?.bonusDocs ?? 0) + amount);
        tx.set(ref, { bonusDocs: next }, { merge: true });
        detail = { amount, bonusDocs: next };
      });
      break;
    }
    case "reset_month":
      await ref.set({ periodUsed: 0 }, { merge: true });
      break;
    case "disable":
    case "enable":
      await adminAuth().updateUser(uid, { disabled: a.action === "disable" });
      if (a.action === "disable") await adminAuth().revokeRefreshTokens(uid);
      break;
    case "sync_billing": {
      const doc = (await ref.get()).data() as AccountDoc | undefined;
      if (!doc?.stripeCustomerId) throw new HttpError(400, "No Stripe customer on this account.");
      const state = await syncCustomer(uid, doc.stripeCustomerId);
      detail = { status: state?.status ?? null, tier: state?.tier ?? null };
      break;
    }
    default:
      throw new HttpError(400, "Unknown action.");
  }
  await adminDb().collection("adminLog").add({ uid, admin: admin.email, action: a.action, detail, at: Date.now() });
}
