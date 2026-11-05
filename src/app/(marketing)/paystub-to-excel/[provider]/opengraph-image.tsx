import { ogImage, OG_SIZE } from "@/lib/seo/og";
import { findProvider, PROVIDER_PAGES } from "@/lib/seo/providers";

export const size = OG_SIZE;
export const contentType = "image/png";
export const generateStaticParams = () => PROVIDER_PAGES.map((p) => ({ provider: p.slug }));

export default async function Image({ params }: { params: Promise<{ provider: string }> }) {
  return ogImage("Paystub converter", findProvider((await params).provider)?.h1 ?? "Paystubs to spreadsheets");
}
