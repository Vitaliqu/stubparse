import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoLanding } from "@/components/marketing/SeoLanding";
import { findUseCase, USE_CASE_PAGES } from "@/lib/seo/use-cases";
import { USE_CASES_SECTION } from "@/lib/seo/sections";

export const dynamicParams = false;
export const generateStaticParams = () => USE_CASE_PAGES.map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = findUseCase((await params).slug);
  if (!page) return {};
  return { title: page.title, description: page.description, alternates: { canonical: `/use-cases/${page.slug}` }, openGraph: { title: page.title, description: page.description } };
}

export default async function UseCasePage({ params }: { params: Promise<{ slug: string }> }) {
  const page = findUseCase((await params).slug);
  if (!page) notFound();
  return <SeoLanding page={page} section={USE_CASES_SECTION} />;
}
