import { NextResponse } from "next/server";
import { errorResponse, getOrCreateAccount, requireUser, usableCustomerId } from "@/lib/server/account";
import { stripe } from "@/lib/server/stripe";

export const runtime = "nodejs";

/** The signed-in user's recent invoices, with links to Stripe-hosted receipts. */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const account = await getOrCreateAccount(user);
    const customerId = await usableCustomerId(user.uid, account.stripeCustomerId);
    if (!customerId) return NextResponse.json({ invoices: [] });

    const list = await stripe().invoices.list({ customer: customerId, limit: 12 });
    const invoices = list.data
      .filter((inv) => inv.status !== "draft")
      .map((inv) => ({
        id: inv.id,
        number: inv.number,
        created: inv.created,
        amount: inv.total,
        currency: inv.currency,
        status: inv.status,
        url: inv.hosted_invoice_url,
        pdf: inv.invoice_pdf,
      }));
    return NextResponse.json({ invoices });
  } catch (err) {
    return errorResponse(err);
  }
}
