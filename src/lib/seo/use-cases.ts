// Use-case pages: the jobs people search for, not the product's features.

import { USE_CASE_PAGES as HANDWRITTEN, type SeoPage } from "@/lib/seo/pages";

const MORE: SeoPage[] = [
  {
    slug: "mortgage-applications",
    title: "Organize Paystubs for a Mortgage Application",
    h1: "Get your paystubs ready for a mortgage application",
    description: "Turn your recent paystubs into a tidy summary of gross pay, YTD earnings, and annualized income before you apply for a mortgage.",
    intro: "Lenders typically ask for your most recent paystubs and look at gross pay, year-to-date earnings, and how steady your income is. StubParse puts those numbers side by side so you know what the lender will see.",
    points: [
      { title: "See what a lender sees", body: "Gross pay per period, year-to-date earnings, and two annualized-income figures, one from your pay periods and one from your YTD pace." },
      { title: "Catch problems early", body: "If your YTD figures don't add up from one stub to the next, you'll know before the underwriter asks." },
      { title: "Keep a clean record", body: "Export a spreadsheet of every stub you send, so you can answer follow-up questions quickly." },
    ],
    faq: [
      { q: "How many paystubs do mortgage lenders ask for?", a: "Requirements vary by lender and loan type; recent consecutive stubs covering about a month are common. Ask your loan officer for their exact list." },
      { q: "Is this a mortgage pre-approval?", a: "No. It's a calculation on your own documents to help you prepare. Your lender makes the decision." },
      { q: "Are my paystubs uploaded?", a: "No. Files are read in your browser and never stored." },
    ],
  },
  {
    slug: "loan-underwriting",
    title: "Paystub Analysis for Loan Underwriting",
    h1: "Paystub analysis for auto and personal loan underwriting",
    description: "Read applicant paystubs, calculate qualifying income, and flag inconsistent or edited stubs, in the browser or through an API.",
    intro: "Small lenders, credit unions, and dealerships review paystubs by hand every day. StubParse extracts the figures, works out income, and highlights what deserves a second look.",
    points: [
      { title: "Income in two ways", body: "Annualized from the average pay period and from the year-to-date pace. When they disagree, you see a flag." },
      { title: "Integrity signals", body: "YTD figures that don't follow from stub to stub, implausible tax rates, mixed fonts in the amounts, and PDFs saved by editing tools." },
      { title: "API for your system", body: "Send stubs from your loan origination system and get JSON back, with checks attached (Business plan)." },
    ],
    faq: [
      { q: "Does StubParse make credit decisions?", a: "No. It extracts and calculates; your underwriting policy decides. Verify income through other sources where your rules require it." },
      { q: "Can several underwriters share one account?", a: "Yes. Business includes five seats with a shared history." },
      { q: "Is there an audit trail?", a: "Saved stubs keep who added them and when, and income reports can be printed to PDF for the file." },
    ],
  },
  {
    slug: "payroll-reconciliation",
    title: "Reconcile Payroll from Paystubs",
    h1: "Reconcile payroll from paystubs",
    description: "Turn a pay cycle's stubs into one sheet to reconcile against your payroll register, general ledger, or tax filings.",
    intro: "Reconciliation means matching what each employee was paid against what your books say. StubParse turns a batch of stubs into rows you can total and compare, with each stub's own math checked first.",
    points: [
      { title: "One row per stub", body: "The vertical layout makes totals by employee, by pay date, or by deduction a single pivot table away." },
      { title: "Each stub checked first", body: "Earnings vs gross and the net-pay formula are verified per stub, so you start from consistent numbers." },
      { title: "Group by client", body: "Label batches by client or entity, then filter your history and export one sheet per client." },
    ],
    faq: [
      { q: "Can I total withholding across a quarter?", a: "Yes. Export the quarter's stubs with tax fields selected and sum each column." },
      { q: "Does it replace my payroll register?", a: "No. It's a fast way to check the register against what employees actually received." },
      { q: "Which plan suits bookkeepers?", a: "Pro for unlimited stubs and history; Business adds team seats and the API." },
    ],
  },
  {
    slug: "divorce-and-child-support",
    title: "Summarize Paystubs for Divorce or Child Support",
    h1: "Summarize paystubs for divorce or child support",
    description: "Turn a year of paystubs into a clear record of gross pay, deductions, and income for financial disclosures and support calculations.",
    intro: "Financial disclosures and support worksheets ask for income figures your paystubs already hold. StubParse lines them up by pay date so totals and averages are easy to find and easy to explain.",
    points: [
      { title: "A year at a glance", body: "Every pay date in one sheet, with gross, taxes, deductions, and net side by side." },
      { title: "Deductions itemized", body: "Health insurance, retirement contributions, and other deductions are broken out, which support worksheets often ask for." },
      { title: "Averages calculated", body: "The income report shows average pay per period and annualized income (Business plan)." },
    ],
    faq: [
      { q: "Is this legal or financial advice?", a: "No. It organizes the figures on your documents. Your attorney or mediator will tell you how they're used." },
      { q: "Can my attorney see the results?", a: "Export to Excel or PDF and share the file, or print the income report." },
      { q: "Are my documents kept?", a: "Files are never stored. Saved history keeps only extracted figures on paid plans, and you can delete it any time." },
    ],
  },
];

export const USE_CASE_PAGES: SeoPage[] = [...HANDWRITTEN, ...MORE];
export const findUseCase = (slug: string) => USE_CASE_PAGES.find((p) => p.slug === slug);
