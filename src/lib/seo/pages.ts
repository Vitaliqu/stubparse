// Hand-written landing-page content (the original provider and use-case pages).
// Content for search landing pages. Provider names describe formats StubParse reads,
// not partnerships; every page carries a non-affiliation note.

export interface SeoPage {
  slug: string;
  title: string;        // <title>
  h1: string;
  description: string;  // meta description
  intro: string;
  points: { title: string; body: string }[];
  faq: { q: string; a: string }[];
}

export const PROVIDER_PAGES: SeoPage[] = [
  {
    slug: "adp",
    title: "ADP Paystub to Excel, CSV, or JSON",
    h1: "Turn ADP paystubs into a spreadsheet",
    description: "Convert ADP earnings statements (PDF or photo) into Excel, CSV, or JSON. Every earning, tax, deduction, and YTD figure, with the math checked.",
    intro: "ADP earnings statements pack a lot into one page: regular and overtime earnings, statutory deductions, voluntary deductions, and a year-to-date column for each. StubParse reads all of it and lays it out as rows.",
    points: [
      { title: "Statutory and voluntary deductions, kept apart", body: "Federal, state, Social Security, and Medicare go under Taxes. 401(k), medical, dental, and similar items go under Deductions, so your totals reconcile." },
      { title: "Current and year-to-date for every line", body: "Each line keeps both columns, so you can export just this period or include YTD for income checks." },
      { title: "Downloaded PDFs or phone photos", body: "Statements downloaded from the employee portal have a text layer and parse instantly. Photos and scans go through OCR, or AI mode for difficult ones." },
    ],
    faq: [
      { q: "Can I convert several ADP stubs at once?", a: "Yes. Drop a batch and export them together, one row per stub or one row per employee with periods as columns." },
      { q: "Does it work with ADP stubs that have multiple earning codes?", a: "Yes. Each earning line becomes its own field, with hours and amounts kept separate." },
      { q: "Is StubParse made by ADP?", a: "No. StubParse is independent and not affiliated with ADP. It reads the statements ADP produces." },
    ],
  },
  {
    slug: "gusto",
    title: "Gusto Paystub to Excel, CSV, or JSON",
    h1: "Turn Gusto paystubs into a spreadsheet",
    description: "Convert Gusto paystub PDFs into clean Excel, CSV, or JSON with earnings, taxes, deductions, and payout details, checked for errors.",
    intro: "Gusto paystubs list gross earnings, employee taxes, deductions, and where the net pay was deposited. StubParse extracts each section and checks that gross minus taxes and deductions equals net.",
    points: [
      { title: "Payout details included", body: "When a stub splits net pay across bank accounts, the payout lines come through as fields you can keep or drop from the export." },
      { title: "Employee taxes only", body: "Employer-paid taxes printed for reference are kept out of the net-pay math, so the checks reflect what the employee actually paid." },
      { title: "Fonts that trip up copy-paste", body: "Some Gusto PDFs use embedded fonts that come out garbled when copied. StubParse falls back to OCR on those pages automatically." },
    ],
    faq: [
      { q: "Why does copying text from my Gusto PDF give gibberish?", a: "The PDF uses custom font encoding. StubParse detects this and reads the page with OCR instead." },
      { q: "Can I export Gusto stubs for my bookkeeping software?", a: "Export CSV or Excel and import it into your accounting tool, or use JSON with the API." },
      { q: "Is StubParse affiliated with Gusto?", a: "No. StubParse is an independent tool that reads Gusto paystubs." },
    ],
  },
  {
    slug: "paychex",
    title: "Paychex Paystub to Excel, CSV, or JSON",
    h1: "Turn Paychex paystubs into a spreadsheet",
    description: "Extract earnings, withholdings, deductions, and YTD totals from Paychex earnings statements into Excel, CSV, or JSON.",
    intro: "Paychex earnings statements arrange earnings, withholdings, and deductions in parallel columns with year-to-date totals. StubParse untangles the columns so every figure lands in the right row.",
    points: [
      { title: "Two-column layouts, split correctly", body: "When two line items share one printed row, StubParse separates them so amounts don't get paired with the wrong label." },
      { title: "Withholdings with YTD", body: "Federal, state, and local withholdings come through with their year-to-date amounts for annual totals." },
      { title: "Math checked per stub", body: "Earnings are compared with gross, and the net-pay formula is verified, so misreads surface before you export." },
    ],
    faq: [
      { q: "Can StubParse read a photo of a Paychex stub?", a: "Yes. Photos run through OCR in your browser. AI mode handles blurry or angled shots best." },
      { q: "What does the export look like?", a: "Choose one row per stub (vertical) or one row per employee with pay periods as column groups (horizontal)." },
      { q: "Is StubParse a Paychex product?", a: "No. StubParse is independent and not affiliated with Paychex." },
    ],
  },
  {
    slug: "square-payroll",
    title: "Square Payroll Paystub to Excel, CSV, or JSON",
    h1: "Turn Square Payroll paystubs into a spreadsheet",
    description: "Convert Square Payroll pay stubs, including tips and hourly earnings, into Excel, CSV, or JSON with every line and YTD figure.",
    intro: "Square Payroll stubs often mix hourly pay, overtime, and tips, which is common in restaurants and retail. StubParse captures hours and amounts separately and keeps tips as their own earning line.",
    points: [
      { title: "Hours and pay, kept separate", body: "Hourly lines produce both an hours field and a pay field, so you can total hours or dollars independently." },
      { title: "Tips as earnings", body: "Cash and card tips come through as earnings and count toward the gross-pay check." },
      { title: "Built for frequent pay cycles", body: "Weekly and biweekly stubs batch quickly. Drop a month's worth and export one sheet." },
    ],
    faq: [
      { q: "Does StubParse handle tipped employees?", a: "Yes. Tips are extracted as earning lines with their year-to-date amounts." },
      { q: "Can I total hours across many stubs?", a: "Export to Excel with hours fields included and sum the column, or use the vertical layout for one row per stub." },
      { q: "Is StubParse made by Square?", a: "No. StubParse is independent and not affiliated with Block, Inc. or Square." },
    ],
  },
  {
    slug: "quickbooks",
    title: "QuickBooks Payroll Paystub to Excel, CSV, or JSON",
    h1: "Turn QuickBooks Payroll paystubs into a spreadsheet",
    description: "Extract earnings, taxes, deductions, and YTD figures from QuickBooks Payroll pay stubs into Excel, CSV, or JSON.",
    intro: "QuickBooks Payroll stubs follow a compact layout with employee and company details at the top, then earnings, taxes, and deductions. StubParse turns them into rows for reconciliation or record-keeping.",
    points: [
      { title: "Employer details captured", body: "Employer name, address, and identifiers come through as fields, which helps when you work across several clients." },
      { title: "Ready for reconciliation", body: "Export by pay period and compare against your payroll journal without retyping a single figure." },
      { title: "Edit before export", body: "Every value stays editable, and the math checks re-run as you correct anything." },
    ],
    faq: [
      { q: "Can I use this for QuickBooks reconciliation?", a: "Yes. Export a vertical CSV with one row per stub and match it against your payroll reports." },
      { q: "Does it read Intuit-branded stubs from other products?", a: "It reads most pay stub layouts. AI mode handles the unusual ones." },
      { q: "Is StubParse an Intuit product?", a: "No. StubParse is independent and not affiliated with Intuit or QuickBooks." },
    ],
  },
];

