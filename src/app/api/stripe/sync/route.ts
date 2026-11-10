import { NextResponse } from "next/server";
import { errorResponse, getOrCreateAccount, requireUser, usableCustomerId, setStripeCustomer, syncCustomer } from "@/lib/server/account";
import { stripe } from "@/lib/server/stripe";
import { summarize } from "@/lib/plan";

export const runtime = "nodejs";

/**
 * Pulls the user's subscription straight from Stripe and stores it.
 * A safety net for missed or delayed webhooks: called after checkout and on the account page.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const account = await getOrCreateAccount(user);

    let customerId = await usableCustomerId(user.uid, account.stripeCustomerId);
    if (!customerId) {
      // Checkout created the customer with metadata.uid; recover the link if it was never stored.
      const found = await stripe().customers.search({ query: `metadata['uid']:'${user.uid}'`, limit: 1 });
      customerId = found.data[0]?.id ?? null;
      if (!customerId) return NextResponse.json(summarize(account));
      await setStripeCustomer(user.uid, customerId);
    }

    const subscription = await syncCustomer(user.uid, customerId);
    return NextResponse.json(summarize({ ...account, stripeCustomerId: customerId, subscription }));
  } catch (err) {
    return errorResponse(err);
  }
}
