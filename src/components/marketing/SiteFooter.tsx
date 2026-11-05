import Link from "next/link";
import { Wordmark } from "@/components/brand";

const COLUMNS = [
  { title: "Product", links: [{ href: "/#how", label: "How it works" }, { href: "/pricing", label: "Pricing" }, { href: "/docs/api", label: "API" }, { href: "/app", label: "Workspace" }] },
  { title: "Payroll providers", links: [
    { href: "/paystub-to-excel/adp", label: "ADP" }, { href: "/paystub-to-excel/gusto", label: "Gusto" },
    { href: "/paystub-to-excel/paychex", label: "Paychex" }, { href: "/paystub-to-excel/paylocity", label: "Paylocity" },
    { href: "/paystub-to-excel/workday", label: "Workday" }, { href: "/paystub-to-excel", label: "All providers" },
  ] },
  { title: "Free tools", links: [
    { href: "/tools/annual-income-calculator", label: "Annual income calculator" }, { href: "/tools/rent-affordability-calculator", label: "Rent affordability" },
    { href: "/tools/paystub-checker", label: "Paystub checker" }, { href: "/tools", label: "All calculators" },
    { href: "/glossary", label: "Paystub glossary" },
  ] },
  { title: "Use cases", links: [
    { href: "/use-cases/income-verification", label: "Income verification" }, { href: "/use-cases/bookkeeping", label: "Bookkeeping" },
    { href: "/use-cases/rental-applications", label: "Rental applications" }, { href: "/convert", label: "Converters" },
    { href: "/use-cases", label: "All use cases" },
  ] },
  { title: "Company", links: [{ href: "/privacy", label: "Privacy" }, { href: "/terms", label: "Terms" }, { href: "mailto:support@stubparse.com", label: "Contact" }] },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-canvas">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-6 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(5,auto)] lg:gap-12">
        <div className="max-w-xs">
          <Wordmark />
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            Reads stubs from Square Payroll, Gusto, ADP, Paychex, QuickBooks Payroll, and most other formats.
          </p>
        </div>
        {COLUMNS.map((c) => (
          <div key={c.title}>
            <h2 className="text-[13px] font-semibold">{c.title}</h2>
            <ul className="mt-3 space-y-2">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[13px] text-muted transition-colors hover:text-ink">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <p className="border-t border-line py-6 text-[12px] text-muted">
          © {new Date().getFullYear()} StubParse. Not affiliated with any payroll provider named on this site.
        </p>
      </div>
    </footer>
  );
}
