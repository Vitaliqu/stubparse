import { NextResponse } from "next/server";
import { errorResponse, getOrCreateAccount, HttpError, requireUser, usableCustomerId } from "@/lib/server/account";
import { appOrigin, stripe } from "@/lib/server/stripe";

export const runtime = "nodejs";

/** Opens the Stripe Customer Portal (update card, invoices, cancel). */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const account = await getOrCreateAccount(user);
    const customerId = await usableCustomerId(user.uid, account.stripeCustomerId);
    if (!customerId) throw new HttpError(404, "No billing account yet.", "no_customer");

    const session = await stripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appOrigin(req)}/app/account`,
      ...(process.env.STRIPE_PORTAL_CONFIGURATION ? { configuration: process.env.STRIPE_PORTAL_CONFIGURATION } : {}),
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return errorResponse(err);
  }
}
