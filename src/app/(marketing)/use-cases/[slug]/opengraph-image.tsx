import { ogImage, OG_SIZE } from "@/lib/seo/og";
import { findUseCase, USE_CASE_PAGES } from "@/lib/seo/use-cases";

export const size = OG_SIZE;
export const contentType = "image/png";
export const generateStaticParams = () => USE_CASE_PAGES.map((p) => ({ slug: p.slug }));

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  return ogImage("Use case", findUseCase((await params).slug)?.h1 ?? "Paystubs to spreadsheets");
}
