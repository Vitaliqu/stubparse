// Server-side account helpers: auth verification, usage metering, subscription sync.

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { canUse, freeAllowance, summarize, tierOf, type AccountDoc, type BusinessFeature, type SubscriptionState, type Tier } from "@/lib/plan";
import { pickSubscription, stripe, toSubscriptionState } from "@/lib/server/stripe";
import { reportError } from "@/lib/server/monitoring";

/** Monthly fair-use ceilings for paid plans. */
const MONTHLY_LIMIT: Record<Exclude<Tier, "free">, number> = {
  pro: Number(process.env.PRO_MONTHLY_LIMIT) || 1000,
  business: Number(process.env.BUSINESS_MONTHLY_LIMIT) || 10000,
};

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export const errorResponse = (err: unknown) => {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  }
  reportError(err);
  return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
};

export interface AuthedUser {
  uid: string;
  email: string | null;
  emailVerified?: boolean;
}

/** Daily ceilings on paid plans, enforced in Firestore so they hold across all server instances. */
const DAILY_LIMIT: Record<Exclude<Tier, "free">, number> = {
  pro: Number(process.env.PRO_DAILY_LIMIT) || 300,
  business: Number(process.env.BUSINESS_DAILY_LIMIT) || 3000,
};
const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);

/**
 * Verifies the Firebase App Check token (X-Firebase-AppCheck) when APP_CHECK_ENFORCE=1.
 * Proves requests come from the real app, not a script replaying a stolen session.
 */
async function requireAppCheck(req: Request): Promise<void> {
  if (process.env.APP_CHECK_ENFORCE !== "1") return;
  const token = req.headers.get("x-firebase-appcheck");
  if (!token) throw new HttpError(401, "This request didn't come from the StubParse app.", "app_check");
  const { adminAppCheck } = await import("@/lib/firebase/admin");
  try {
    await adminAppCheck().verifyToken(token);
  } catch {
    throw new HttpError(401, "This request didn't come from the StubParse app.", "app_check");
  }
}

/** Verifies the Firebase ID token in `Authorization: Bearer <token>`. */
export async function requireUser(req: Request): Promise<AuthedUser> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new HttpError(401, "Sign in to continue.", "unauthenticated");
  const auth = adminAuth(); // throws a clear configuration error outside the token check
  let user: AuthedUser;
  try {
    const decoded = await auth.verifyIdToken(token);
    user = { uid: decoded.uid, email: decoded.email ?? null, emailVerified: decoded.email_verified === true };
  } catch {
    throw new HttpError(401, "Your session expired. Sign in again.", "unauthenticated");
  }
  await requireAppCheck(req);
  return user;
}

export const usersCol = () => adminDb().collection("users");
const periodKey = (d = new Date()) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

function freshDoc(user: AuthedUser): AccountDoc {
  return { email: user.email, createdAt: Date.now(), docsUsed: 0, periodKey: periodKey(), periodUsed: 0, stripeCustomerId: null, subscription: null };
}

/** Reads the account, creating it on first contact. `created` is true for a brand-new account. */
export async function getOrCreateAccount(user: AuthedUser): Promise<AccountDoc & { created?: boolean }> {
  const ref = usersCol().doc(user.uid);
  const snap = await ref.get();
  if (snap.exists) return snap.data() as AccountDoc;
  const doc = freshDoc(user);
  await ref.set(doc);
  return { ...doc, created: true };
}

/** Pure quota rule, exported for tests. */
export function quotaError(doc: AccountDoc, now = new Date()): HttpError | null {
  const tier = tierOf(doc);
  if (tier !== "free") {
    const used = doc.periodKey === periodKey(now) ? doc.periodUsed : 0;
    const limit = MONTHLY_LIMIT[tier];
    if (used >= limit) {
      return new HttpError(429, `You've reached this month's fair-use limit of ${limit.toLocaleString("en-US")} documents. Contact support to raise it.`, "fair_use");
    }
    const today = doc.dayKey === dayKey(now) ? doc.dayUsed ?? 0 : 0;
    if (today >= DAILY_LIMIT[tier]) {
      return new HttpError(429, `You've reached today's limit of ${DAILY_LIMIT[tier].toLocaleString("en-US")} documents. It resets at midnight UTC.`, "daily_limit");
    }
    return null;
  }
  const allowance = freeAllowance(doc);
  return doc.docsUsed >= allowance
    ? new HttpError(402, `You've used your ${allowance} free documents. Upgrade to keep parsing.`, "limit_reached")
    : null;
}

