"use client";

import type { Interval, PaidTier } from "@/lib/plan";
import { track } from "@/lib/analytics";

type AuthedFetch = (input: string, init?: RequestInit) => Promise<Response>;

/** Calls a billing route and sends the browser to the Stripe URL it returns. */
export async function redirectToStripe(
  authedFetch: AuthedFetch,
  route: "checkout" | "portal",
  choice: { plan: PaidTier; interval: Interval } = { plan: "pro", interval: "month" },
): Promise<void> {
  if (route === "checkout") track("checkout_started", choice);
  const res = await authedFetch(`/api/stripe/${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: route === "checkout" ? JSON.stringify(choice) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.url) throw new Error(json.error ?? "Billing is unavailable right now. Try again in a moment.");
  window.location.assign(json.url);
}
