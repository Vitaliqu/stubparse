import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Breadcrumbs } from "@/components/marketing/seo/Breadcrumbs";
import { itemListLd, jsonLd } from "@/lib/seo/site";
import { ButtonLink } from "@/components/ui";

interface HubItem { path: string; title: string; blurb: string }

/** Section hub: an indexable directory of every page in the section (ItemList + breadcrumbs). */
export function Hub({ path, title, intro, groups, footnote }: {
  path: string;
  title: string;
  intro: string;
  groups: { heading?: string; items: HubItem[] }[];
  footnote?: string;
}) {
  const all = groups.flatMap((g) => g.items);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(itemListLd(title, all.map((i) => ({ name: i.title, path: i.path }))))} />
      <Breadcrumbs crumbs={[{ name: "Home", path: "/" }, { name: title, path }]} />
      <section className="mx-auto max-w-[1200px] px-4 pt-10 pb-24 sm:px-6 sm:pt-14">
        <h1 className="max-w-[18ch] text-[clamp(2.5rem,6vw,4rem)] leading-[1.02] font-semibold tracking-[-0.04em]">{title}</h1>
        <p className="mt-5 max-w-[42rem] text-[clamp(1.0625rem,1.6vw,1.25rem)] leading-[1.5] text-muted">{intro}</p>

        {groups.map((g, gi) => (
          <div key={gi} className="mt-14">
            {g.heading && <h2 className="border-b border-ink pb-3 text-[15px] font-semibold">{g.heading}</h2>}
            <ul className={`grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3 ${g.heading ? "" : "border-t border-ink"}`}>
              {g.items.map((it) => (
                <li key={it.path} className="border-b border-line">
                  <Link href={it.path} className="group flex h-full flex-col py-5">
                    <span className="flex items-start justify-between gap-3 text-[17px] font-semibold tracking-[-0.01em]">
                      {it.title}
                      <ArrowUpRight aria-hidden className="mt-1 size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink" strokeWidth={2} />
                    </span>
                    <span className="mt-1.5 text-[14px] leading-relaxed text-muted">{it.blurb}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {footnote && <p className="mt-10 max-w-[70ch] text-[12px] text-muted">{footnote}</p>}

        <div className="mt-20 flex flex-col items-start gap-4 rounded-[22px] bg-canvas p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div>
            <p className="text-[24px] font-semibold tracking-[-0.025em]">Turn your paystubs into a spreadsheet.</p>
            <p className="mt-1 text-[15px] text-muted">Three documents free. No card required.</p>
          </div>
          <ButtonLink href="/sign-up" size="lg">Start free</ButtonLink>
        </div>
      </section>
    </>
  );
}
