import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { claimStripeEvent, findUidByCustomer, releaseStripeEvent, syncCustomer } from "@/lib/server/account";
import { stripe } from "@/lib/server/stripe";
import { reportError } from "@/lib/server/monitoring";

export const runtime = "nodejs";

const customerOf = (c: string | Stripe.Customer | Stripe.DeletedCustomer | null) => (typeof c === "string" ? c : c?.id ?? null);

/**
 * Keeps users/{uid}.subscription in sync with Stripe.
 * Each event is processed once (event id claimed in Firestore), and the subscription is always
 * re-read from Stripe, so retries and out-of-order delivery can't leave a stale plan behind.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let customerId: string | null = null;
  let uid: string | null = null;
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      customerId = customerOf(session.customer);
      uid = session.client_reference_id;
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      customerId = customerOf(sub.customer);
      uid = sub.metadata?.uid || null;
      break;
    }
    default:
      return NextResponse.json({ received: true, ignored: event.type });
  }
  if (!customerId) return NextResponse.json({ received: true });

  if (!(await claimStripeEvent(event.id, event.type))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    uid ??= await findUidByCustomer(customerId);
    if (!uid) {
      console.warn("[stripe-webhook] no account for customer", customerId);
      return NextResponse.json({ received: true });
    }
    await syncCustomer(uid, customerId);
  } catch (err) {
    await releaseStripeEvent(event.id); // let Stripe's retry try again
    reportError(err, { where: "stripe-webhook", type: event.type, eventId: event.id, uid: uid ?? undefined });
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
