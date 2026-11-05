// Server-side Stripe client, price catalog, and subscription mapping.

import Stripe from "stripe";
import type { Interval, PaidTier, SubscriptionState } from "@/lib/plan";

let client: Stripe | null = null;

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  client ??= new Stripe(key);
  return client;
}

export function appOrigin(req: Request): string {
  return process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || new URL(req.url).origin;
}

/** Price IDs per tier and interval. STRIPE_PRICE_ID is the legacy name for Pro monthly. */
function priceCatalog(): Record<PaidTier, Partial<Record<Interval, string>>> {
  const env = process.env;
  return {
    pro: {
      month: env.STRIPE_PRICE_PRO_MONTHLY || env.STRIPE_PRICE_ID || undefined,
      year: env.STRIPE_PRICE_PRO_YEARLY || undefined,
    },
    business: {
      month: env.STRIPE_PRICE_BUSINESS_MONTHLY || undefined,
      year: env.STRIPE_PRICE_BUSINESS_YEARLY || undefined,
    },
  };
}

export function priceFor(tier: PaidTier, interval: Interval): string | undefined {
  return priceCatalog()[tier][interval];
}

function tierForPrice(price: Stripe.Price | undefined): { tier: PaidTier; interval: Interval } {
  const catalog = priceCatalog();
  for (const tier of ["business", "pro"] as const) {
    for (const interval of ["month", "year"] as const) {
      if (price && catalog[tier][interval] === price.id) return { tier, interval };
    }
  }
  // Unknown price: fall back to its metadata, then to Pro
  const meta = price?.metadata?.tier;
  return {
    tier: meta === "business" ? "business" : "pro",
    interval: price?.recurring?.interval === "year" ? "year" : "month",
  };
}

export function toSubscriptionState(sub: Stripe.Subscription): SubscriptionState {
  const item = sub.items.data[0];
  const { tier, interval } = tierForPrice(item?.price);
  return {
    id: sub.id,
    status: sub.status,
    tier,
    interval,
    priceId: item?.price.id ?? null,
    currentPeriodEnd: item?.current_period_end ?? null,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  };
}

/** Picks the subscription that should drive the account: a paying one first, else the newest. */
export function pickSubscription(subs: Stripe.Subscription[]): Stripe.Subscription | null {
  const paying = subs.filter((s) => ["active", "trialing", "past_due"].includes(s.status));
  const pool = paying.length ? paying : subs;
  return pool.sort((a, b) => b.created - a.created)[0] ?? null;
}
