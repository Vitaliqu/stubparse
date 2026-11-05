import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoLanding } from "@/components/marketing/SeoLanding";
import { findProvider, PROVIDER_PAGES } from "@/lib/seo/providers";
import { PROVIDERS_SECTION } from "@/lib/seo/sections";

export const dynamicParams = false;
export const generateStaticParams = () => PROVIDER_PAGES.map((p) => ({ provider: p.slug }));

export async function generateMetadata({ params }: { params: Promise<{ provider: string }> }): Promise<Metadata> {
  const page = findProvider((await params).provider);
  if (!page) return {};
  return { title: page.title, description: page.description, alternates: { canonical: `/paystub-to-excel/${page.slug}` }, openGraph: { title: page.title, description: page.description } };
}

export default async function ProviderPage({ params }: { params: Promise<{ provider: string }> }) {
  const page = findProvider((await params).provider);
  if (!page) notFound();
  return <SeoLanding page={page} section={PROVIDERS_SECTION} />;
}
