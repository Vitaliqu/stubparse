"use client";

import { useState } from "react";
import { Columns3, Rows3 } from "lucide-react";
import { Segmented } from "@/components/ui";

const PERIODS = [
  { date: "2026-09-20", gross: "2,284.10", taxes: "494.52", net: "1,590.21" },
  { date: "2026-10-05", gross: "2,301.75", taxes: "498.34", net: "1,602.49" },
  { date: "2026-10-20", gross: "2,319.40", taxes: "502.15", net: "1,614.78" },
];

/** The two export layouts, shown on the same three fictional pay periods. */
export function ExportDemo() {
  const [layout, setLayout] = useState<"horizontal" | "vertical">("horizontal");

  return (
    <div>
      <div className="mx-auto w-full max-w-xs">
        <Segmented
          label="Export layout"
          value={layout}
          onChange={setLayout}
          options={[
            { value: "horizontal", label: <><Columns3 aria-hidden className="size-3.5" strokeWidth={2} />Horizontal</> },
            { value: "vertical", label: <><Rows3 aria-hidden className="size-3.5" strokeWidth={2} />Vertical</> },
          ]}
        />
      </div>
      <p className="mt-4 text-center text-[14px] text-muted">
        {layout === "horizontal"
          ? "One row per employee. Pay periods run across as column groups, for comparing periods side by side."
          : "One row per pay stub. Fields run across as columns, for sorting and filtering by date."}
      </p>

      <div className="mt-8 overflow-x-auto rounded-[14px] bg-paper ring-1 ring-line">
        {layout === "horizontal" ? (
          <table className="tnum w-full min-w-[720px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-canvas text-[12px]">
                <th rowSpan={2} className="border-r border-b border-line px-4 py-2 text-left font-medium text-muted">Employee</th>
                {PERIODS.map((p) => (
                  <th key={p.date} colSpan={3} className="border-r border-b border-line px-4 py-2 text-center font-mono font-medium last:border-r-0">{p.date}</th>
                ))}
              </tr>
              <tr className="bg-canvas text-[11px] text-muted">
                {PERIODS.flatMap((p) => ["Gross", "Taxes", "Net"].map((h) => (
                  <th key={p.date + h} className="border-r border-b border-line px-3 py-1.5 text-right font-medium last:border-r-0">{h}</th>
                )))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-r border-line px-4 py-2.5 font-medium">Maya Okafor</td>
                {PERIODS.flatMap((p) => [p.gross, p.taxes, p.net].map((v, i) => (
                  <td key={p.date + i} className={`border-r border-line px-3 py-2.5 text-right font-mono last:border-r-0 ${i === 2 ? "font-semibold" : ""}`}>{v}</td>
                )))}
              </tr>
            </tbody>
          </table>
        ) : (
          <table className="tnum w-full min-w-[560px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-canvas text-[12px] text-muted">
                {["Employee", "Pay date", "Gross pay", "Total taxes", "Net pay"].map((h, i) => (
                  <th key={h} className={`border-r border-b border-line px-4 py-2 font-medium last:border-r-0 ${i < 2 ? "text-left" : "text-right"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map((p) => (
                <tr key={p.date} className="border-b border-line last:border-b-0">
                  <td className="border-r border-line px-4 py-2.5 font-medium">Maya Okafor</td>
                  <td className="border-r border-line px-4 py-2.5 font-mono">{p.date}</td>
                  <td className="border-r border-line px-4 py-2.5 text-right font-mono">{p.gross}</td>
                  <td className="border-r border-line px-4 py-2.5 text-right font-mono">{p.taxes}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold">{p.net}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-muted">Fictional sample data.</p>
    </div>
  );
}
