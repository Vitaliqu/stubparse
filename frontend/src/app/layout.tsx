import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://stubparse.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "StubParse — Free Paystub Parser | PDF Payroll Data Extractor",
    template: "%s | StubParse",
  },
  description:
    "Parse any paystub PDF or image instantly. Extract employee name, earnings, taxes, hours, and net pay from Square, Gusto, ADP, Paychex and more. Export to Excel, CSV, or JSON. 100% free — no account required, files are never stored.",
  keywords: [
    "paystub parser",
    "pay stub parser",
    "paystub extractor",
    "payroll PDF extractor",
    "free paystub tool",
    "stubparse",
    "Square paystub",
    "Gusto paystub",
    "ADP paystub",
    "Paychex paystub",
    "PDF to Excel payroll",
    "paycheck parser",
    "earnings statement parser",
    "extract payroll data from PDF",
  ],
  authors: [{ name: "StubParse", url: BASE_URL }],
  creator: "StubParse",
  publisher: "StubParse",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  alternates: { canonical: BASE_URL },
  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "StubParse",
    title: "StubParse — Free Paystub Parser",
    description:
      "Parse Square, Gusto, ADP, Paychex paystubs and more. Export to Excel, CSV, or JSON. 100% free, no account required, files are never stored.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "StubParse — Free Paystub Parser",
    description:
      "Extract payroll data from any paystub PDF or image. Free, no login required, files never stored. Export to Excel, CSV, or JSON.",
    site: "@stubparse",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "StubParse",
  url: BASE_URL,
  description:
    "Free online paystub parser. Upload any paystub PDF or image and extract payroll data to Excel, CSV, or JSON. Supports Square, Gusto, ADP, Paychex, and generic formats.",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: [
    "Parse Square, Gusto, ADP, Paychex, and generic paystub PDFs",
    "OCR support for paystub images (PNG, JPG, WEBP)",
    "Export to Excel (XLSX), CSV, or JSON",
    "Batch processing of multiple files",
    "No account or login required",
    "100% free — no token costs",
    "Files processed securely and never stored",
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
