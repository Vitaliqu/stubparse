// Shared plan constants and account shape — safe to import on client and server.

export const FREE_DOCUMENTS = 3;

export type Tier = "free" | "pro" | "business";
export type PaidTier = Exclude<Tier, "free">;
export type Interval = "month" | "year";

interface TierInfo {
  id: Tier;
  name: string;
  monthly: number;   // USD per month, billed monthly
  yearly: number;    // USD per year, billed yearly
  tagline: string;
}

export const TIERS: Record<Tier, TierInfo> = {
  free:     { id: "free",     name: "Free",     monthly: 0,  yearly: 0,   tagline: `${FREE_DOCUMENTS} documents, every parsing feature.` },
  pro:      { id: "pro",      name: "Pro",      monthly: 5,  yearly: 50,  tagline: "Unlimited documents and saved history, for anyone handling stubs every pay cycle." },
  business: { id: "business", name: "Business", monthly: 29, yearly: 290, tagline: "Team seats, income reports, integrity checks, and API access, for lenders, landlords, and firms." },
};

/** Features that need Business. */
export const BUSINESS_FEATURES = ["income-report", "integrity", "api", "team"] as const;

/** Seats included with Business (the owner counts as one). */
export const TEAM_SEATS = 5;

/** Retention choices for saved history, in months (0 = keep until deleted). */
export const RETENTION_OPTIONS = [3, 6, 12, 24, 0] as const;
export const DEFAULT_RETENTION_MONTHS = 12;
export type BusinessFeature = (typeof BUSINESS_FEATURES)[number];

/** Subscription statuses that unlock a paid tier. `past_due` keeps access while Stripe retries the card. */
const PAID_STATUSES = new Set(["active", "trialing", "past_due"]);

export interface SubscriptionState {
  id: string;
  status: string;
  tier: PaidTier;
  interval: Interval;
  priceId: string | null;
  currentPeriodEnd: number | null; // unix seconds
  cancelAtPeriodEnd: boolean;
}

/** Firestore document at users/{uid}. Written only by the server (Admin SDK). */
export interface AccountDoc {
  email: string | null;
  createdAt: number;          // ms
  docsUsed: number;           // lifetime documents parsed
  periodKey: string;          // "YYYY-MM" of periodUsed
  periodUsed: number;         // documents parsed in periodKey (fair-use cap for paid plans)
  stripeCustomerId?: string | null;
  subscription?: SubscriptionState | null;
  emails?: Partial<Record<"welcome" | "activation" | "limit", number>>; // sent-at ms
  emailOptOut?: boolean;
  /** Extra free documents granted by support. */
  bonusDocs?: number;
  /** "YYYY-MM-DD" (UTC) of dayUsed — daily ceiling on paid plans. */
  dayKey?: string;
  dayUsed?: number;
  /** Team membership, denormalized by the server so the plan resolves without extra reads. */
  team?: TeamMembership | null;
}

export interface TeamMembership {
  id: string;
  name: string;
  role: "owner" | "member";
  /** The team owner's current tier; members inherit it. */
  tier: Tier;
}

export interface AccountSummary {
  plan: Tier;                 // effective plan (own subscription or team)
  ownPlan: Tier;              // from the user's own subscription only
  docsUsed: number;
  freeRemaining: number;      // only meaningful on free
  subscription: SubscriptionState | null;
  team: TeamMembership | null;
}

const RANK: Record<Tier, number> = { free: 0, pro: 1, business: 2 };

/** Tier from the user's own subscription. */
export function ownTierOf(doc: Pick<AccountDoc, "subscription"> | null | undefined): Tier {
  const sub = doc?.subscription;
  if (!sub || !PAID_STATUSES.has(sub.status)) return "free";
  return sub.tier ?? "pro"; // subscriptions stored before tiers existed were Pro
}

/** Effective tier: the better of the user's own plan and their team's plan. */
export function tierOf(doc: Pick<AccountDoc, "subscription" | "team"> | null | undefined): Tier {
  const own = ownTierOf(doc);
  const team = doc?.team?.tier ?? "free";
  return RANK[team] > RANK[own] ? team : own;
}

export const freeAllowance = (doc: Pick<AccountDoc, "bonusDocs"> | null | undefined) => FREE_DOCUMENTS + Math.max(0, doc?.bonusDocs ?? 0);

export const canUse = (tier: Tier | undefined, feature: BusinessFeature) =>
  (BUSINESS_FEATURES as readonly string[]).includes(feature) ? tier === "business" : tier !== undefined;

export function summarize(doc: AccountDoc | null | undefined): AccountSummary {
  const docsUsed = doc?.docsUsed ?? 0;
  return {
    plan: tierOf(doc),
    ownPlan: ownTierOf(doc),
    docsUsed,
    freeRemaining: Math.max(0, freeAllowance(doc) - docsUsed),
    subscription: doc?.subscription ?? null,
    team: doc?.team ?? null,
  };
}
