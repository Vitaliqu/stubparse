"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Printer, Download, ArrowLeft, Lock, ShieldAlert, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { canUse } from "@/lib/plan";
import { readReport } from "@/lib/report-stash";
import { buildIncomeReport, FREQUENCY_LABEL, PERIODS_PER_YEAR, type IncomeSummary } from "@/lib/income";
import { money } from "@/lib/reconcile";
import { Button, ButtonLink } from "@/components/ui";
import type { PaystubData } from "@/types/paystub";

const fmt = (n: number | null) => (n === null ? "—" : money(n));

export default function ReportPage() {
  const { account } = useAuth();
  // AppShell renders children only in the browser (after auth), so sessionStorage is available here.
  const [stubs] = useState<PaystubData[] | null>(() => (typeof window === "undefined" ? null : readReport()));
  const report = useMemo(() => (stubs ? buildIncomeReport(stubs) : []), [stubs]);
  const allowed = canUse(account?.plan, "income-report");
  const generated = useMemo(() => new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), []);

  if (account && !allowed) {
    return (
      <div className="mx-auto max-w-[640px] px-4 py-16 text-center sm:px-6">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-paper ring-1 ring-line"><Lock aria-hidden className="size-5" strokeWidth={1.75} /></span>
        <h1 className="mt-5 text-[32px] font-semibold tracking-[-0.03em]">Income reports are part of Business</h1>
        <p className="mx-auto mt-3 max-w-[44ch] text-[15px] leading-relaxed text-muted">
          Turn a set of stubs into pay frequency, average pay, annualized income, and flags for gaps or inconsistent year-to-date figures.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <ButtonLink href="/pricing">See Business</ButtonLink>
          <ButtonLink href="/app" variant="secondary">Back to workspace</ButtonLink>
        </div>
      </div>
    );
  }

  const downloadCsv = () => {
    const head = ["Employee", "Employer", "Stubs", "First pay date", "Last pay date", "Frequency", "Avg gross", "Avg net", "Annualized (periods)", "Annualized (YTD pace)", "Missing periods", "Flags"];
    const lines = report.map((r) => [
      r.employee, r.employer ?? "", r.stubCount, r.firstPayDate ?? "", r.lastPayDate ?? "", FREQUENCY_LABEL[r.frequency],
      r.avgGross?.toFixed(2) ?? "", r.avgNet?.toFixed(2) ?? "", r.annualizedFromAverage?.toFixed(2) ?? "", r.annualizedFromYtd?.toFixed(2) ?? "",
      r.missingPeriods, r.flags.map((f) => f.title).join("; "),
    ]);
    const csv = [head, ...lines].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "income-report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-8 sm:px-6 sm:py-10 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/app" className="inline-flex items-center gap-1.5 text-[14px] text-muted hover:text-ink"><ArrowLeft aria-hidden className="size-4" strokeWidth={2} />Workspace</Link>
        {report.length > 0 && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={downloadCsv}><Download aria-hidden className="size-4" strokeWidth={2} />CSV</Button>
            <Button onClick={() => window.print()}><Printer aria-hidden className="size-4" strokeWidth={2} />Print or save PDF</Button>
          </div>
        )}
      </div>

      <header className="mt-6 print:mt-0">
        <h1 className="text-[32px] font-semibold tracking-[-0.03em]">Income report</h1>
        <p className="mt-1 text-[14px] text-muted">
          {stubs === null ? "Loading…" : `${stubs.length} stub${stubs.length === 1 ? "" : "s"} · ${report.length} employee${report.length === 1 ? "" : "s"} · Generated ${generated} with StubParse`}
        </p>
      </header>

      {stubs !== null && stubs.length === 0 && (
        <div className="mt-8 rounded-[14px] bg-paper px-6 py-14 text-center ring-1 ring-line">
          <p className="text-[17px] font-semibold tracking-[-0.02em]">No stubs selected</p>
          <p className="mt-1 text-[14px] text-muted">Parse stubs in the workspace, or select them in History, then choose Income report.</p>
          <div className="mt-6 flex justify-center gap-3">
            <ButtonLink href="/app">Workspace</ButtonLink>
            <ButtonLink href="/app/history" variant="secondary">History</ButtonLink>
          </div>
        </div>
      )}

      <div className="mt-8 space-y-6">
        {report.map((r) => <EmployeeReport key={r.employee} r={r} />)}
      </div>

      {report.length > 0 && (
        <p className="mt-8 text-[12px] leading-relaxed text-muted">
          Figures are calculated from the stubs provided and the values as reviewed in StubParse. Annualized income assumes the detected pay frequency continues; the year-to-date pace uses the latest stub&apos;s YTD gross. This report is not a credit or lending decision. Verify income with the employer or a third-party source where required.
        </p>
      )}
    </div>
  );
}

