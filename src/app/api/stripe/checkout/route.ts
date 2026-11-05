import { NextResponse } from "next/server";
import { errorResponse, getOrCreateAccount, HttpError, requireUser, setStripeCustomer } from "@/lib/server/account";
import { appOrigin, priceFor, stripe } from "@/lib/server/stripe";
import { tierOf, type Interval, type PaidTier } from "@/lib/plan";

export const runtime = "nodejs";

/** Starts Stripe Checkout for a paid plan. Body: { plan: "pro" | "business", interval: "month" | "year" }. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const tier: PaidTier = body?.plan === "business" ? "business" : "pro";
    const interval: Interval = body?.interval === "year" ? "year" : "month";

    const priceId = priceFor(tier, interval);
    if (!priceId) throw new HttpError(503, `The ${tier} ${interval === "year" ? "annual" : "monthly"} plan isn't available yet.`, "price_missing");
    if (!priceId.startsWith("price_")) {
      console.error(`[checkout] price for ${tier}/${interval} must be a Stripe price ID (price_...), got "${priceId}"`);
      throw new HttpError(503, "Billing is misconfigured. Price IDs must start with price_.");
    }

    const account = await getOrCreateAccount(user);
    if (account.team?.role === "member" && account.team.tier === "business") {
      throw new HttpError(409, `Your Business plan comes from ${account.team.name}. Leave the team first to buy your own plan.`, "team_member");
    }
    if (tierOf(account) !== "free") {
      // Plan changes go through the portal so Stripe prorates correctly.
      throw new HttpError(409, "You already have a subscription. Change plans from Manage billing.", "already_subscribed");
    }

    let customerId = account.stripeCustomerId ?? null;
    if (!customerId) {
      const customer = await stripe().customers.create({ email: user.email ?? undefined, metadata: { uid: user.uid } });
      customerId = customer.id;
      await setStripeCustomer(user.uid, customerId);
    }

    const origin = appOrigin(req);
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.uid,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { metadata: { uid: user.uid, tier } },
      allow_promotion_codes: true,
      ...(process.env.STRIPE_AUTOMATIC_TAX === "1" ? { automatic_tax: { enabled: true }, customer_update: { address: "auto" as const } } : {}),
      success_url: `${origin}/app?upgraded=1`,
      cancel_url: `${origin}/app/account`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return errorResponse(err);
  }
}
