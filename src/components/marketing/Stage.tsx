"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { FileSpreadsheet, ArrowDownToLine } from "lucide-react";
import { SAMPLE, STAGE_ROWS } from "./sample";
import { Reconciliation } from "@/components/Reconciliation";
import type { Check } from "@/lib/reconcile";

const STEP_MS = 360;
const N = STAGE_ROWS.length;
const CHECKS: Check[] = [
  { id: "earnings", label: "Earnings add up to gross", status: "pass", detail: "$2,319.40 = $2,319.40" },
  { id: "net", label: "Gross − taxes − deductions = net", status: "pass", detail: "$1,614.78 = $1,614.78" },
  { id: "ytd", label: "Year-to-date ≥ current", status: "pass", detail: "11 lines consistent" },
];
// Timeline: rows land one by one, then the three checks tick, then the sheet holds.
const TOTAL = N + 4;

/** The hero: a sample stub read into a spreadsheet in front of the visitor. Also the page's drop target. */
export function Stage({ dragging }: { dragging: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(TOTAL - 1); // already-visible default: the finished state
  const [playing, setPlaying] = useState(false);

  // Play once, the first time the stage is seen; then hold the finished sheet.
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      setT(-2);
      setPlaying(true);
    }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setT((v) => {
      if (v + 1 >= TOTAL) { setPlaying(false); return TOTAL - 1; }
      return v + 1;
    }), STEP_MS);
    return () => clearInterval(id);
  }, [playing]);

  const replay = () => { setT(-2); setPlaying(true); };

  const landed = (i: number) => t >= i;
  const lit = (key: string) => {
    const i = STAGE_ROWS.findIndex((r) => r.key === key);
    return i >= 0 && t >= i;
  };
  const revealedChecks = Math.max(0, Math.min(3, t - N + 1));

  return (
    <div ref={ref} className="relative">
      <div
        className={`relative overflow-hidden rounded-[28px] bg-canvas ring-1 ring-inset transition-[box-shadow] duration-300 ${dragging ? "ring-2 ring-ink" : "ring-line"}`}
      >
        <div className="grid items-start gap-6 p-4 sm:p-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-10 lg:p-12">
          <Paystub lit={lit} />
          <Sheet landed={landed} fresh={t} />
        </div>

        <div className="border-t border-line bg-paper/70 px-4 py-4 sm:px-8 lg:px-12">
          <Reconciliation checks={CHECKS} revealed={revealedChecks} compact />
        </div>

        {/* Drop state */}
        <div
          aria-hidden={!dragging}
          className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-paper/92 transition-opacity duration-200 ${dragging ? "opacity-100" : "opacity-0"}`}
        >
          <span className="flex size-14 items-center justify-center rounded-2xl bg-ink text-white">
            <ArrowDownToLine className="size-6" strokeWidth={1.75} />
          </span>
          <p className="text-2xl font-semibold tracking-[-0.025em]">Drop to parse</p>
          <p className="text-sm text-muted">Your first 3 documents are free. Files are read in your browser.</p>
        </div>
      </div>
      <p className="mt-3 flex items-center justify-center gap-3 text-xs text-muted">
        Sample paystub with fictional data.
        <button onClick={replay} disabled={playing} className="cursor-pointer font-medium text-ink underline-offset-4 hover:underline disabled:cursor-default disabled:text-faint disabled:no-underline">
          {playing ? "Reading…" : "Replay"}
        </button>
      </p>
    </div>
  );
}

// ── The stub ─────────────────────────────────────────────────────────────────

const LitContext = createContext<(key: string) => boolean>(() => true);

/** A value on the stub that gets the highlighter when it's lifted. */
function S({ k, children, className = "" }: { k: string; children: React.ReactNode; className?: string }) {
  const lit = useContext(LitContext);
  return <span className={`sweep px-0.5 ${className}`} data-on={lit(k)}>{children}</span>;
}

function Paystub({ lit }: { lit: (key: string) => boolean }) {
  return (
    <LitContext.Provider value={lit}>
    <figure
      aria-label="Sample paystub"
      className="mx-auto w-full max-w-[460px] origin-top rounded-[10px] bg-paper p-5 text-[11px] leading-[1.45] text-ink-2 shadow-[var(--shadow-float)] sm:p-7 sm:text-[12px] lg:rotate-[-1.2deg]"
    >
      <header className="flex items-start justify-between gap-4 border-b border-ink pb-3">
        <div>
          <p className="text-[13px] font-semibold tracking-[-0.01em] text-ink sm:text-[14px]">{SAMPLE.employer}</p>
          <p className="text-muted">{SAMPLE.employerAddress}</p>
        </div>
        <p className="shrink-0 text-right text-[11px] font-semibold tracking-[0.08em] text-muted">EARNINGS<br />STATEMENT</p>
      </header>

      <dl className="tnum grid grid-cols-2 gap-x-4 gap-y-1 border-b border-line py-3 font-mono sm:grid-cols-3">
        <div><dt className="font-sans text-muted">Employee</dt><dd><S k="employee" className="font-sans font-medium">{SAMPLE.employee}</S></dd></div>
        <div><dt className="font-sans text-muted">Pay period</dt><dd className="whitespace-nowrap">{SAMPLE.periodStart} – {SAMPLE.periodEnd}</dd></div>
        <div><dt className="font-sans text-muted">Pay date</dt><dd><S k="payDate">{SAMPLE.payDate}</S></dd></div>
      </dl>

      <StubTable
        head={["Earnings", "Hours", "Rate", "Current", "YTD"]}
        rows={SAMPLE.earnings.map((e) => [e.label, e.hours, e.rate, <S key="c" k={`e-${e.label}`}>{e.current}</S>, e.ytd])}
        foot={["Gross pay", "", "", <S key="g" k="gross" className="font-semibold">{SAMPLE.gross.current}</S>, SAMPLE.gross.ytd]}
      />
      <StubTable
        head={["Taxes", "", "", "Current", "YTD"]}
        rows={SAMPLE.taxes.map((x) => [x.label, "", "", <S key="c" k={`t-${x.label}`}>{x.current}</S>, x.ytd])}
      />
      <StubTable
        head={["Deductions", "", "", "Current", "YTD"]}
        rows={SAMPLE.deductions.map((x) => [x.label, "", "", <S key="c" k={`d-${x.label}`}>{x.current}</S>, x.ytd])}
      />

      <div className="tnum mt-3 flex items-baseline justify-between rounded-md bg-canvas px-3 py-2.5">
        <span className="font-semibold text-ink">Net pay</span>
        <span className="font-mono text-[14px] font-semibold text-ink sm:text-[15px]"><S k="net">${SAMPLE.net.current}</S></span>
      </div>
    </figure>
    </LitContext.Provider>
  );
}

function StubTable({ head, rows, foot }: { head: string[]; rows: React.ReactNode[][]; foot?: React.ReactNode[] }) {
  const cell = (i: number) => (i === 0 ? "text-left" : "text-right") + (i === 1 || i === 2 ? " hidden sm:table-cell" : "");
  return (
    <table className="tnum mt-3 w-full border-collapse font-mono">
      <thead>
        <tr className="border-b border-line">
          {head.map((h, i) => (
            <th key={i} className={`pb-1 font-sans text-[11px] font-semibold tracking-[0.04em] text-muted uppercase ${cell(i)}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, ri) => (
          <tr key={ri}>
            {r.map((c, i) => <td key={i} className={`py-[3px] ${i === 0 ? "font-sans" : ""} ${cell(i)}`}>{c}</td>)}
          </tr>
        ))}
      </tbody>
      {foot && (
        <tfoot>
          <tr className="border-t border-line">
            {foot.map((c, i) => <td key={i} className={`pt-1 font-semibold text-ink ${i === 0 ? "font-sans" : ""} ${cell(i)}`}>{c}</td>)}
          </tr>
        </tfoot>
      )}
    </table>
  );
}

