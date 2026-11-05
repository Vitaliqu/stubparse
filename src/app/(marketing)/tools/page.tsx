import type { Metadata } from "next";
import { Hub } from "@/components/marketing/seo/Hub";
import { TOOLS } from "@/lib/seo/calculators";

export const metadata: Metadata = {
  title: "Free Paycheck and Income Calculators",
  description: "Free calculators for annual income from a paycheck, YTD income, hourly to salary, rent affordability, and checking your paystub math.",
  alternates: { canonical: "/tools" },
};

export default function ToolsHub() {
  return (
    <Hub
      path="/tools"
      title="Free paycheck and income calculators"
      intro="Quick, private calculators for the questions paystubs raise. No sign-up, nothing stored: everything runs in your browser."
      groups={[{ items: TOOLS.map((t) => ({ path: `/tools/${t.slug}`, title: t.name, blurb: t.description.split(".")[0] + "." })) }]}
    />
  );
}
