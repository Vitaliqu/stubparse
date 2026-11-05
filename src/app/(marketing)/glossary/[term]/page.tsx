import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GlossaryTermPage } from "@/components/marketing/seo/GlossaryTermPage";
import { findTerm, GLOSSARY } from "@/lib/seo/glossary";

export const dynamicParams = false;
export const generateStaticParams = () => GLOSSARY.map((t) => ({ term: t.slug }));

export async function generateMetadata({ params }: { params: Promise<{ term: string }> }): Promise<Metadata> {
  const t = findTerm((await params).term);
  if (!t) return {};
  const title = `What Is ${t.term.replace(/ \(.+\)$/, "")}? Paystub Glossary`;
  return { title, description: t.short, alternates: { canonical: `/glossary/${t.slug}` }, openGraph: { title, description: t.short } };
}

export default async function TermPage({ params }: { params: Promise<{ term: string }> }) {
  const t = findTerm((await params).term);
  if (!t) notFound();
  return <GlossaryTermPage t={t} />;
}
