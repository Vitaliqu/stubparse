import { ogImage, OG_SIZE } from "@/lib/seo/og";
import { findTerm, GLOSSARY } from "@/lib/seo/glossary";

export const size = OG_SIZE;
export const contentType = "image/png";
export const generateStaticParams = () => GLOSSARY.map((t) => ({ term: t.slug }));

export default async function Image({ params }: { params: Promise<{ term: string }> }) {
  const t = findTerm((await params).term);
  return ogImage("Paystub glossary", t ? `What is ${t.term.replace(/ \(.+\)$/, "")}?` : "Paystub glossary");
}
