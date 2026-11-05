"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button, Segmented } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { redirectToStripe } from "@/lib/billing";
import { FREE_DOCUMENTS, TEAM_SEATS, TIERS, type Interval, type PaidTier, type Tier } from "@/lib/plan";

const FEATURES: Record<Tier, string[]> = {
  free: [
    `${FREE_DOCUMENTS} documents in total`,
    "PDF and image paystubs, batch upload",
    "Basic and AI extraction",
    "Live math checks on every stub",
    "Excel, CSV, and JSON export",
  ],
  pro: [
    "Unlimited documents",
    "Saved history of extracted data",
    "Client labels to group stubs",
    "Everything in Free",
  ],
  business: [
    `${TEAM_SEATS} team seats with one shared history`,
    "Income reports: frequency, averages, annualized income",
    "Integrity checks for edited or inconsistent stubs",
    "REST API with keys",
    "Everything in Pro",
  ],
};

export function Pricing() {
  const router = useRouter();
  const { user, account, authedFetch } = useAuth();
  const [interval, setInterval] = useState<Interval>("year");
  const [busy, setBusy] = useState<PaidTier | null>(null);
  const [error, setError] = useState("");
  const current = account?.plan ?? "free";

  const subscribe = async (plan: PaidTier) => {
    if (!user) return router.push(`/sign-up?next=${encodeURIComponent("/app/account")}`);
    if (current !== "free") return router.push("/app/account");
    setBusy(plan);
    setError("");
    try {
      await redirectToStripe(authedFetch, "checkout", { plan, interval });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start checkout.");
      setBusy(null);
    }
  };

  const price = (t: Tier) => (interval === "month" ? TIERS[t].monthly : TIERS[t].yearly);
  const cadence = interval === "month" ? "per month" : "per year";

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mx-auto w-full max-w-[16rem]">
        <Segmented
          label="Billing interval"
          value={interval}
          onChange={setInterval}
          options={[{ value: "month", label: "Monthly" }, { value: "year", label: <>Yearly <span className="text-ok">−17%</span></> }]}
        />
      </div>
      <p className="mt-2 text-center text-[13px] text-muted">{interval === "year" ? "Two months free with yearly billing." : "Switch to yearly for two months free."}</p>

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        <Plan
          tier="free"
          price="$0"
          cadence="forever"
          features={FEATURES.free}
          action={
            <Button variant="secondary" size="lg" className="w-full" onClick={() => router.push(user ? "/app" : "/sign-up")}>
              {user ? "Open workspace" : "Start free"}
            </Button>
          }
        />
        <Plan
          tier="pro"
          price={`$${price("pro")}`}
          cadence={cadence}
          features={FEATURES.pro}
          featured
          action={
            <Button variant="inverse" size="lg" className="w-full" onClick={() => subscribe("pro")} loading={busy === "pro"} disabled={!!busy || current === "pro"}>
              {current === "pro" ? "Your plan" : current === "business" ? "Manage plan" : "Choose Pro"}
            </Button>
          }
        />
        <Plan
          tier="business"
          price={`$${price("business")}`}
          cadence={cadence}
          features={FEATURES.business}
          action={
            <Button size="lg" className="w-full" onClick={() => subscribe("business")} loading={busy === "business"} disabled={!!busy || current === "business"}>
              {current === "business" ? "Your plan" : current === "pro" ? "Upgrade in billing" : "Choose Business"}
            </Button>
          }
        />
      </div>

      {error && <p role="alert" className="mt-4 text-center text-[13px] text-bad">{error}</p>}
      <p className="mt-6 text-center text-[13px] text-muted">
        Billed through Stripe. Change or cancel any time from your account; paid features stay on until the period ends.
      </p>
    </div>
  );
}

function Plan({
  tier, price, cadence, features, action, featured = false,
}: {
  tier: Tier; price: string; cadence: string; features: string[]; action: React.ReactNode; featured?: boolean;
}) {
  const info = TIERS[tier];
  return (
    <div className={`flex flex-col rounded-[22px] p-7 sm:p-8 ${featured ? "bg-ink text-white" : "bg-paper ring-1 ring-line"}`}>
      <h3 className="text-[17px] font-semibold tracking-[-0.01em]">{info.name}</h3>
      <p className="mt-4 flex items-baseline gap-1.5">
        <span className="tnum text-[44px] leading-none font-semibold tracking-[-0.035em]">{price}</span>
        <span className={featured ? "text-white/60" : "text-muted"}>{cadence}</span>
      </p>
      <p className={`mt-4 text-[15px] leading-relaxed ${featured ? "text-white/70" : "text-muted"}`}>{info.tagline}</p>
      <ul className="mt-6 space-y-2.5 text-[14px]">
        {features.map((f, i) => (
          <li key={f} className="flex items-start gap-2.5">
            <Check aria-hidden className={`mt-0.5 size-4 shrink-0 ${featured ? (i === 0 ? "text-white" : "text-white/50") : i === 0 ? "text-ink" : "text-faint"}`} strokeWidth={2.25} />
            <span className={i === 0 ? "font-medium" : ""}>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-8">{action}</div>
    </div>
  );
}
