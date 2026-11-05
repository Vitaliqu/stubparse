import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { breadcrumbLd, jsonLd, type Crumb } from "@/lib/seo/site";

/** Visible breadcrumb trail plus BreadcrumbList structured data. The last crumb is the current page. */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbLd(crumbs))} />
      <nav aria-label="Breadcrumb" className="mx-auto max-w-[1200px] px-4 pt-8 sm:px-6">
        <ol className="flex flex-wrap items-center gap-1 text-[13px] text-muted">
          {crumbs.map((c, i) => (
            <li key={c.path} className="flex items-center gap-1">
              {i > 0 && <ChevronRight aria-hidden className="size-3.5 text-faint" strokeWidth={2} />}
              {i === crumbs.length - 1
                ? <span aria-current="page" className="text-ink">{c.name}</span>
                : <Link href={c.path} className="hover:text-ink">{c.name}</Link>}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
