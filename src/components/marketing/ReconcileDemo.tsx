"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { SAMPLE } from "./sample";
import { Reconciliation } from "@/components/Reconciliation";
import { reconcile } from "@/lib/reconcile";
import type { PaystubData } from "@/types/paystub";

type Row = { section: string; label: string; value: string; ytd: string; editable?: boolean };

const INITIAL: Row[] = [
  ...SAMPLE.earnings.map((e) => ({ section: "Earnings", label: e.label, value: e.current, ytd: e.ytd, editable: e.label === "Tips" })),
  ...SAMPLE.taxes.map((t) => ({ section: "Taxes", label: t.label, value: t.current, ytd: t.ytd, editable: t.label === "Federal income tax" })),
  ...SAMPLE.deductions.map((d) => ({ section: "Deductions", label: d.label, value: d.current, ytd: d.ytd })),
];

/** Interactive proof: change a number on the sample stub and watch the checks respond. */
export function ReconcileDemo() {
  const [rows, setRows] = useState(INITIAL);
  const [net, setNet] = useState<string>(SAMPLE.net.current);

  const data: PaystubData = useMemo(() => ({
    fileName: "sample.pdf", name: SAMPLE.employee, payPeriodStart: "", payPeriodEnd: "", checkDate: "", payoutMethod: "",
    grossPay: SAMPLE.gross.current, netPay: net,
    fields: rows.map((r) => ({ section: r.section, label: r.label, value: r.value, ytd: r.ytd })),
  }), [rows, net]);
  const checks = useMemo(() => reconcile(data), [data]);
  const changed = net !== SAMPLE.net.current || rows.some((r, i) => r.value !== INITIAL[i].value);

  const set = (i: number, v: string) => setRows((prev) => prev.map((r, j) => (j === i ? { ...r, value: v } : r)));

  return (
    <div className="overflow-hidden rounded-[22px] bg-paper ring-1 ring-line">
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5 sm:px-6">
        <p className="text-[13px] font-medium">Sample stub · {SAMPLE.employee}</p>
        <button
          onClick={() => { setRows(INITIAL); setNet(SAMPLE.net.current); }}
          disabled={!changed}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-canvas hover:text-ink disabled:pointer-events-none disabled:opacity-0"
        >
          <RotateCcw aria-hidden className="size-3.5" strokeWidth={2} /> Reset
        </button>
      </div>

      <div className="tnum px-5 py-3 sm:px-6">
        {(["Earnings", "Taxes", "Deductions"] as const).map((section) => (
          <div key={section} className="py-2">
            <p className="pb-1 text-[11px] font-semibold tracking-[0.04em] text-muted uppercase">{section}</p>
            {rows.map((r, i) => r.section !== section ? null : (
              <div key={r.label} className="flex h-9 items-center justify-between gap-4 text-[14px]">
                <span className={r.editable ? "font-medium text-ink" : "text-ink-2"}>{r.label}</span>
                {r.editable ? (
                  <AmountInput label={r.label} value={r.value} onChange={(v) => set(i, v)} />
                ) : (
                  <span className="font-mono text-ink-2">{r.value}</span>
                )}
              </div>
            ))}
          </div>
        ))}
        <div className="mt-1 space-y-1 border-t border-line pt-3 text-[14px]">
          <div className="flex h-9 items-center justify-between">
            <span className="font-semibold">Gross pay</span>
            <span className="font-mono font-semibold">{SAMPLE.gross.current}</span>
          </div>
          <div className="flex h-9 items-center justify-between">
            <span className="font-semibold">Net pay</span>
            <AmountInput label="Net pay" value={net} onChange={setNet} strong />
          </div>
        </div>
      </div>

      <div className="border-t border-line bg-canvas px-5 py-4 sm:px-6" aria-live="polite">
        <Reconciliation checks={checks} stacked />
      </div>
    </div>
  );
}

function AmountInput({ label, value, onChange, strong }: { label: string; value: string; onChange: (v: string) => void; strong?: boolean }) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-8 w-[118px] rounded-lg bg-mark-soft px-2.5 text-right font-mono text-[14px] text-ink ring-1 ring-inset ring-mark outline-none transition-shadow focus:ring-2 focus:ring-ink ${strong ? "font-semibold" : ""}`}
      />
    </label>
  );
}
