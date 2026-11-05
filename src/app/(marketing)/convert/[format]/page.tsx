import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoLanding } from "@/components/marketing/SeoLanding";
import { findFormat, FORMAT_PAGES } from "@/lib/seo/formats";
import { FORMATS_SECTION } from "@/lib/seo/sections";

export const dynamicParams = false;
export const generateStaticParams = () => FORMAT_PAGES.map((p) => ({ format: p.slug }));

export async function generateMetadata({ params }: { params: Promise<{ format: string }> }): Promise<Metadata> {
  const page = findFormat((await params).format);
  if (!page) return {};
  return { title: page.title, description: page.description, alternates: { canonical: `/convert/${page.slug}` }, openGraph: { title: page.title, description: page.description } };
}

export default async function FormatPage({ params }: { params: Promise<{ format: string }> }) {
  const page = findFormat((await params).format);
  if (!page) notFound();
  return <SeoLanding page={page} section={FORMATS_SECTION} />;
}
