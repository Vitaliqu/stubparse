import { FileText, ScanText, Sparkles, Table2, Laptop, Server, ShieldCheck, LineChart, Braces } from "lucide-react";
import { Hero } from "@/components/marketing/Hero";
import { ReconcileDemo } from "@/components/marketing/ReconcileDemo";
import { ExportDemo } from "@/components/marketing/ExportDemo";
import { Pricing } from "@/components/marketing/Pricing";
import { ButtonLink } from "@/components/ui";
import type { Metadata } from "next";
import { FREE_DOCUMENTS, TIERS } from "@/lib/plan";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Landing() {
  return (
    <>
      <Hero />
      <EveryLine />
      <Checks />
      <Privacy />
      <Exports />
      <Decisions />
      <Audiences />
      <section id="pricing" className="bg-canvas py-28 sm:py-36">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <SectionHead title="Start free. Upgrade when it pays." body={`Every account starts with ${FREE_DOCUMENTS} documents and every parsing feature. Pro is $${TIERS.pro.monthly} a month for unlimited stubs and history; Business adds the tools for decisions.`} />
          <div className="mt-14"><Pricing /></div>
        </div>
      </section>
      <Faq />
      <Closing />
    </>
  );
}

function SectionHead({ title, body, align = "center", tone = "light" }: { title: string; body: string; align?: "center" | "left"; tone?: "light" | "dark" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-[720px] text-center" : "max-w-[560px]"}>
      <h2 className={`text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.02] font-semibold tracking-[-0.035em] ${tone === "dark" ? "text-white" : "text-ink"}`}>{title}</h2>
      <p className={`mt-5 text-[clamp(1.0625rem,1.6vw,1.25rem)] leading-[1.5] tracking-[-0.01em] ${tone === "dark" ? "text-white/65" : "text-muted"}`}>{body}</p>
    </div>
  );
}

// ── Every line ───────────────────────────────────────────────────────────────

const EXTRACTED = [
  { group: "Employee & period", items: ["Employee name and ID", "Employer, address, EIN", "Pay period start and end", "Pay date and payout method"] },
  { group: "Earnings", items: ["Regular, overtime, holiday", "Hours and rates", "Bonuses, tips, commissions", "Current and year-to-date"] },
  { group: "Taxes", items: ["Federal and state income tax", "Social Security, Medicare", "SDI, local, CPP, EI", "Current and year-to-date"] },
  { group: "Deductions & totals", items: ["401(k), health, dental, vision", "FSA, HSA, union dues", "Gross and net pay", "Totals with YTD"] },
];

function EveryLine() {
  return (
    <section id="how" className="border-t border-line py-28 sm:py-36">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <SectionHead
          title="Every line. Not just the totals."
          body="StubParse reads the whole stub: each earning, tax, and deduction, with its year-to-date figure. Then it lays them out as rows you can sort, sum, and send."
        />

        <dl className="mt-16 grid gap-x-10 gap-y-10 border-t border-ink pt-10 sm:grid-cols-2 lg:grid-cols-4">
          {EXTRACTED.map((g) => (
            <div key={g.group}>
              <dt className="text-[15px] font-semibold tracking-[-0.01em]">{g.group}</dt>
              {g.items.map((it) => (
                <dd key={it} className="mt-2 text-[15px] text-muted">{it}</dd>
              ))}
            </div>
          ))}
        </dl>

        <div className="mt-20 grid gap-px overflow-hidden rounded-[22px] bg-line ring-1 ring-line md:grid-cols-2">
          <Mode
            icon={<ScanText aria-hidden className="size-5" strokeWidth={1.75} />}
            name="Basic"
            body="Rules built for common payroll layouts, running entirely in your browser. Instant, and nothing is sent anywhere."
          />
          <Mode
            icon={<Sparkles aria-hidden className="size-5" strokeWidth={1.75} />}
            name="AI"
            body="For unusual layouts and scans. Your browser extracts the text first, then Claude by Anthropic reads it and fills every field."
          />
        </div>
      </div>
    </section>
  );
}

