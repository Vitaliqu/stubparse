import type { Metadata } from "next";
import { Pricing } from "@/components/marketing/Pricing";
import { FREE_DOCUMENTS, TIERS } from "@/lib/plan";

export const metadata: Metadata = {
  title: "Pricing",
  alternates: { canonical: "/pricing" },
  description: `${FREE_DOCUMENTS} paystubs free. Pro is $${TIERS.pro.monthly}/month for unlimited stubs and history; Business is $${TIERS.business.monthly}/month with income reports, integrity checks, and API access.`,
};

export default function PricingPage() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="mx-auto max-w-[720px] text-center">
          <h1 className="text-[clamp(2.75rem,7vw,4.75rem)] leading-[1] font-semibold tracking-[-0.04em]">Simple pricing.</h1>
          <p className="mx-auto mt-5 max-w-[32rem] text-[19px] leading-[1.5] text-muted">
            Try every parsing feature on {FREE_DOCUMENTS} documents. Pro makes it unlimited with saved history. Business adds income reports, integrity checks, and an API.
          </p>
        </div>
        <div className="mt-16"><Pricing /></div>
      </div>
    </section>
  );
}