/** Throws if the account can't parse another document right now. */
export async function assertCanParse(user: AuthedUser): Promise<void> {
  const err = quotaError(await getOrCreateAccount(user));
  if (err) throw err;
}

/** Throws unless the account is on a plan that includes the feature. */
export async function requireFeature(user: AuthedUser, feature: BusinessFeature): Promise<AccountDoc> {
  const doc = await getOrCreateAccount(user);
  if (!canUse(tierOf(doc), feature)) throw new HttpError(403, "This feature is part of the Business plan.", "upgrade_required");
  return doc;
}

/** Atomically records one parsed document. Throws if the quota is exhausted. */
export async function consumeDocument(user: AuthedUser) {
  const ref = usersCol().doc(user.uid);
  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const doc = snap.exists ? (snap.data() as AccountDoc) : freshDoc(user);
    const err = quotaError(doc);
    if (err) throw err;

    const key = periodKey(), day = dayKey();
    const next: AccountDoc = {
      ...doc,
      docsUsed: (doc.docsUsed ?? 0) + 1,
      periodKey: key,
      periodUsed: (doc.periodKey === key ? doc.periodUsed : 0) + 1,
      dayKey: day,
      dayUsed: (doc.dayKey === day ? doc.dayUsed ?? 0 : 0) + 1,
    };
    tx.set(ref, next);
    return summarize(next);
  });
}

/**
 * Gives back a document reserved with consumeDocument when the work then failed.
 * Reserving first (atomically) means parallel requests can't all slip past the quota check.
 */
export async function refundDocument(uid: string) {
  const ref = usersCol().doc(uid);
  await adminDb().runTransaction(async (tx) => {
    const doc = (await tx.get(ref)).data() as AccountDoc | undefined;
    if (!doc) return;
    tx.set(ref, {
      docsUsed: Math.max(0, (doc.docsUsed ?? 0) - 1),
      periodUsed: Math.max(0, (doc.periodUsed ?? 0) - 1),
      dayUsed: Math.max(0, (doc.dayUsed ?? 0) - 1),
    }, { merge: true });
  });
}

export async function setStripeCustomer(uid: string, customerId: string) {
  await usersCol().doc(uid).set({ stripeCustomerId: customerId }, { merge: true });
}

export async function findUidByCustomer(customerId: string): Promise<string | null> {
  const snap = await usersCol().where("stripeCustomerId", "==", customerId).limit(1).get();
  if (!snap.empty) return snap.docs[0].id;
  const customer = await stripe().customers.retrieve(customerId);
  return !customer.deleted && customer.metadata?.uid ? customer.metadata.uid : null;
}

/**
 * Re-reads the customer's subscriptions from Stripe and stores the one that should drive the plan.
 * Stripe is the source of truth, so this is safe to call repeatedly and in any order.
 */
export async function syncCustomer(uid: string, customerId: string): Promise<SubscriptionState | null> {
  const subs = await stripe().subscriptions.list({ customer: customerId, status: "all", limit: 20 });
  const sub = pickSubscription(subs.data);
  const state = sub ? toSubscriptionState(sub) : null;
  await usersCol().doc(uid).set({ stripeCustomerId: customerId, subscription: state }, { merge: true });
  // Members of this user's team inherit the plan
  const { refreshTeamTier } = await import("@/lib/server/team");
  await refreshTeamTier(uid);
  return state;
}

/** Records a Stripe event id; returns false if it was already processed. */
export async function claimStripeEvent(eventId: string, type: string): Promise<boolean> {
  const ref = adminDb().collection("stripe_events").doc(eventId);
  try {
    await ref.create({ type, receivedAt: Date.now() });
    return true;
  } catch (err) {
    if ((err as { code?: number }).code === 6) return false; // ALREADY_EXISTS
    throw err;
  }
}

export async function releaseStripeEvent(eventId: string) {
  await adminDb().collection("stripe_events").doc(eventId).delete().catch(() => {});
}
