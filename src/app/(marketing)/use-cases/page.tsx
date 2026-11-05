import type { Metadata } from "next";
import { Hub } from "@/components/marketing/seo/Hub";
import { USE_CASE_PAGES } from "@/lib/seo/use-cases";
import { USE_CASE_LABELS } from "@/lib/seo/sections";

export const metadata: Metadata = {
  title: "What People Use StubParse For",
  description: "Income verification, bookkeeping, rental applications, mortgages, loan underwriting, payroll reconciliation, and more.",
  alternates: { canonical: "/use-cases" },
};

export default function UseCasesHub() {
  return (
    <Hub
      path="/use-cases"
      title="What people use StubParse for"
      intro="From one person's tax prep to a lender's underwriting queue, the job is the same: get paystub numbers out of documents and into decisions."
      groups={[{ items: USE_CASE_PAGES.map((p) => ({ path: `/use-cases/${p.slug}`, title: USE_CASE_LABELS[p.slug] ?? p.h1, blurb: p.description.split(".")[0] + "." })) }]}
    />
  );
}
