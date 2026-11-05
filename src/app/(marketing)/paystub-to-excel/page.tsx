import type { Metadata } from "next";
import { Hub } from "@/components/marketing/seo/Hub";
import { PROVIDER_PAGES, providerName } from "@/lib/seo/providers";
import { PROVIDER_DISCLAIMER } from "@/lib/seo/sections";

export const metadata: Metadata = {
  title: "Paystub to Excel for Every Payroll Provider",
  description: "Convert paystubs from ADP, Gusto, Paychex, Paycom, Paylocity, Workday, and more into Excel, CSV, or JSON, with every line item checked.",
  alternates: { canonical: "/paystub-to-excel" },
};

const HEADINGS: Record<string, string> = {
  "HR and payroll suite": "HR and payroll suites",
  "enterprise HR and payroll platform": "Enterprise platforms",
  "professional employer organization (PEO)": "PEOs (professional employer organizations)",
  "small-business payroll service": "Small-business payroll",
  "global payroll and employer-of-record platform": "Global payroll",
  "restaurant and hospitality payroll service": "Restaurants and hospitality",
};

export default function ProvidersHub() {
  const handwritten = PROVIDER_PAGES.filter((p) => !p.category);
  const byCategory = new Map<string, typeof PROVIDER_PAGES>();
  for (const p of PROVIDER_PAGES.filter((p) => p.category)) byCategory.set(p.category!, [...(byCategory.get(p.category!) ?? []), p]);
  const item = (p: (typeof PROVIDER_PAGES)[number]) => ({ path: `/paystub-to-excel/${p.slug}`, title: providerName(p.slug), blurb: p.description.split(".")[0] + "." });
  return (
    <Hub
      path="/paystub-to-excel"
      title="Paystub to Excel, for every payroll provider"
      intro="StubParse reads paystubs from most US payroll providers. Pick yours for specifics, or just drop any stub in. It works the same way."
      groups={[
        { heading: "Most common", items: handwritten.map(item) },
        ...[...byCategory.entries()].map(([cat, pages]) => ({ heading: HEADINGS[cat] ?? cat, items: pages.map(item) })),
      ]}
      footnote={PROVIDER_DISCLAIMER}
    />
  );
}
