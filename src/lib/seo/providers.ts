// Payroll-provider landing pages. Names describe formats StubParse reads, not partnerships.
// Hand-written pages live in seo-pages.ts; the rest are generated from category facts plus a
// provider-specific note, so each page says something true and distinct.

import { PROVIDER_PAGES as HANDWRITTEN, type SeoPage } from "@/lib/seo/pages";

type Category = "small-business" | "hcm" | "enterprise" | "peo" | "global" | "hospitality";

interface Provider { slug: string; name: string; category: Category; note: string }

const PROVIDERS: Provider[] = [
  { slug: "paycom", name: "Paycom", category: "hcm", note: "Paycom bundles payroll with time, HR, and talent tools in one system, and employees usually download stubs from its self-service app." },
  { slug: "paylocity", name: "Paylocity", category: "hcm", note: "Paylocity serves mid-sized employers, so its stubs often carry several earning codes, benefit deductions, and employer contributions." },
  { slug: "paycor", name: "Paycor", category: "hcm", note: "Paycor focuses on small and mid-sized businesses, and its stubs usually list each earning, tax, and deduction with year-to-date totals." },
  { slug: "rippling", name: "Rippling", category: "hcm", note: "Rippling ties payroll to HR and IT, and employees typically download paystubs as PDFs from the Rippling app." },
  { slug: "workday", name: "Workday", category: "enterprise", note: "Workday payslips at large employers can run several pages, with many earning and deduction types plus imputed income." },
  { slug: "ukg", name: "UKG", category: "enterprise", note: "UKG (formerly Ultimate Software and Kronos) is common at large hourly workforces, so stubs often include shift differentials and overtime lines." },
  { slug: "dayforce", name: "Dayforce", category: "enterprise", note: "Dayforce (formerly Ceridian) runs continuous payroll for large employers, and its pay statements can include many earning codes." },
  { slug: "justworks", name: "Justworks", category: "peo", note: "Justworks is a PEO, so stubs may name Justworks alongside the company you actually work for." },
  { slug: "trinet", name: "TriNet", category: "peo", note: "TriNet is a PEO serving small and mid-sized businesses, and its pay statements reflect co-employment." },
  { slug: "insperity", name: "Insperity", category: "peo", note: "Insperity is a PEO, so benefit deductions often come from its pooled plans and appear as several separate lines." },
  { slug: "onpay", name: "OnPay", category: "small-business", note: "OnPay is a small-business payroll service whose stubs follow a compact layout with current and year-to-date columns." },
  { slug: "patriot-software", name: "Patriot Software", category: "small-business", note: "Patriot Software serves very small employers, and its stubs are usually a single page with straightforward sections." },
  { slug: "surepayroll", name: "SurePayroll", category: "small-business", note: "SurePayroll is built for small businesses and household employers, so stubs are short but still carry full YTD figures." },
  { slug: "wave", name: "Wave Payroll", category: "small-business", note: "Wave Payroll is popular with freelancers' and micro-businesses' first employees, and its stubs are simple one-pagers." },
  { slug: "bamboohr", name: "BambooHR", category: "hcm", note: "BambooHR adds payroll to its HR platform, and pay stubs are available to employees in the BambooHR app." },
  { slug: "deel", name: "Deel", category: "global", note: "Deel runs payroll and employer-of-record services across many countries; StubParse reads the US-style stubs and most English-language payslips." },
  { slug: "toast-payroll", name: "Toast Payroll", category: "hospitality", note: "Toast Payroll is used by restaurants, so stubs commonly include declared tips, tip credits, and multiple hourly rates." },
  { slug: "heartland", name: "Heartland Payroll", category: "hospitality", note: "Heartland serves restaurants and small businesses, so its stubs often mix hourly pay with tips." },
];