function Mode({ icon, name, body }: { icon: React.ReactNode; name: string; body: string }) {
  return (
    <div className="bg-paper p-8 sm:p-10">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-[10px] bg-canvas text-ink">{icon}</span>
        <h3 className="text-[19px] font-semibold tracking-[-0.02em]">{name} mode</h3>
      </div>
      <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}

// ── Checks ───────────────────────────────────────────────────────────────────

function Checks() {
  return (
    <section className="bg-canvas py-28 sm:py-36">
      <div className="mx-auto grid max-w-[1200px] items-start gap-14 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-20">
        <div className="lg:sticky lg:top-32">
          <SectionHead
            align="left"
            title="It checks the math before you do."
            body="Every stub gets three checks: earnings against gross, the net-pay formula, and year-to-date against current. Fix a number and the checks update as you type."
          />
          <p className="mt-8 flex items-center gap-2.5 text-[15px] font-medium">
            <span className="rounded-md bg-ink px-1.5 py-0.5 whitespace-nowrap text-white">Try it.</span> Change the tips or the net pay on the sample.
          </p>
        </div>
        <ReconcileDemo />
      </div>
    </section>
  );
}

// ── Privacy ──────────────────────────────────────────────────────────────────

function Privacy() {
  return (
    <section id="privacy" className="bg-ink py-28 text-white sm:py-36">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <SectionHead
          tone="dark"
          title="Your files are read on your device."
          body="PDF reading and OCR run inside your browser, so the file itself is never uploaded. Basic mode sends nothing at all. AI mode sends the extracted text, or downscaled page images when a scan has no text. Nothing is stored."
        />

        <div className="mt-16 grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.6fr)_auto_minmax(0,1fr)]">
          <Zone icon={<Laptop aria-hidden className="size-4" strokeWidth={1.75} />} title="Your browser" note="The file is opened here and never uploaded.">
            <ol className="grid divide-y divide-white/15 border-y border-white/15 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <Step icon={<FileText aria-hidden className="size-4" strokeWidth={1.75} />} name="Read" body="PDF.js pulls the text layer from PDFs." />
              <Step icon={<ScanText aria-hidden className="size-4" strokeWidth={1.75} />} name="Recognize" body="Tesseract OCR reads scans and photos." />
              <Step icon={<Table2 aria-hidden className="size-4" strokeWidth={1.75} />} name="Structure" body="Fields are parsed, checked, and exported." />
            </ol>
          </Zone>

          <div className="flex items-center justify-center py-2 lg:flex-col lg:px-2">
            <span className="h-px w-10 bg-white/25 lg:h-16 lg:w-px" aria-hidden />
            <span className="mx-3 rounded-full bg-white px-3 py-1.5 text-center font-mono text-[12px] whitespace-nowrap text-ink lg:mx-0 lg:my-3">text only · AI mode</span>
            <span className="h-px w-10 bg-white/25 lg:h-16 lg:w-px" aria-hidden />
          </div>

          <Zone icon={<Server aria-hidden className="size-4" strokeWidth={1.75} />} title="StubParse server" note="Holds nothing after it replies.">
            <ul className="space-y-3 text-[14px] leading-relaxed text-white/70">
              <li>Receives the extracted text and returns structured fields.</li>
              <li>A scan with no readable text sends downscaled page images instead (up to five pages).</li>
              <li>Your account stores your plan and a document count. Never the documents.</li>
            </ul>
          </Zone>
        </div>
      </div>
    </section>
  );
}

function Zone({ icon, title, note, children }: { icon: React.ReactNode; title: string; note: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[22px] p-6 ring-1 ring-white/15 sm:p-8">
      <div className="flex items-center gap-2 text-[14px] font-semibold">{icon}{title}</div>
      <p className="mt-1 text-[13px] text-white/55">{note}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Step({ icon, name, body }: { icon: React.ReactNode; name: string; body: string }) {
  return (
    <li className="py-4 sm:px-5 sm:first:pl-0 sm:last:pr-0">
      <span className="text-white/70">{icon}</span>
      <p className="mt-3 text-[14px] font-semibold">{name}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-white/60">{body}</p>
    </li>
  );
}

// ── Exports ──────────────────────────────────────────────────────────────────

function Exports() {
  return (
    <section className="py-28 sm:py-36">
      <div className="mx-auto max-w-[1000px] px-4 sm:px-6">
        <SectionHead
          title="Two layouts. Three formats."
          body="Export Excel with styled headers and frozen panes, a flat CSV for any tool, or JSON for your own code. Choose which fields to include, and whether to include YTD."
        />
        <div className="mt-14"><ExportDemo /></div>
      </div>
    </section>
  );
}

// ── Decisions (Business) ─────────────────────────────────────────────────────

const REPORT_ROWS = [
  ["2026-09-20", "2,284.10", "1,590.21"],
  ["2026-10-05", "2,301.75", "1,602.49"],
  ["2026-10-20", "2,319.40", "1,614.78"],
];

function Decisions() {
  return (
    <section className="bg-canvas py-28 sm:py-36">
      <div className="mx-auto grid max-w-[1200px] items-start gap-14 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-20">
        <figure aria-label="Sample income report" className="order-2 overflow-hidden rounded-[22px] bg-paper ring-1 ring-line lg:order-1">
          <div className="flex items-baseline justify-between gap-3 border-b border-line px-6 py-4">
            <div>
              <p className="text-[17px] font-semibold tracking-[-0.02em]">Maya Okafor</p>
              <p className="text-[13px] text-muted">Harbor &amp; Pine Bakery LLC · 3 stubs</p>
            </div>
            <p className="text-[13px] font-medium">Twice a month</p>
          </div>
          <dl className="tnum grid grid-cols-2 border-b border-line">
            <div className="px-6 py-4"><dt className="text-[12px] text-muted">Annualized, from pay periods</dt><dd className="mt-1 font-mono text-[24px] font-semibold">$55,242.00</dd></div>
            <div className="border-l border-line px-6 py-4"><dt className="text-[12px] text-muted">Annualized, YTD pace</dt><dd className="mt-1 font-mono text-[24px]">$56,607.64</dd></div>
          </dl>
          <table className="tnum w-full text-[13px]">
            <thead><tr className="border-b border-line text-left text-[12px] text-muted"><th className="px-6 py-2 font-medium">Pay date</th><th className="py-2 pr-4 text-right font-medium">Gross</th><th className="py-2 pr-6 text-right font-medium">Net</th></tr></thead>
            <tbody className="divide-y divide-line">
              {REPORT_ROWS.map(([d, g, n]) => <tr key={d}><td className="px-6 py-2 font-mono">{d}</td><td className="py-2 pr-4 text-right font-mono">{g}</td><td className="py-2 pr-6 text-right font-mono font-semibold">{n}</td></tr>)}
            </tbody>
          </table>
          <div className="flex items-center gap-2 border-t border-line px-6 py-3.5 text-[13px] font-medium">
            <ShieldCheck aria-hidden className="size-4 text-ok" strokeWidth={2} /> Year-to-date figures follow from stub to stub
          </div>
          <figcaption className="border-t border-line px-6 py-2.5 text-[11px] text-muted">Sample report with fictional data.</figcaption>
        </figure>

        <div className="order-1 lg:order-2 lg:sticky lg:top-32">
          <SectionHead
            align="left"
            title="From a pile of stubs to a decision."
            body="Business turns an applicant's or client's stubs into pay frequency, average pay, and annualized income two ways, then checks whether the stubs hold together."
          />
          <ul className="mt-10 space-y-6">
            {[
              [<LineChart key="i" aria-hidden className="size-5" strokeWidth={1.75} />, "Income reports", "Detects how often someone is paid, averages each period, annualizes from both the periods and the year-to-date pace, and flags gaps or drops. Print it or save it as a PDF."],
              [<ShieldCheck key="i" aria-hidden className="size-5" strokeWidth={1.75} />, "Integrity checks", "Flags year-to-date figures that don't add up between stubs, implausible tax rates, mixed fonts in the amounts, and PDFs saved by editing tools."],
              [<Braces key="i" aria-hidden className="size-5" strokeWidth={1.75} />, "REST API", "Send a PDF or image and get structured JSON back, with the checks attached."],
            ].map(([icon, t, b]) => (
              <li key={t as string} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-paper ring-1 ring-line">{icon}</span>
                <span><span className="block text-[17px] font-semibold tracking-[-0.01em]">{t}</span><span className="mt-1 block text-[15px] leading-relaxed text-muted">{b}</span></span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ── Audiences ────────────────────────────────────────────────────────────────

const AUDIENCES = [
  { who: "Bookkeepers & payroll", what: "Turn a client's pay cycle into one reconciled sheet, instead of retyping every stub." },
  { who: "Lenders & landlords", what: "Line up an applicant's stubs by period and compare gross, net, and YTD at a glance." },
  { who: "Everyone else", what: "Get your own paystubs into a spreadsheet for taxes, budgeting, or an application." },
];

function Audiences() {
  return (
    <section className="border-t border-line py-28 sm:py-32">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <h2 className="max-w-[16ch] text-[clamp(2rem,4vw,3rem)] leading-[1.05] font-semibold tracking-[-0.03em]">
          Built for whoever handles the paystubs.
        </h2>
        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {AUDIENCES.map((a) => (
            <div key={a.who} className="border-t border-ink pt-6">
              <h3 className="text-[19px] font-semibold tracking-[-0.02em]">{a.who}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{a.what}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ = [
  { q: "What counts as a document?", a: "One paystub file you parse, in either mode. Parsing a batch of five files uses five documents. Re-exporting results you've already parsed is free." },
  { q: "Which payroll providers does it read?", a: "It's tuned for stubs from Square Payroll, Gusto, ADP, Paychex, and QuickBooks Payroll, and it handles most other layouts. AI mode copes best with unusual formats and scans." },
  { q: "Do you store my paystubs?", a: "Never the files. They're opened in your browser. In AI mode the extracted text is sent for reading (or downscaled page images when a scan has no readable text), and nothing is kept after the response. On paid plans, the extracted figures are saved to your history so you can come back to them; you can turn that off or delete them any time." },
  { q: "Can I edit what was extracted?", a: "Yes. Every field is editable before you export, and the math checks re-run as you type." },
  { q: "What happens after my three free documents?", a: `Results already in your workspace can still be edited and exported. To parse more, upgrade to Pro for $${TIERS.pro.monthly} a month, or $${TIERS.pro.yearly} a year. It's unlimited for normal use, and you can cancel any time.` },
  { q: "What does Business add?", a: `Five team seats with one shared history, income reports that work out pay frequency and annualized income across an employee's stubs, integrity checks that flag edited or inconsistent stubs, and a REST API. It's $${TIERS.business.monthly} a month or $${TIERS.business.yearly} a year.` },
  { q: "How do I cancel?", a: "From your account page, open Manage billing and cancel. Pro stays active until the end of the period you paid for." },
];

function Faq() {
  return (
    <section className="py-28 sm:py-36">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <h2 className="text-[clamp(2rem,4vw,3rem)] leading-[1.05] font-semibold tracking-[-0.03em]">Questions, answered.</h2>
        <div className="divide-y divide-line border-y border-line">
          {FAQ.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[17px] font-medium tracking-[-0.01em] [&::-webkit-details-marker]:hidden">
                {f.q}
                <span aria-hidden className="relative size-3.5 shrink-0 text-muted">
                  <span className="absolute inset-x-0 top-1/2 h-[1.5px] -translate-y-1/2 rounded bg-current" />
                  <span className="absolute inset-y-0 left-1/2 w-[1.5px] -translate-x-1/2 rounded bg-current transition-transform duration-200 group-open:scale-y-0" />
                </span>
              </summary>
              <p className="max-w-[62ch] pb-6 text-[15px] leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Closing ──────────────────────────────────────────────────────────────────

function Closing() {
  return (
    <section className="border-t border-line py-28 sm:py-36">
      <div className="mx-auto max-w-[720px] px-4 text-center sm:px-6">
        <h2 className="text-[clamp(2.5rem,6vw,4.5rem)] leading-[1] font-semibold tracking-[-0.04em]">
          Your first three<br />are on us.
        </h2>
        <p className="mx-auto mt-6 max-w-[30rem] text-[19px] leading-[1.5] text-muted">
          Create an account, drop a paystub, and have a spreadsheet in under a minute.
        </p>
        <div className="mt-9 flex justify-center">
          <ButtonLink href="/sign-up" size="lg" className="min-w-[200px]">Start free</ButtonLink>
        </div>
      </div>
    </section>
  );
}
