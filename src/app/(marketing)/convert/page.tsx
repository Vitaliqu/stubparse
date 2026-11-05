import type { Metadata } from "next";
import { Hub } from "@/components/marketing/seo/Hub";
import { FORMAT_PAGES } from "@/lib/seo/formats";
import { FORMAT_LABELS } from "@/lib/seo/sections";

export const metadata: Metadata = {
  title: "Paystub Converters: Excel, CSV, JSON, Google Sheets",
  description: "Convert paystub PDFs, photos, and scans into Excel, CSV, JSON, or Google Sheets, with every line item extracted and checked.",
  alternates: { canonical: "/convert" },
};

export default function ConvertHub() {
  return (
    <Hub
      path="/convert"
      title="Paystub converters"
      intro="Whatever format your paystub is in, and wherever the numbers need to go."
      groups={[{ items: FORMAT_PAGES.map((p) => ({ path: `/convert/${p.slug}`, title: FORMAT_LABELS[p.slug] ?? p.h1, blurb: p.description.split(".")[0] + "." })) }]}
    />
  );
}
