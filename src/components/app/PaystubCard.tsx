"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Sparkles, ScanText, ShieldCheck, ShieldAlert, Lock, Tag, Cloud } from "lucide-react";
import type { DynamicField, PaystubData, FileResult } from "@/types/paystub";
import { HEADER_DISPLAY_FIELDS } from "@/lib/field-definitions";
import { reconcile, toNumber, money } from "@/lib/reconcile";
import { Reconciliation } from "@/components/Reconciliation";
import { riskLevel, type Signal } from "@/lib/integrity";

const SECTION_ORDER: Record<string, number> = { Employee: 0, Employer: 1, Earnings: 2, Taxes: 3, Deductions: 4, Totals: 5, Other: 6 };

const fmtMoney = (v: string) => {
  const n = toNumber(v);
  return n === null ? v || "—" : money(n);
};

interface Props {
  result: FileResult;
  data: PaystubData;
  index: number;
  label?: string;
  saved?: boolean;
  /** Integrity signals; null when the plan doesn't include them. */
  integrity?: Signal[] | null;
  expanded: boolean;
  onToggle: () => void;
  onUpdateHeader: (key: keyof PaystubData, value: string) => void;
  onUpdateField: (fieldIndex: number, col: "value" | "ytd", value: string) => void;
}

export function PaystubCard({ result, data, index, label, saved, integrity = null, expanded, onToggle, onUpdateHeader, onUpdateField }: Props) {
  const [showRaw, setShowRaw] = useState(false);
  const checks = useMemo(() => reconcile(data), [data]);
  const failed = checks.filter((c) => c.status === "fail").length;
  const passed = checks.filter((c) => c.status === "pass").length;

  const sections = useMemo(() => {
    const map = new Map<string, { field: DynamicField; index: number }[]>();
    data.fields.forEach((f, i) => {
      if (!map.has(f.section)) map.set(f.section, []);
      map.get(f.section)!.push({ field: f, index: i });
    });
    return [...map.entries()].sort(([a], [b]) => (SECTION_ORDER[a] ?? 99) - (SECTION_ORDER[b] ?? 99));
  }, [data.fields]);

  const bodyId = `stub-${index}-body`;
  // AI values keep the highlighter until the user edits them (result.data is the untouched extraction)
  const isAi = result.aiFieldCount !== undefined;
  const original = result.data;
  const fromAi = (current: string, before: string | undefined) => isAi && !!current && current === before;
  const risk = integrity ? riskLevel(integrity) : null;

  return (
    <article id={`card-${index}`} className="overflow-hidden rounded-[14px] bg-paper ring-1 ring-line">
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={bodyId}
        className="flex w-full cursor-pointer items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-canvas/60 sm:px-5"
      >
        <span className="tnum flex size-7 shrink-0 items-center justify-center rounded-lg bg-canvas font-mono text-[12px] text-muted">{index + 1}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-[15px] font-medium tracking-[-0.01em]">{data.name || result.fileName}</span>
            {result.aiFieldCount !== undefined && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-mark-soft px-1.5 py-0.5 text-[11px] font-medium text-ink ring-1 ring-inset ring-mark">
                <Sparkles aria-hidden className="size-3" strokeWidth={2} /> AI
              </span>
            )}
            {label && (
              <span className="inline-flex max-w-[10rem] shrink-0 items-center gap-1 truncate rounded-md bg-canvas px-1.5 py-0.5 text-[11px] font-medium text-ink-2 ring-1 ring-inset ring-line">
                <Tag aria-hidden className="size-3 shrink-0" strokeWidth={2} /> <span className="truncate">{label}</span>
              </span>
            )}
            {saved && <Cloud aria-label="Saved to history" className="size-3.5 shrink-0 text-muted" strokeWidth={2} />}
            {result.fileType === "image" && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-canvas px-1.5 py-0.5 text-[11px] font-medium text-muted ring-1 ring-inset ring-line">
                <ScanText aria-hidden className="size-3" strokeWidth={2} /> OCR
              </span>
            )}
          </span>
          <span className="tnum mt-0.5 block truncate text-[13px] text-muted">
            {[data.name ? result.fileName : null, data.payPeriodStart ? `${data.payPeriodStart}${data.payPeriodEnd ? ` – ${data.payPeriodEnd}` : ""}` : null]
              .filter(Boolean).join(" · ") || "No pay period found"}
          </span>
        </span>

        <span className="tnum hidden shrink-0 items-center gap-6 font-mono text-[14px] sm:flex">
          <span className="text-right"><span className="block font-sans text-[11px] text-muted">Gross</span>{data.grossPay ? fmtMoney(data.grossPay) : "—"}</span>
          <span className="text-right"><span className="block font-sans text-[11px] text-muted">Net</span><span className="font-semibold">{data.netPay ? fmtMoney(data.netPay) : "—"}</span></span>
        </span>

        {risk && risk !== "low" && (
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium ${risk === "high" ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn"}`}>
            {risk === "high" ? "Review stub" : "Check stub"}
          </span>
        )}
        <StatusPill failed={failed} passed={passed} />
        <ChevronDown aria-hidden className={`size-4 shrink-0 text-muted transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} strokeWidth={2} />
      </button>

      {expanded && (
        <div id={bodyId} className="border-t border-line">
          <div className="border-b border-line bg-canvas/60 px-4 py-4 sm:px-5" aria-live="polite">
            <Reconciliation checks={checks} />
          </div>
          <IntegrityPanel signals={integrity} />
          {isAi && original && (
            <p className="flex items-center gap-2 border-b border-line px-4 py-2.5 text-[12px] text-muted sm:px-5">
              <span aria-hidden className="inline-block h-3 w-6 rounded-[3px] bg-mark-soft ring-1 ring-inset ring-mark" />
              Highlighted values were read by AI. Anything you edit turns plain.
            </p>
          )}

          <div className="flex">
            <div className="min-w-0 flex-1 px-4 pb-4 sm:px-5">
              <Group title="Pay period">
                {HEADER_DISPLAY_FIELDS.map(({ key, label }) => (
                  <Row key={key} label={label}>
                    <Cell value={String(data[key] ?? "")} onChange={(v) => onUpdateHeader(key, v)} label={label} wide extracted={fromAi(String(data[key] ?? ""), original ? String(original[key] ?? "") : undefined)} />
                  </Row>
                ))}
              </Group>

              {sections.length === 0 && (
                <p className="py-6 text-[14px] text-muted">No line items were found. Try parsing this file again in AI mode.</p>
              )}

              {sections.map(([name, items]) => {
                const hasYtd = items.some(({ field }) => field.ytd !== "");
                const numeric = items.some(({ field }) => toNumber(field.value) !== null && !/[a-z]{3}/i.test(field.value));
                return (
                  <Group key={name} title={name} cols={hasYtd ? ["Current", "YTD"] : numeric ? ["Amount"] : undefined}>
                    {items.map(({ field, index: fi }) => (
                      <Row key={fi} label={field.label}>
                        <Cell value={field.value} onChange={(v) => onUpdateField(fi, "value", v)} label={`${field.label} current`} wide={!hasYtd && !numeric} extracted={fromAi(field.value, original?.fields[fi]?.value)} />
                        {hasYtd && <Cell value={field.ytd} onChange={(v) => onUpdateField(fi, "ytd", v)} label={`${field.label} year to date`} muted extracted={fromAi(field.ytd, original?.fields[fi]?.ytd)} />}
                      </Row>
                    ))}
                  </Group>
                );
              })}

              {result.rawText && (
                <div className="mt-4">
                  <button onClick={() => setShowRaw((v) => !v)} aria-expanded={showRaw} className="inline-flex cursor-pointer items-center gap-1.5 rounded-md py-1 text-[13px] font-medium text-muted hover:text-ink">
                    <ChevronDown aria-hidden className={`size-3.5 transition-transform ${showRaw ? "rotate-180" : ""}`} strokeWidth={2} />
                    {showRaw ? "Hide" : "Show"} extracted text
                  </button>
                  {showRaw && (
                    <pre className="mt-2 max-h-56 overflow-auto rounded-[10px] bg-canvas p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-ink-2">{result.rawText}</pre>
                  )}
                </div>
              )}
            </div>

            {result.previewUrl && (
              <aside className="hidden w-64 shrink-0 border-l border-line bg-canvas/60 p-4 lg:block xl:w-72" aria-label="Document preview">
                <div className="sticky top-20">
                  {/* blob URLs can't use next/image */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={result.previewUrl} alt={`Preview of ${result.fileName}`} className="w-full rounded-lg bg-paper shadow-[var(--shadow-float)]" loading="lazy" />
                  <p className="mt-2 text-center text-[12px] text-muted">{result.fileType === "pdf" ? "Page 1" : "Original image"}</p>
                </div>
              </aside>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function StatusPill({ failed, passed }: { failed: number; passed: number }) {
  if (failed) {
    return <span className="shrink-0 rounded-full bg-bad-soft px-2.5 py-1 text-[12px] font-medium text-bad">{failed} issue{failed > 1 ? "s" : ""}</span>;
  }
  if (passed) {
    return <span className="hidden shrink-0 rounded-full bg-ok-soft px-2.5 py-1 text-[12px] font-medium text-ok sm:inline">Balanced</span>;
  }
  return <span className="hidden shrink-0 rounded-full bg-canvas px-2.5 py-1 text-[12px] font-medium text-muted sm:inline">Unchecked</span>;
}

function Group({ title, cols, children }: { title: string; cols?: string[]; children: React.ReactNode }) {
  return (
    <section className="pt-5">
      <div className="flex items-end gap-3 border-b border-line pb-1.5">
        <h3 className="flex-1 text-[12px] font-semibold tracking-[0.03em] text-muted uppercase">{title}</h3>
        {cols?.map((c) => <span key={c} className="w-[5.75rem] pr-2.5 text-right text-[11px] font-medium text-muted sm:w-32">{c}</span>)}
      </div>
      <div className="divide-y divide-line/70">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-10 items-center gap-3 py-1">
      <span className="line-clamp-2 min-w-0 flex-1 text-[14px] leading-snug text-ink-2 sm:truncate" title={label}>{label}</span>
      {children}
    </div>
  );
}

/** Shows grouped figures (1,960.00) at rest and the raw value while editing. */
const grouped = (v: string) => {
  if (!/^-?\$?[\d,]*\.?\d+$/.test(v.trim())) return v;
  const n = toNumber(v);
  return n === null ? v : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

function Cell({ value, onChange, label, wide = false, muted = false, extracted = false }: { value: string; onChange: (v: string) => void; label: string; wide?: boolean; muted?: boolean; extracted?: boolean }) {
  const [editing, setEditing] = useState(false);
  return (
    <input
      type="text"
      value={editing || wide ? value : grouped(value)}
      onFocus={() => setEditing(true)}
      onBlur={() => setEditing(false)}
      onChange={(e) => onChange(e.target.value)}
      placeholder="—"
      aria-label={extracted ? `${label} (read by AI)` : label}
      className={`tnum h-8 rounded-lg px-2.5 text-[14px] ring-inset transition-[background-color,box-shadow] outline-none placeholder:text-faint hover:ring-1 hover:ring-line focus:bg-paper focus:ring-2 focus:ring-ink ${extracted ? "bg-mark-soft/70 hover:bg-mark-soft" : "bg-transparent hover:bg-canvas"} ${
        wide ? "w-[min(60%,22rem)] text-left" : "w-[5.75rem] text-right font-mono text-[13px] sm:w-32 sm:text-[14px]"
      } ${muted ? "text-muted" : "text-ink"}`}
    />
  );
}

function IntegrityPanel({ signals }: { signals: Signal[] | null }) {
  if (signals === null) {
    return (
      <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 sm:px-5">
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <Lock aria-hidden className="size-3.5" strokeWidth={2} />
          Integrity checks look for edited or inconsistent stubs.
        </p>
        <Link href="/pricing" className="shrink-0 text-[13px] font-medium underline-offset-4 hover:underline">Business plan</Link>
      </div>
    );
  }
  const shown = signals.filter((s) => s.severity !== "info" || signals.length <= 4);
  const level = riskLevel(signals);
  return (
    <section aria-label="Integrity checks" className="border-b border-line px-4 py-3.5 sm:px-5">
      <div className="flex items-center gap-2 text-[13px] font-medium">
        {level === "low"
          ? <ShieldCheck aria-hidden className="size-4 text-ok" strokeWidth={2} />
          : <ShieldAlert aria-hidden className={`size-4 ${level === "high" ? "text-bad" : "text-warn"}`} strokeWidth={2} />}
        {level === "low" && signals.length === 0 ? "No integrity concerns found" : level === "low" ? "Nothing serious found" : level === "high" ? "Review this stub before relying on it" : "A few things worth checking"}
      </div>
      {shown.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {shown.map((s) => (
            <li key={s.id} className="flex items-start gap-2.5 text-[13px]">
              <span aria-hidden className={`mt-[6px] size-1.5 shrink-0 rounded-full ${s.severity === "risk" ? "bg-bad" : s.severity === "warn" ? "bg-warn" : "bg-line-2"}`} />
              <span><span className="font-medium text-ink">{s.title}.</span> <span className="text-muted">{s.detail}</span></span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-faint">Signals are prompts to look closer, not proof of fraud.</p>
    </section>
  );
}
