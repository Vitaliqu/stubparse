import type { Metadata } from "next";
import { Hub } from "@/components/marketing/seo/Hub";
import { GLOSSARY } from "@/lib/seo/glossary";

export const metadata: Metadata = {
  title: "Paystub Glossary: Every Term on Your Pay Stub",
  description: "Plain-English definitions of gross pay, net pay, YTD, FICA, Social Security, Medicare, pre-tax deductions, and every other paystub term.",
  alternates: { canonical: "/glossary" },
};

export default function GlossaryHub() {
  const sorted = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term));
  return (
    <Hub
      path="/glossary"
      title="Paystub glossary"
      intro="Every term printed on a US pay stub, explained in plain English, with where to find it and a worked example."
      groups={[{ items: sorted.map((t) => ({ path: `/glossary/${t.slug}`, title: t.term, blurb: t.short })) }]}
    />
  );
}
