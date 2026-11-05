import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { FREE_DOCUMENTS } from "@/lib/plan";
import type { SeoPage } from "@/lib/seo/pages";
import { faqLd, howToLd, jsonLd } from "@/lib/seo/site";
import { Breadcrumbs } from "@/components/marketing/seo/Breadcrumbs";
import { TOOLS } from "@/lib/seo/calculators";

export interface Section {
  base: string;                       // e.g. "/paystub-to-excel"
  hubName: string;                    // breadcrumb + "more" heading
  siblings: { slug: string; label: string }[];
  disclaimer?: string;
}

const STEPS = [
  { name: "Drop the stubs", text: "PDFs or photos, one or a batch. Files are read in your browser." },
  { name: "Review the numbers", text: "Every field is editable, and three math checks re-run as you type." },
  { name: "Export", text: "Excel with styled headers, a flat CSV, or JSON. Include YTD or leave it out." },
];

/** Shared template for provider, format, and use-case landing pages. */
export function SeoLanding({ page, section }: { page: SeoPage; section: Section }) {
  const others = section.siblings.filter((s) => s.slug !== page.slug);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqLd(page.faq))} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(howToLd(page.h1, STEPS))} />
      <Breadcrumbs crumbs={[{ name: "Home", path: "/" }, { name: section.hubName, path: section.base }, { name: page.h1, path: `${section.base}/${page.slug}` }]} />

      <section className="mx-auto max-w-[1200px] px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
        <div className="max-w-[820px]">
          <h1 className="text-[clamp(2.5rem,6.5vw,4.5rem)] leading-[1] font-semibold tracking-[-0.04em]">{page.h1}</h1>
          <p className="mt-6 max-w-[40rem] text-[clamp(1.0625rem,1.8vw,1.25rem)] leading-[1.5] text-muted">{page.intro}</p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <ButtonLink href="/sign-up" size="lg">Start free</ButtonLink>
            <span className="text-[13px] text-muted">{FREE_DOCUMENTS} documents free · No card required</span>
          </div>
        </div>
      </section>

      <section className="border-t border-line py-20 sm:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-4 sm:px-6 md:grid-cols-3">
          {page.points.map((pt) => (
            <div key={pt.title} className="border-t border-ink pt-6">
              <h2 className="text-[19px] font-semibold tracking-[-0.02em]">{pt.title}</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{pt.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-canvas py-20 sm:py-24">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.05] font-semibold tracking-[-0.03em]">How it works</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.name}>
                <span className="tnum font-mono text-[13px] text-muted">Step {i + 1}</span>
                <h3 className="mt-2 text-[17px] font-semibold tracking-[-0.01em]">{s.name}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.05] font-semibold tracking-[-0.03em]">Questions</h2>
          <dl className="divide-y divide-line border-y border-line">
            {page.faq.map((f) => (
              <div key={f.q} className="py-5">
                <dt className="text-[17px] font-medium tracking-[-0.01em]">{f.q}</dt>
                <dd className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-muted">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <RelatedLinks section={section} others={others} />
    </>
  );
}

/** Internal links: siblings in this section, plus the free tools. */
function RelatedLinks({ section, others }: { section: Section; others: { slug: string; label: string }[] }) {
  return (
    <section className="border-t border-line py-16">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div>
          <h2 className="flex items-baseline justify-between gap-4 text-[15px] font-semibold">
            More in {section.hubName.toLowerCase()}
            <Link href={section.base} className="inline-flex items-center gap-1 text-[13px] font-normal text-muted hover:text-ink">See all <ArrowRight aria-hidden className="size-3.5" strokeWidth={2} /></Link>
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {others.map((r) => (
              <li key={r.slug}>
                <Link href={`${section.base}/${r.slug}`} className="inline-flex rounded-full px-3.5 py-1.5 text-[14px] ring-1 ring-line transition-colors hover:bg-canvas">{r.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-[15px] font-semibold">Free calculators</h2>
          <ul className="mt-4 space-y-2">
            {TOOLS.map((t) => (
              <li key={t.slug}><Link href={`/tools/${t.slug}`} className="text-[14px] text-muted hover:text-ink hover:underline">{t.name}</Link></li>
            ))}
          </ul>
        </div>
      </div>
      {section.disclaimer && <p className="mx-auto mt-10 max-w-[1200px] px-4 text-[12px] text-muted sm:px-6">{section.disclaimer}</p>}
    </section>
  );
}