export const USE_CASE_PAGES: SeoPage[] = [
  {
    slug: "income-verification",
    title: "Verify Income from Paystubs",
    h1: "Verify income from paystubs in minutes",
    description: "Turn an applicant's paystubs into pay frequency, average pay, and annualized income, with flags for gaps and edited stubs.",
    intro: "Checking income means reading several stubs, working out how often someone is paid, and annualizing it. StubParse does the arithmetic and points out what deserves a second look.",
    points: [
      { title: "Two annualized figures", body: "One from the average pay per period times the detected frequency, and one from the year-to-date pace. When they disagree, you'll see a flag." },
      { title: "Integrity signals", body: "It checks whether year-to-date figures follow from one stub to the next, whether tax rates are plausible, and whether the PDF was made with an editing tool." },
      { title: "A printable report", body: "Save the income report as a PDF for the file, with every stub's figures listed beneath the summary." },
    ],
    faq: [
      { q: "Is the income report a lending decision?", a: "No. It's arithmetic on the stubs provided. Verify with the employer or a third party where your process requires it." },
      { q: "How does it detect pay frequency?", a: "From the length of each pay period, and from the gaps between pay dates when periods aren't printed." },
      { q: "Which plan includes income reports?", a: "Business, which also includes integrity checks and API access." },
    ],
  },
  {
    slug: "bookkeeping",
    title: "Paystubs to Spreadsheets for Bookkeepers",
    h1: "Paystubs to spreadsheets, for bookkeepers",
    description: "Batch-convert client paystubs into reconciled Excel or CSV, grouped by client label, with every line item and YTD figure.",
    intro: "When a client hands you a stack of stubs, retyping them is the slowest part of the job. StubParse reads the whole batch, checks each stub's math, and groups the results by client.",
    points: [
      { title: "Client labels", body: "Tag a batch with the client's name, filter history by label, and export one sheet per client." },
      { title: "Saved history", body: "Come back next month and the data is still there, ready to re-export. The files themselves are never stored." },
      { title: "Every line, not just totals", body: "Earnings codes, each tax, and each deduction come through as separate columns with year-to-date amounts." },
    ],
    faq: [
      { q: "Can I keep client data separate?", a: "Label each batch with the client name and filter history by label. Exports only include the stubs you select." },
      { q: "Do you store my clients' paystubs?", a: "No. Files are read in your browser. Pro saves only the extracted figures, and you can delete them any time." },
      { q: "Which plan do bookkeepers usually need?", a: "Pro covers unlimited documents and history. Business adds income reports and API access." },
    ],
  },
  {
    slug: "rental-applications",
    title: "Check Rental Applicants' Paystubs",
    h1: "Check rental applicants' paystubs",
    description: "Compare an applicant's paystubs, confirm income against rent, and spot inconsistent or edited stubs before approving a lease.",
    intro: "A common rule of thumb is income of about three times the rent. StubParse turns an applicant's stubs into monthly and annual income, so the comparison takes a minute instead of a spreadsheet session.",
    points: [
      { title: "Monthly income at a glance", body: "Annualized income divided by twelve gives you a monthly figure to compare against rent." },
      { title: "Consistency across stubs", body: "Stubs from the same employer should build on each other. If the year-to-date figures don't add up, StubParse flags it." },
      { title: "Private by design", body: "Applicants' files are read in your browser and never uploaded or stored." },
    ],
    faq: [
      { q: "How many stubs should I ask for?", a: "Two to three consecutive stubs give a reliable frequency and average. More helps when pay varies." },
      { q: "Can it tell if a stub is fake?", a: "It flags signals worth checking, like inconsistent YTD figures or editing-software metadata. Confirm with the employer when something looks off." },
      { q: "Do I need Business for this?", a: "Income reports and integrity checks are part of Business. Parsing and exporting work on every plan." },
    ],
  },
  {
    slug: "taxes-and-budgeting",
    title: "Organize Your Own Paystubs for Taxes",
    h1: "Get your own paystubs into a spreadsheet",
    description: "Turn your paystubs into a spreadsheet to track earnings, withholdings, and deductions across the year for taxes or budgeting.",
    intro: "Your paystubs hold the clearest record of what you earned and what was withheld. StubParse turns a year of them into one sheet you can total, chart, or hand to whoever does your taxes.",
    points: [
      { title: "Withholding across the year", body: "See federal and state withholding per period to spot changes after a W-4 update or a raise." },
      { title: "Deductions in one place", body: "Retirement contributions and benefit deductions line up by pay date, so annual totals are one sum away." },
      { title: "Three free documents", body: "Try it on your latest stubs at no cost. No card required." },
    ],
    faq: [
      { q: "Is this a replacement for my W-2?", a: "No. Your W-2 is the official record for filing. Paystubs help you track the year as it goes and check the W-2 when it arrives." },
      { q: "Can I export to Google Sheets?", a: "Export CSV or Excel and open it in Google Sheets." },
      { q: "Is my data private?", a: "Files are read in your browser and never stored. Nothing is saved unless you're on a paid plan with history turned on." },
    ],
  },
];