const CATEGORY: Record<Category, { kind: string; points: { title: string; body: string }[]; faq: (n: string) => { q: string; a: string }[] }> = {
  "small-business": {
    kind: "small-business payroll service",
    points: [
      { title: "Every line, current and YTD", body: "Earnings, taxes, and deductions each become a row with both the current-period and year-to-date amounts." },
      { title: "Straight into your books", body: "Export a vertical CSV with one row per stub to reconcile against your payroll journal or accounting software." },
      { title: "Math checked before you export", body: "Earnings are compared with gross, and gross minus taxes and deductions with net, so misreads surface immediately." },
    ],
    faq: (n) => [
      { q: `Can I convert a batch of ${n} stubs at once?`, a: "Yes. Drop several files together and export them as one spreadsheet, one row per stub or one row per employee." },
      { q: "Do I need an account?", a: "You get three documents free with a free account, no card required. Pro makes it unlimited." },
    ],
  },
  hcm: {
    kind: "HR and payroll suite",
    points: [
      { title: "Many earning codes, kept separate", body: "Regular, overtime, bonus, PTO, and other codes each get their own field, with hours split from amounts." },
      { title: "Benefits and pre-tax deductions", body: "Medical, dental, 401(k), HSA, and FSA lines land under Deductions, so taxes and voluntary deductions never blur." },
      { title: "Downloaded PDFs read instantly", body: "PDFs downloaded from the employee portal have a text layer, so they parse in seconds in your browser." },
    ],
    faq: (n) => [
      { q: `Do ${n} stubs with many earning codes work?`, a: "Yes. Each code becomes its own row. AI mode handles unusual or very dense layouts best." },
      { q: "Can I compare several pay periods?", a: "Export the horizontal layout to see each pay period as a column group, or create an income report on the Business plan." },
    ],
  },
  enterprise: {
    kind: "enterprise HR and payroll platform",
    points: [
      { title: "Multi-page payslips", body: "Long statements are read page by page, and every earning and deduction is collected into one record." },
      { title: "Shift differentials and overtime", body: "Each earning line keeps its own hours and amount, so you can total overtime or premiums separately." },
      { title: "Imputed income and employer contributions", body: "Lines that don't affect take-home pay are kept apart, so the net-pay check stays meaningful." },
    ],
    faq: (n) => [
      { q: `My ${n} payslip has several pages. Is that okay?`, a: "Yes. Text PDFs are read in full. For scans with no text, AI mode reads up to five pages per stub." },
      { q: "Can I export for an audit?", a: "Export Excel or CSV with one row per stub, including YTD, and choose exactly which fields to include." },
    ],
  },
  peo: {
    kind: "professional employer organization (PEO)",
    points: [
      { title: "Co-employment, handled", body: "PEO stubs can name both the PEO and your company. StubParse captures the employer fields so you can tell them apart." },
      { title: "Pooled benefits as separate lines", body: "Medical, dental, vision, and other plan deductions each come through as their own field with YTD." },
      { title: "Verify income across periods", body: "Line up several stubs to see pay frequency, average pay, and annualized income on the Business plan." },
    ],
    faq: (n) => [
      { q: `Why does my stub say ${n} instead of my employer?`, a: `${n} is a PEO, which co-employs staff and runs payroll for your company. That's normal, and both names are extracted when present.` },
      { q: "Is StubParse affiliated with the PEO?", a: "No. StubParse is independent and simply reads the stubs it produces." },
    ],
  },
  global: {
    kind: "global payroll and employer-of-record platform",
    points: [
      { title: "US stubs and English payslips", body: "US stubs parse fully, and AI mode reads most English-language payslips from other countries." },
      { title: "Contractor and employee statements", body: "Employee payslips come through with earnings, taxes, and deductions. Contractor invoices aren't paystubs and are flagged." },
      { title: "Clean exports", body: "Get Excel, CSV, or JSON with consistent field names, whatever the source layout." },
    ],
    faq: (n) => [
      { q: `Does it read ${n} payslips from outside the US?`, a: "AI mode handles most English-language payslips. The math checks are tuned for US-style stubs." },
      { q: "Which currencies are supported?", a: "Amounts are extracted as written. Export keeps the numbers, so you can convert them in your spreadsheet." },
    ],
  },
  hospitality: {
    kind: "restaurant and hospitality payroll service",
    points: [
      { title: "Tips as earnings", body: "Cash and credit-card tips come through as earning lines and count toward the gross-pay check." },
      { title: "Multiple hourly rates", body: "Server, bartender, and training rates each keep their own hours and pay." },
      { title: "Fast weekly batches", body: "Drop a month of weekly stubs and export one sheet in a minute." },
    ],
    faq: (n) => [
      { q: `Does it handle tips on ${n} stubs?`, a: "Yes. Tips are extracted as earnings with their year-to-date amounts." },
      { q: "Can I total hours across stubs?", a: "Export with hours fields included and sum the column in Excel or Google Sheets." },
    ],
  },
};

const generated: SeoPage[] = PROVIDERS.map((p) => {
  const c = CATEGORY[p.category];
  return {
    slug: p.slug,
    title: `${p.name} Paystub to Excel, CSV, or JSON`,
    h1: `Turn ${p.name} paystubs into a spreadsheet`,
    description: `Convert ${p.name} pay stubs (PDF or photo) into Excel, CSV, or JSON. Every earning, tax, deduction, and YTD figure, with the math checked.`,
    intro: `${p.note} StubParse reads ${p.name} stubs in your browser and turns every line into rows you can sort, sum, and export.`,
    points: c.points,
    faq: [
      ...c.faq(p.name),
      { q: `Is StubParse made by ${p.name}?`, a: `No. StubParse is independent and not affiliated with ${p.name}. It reads the stubs ${p.name} produces, the same way it reads stubs from any other payroll provider.` },
    ],
  };
});

export const PROVIDER_PAGES: (SeoPage & { category?: string })[] = [
  ...HANDWRITTEN,
  ...generated.map((g, i) => ({ ...g, category: CATEGORY[PROVIDERS[i].category].kind })),
];

export const findProvider = (slug: string) => PROVIDER_PAGES.find((p) => p.slug === slug);
export const providerName = (slug: string) =>
  PROVIDERS.find((p) => p.slug === slug)?.name ?? HANDWRITTEN.find((p) => p.slug === slug)?.h1.replace(/^Turn | paystubs into a spreadsheet$/g, "") ?? slug;