// ── The spreadsheet ──────────────────────────────────────────────────────────

function Sheet({ landed, fresh }: { landed: (i: number) => boolean; fresh: number }) {
  return (
    <div className="overflow-hidden rounded-[14px] bg-paper ring-1 ring-line lg:mt-6">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <FileSpreadsheet aria-hidden className="size-4 text-ok" strokeWidth={1.75} />
        <span className="text-[13px] font-medium">paystubs.xlsx</span>
        <span className="ml-auto font-mono text-[11px] text-muted">Sheet 1</span>
      </div>
      <table className="tnum w-full border-collapse text-[11.5px] sm:text-[13px]">
        <thead>
          <tr className="bg-canvas text-[11px] text-muted">
            <th className="hidden w-8 border-r border-b border-line py-1.5 font-mono font-normal sm:table-cell" aria-hidden />
            <th className="border-r border-b border-line px-3 py-1.5 text-left font-medium">Field</th>
            <th className="border-r border-b border-line px-3 py-1.5 text-right font-medium">Current</th>
            <th className="border-b border-line px-3 py-1.5 text-right font-medium">YTD</th>
          </tr>
        </thead>
        <tbody>
          {STAGE_ROWS.map((r, i) => {
            const on = landed(i);
            const isFresh = fresh === i;
            return (
              <tr key={r.key} className={r.strong ? "font-semibold" : ""}>
                <td className="hidden border-r border-b border-line bg-canvas text-center font-mono text-[11px] text-muted sm:table-cell" aria-hidden>{i + 2}</td>
                <td className="border-r border-b border-line px-2.5 py-[5px] whitespace-nowrap sm:px-3">{r.label}</td>
                <td className="border-r border-b border-line p-0 text-right font-mono">
                  <span className="cell-land block px-2.5 py-[5px] whitespace-nowrap sm:px-3" data-on={on} data-fresh={isFresh}>{r.current}</span>
                </td>
                <td className="border-b border-line p-0 text-right font-mono text-muted">
                  <span className="cell-land block px-2.5 py-[5px] whitespace-nowrap sm:px-3" data-on={on} data-fresh={isFresh}>{r.ytd || " "}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
