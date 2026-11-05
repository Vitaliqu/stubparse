import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/seo/Breadcrumbs";
import { ButtonLink } from "@/components/ui";
import { findTerm, type GlossaryTerm } from "@/lib/seo/glossary";
import { definedTermLd, jsonLd } from "@/lib/seo/site";
import { TOOLS } from "@/lib/seo/calculators";

/** Which calculator is most useful next to a term. */
const TOOL_FOR: Record<string, string> = {
  "gross-pay": "annual-income-calculator", "net-pay": "paystub-checker", "year-to-date": "ytd-income-calculator",
  "pay-frequency": "annual-income-calculator", "annualized-income": "ytd-income-calculator", "overtime-pay": "hourly-to-salary-calculator",
  "pay-period": "annual-income-calculator",
};

export function GlossaryTermPage({ t }: { t: GlossaryTerm }) {
  const path = `/glossary/${t.slug}`;
  const tool = TOOLS.find((x) => x.slug === (TOOL_FOR[t.slug] ?? "paystub-checker"))!;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(definedTermLd(t.term, t.short, path))} />
      <Breadcrumbs crumbs={[{ name: "Home", path: "/" }, { name: "Glossary", path: "/glossary" }, { name: t.term, path }]} />
      <article className="mx-auto grid max-w-[1200px] gap-14 px-4 pt-10 pb-24 sm:px-6 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="max-w-[68ch]">
          <h1 className="text-[clamp(2.25rem,5.5vw,3.5rem)] leading-[1.03] font-semibold tracking-[-0.035em]">What is {t.term.replace(/ \(.+\)$/, "")}?</h1>
          <p className="mt-6 text-[clamp(1.125rem,2vw,1.3rem)] leading-[1.5] text-ink-2">{t.short}</p>
          <div className="mt-8 space-y-5 text-[17px] leading-[1.7] text-ink-2">
            {t.body.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <h2 className="mt-12 text-[24px] font-semibold tracking-[-0.02em]">Where to find it on your paystub</h2>
          <p className="mt-3 text-[17px] leading-[1.7] text-ink-2">{t.onStub}</p>
          {t.example && (
            <>
              <h2 className="mt-12 text-[24px] font-semibold tracking-[-0.02em]">Example</h2>
              <p className="tnum mt-3 rounded-[14px] bg-canvas p-5 font-mono text-[15px] leading-relaxed">{t.example}</p>
            </>
          )}
          <div className="mt-14 flex flex-col items-start gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[15px] text-muted">StubParse reads every line of a paystub, including this one, and checks the math adds up.</p>
            <ButtonLink href="/sign-up">Try it free</ButtonLink>
          </div>
        </div>
        <aside className="space-y-10 lg:pt-16">
          <div>
            <h2 className="text-[13px] font-semibold">Related terms</h2>
            <ul className="mt-3 space-y-2">
              {t.related.map((r) => { const rt = findTerm(r); return rt ? <li key={r}><Link href={`/glossary/${r}`} className="text-[15px] text-muted hover:text-ink hover:underline">{rt.term}</Link></li> : null; })}
            </ul>
          </div>
          <div>
            <h2 className="text-[13px] font-semibold">Free calculator</h2>
            <Link href={`/tools/${tool.slug}`} className="mt-3 block rounded-[14px] p-4 ring-1 ring-line transition-colors hover:bg-canvas">
              <span className="block text-[15px] font-semibold">{tool.name}</span>
              <span className="mt-1 block text-[13px] text-muted">{tool.description.split(".")[0]}.</span>
            </Link>
          </div>
          <Link href="/glossary" className="block text-[14px] font-medium hover:underline">All paystub terms →</Link>
        </aside>
      </article>
    </>
  );
}
