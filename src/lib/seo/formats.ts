// Conversion pages: one per input/output format people search for.

import type { SeoPage } from "@/lib/seo/pages";

export const FORMAT_PAGES: SeoPage[] = [
  {
    slug: "pdf-paystub-to-excel",
    title: "Convert a PDF Paystub to Excel",
    h1: "Convert a PDF paystub to Excel",
    description: "Turn paystub PDFs into a clean Excel spreadsheet with every earning, tax, deduction, and YTD figure, checked for errors. Files stay in your browser.",
    intro: "Copying numbers out of a paystub PDF by hand is slow and easy to get wrong. StubParse reads the PDF's text layer in your browser, finds every line item, checks the math, and exports a styled Excel file.",
    points: [
      { title: "Styled, ready-to-use workbook", body: "Excel exports come with formatted headers and frozen panes, one row per stub or one row per employee." },
      { title: "Scanned PDFs too", body: "PDFs without a text layer go through OCR in your browser, or AI mode for difficult scans." },
      { title: "Pick your columns", body: "Choose exactly which fields to include, and whether to add year-to-date amounts." },
    ],
    faq: [
      { q: "Is my PDF uploaded?", a: "No. The PDF is opened in your browser. In AI mode only the extracted text is sent to be read; nothing is stored." },
      { q: "Can I convert many PDFs into one spreadsheet?", a: "Yes. Drop a batch and export them together." },
      { q: "Does it work with password-protected PDFs?", a: "Remove the password first (print to PDF works), then drop the copy in." },
    ],
  },
  {
    slug: "paystub-to-csv",
    title: "Convert Paystubs to CSV",
    h1: "Convert paystubs to CSV",
    description: "Export paystub data to CSV for any spreadsheet, accounting tool, or database, with every line item and YTD amount.",
    intro: "CSV is the format every tool accepts. StubParse turns paystub PDFs and photos into a flat CSV with consistent column names, so imports work the first time.",
    points: [
      { title: "Flat or pivoted", body: "Choose one row per stub for sorting and filtering, or one row per employee with pay periods as columns." },
      { title: "Consistent column names", body: "Different payroll providers label things differently; the export uses the same field names every time." },
      { title: "Imports anywhere", body: "Open in Excel, Google Sheets, or Numbers, or import into your accounting or HR software." },
    ],
    faq: [
      { q: "What delimiter does the CSV use?", a: "Commas, with values quoted where needed, which every spreadsheet app reads." },
      { q: "Are amounts formatted as numbers?", a: "Yes. Amounts are plain numbers without currency symbols or thousands separators, so they sum correctly." },
      { q: "Can I include year-to-date amounts?", a: "Yes. Turn on YTD to add a YTD column next to each current amount." },
    ],
  },
  {
    slug: "paystub-to-json",
    title: "Convert Paystubs to JSON",
    h1: "Convert paystubs to JSON",
    description: "Extract structured JSON from paystub PDFs and images, by hand in the app or programmatically with the StubParse API.",
    intro: "Developers need paystub data as structured objects, not screenshots. StubParse produces JSON grouped by employee and pay period, in the browser or through a REST API.",
    points: [
      { title: "Structured by employee and period", body: "Each stub becomes an object with header fields and an array of line items with current and YTD amounts." },
      { title: "API on the Business plan", body: "Send a PDF or image and get JSON back, with the math checks and integrity signals attached." },
      { title: "Consistent schema", body: "The same keys every time, whatever payroll provider produced the stub." },
    ],
    faq: [
      { q: "Is there an API?", a: "Yes, on the Business plan. See the API reference for request and response examples." },
      { q: "What does the JSON look like?", a: "An array of stubs, each with name, dates, gross and net pay, and a fields array of {section, label, value, ytd}." },
      { q: "Can I use it in a lending workflow?", a: "Yes. Many teams combine the API with the income report for underwriting checks." },
    ],
  },
  {
    slug: "paystub-to-google-sheets",
    title: "Get Paystub Data into Google Sheets",
    h1: "Get paystub data into Google Sheets",
    description: "Turn paystub PDFs and photos into a spreadsheet you can open in Google Sheets, with every line item and year-to-date figure.",
    intro: "Google Sheets is where many people track pay, budgets, and client payroll. StubParse turns your stubs into a file Google Sheets opens directly, with clean columns and the math already checked.",
    points: [
      { title: "Open in one step", body: "Export Excel or CSV, then in Google Sheets choose File → Import and upload it." },
      { title: "Track pay over time", body: "The vertical layout gives one row per pay date, ready for charts and running totals." },
      { title: "Share with your bookkeeper", body: "Everything stays in plain columns, so anyone you share the sheet with can follow it." },
    ],
    faq: [
      { q: "Is there a direct Google Sheets connection?", a: "Not yet. Export Excel or CSV and import it, which takes a few seconds." },
      { q: "Which layout works best in Sheets?", a: "Vertical: one row per stub, with fields as columns." },
      { q: "Can I keep adding stubs to the same sheet?", a: "Yes. Export new stubs with the same fields selected and paste the rows below your existing data." },
    ],
  },
  {
    slug: "paystub-photo-to-excel",
    title: "Convert a Paystub Photo to Excel",
    h1: "Convert a photo of a paystub to Excel",
    description: "Snap a picture of a paper paystub and turn it into a spreadsheet. OCR runs in your browser, with AI mode for blurry or angled photos.",
    intro: "Paper stubs still exist. Photograph one with your phone, drop the image into StubParse, and get the earnings, taxes, and deductions back as rows.",
    points: [
      { title: "OCR in your browser", body: "Basic mode reads photos with Tesseract OCR on your device, so the image is never uploaded." },
      { title: "AI for hard photos", body: "Blurry, angled, or low-light photos read best in AI mode, which sends a downscaled image to be read." },
      { title: "Fix anything before export", body: "Every value is editable, and the math checks show you exactly which number to look at." },
    ],
    faq: [
      { q: "Which image formats work?", a: "PNG, JPG, WEBP, BMP, and TIFF." },
      { q: "How do I get the best results from a photo?", a: "Lay the stub flat, fill the frame, use even light, and avoid shadows across the numbers." },
      { q: "Is the photo stored?", a: "No. It's read in your browser. In AI mode a downscaled copy is sent for reading and discarded." },
    ],
  },
  {
    slug: "scanned-paystub-to-text",
    title: "Extract Text from a Scanned Paystub",
    h1: "Extract data from a scanned paystub",
    description: "Read scanned or image-only paystub PDFs and get structured fields, with OCR in your browser and AI mode for multi-page scans.",
    intro: "Scanned PDFs are just pictures of text, so copy and paste doesn't work. StubParse runs OCR on each page, or sends up to five pages to AI mode, and returns the fields as structured data.",
    points: [
      { title: "Multi-page scans", body: "AI mode reads up to five pages of one stub together and combines them into a single result." },
      { title: "Structured, not just text", body: "You get fields like gross pay, each tax, and each deduction, not a wall of OCR text." },
      { title: "See the raw text too", body: "The extracted text is available under each stub if you want to check what OCR saw." },
    ],
    faq: [
      { q: "Why can't I copy text from my scanned PDF?", a: "A scan stores each page as an image. OCR is needed to turn the image back into text." },
      { q: "How many pages can it read?", a: "Text PDFs are read in full. Image-only scans go to AI mode up to five pages per stub." },
      { q: "What if the scan is low quality?", a: "Try AI mode. If numbers still come out wrong, edit them before export; the math checks point to mismatches." },
    ],
  },
];

export const findFormat = (slug: string) => FORMAT_PAGES.find((p) => p.slug === slug);
