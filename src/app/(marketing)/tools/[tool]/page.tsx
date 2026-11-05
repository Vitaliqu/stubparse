import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/marketing/seo/Breadcrumbs";
import { Calculator } from "@/components/marketing/seo/Calculator";
import { findTool, TOOLS } from "@/lib/seo/calculators";
import { calculatorLd, faqLd, jsonLd } from "@/lib/seo/site";
import { GLOSSARY } from "@/lib/seo/glossary";

export const dynamicParams = false;
export const generateStaticParams = () => TOOLS.map((t) => ({ tool: t.slug }));

export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }): Promise<Metadata> {
  const t = findTool((await params).tool);
  if (!t) return {};
  return { title: t.title, description: t.description, alternates: { canonical: `/tools/${t.slug}` }, openGraph: { title: t.title, description: t.description } };
}

const TERMS_FOR: Record<string, string[]> = {
  "annual-income-calculator": ["pay-frequency", "gross-pay", "annualized-income"],
  "ytd-income-calculator": ["year-to-date", "annualized-income", "pay-date"],
  "hourly-to-salary-calculator": ["overtime-pay", "gross-pay", "pay-period"],
  "rent-affordability-calculator": ["gross-pay", "annualized-income", "pay-frequency"],
  "paystub-checker": ["net-pay", "pre-tax-deduction", "fica"],
};

export default async function ToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const t = findTool((await params).tool);
  if (!t) notFound();
  const path = `/tools/${t.slug}`;
  const terms = (TERMS_FOR[t.slug] ?? []).map((s) => GLOSSARY.find((g) => g.slug === s)).filter(Boolean);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(calculatorLd(t.title, t.description, path))} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqLd(t.faq))} />
      <Breadcrumbs crumbs={[{ name: "Home", path: "/" }, { name: "Free calculators", path: "/tools" }, { name: t.name, path }]} />
      <section className="mx-auto max-w-[1200px] px-4 pt-10 pb-16 sm:px-6 sm:pt-14">
        <h1 className="max-w-[20ch] text-[clamp(2.25rem,5.5vw,3.75rem)] leading-[1.03] font-semibold tracking-[-0.035em]">{t.title.replace(/:.*$/, "")}</h1>
        <p className="mt-5 max-w-[42rem] text-[clamp(1.0625rem,1.6vw,1.25rem)] leading-[1.5] text-muted">{t.intro}</p>
        <div className="mt-10"><Calculator slug={t.slug} /></div>
        <p className="mt-3 text-[12px] text-muted">Runs in your browser. Nothing you type is sent or stored.</p>
      </section>

      <section className="border-t border-line py-16">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="text-[24px] font-semibold tracking-[-0.025em]">How it works</h2>
            <ul className="mt-5 space-y-3 text-[16px] leading-relaxed text-ink-2">{t.how.map((h) => <li key={h}>{h}</li>)}</ul>
            {terms.length > 0 && (
              <p className="mt-6 text-[14px] text-muted">
                Terms: {terms.map((g, i) => <span key={g!.slug}>{i > 0 && ", "}<Link href={`/glossary/${g!.slug}`} className="text-ink underline underline-offset-4">{g!.term}</Link></span>)}
              </p>
            )}
          </div>
          <div>
            <h2 className="text-[24px] font-semibold tracking-[-0.025em]">Questions</h2>
            <dl className="mt-5 divide-y divide-line border-y border-line">
              {t.faq.map((f) => (
                <div key={f.q} className="py-4"><dt className="text-[16px] font-medium">{f.q}</dt><dd className="mt-1.5 text-[15px] leading-relaxed text-muted">{f.a}</dd></div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="border-t border-line py-14">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold">More free calculators</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {TOOLS.filter((x) => x.slug !== t.slug).map((x) => <li key={x.slug}><Link href={`/tools/${x.slug}`} className="inline-flex rounded-full px-3.5 py-1.5 text-[14px] ring-1 ring-line hover:bg-canvas">{x.name}</Link></li>)}
            </ul>
          </div>
          <div className="max-w-sm rounded-[14px] bg-canvas p-5">
            <p className="text-[15px] font-semibold">Have the paystubs?</p>
            <p className="mt-1 text-[14px] text-muted">StubParse reads them for you, checks every line, and exports a spreadsheet. Three documents free.</p>
            <Link href="/sign-up" className="mt-3 inline-block text-[14px] font-medium underline underline-offset-4">Start free</Link>
          </div>
        </div>
      </section>
    </>
  );
}
