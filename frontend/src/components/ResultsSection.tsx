"use client";

import type { RefObject } from "react";
import type { PaystubData, FileResult } from "@/types/paystub";
import { XIcon, ChevronDown } from "./icons";
import { PaystubCard } from "./PaystubCard";

interface Props {
  results: FileResult[];
  editedData: PaystubData[];
  expandedCards: Set<string>;
  containerRef: RefObject<HTMLDivElement | null>;
  onToggleExpand: (fileName: string, index: number) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onUpdateHeader: (dataIndex: number, key: keyof PaystubData, value: string) => void;
  onUpdateDynamic: (dataIndex: number, fieldIndex: number, col: "value" | "ytd", value: string) => void;
}

export function ResultsSection({
  results, editedData, expandedCards, containerRef,
  onToggleExpand, onExpandAll, onCollapseAll, onUpdateHeader, onUpdateDynamic,
}: Props) {
  const successResults = results.filter((r) => r.success && r.data);
  const failedResults  = results.filter((r) => !r.success);

  return (
    <section ref={containerRef} className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      {/* Failed files */}
      {failedResults.map((r) => (
        <div
          key={r.fileName}
          className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <span className="mt-0.5 shrink-0"><XIcon size={4} /></span>
          <div>
            <strong className="font-medium">{r.fileName}</strong> — {r.error}
          </div>
        </div>
      ))}

      {/* Summary table (shown when more than one file) */}
      {successResults.length > 1 && (
        <SummaryTable
          results={successResults}
          editedData={editedData}
          expandedCards={expandedCards}
          onToggleExpand={onToggleExpand}
          onExpandAll={onExpandAll}
          onCollapseAll={onCollapseAll}
        />
      )}

      {/* Expandable edit cards */}
      <div className="space-y-4">
        {successResults.map((result, i) => {
          const dataIndex = editedData.findIndex((d) => d.fileName === result.fileName);
          const data = dataIndex >= 0 ? editedData[dataIndex] : null;
          if (!data) return null;

          return (
            <PaystubCard
              key={result.fileName}
              result={result}
              data={data}
              index={i}
              isExpanded={expandedCards.has(result.fileName)}
              onToggleExpand={() => onToggleExpand(result.fileName, i)}
              onUpdateHeader={(key, value) => onUpdateHeader(dataIndex, key, value)}
              onUpdateDynamic={(fi, col, value) => onUpdateDynamic(dataIndex, fi, col, value)}
            />
          );
        })}
      </div>
    </section>
  );
}

function SummaryTable({
  results, editedData, expandedCards,
  onToggleExpand, onExpandAll, onCollapseAll,
}: {
  results: FileResult[];
  editedData: PaystubData[];
  expandedCards: Set<string>;
  onToggleExpand: (fileName: string, index: number) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-[#eaeaea] bg-white">
      <div className="flex items-center justify-between border-b border-[#eaeaea] px-5 py-3">
        <h2 className="text-sm font-medium text-black">Results Summary</h2>
        <div className="flex gap-2">
          <button onClick={onExpandAll} className="cursor-pointer text-xs text-black font-medium hover:underline">
            Expand all
          </button>
          <span className="text-zinc-300">·</span>
          <button onClick={onCollapseAll} className="cursor-pointer text-xs text-[#666] hover:underline">
            Collapse all
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#fafafa] text-xs font-medium text-[#666] uppercase tracking-wide border-b border-[#eaeaea]">
            <tr>
              <th className="px-5 py-2.5 text-left">#</th>
              <th className="px-5 py-2.5 text-left">Employee</th>
              <th className="px-5 py-2.5 text-left">Pay Period</th>
              <th className="px-5 py-2.5 text-right">Gross Pay</th>
              <th className="px-5 py-2.5 text-right">Net Pay</th>
              <th className="px-5 py-2.5 text-center">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eaeaea]">
            {results.map((result, i) => {
              const data = editedData.find((d) => d.fileName === result.fileName);
              const isExpanded = expandedCards.has(result.fileName);

              return (
                <tr key={result.fileName} className="hover:bg-[#fafafa] transition-colors">
                  <td className="px-5 py-3 text-[#666] font-mono text-xs">{i + 1}</td>
                  <td className="px-5 py-3 max-w-[200px]">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-medium text-black">{data?.name || "—"}</span>
                      {result.fileType === "image" && (
                        <span className="shrink-0 rounded border border-[#eaeaea] bg-zinc-100 px-1 py-0.5 text-[9px] font-medium text-zinc-600 uppercase">
                          OCR
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[#666] whitespace-nowrap">
                    {data?.payPeriodStart && data?.payPeriodEnd
                      ? `${data.payPeriodStart} – ${data.payPeriodEnd}`
                      : data?.payPeriodStart || "—"}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-zinc-700">
                    {data?.grossPay ? `$${data.grossPay}` : "—"}
                  </td>
                  <td className="px-5 py-3 text-right font-mono font-semibold text-black">
                    {data?.netPay ? `$${data.netPay}` : "—"}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => onToggleExpand(result.fileName, i)}
                      className={`inline-flex cursor-pointer items-center gap-1 rounded px-3 py-1 text-xs font-medium transition-colors border ${
                        isExpanded
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-zinc-600 border-[#eaeaea] hover:border-indigo-400 hover:text-indigo-600"
                      }`}
                    >
                      {isExpanded ? "Collapse" : "Edit"}
                      <ChevronDown open={isExpanded} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
