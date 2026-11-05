import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { jsonLd, siteGraphLd } from "@/lib/seo/site";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://stubparse.com";

const DESCRIPTION =
  "Turn paystub PDFs and photos into clean Excel, CSV, or JSON. StubParse reads every line item, checks the math, and reads your files right in your browser. 3 documents free, then $5/month.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "StubParse — Paystubs in. Spreadsheets out.",
    template: "%s — StubParse",
  },
  description: DESCRIPTION,
  keywords: [
    "paystub parser", "pay stub to excel", "paystub extractor", "payroll PDF extractor",
    "paystub OCR", "income verification", "ADP paystub", "Gusto paystub", "Paychex paystub",
    "Square Payroll paystub", "earnings statement parser", "extract payroll data from PDF",
  ],
  authors: [{ name: "StubParse", url: BASE_URL }],
  creator: "StubParse",
  publisher: "StubParse",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  // Search Console / Bing Webmaster verification (set the codes in the environment)
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
  },
  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "StubParse",
    title: "StubParse — Paystubs in. Spreadsheets out.",
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "StubParse — Paystubs in. Spreadsheets out.",
    description: DESCRIPTION,
    site: "@stubparse",
  },
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(siteGraphLd(DESCRIPTION))} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
