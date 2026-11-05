import { ogImage, OG_SIZE } from "@/lib/seo/og";
import { findFormat, FORMAT_PAGES } from "@/lib/seo/formats";

export const size = OG_SIZE;
export const contentType = "image/png";
export const generateStaticParams = () => FORMAT_PAGES.map((p) => ({ format: p.slug }));

export default async function Image({ params }: { params: Promise<{ format: string }> }) {
  return ogImage("Converter", findFormat((await params).format)?.h1 ?? "Paystub converter");
}
