// The SEO site map: each section's hub, its pages, and how they link to each other.

import type { Section } from "@/components/marketing/SeoLanding";
import { PROVIDER_PAGES, providerName } from "@/lib/seo/providers";

export const PROVIDER_DISCLAIMER =
  "StubParse is independent and not affiliated with, endorsed by, or sponsored by any payroll provider named on this site. Names are used only to describe the formats it reads.";

export const FORMAT_LABELS: Record<string, string> = {
  "pdf-paystub-to-excel": "PDF paystub to Excel",
  "paystub-to-csv": "Paystub to CSV",
  "paystub-to-json": "Paystub to JSON",
  "paystub-to-google-sheets": "Paystub to Google Sheets",
  "paystub-photo-to-excel": "Paystub photo to Excel",
  "scanned-paystub-to-text": "Scanned paystub to data",
};

export const USE_CASE_LABELS: Record<string, string> = {
  "income-verification": "Income verification",
  "bookkeeping": "Bookkeeping",
  "rental-applications": "Rental applications",
  "taxes-and-budgeting": "Taxes and budgeting",
  "mortgage-applications": "Mortgage applications",
  "loan-underwriting": "Loan underwriting",
  "payroll-reconciliation": "Payroll reconciliation",
  "divorce-and-child-support": "Divorce and child support",
};

export const PROVIDERS_SECTION: Section = {
  base: "/paystub-to-excel",
  hubName: "Payroll providers",
  siblings: PROVIDER_PAGES.map((p) => ({ slug: p.slug, label: providerName(p.slug) })),
  disclaimer: PROVIDER_DISCLAIMER,
};

export const FORMATS_SECTION: Section = {
  base: "/convert",
  hubName: "Converters",
  siblings: Object.entries(FORMAT_LABELS).map(([slug, label]) => ({ slug, label })),
};

export const USE_CASES_SECTION: Section = {
  base: "/use-cases",
  hubName: "Use cases",
  siblings: Object.entries(USE_CASE_LABELS).map(([slug, label]) => ({ slug, label })),
};