function EmployeeReport({ r }: { r: IncomeSummary }) {
  const serious = r.flags.filter((f) => f.severity !== "info");
  return (
    <article className="overflow-hidden rounded-[14px] bg-paper ring-1 ring-line print:break-inside-avoid print:rounded-none print:ring-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-[19px] font-semibold tracking-[-0.02em]">{r.employee}</h2>
          <p className="text-[13px] text-muted">{[r.employer, `${r.stubCount} stub${r.stubCount === 1 ? "" : "s"}`, r.firstPayDate && r.lastPayDate ? `${r.firstPayDate} to ${r.lastPayDate}` : null].filter(Boolean).join(" · ")}</p>
        </div>
        <p className="text-[13px] font-medium">{FREQUENCY_LABEL[r.frequency]}</p>
      </div>

      <dl className="tnum grid grid-cols-2 border-b border-line sm:grid-cols-4">
        <Figure term="Annualized, from pay periods" value={fmt(r.annualizedFromAverage)} note={r.frequency !== "unknown" ? `avg × ${PERIODS_PER_YEAR[r.frequency]}` : "frequency unknown"} strong />
        <Figure term="Annualized, YTD pace" value={fmt(r.annualizedFromYtd)} note={r.annualizedFromYtd === null ? "no YTD on stubs" : "latest YTD ÷ days × 365"} />
        <Figure term="Average gross per period" value={fmt(r.avgGross)} note={r.minGross !== null && r.maxGross !== null && r.stubCount > 1 ? `${money(r.minGross)} – ${money(r.maxGross)}` : undefined} />
        <Figure term="Average net per period" value={fmt(r.avgNet)} />
      </dl>

      <div className="overflow-x-auto">
        <table className="tnum w-full min-w-[640px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-line text-left text-[12px] text-muted">
              <th className="px-5 py-2 font-medium sm:px-6">Pay date</th>
              <th className="py-2 pr-4 font-medium">Period</th>
              <th className="py-2 pr-4 text-right font-medium">Gross</th>
              <th className="py-2 pr-4 text-right font-medium">Net</th>
              <th className="py-2 pr-5 text-right font-medium sm:pr-6">YTD gross</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {r.rows.map((row, i) => (
              <tr key={i}>
                <td className="px-5 py-2 font-mono whitespace-nowrap sm:px-6">{row.payDate || "—"}</td>
                <td className="py-2 pr-4 font-mono whitespace-nowrap text-muted">{row.periodStart && row.periodEnd ? `${row.periodStart} – ${row.periodEnd}` : "—"}</td>
                <td className="py-2 pr-4 text-right font-mono">{fmt(row.gross)}</td>
                <td className="py-2 pr-4 text-right font-mono font-semibold">{fmt(row.net)}</td>
                <td className="py-2 pr-5 text-right font-mono text-muted sm:pr-6">{fmt(row.grossYtd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-line px-5 py-4 sm:px-6">
        <p className="flex items-center gap-2 text-[13px] font-medium">
          {serious.length
            ? <><ShieldAlert aria-hidden className="size-4 text-warn" strokeWidth={2} />{serious.length} thing{serious.length > 1 ? "s" : ""} to check</>
            : <><ShieldCheck aria-hidden className="size-4 text-ok" strokeWidth={2} />No inconsistencies across these stubs</>}
        </p>
        {r.flags.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {r.flags.map((f) => (
              <li key={f.id} className="flex items-start gap-2.5 text-[13px]">
                <span aria-hidden className={`mt-[6px] size-1.5 shrink-0 rounded-full ${f.severity === "risk" ? "bg-bad" : f.severity === "warn" ? "bg-warn" : "bg-line-2"}`} />
                <span><span className="font-medium">{f.title}.</span> <span className="text-muted">{f.detail}</span></span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

function Figure({ term, value, note, strong }: { term: string; value: string; note?: string; strong?: boolean }) {
  return (
    <div className="border-line px-5 py-4 even:border-l sm:px-6 sm:[&:not(:first-child)]:border-l">
      <dt className="text-[12px] text-muted">{term}</dt>
      <dd className={`mt-1 font-mono text-[20px] tracking-[-0.01em] ${strong ? "font-semibold" : ""}`}>{value}</dd>
      {note && <dd className="mt-0.5 text-[11px] text-faint">{note}</dd>}
    </div>
  );
}
