import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { pickSubscription, toSubscriptionState } from "@/lib/server/stripe";
import { quotaError } from "@/lib/server/account";
import { ownTierOf, summarize, tierOf, type AccountDoc } from "@/lib/plan";
import { unsubscribeToken, verifyUnsubscribeToken } from "@/lib/server/email";

const env = { ...process.env };
beforeEach(() => {
  process.env.STRIPE_PRICE_PRO_MONTHLY = "price_pro_m";
  process.env.STRIPE_PRICE_PRO_YEARLY = "price_pro_y";
  process.env.STRIPE_PRICE_BUSINESS_MONTHLY = "price_biz_m";
  process.env.STRIPE_PRICE_BUSINESS_YEARLY = "price_biz_y";
  process.env.EMAIL_UNSUBSCRIBE_SECRET = "test-secret-that-is-at-least-32-characters-long";
});
afterEach(() => { process.env = { ...env }; });

const sub = (priceId: string, status = "active", created = 1, interval: "month" | "year" = "month") => ({
  id: `sub_${priceId}_${created}`, status, created, cancel_at_period_end: false,
  items: { data: [{ current_period_end: 1800000000, price: { id: priceId, metadata: {}, recurring: { interval } } }] },
}) as unknown as Stripe.Subscription;

describe("subscription mapping", () => {
  it("maps each configured price to its tier and interval", () => {
    expect(toSubscriptionState(sub("price_biz_y", "active", 1, "year"))).toMatchObject({ tier: "business", interval: "year", status: "active" });
    expect(toSubscriptionState(sub("price_pro_m"))).toMatchObject({ tier: "pro", interval: "month" });
  });

  it("prefers a paying subscription, then the newest", () => {
    const picked = pickSubscription([sub("price_pro_m", "canceled", 5), sub("price_biz_m", "active", 2), sub("price_pro_y", "active", 3)]);
    expect(picked?.id).toBe("sub_price_pro_y_3");
    expect(pickSubscription([sub("price_pro_m", "canceled", 1), sub("price_pro_m", "canceled", 9)])?.id).toBe("sub_price_pro_m_9");
  });
});

const account = (over: Partial<AccountDoc> = {}): AccountDoc => ({
  email: "a@b.c", createdAt: 0, docsUsed: 0, periodKey: "2026-11", periodUsed: 0, subscription: null, ...over,
});
const paid = (tier: "pro" | "business", status = "active") => ({ id: "s", status, tier, interval: "month" as const, priceId: null, currentPeriodEnd: null, cancelAtPeriodEnd: false });

describe("plan rules", () => {
  it("allows three free documents, then blocks with 402", () => {
    expect(quotaError(account({ docsUsed: 2 }))).toBeNull();
    expect(quotaError(account({ docsUsed: 3 }))?.status).toBe(402);
  });

  it("applies the monthly fair-use ceiling to paid plans, resetting each month", () => {
    const now = new Date("2026-11-15T00:00:00Z");
    expect(quotaError(account({ subscription: paid("pro"), periodUsed: 1000 }), now)?.status).toBe(429);
    expect(quotaError(account({ subscription: paid("pro"), periodUsed: 1000, periodKey: "2026-10" }), now)).toBeNull();
    expect(quotaError(account({ subscription: paid("business"), periodUsed: 1000 }), now)).toBeNull();
  });

  it("treats past_due as paid and canceled as free; legacy subscriptions are Pro", () => {
    expect(tierOf(account({ subscription: paid("business", "past_due") }))).toBe("business");
    expect(tierOf(account({ subscription: paid("pro", "canceled") }))).toBe("free");
    expect(tierOf(account({ subscription: { ...paid("pro"), tier: undefined as unknown as "pro" } }))).toBe("pro");
    expect(summarize(account({ docsUsed: 5 })).freeRemaining).toBe(0);
  });
});

describe("unsubscribe tokens", () => {
  it("refuses to sign or verify without a strong secret", () => {
    delete process.env.EMAIL_UNSUBSCRIBE_SECRET;
    expect(() => unsubscribeToken("user-1")).toThrow(/EMAIL_UNSUBSCRIBE_SECRET/);
    expect(verifyUnsubscribeToken("user-1", "anything")).toBe(false);
    process.env.EMAIL_UNSUBSCRIBE_SECRET = "short";
    expect(verifyUnsubscribeToken("user-1", "anything")).toBe(false);
  });

  it("verifies only the matching user's token", () => {
    const t = unsubscribeToken("user-1");
    expect(verifyUnsubscribeToken("user-1", t)).toBe(true);
    expect(verifyUnsubscribeToken("user-2", t)).toBe(false);
    expect(verifyUnsubscribeToken("user-1", "nope")).toBe(false);
  });
});

describe("teams and bonus documents", () => {
  const team = (tier: "business" | "free", role: "owner" | "member" = "member") => ({ id: "t1", name: "Harbor Lending", role, tier });

  it("members inherit Business from the team; own plan is unchanged", () => {
    const doc = account({ team: team("business") });
    expect(tierOf(doc)).toBe("business");
    expect(ownTierOf(doc)).toBe("free");
    expect(summarize(doc)).toMatchObject({ plan: "business", ownPlan: "free" });
  });

  it("a lapsed team falls back to the member's own plan", () => {
    expect(tierOf(account({ team: team("free") }))).toBe("free");
    expect(tierOf(account({ team: team("free"), subscription: paid("pro") }))).toBe("pro");
  });

  it("team Business members get the Business fair-use ceiling, not the free limit", () => {
    expect(quotaError(account({ team: team("business"), docsUsed: 50 }))).toBeNull();
  });

  it("support-granted bonus documents extend the free allowance", () => {
    expect(quotaError(account({ docsUsed: 3, bonusDocs: 2 }))).toBeNull();
    expect(quotaError(account({ docsUsed: 5, bonusDocs: 2 }))?.status).toBe(402);
    expect(summarize(account({ docsUsed: 3, bonusDocs: 2 })).freeRemaining).toBe(2);
  });
});

describe("daily ceiling on paid plans", () => {
  const now = new Date("2026-11-15T12:00:00Z");
  it("blocks at the daily limit and resets the next day", () => {
    const busy = account({ subscription: paid("pro"), periodUsed: 10, dayKey: "2026-11-15", dayUsed: 300 });
    expect(quotaError(busy, now)?.code).toBe("daily_limit");
    expect(quotaError({ ...busy, dayKey: "2026-11-14" }, now)).toBeNull();
    expect(quotaError(account({ subscription: paid("business"), dayKey: "2026-11-15", dayUsed: 300 }), now)).toBeNull();
  });
});
