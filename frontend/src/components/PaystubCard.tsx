"use client";

import { useState } from "react";
import type { DynamicField, PaystubData, FileResult } from "@/types/paystub";
import { HEADER_DISPLAY_FIELDS } from "@/lib/field-definitions";
import { ChevronDown } from "./icons";
import { Stat, ProgressPill } from "./ui";

/** Ensure exactly one leading $ on a monetary string. */
const fmt = (v: string) => (v.startsWith("$") ? v : `$${v}`);

/** Section display order — info first, financials after. */
const SECTION_ORDER: Record<string, number> = {
  Employee:   0,
  Employer:   1,
  Earnings:   2,
  Taxes:      3,
  Deductions: 4,
  Totals:     5,
  Other:      6,
};

interface Props {
  result: FileResult;
  data: PaystubData;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdateHeader: (key: keyof PaystubData, value: string) => void;
  onUpdateDynamic: (fieldIndex: number, col: "value" | "ytd", value: string) => void;
}

export function PaystubCard({
  result, data, index,
  isExpanded, onToggleExpand,
  onUpdateHeader, onUpdateDynamic,
}: Props) {
  const [showRawText, setShowRawText] = useState(false);

  const filledFields = data.fields.filter((f) => f.value || f.ytd).length;

  // Group dynamic fields by section, then sort sections by priority
  const sectionsMap = new Map<string, { field: DynamicField; index: number }[]>();
  data.fields.forEach((f, i) => {
    if (!sectionsMap.has(f.section)) sectionsMap.set(f.section, []);
    sectionsMap.get(f.section)!.push({ field: f, index: i });
  });
  const sections = [...sectionsMap.entries()].sort(
    ([a], [b]) => (SECTION_ORDER[a] ?? 99) - (SECTION_ORDER[b] ?? 99)
  );

  return (
    <div id={`card-${index}`} className="overflow-hidden rounded-md border border-[#eaeaea] bg-white">
      {/* Header */}
      <button
        onClick={onToggleExpand}
        className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left hover:bg-[#fafafa] transition-colors"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-zinc-100 text-xs font-medium text-zinc-700">
          {index + 1}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="truncate text-sm font-medium text-black">
              {data.name || result.fileName}
            </p>
            {result.fileType === "image" && (
              <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 uppercase border border-[#eaeaea]">OCR</span>
            )}
            {result.aiFieldCount !== undefined && (
              <span
                className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase bg-amber-50 text-amber-600 border border-amber-200"
                title={result.aiFieldCount > 0 ? `AI extracted ${result.aiFieldCount} field${result.aiFieldCount !== 1 ? "s" : ""}` : "AI ran but found nothing new"}
              >
                {result.aiFieldCount > 0 ? `✦ AI +${result.aiFieldCount}` : "✦ AI"}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-[#666] truncate">
            {result.fileName}
            {data.payPeriodStart ? ` · ${data.payPeriodStart}${data.payPeriodEnd ? ` – ${data.payPeriodEnd}` : ""}` : ""}
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-4 shrink-0">
          {data.grossPay && <Stat label="Gross" value={fmt(data.grossPay)} />}
          {data.netPay   && <Stat label="Net"   value={fmt(data.netPay)}   highlight />}
          <ProgressPill filled={filledFields} total={Math.max(data.fields.length, 1)} />
        </div>

        <span className="text-[#666] shrink-0"><ChevronDown open={isExpanded} /></span>
      </button>

      {/* Mobile stats (collapsed) */}
      {!isExpanded && (data.grossPay || data.netPay) && (
        <div className="flex sm:hidden gap-4 px-5 pb-4">
          {data.grossPay && <Stat label="Gross" value={fmt(data.grossPay)} />}
          {data.netPay   && <Stat label="Net"   value={fmt(data.netPay)}   highlight />}
        </div>
      )}

      {/* Expanded body */}
      {isExpanded && (
        <div className="border-t border-[#eaeaea] flex">

          <div className="flex-1 min-w-0">

            {/* Pay period & dates */}
            <div>
              <div className="bg-[#fafafa] px-5 py-2 text-xs font-medium uppercase tracking-wider text-[#666] border-b border-[#eaeaea]">
                Pay Period
              </div>
              {HEADER_DISPLAY_FIELDS.filter(({ key }) => !!data[key]).map(({ key, label }) => (
                <HeaderFieldRow
                  key={key}
                  label={label}
                  value={String(data[key] ?? "")}
                  onChange={(v) => onUpdateHeader(key, v)}
                />
              ))}
            </div>

            {/* Dynamic sections */}
            {sections.length === 0 && (
              <div className="px-5 py-4 text-sm text-[#666]">
                No line items extracted. Try enabling AI mode for better results.
              </div>
            )}

            {sections.map(([sectionName, items]) => {
              const hasYtd = items.some(({ field }) => field.ytd !== "");
              return (
                <div key={sectionName}>
                  <div className="bg-[#fafafa] px-5 py-2 text-xs font-medium uppercase tracking-wider text-[#666] flex items-center justify-between border-b border-[#eaeaea]">
                    <span>{sectionName}</span>
                    <span className="normal-case font-normal text-zinc-400">
                      {items.length} field{items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="divide-y divide-[#fafafa]">
                    <div className="flex gap-3 px-5 py-1.5">
                      <span className="flex-1 text-[10px] font-medium uppercase tracking-wide text-zinc-300">Field</span>
                      {hasYtd ? (
                        <>
                          <span className="w-28 text-[10px] font-medium uppercase tracking-wide text-zinc-300 text-right">Current</span>
                          <span className="w-28 text-[10px] font-medium uppercase tracking-wide text-zinc-300 text-right">YTD</span>
                        </>
                      ) : (
                        <span className="w-48 text-[10px] font-medium uppercase tracking-wide text-zinc-300 text-right">Value</span>
                      )}
                    </div>
                    {items.map(({ field, index: fi }) => (
                      field.ytd !== "" ? (
                        <DynamicFieldRow
                          key={fi}
                          field={field}
                          onChangeValue={(v) => onUpdateDynamic(fi, "value", v)}
                          onChangeYtd={(v)   => onUpdateDynamic(fi, "ytd",   v)}
                        />
                      ) : hasYtd ? (
                        <NoYtdFieldRow
                          key={fi}
                          field={field}
                          onChangeValue={(v) => onUpdateDynamic(fi, "value", v)}
                        />
                      ) : (
                        <InfoFieldRow
                          key={fi}
                          field={field}
                          onChangeValue={(v) => onUpdateDynamic(fi, "value", v)}
                        />
                      )
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Raw text toggle */}
            {result.rawText && (
              <div>
                <button
                  onClick={() => setShowRawText((v) => !v)}
                  className="flex w-full cursor-pointer items-center justify-between px-5 py-2.5 text-xs font-medium text-[#666] hover:bg-[#fafafa] transition-colors"
                >
                  <span>Raw OCR / PDF Text</span>
                  <ChevronDown open={showRawText} />
                </button>
                {showRawText && (
                  <pre className="max-h-48 overflow-auto border-t border-[#eaeaea] px-5 py-4 font-mono text-xs text-[#666] whitespace-pre-wrap bg-[#fafafa]">
                    {result.rawText}
                  </pre>
                )}
              </div>
            )}
          </div>

          {result.previewUrl && (
            <div className="hidden lg:block w-64 xl:w-72 shrink-0 border-l border-[#eaeaea] bg-[#fafafa]">
              <div className="sticky top-4 p-3">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-[#666]">
                  Document Preview
                </p>
                <div className="overflow-hidden rounded-md border border-[#eaeaea] bg-white">
                  {/* blob URLs can't use next/image — native img is intentional */}
                  {/* eslint-disable-next-line */}
                  <img
                    src={result.previewUrl}
                    alt="Paystub document preview"
                    className="w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <p className="mt-1.5 text-[10px] text-[#666] text-center">
                  {result.fileType === "pdf" ? "First page" : "Original image"}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HeaderFieldRow({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-[#fafafa] px-5 py-2 last:border-b-0 sm:flex-nowrap">
      <label className="w-full text-xs font-medium text-[#666] sm:w-40 sm:shrink-0">{label}</label>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder="—"
        className="flex-1 rounded border border-[#eaeaea] bg-white px-3 py-1.5 text-sm text-black outline-none transition-colors focus:border-black"
      />
    </div>
  );
}

function InfoFieldRow({ field, onChangeValue }: {
  field: DynamicField;
  onChangeValue: (v: string) => void;
}) {
  const isLongText = field.value.length > 12 || /[a-zA-Z]{3}/.test(field.value);
  return (
    <div className={`flex gap-3 px-5 py-2 ${isLongText ? "flex-col sm:flex-row sm:items-center" : "items-center"}`}>
      <span className={`text-xs text-zinc-600 truncate ${isLongText ? "sm:w-40 sm:shrink-0" : "flex-1"}`} title={field.label}>
        {field.label}
      </span>
      <input
        type="text" value={field.value} onChange={(e) => onChangeValue(e.target.value)} placeholder="—"
        className={`rounded border px-3 py-1.5 text-sm outline-none transition-colors focus:border-black ${
          isLongText ? "flex-1 text-left" : "w-36 text-right"
        } ${
          field.value
            ? "border-[#eaeaea] bg-white text-zinc-800"
            : "border-[#eaeaea] bg-white text-zinc-300 placeholder-zinc-200"
        }`}
      />
    </div>
  );
}

function DynamicFieldRow({ field, onChangeValue, onChangeYtd }: {
  field: DynamicField;
  onChangeValue: (v: string) => void;
  onChangeYtd:   (v: string) => void;
}) {
  const baseInput = "w-28 rounded border px-2 py-1.5 text-sm text-right outline-none transition-colors focus:border-black border-[#eaeaea] bg-white";
  const filled    = "text-zinc-800";
  const empty     = "text-zinc-300 placeholder-zinc-200";

  return (
    <div className="flex items-center gap-3 px-5 py-2">
      <span className="flex-1 text-xs text-zinc-600 truncate" title={field.label}>{field.label}</span>
      <input
        type="text" value={field.value} onChange={(e) => onChangeValue(e.target.value)} placeholder="—"
        className={`${baseInput} ${field.value ? filled : empty}`}
      />
      <input
        type="text" value={field.ytd} onChange={(e) => onChangeYtd(e.target.value)} placeholder="—"
        className={`${baseInput} ${field.ytd ? "text-zinc-500" : empty}`}
      />
    </div>
  );
}

/** Field with no YTD in a section that has YTD columns — keeps column alignment. */
function NoYtdFieldRow({ field, onChangeValue }: {
  field: DynamicField;
  onChangeValue: (v: string) => void;
}) {
  const filled = field.value ? "text-zinc-800" : "text-zinc-300 placeholder-zinc-200";
  return (
    <div className="flex items-center gap-3 px-5 py-2">
      <span className="flex-1 text-xs text-zinc-500 truncate italic" title={field.label}>{field.label}</span>
      <input
        type="text" value={field.value} onChange={(e) => onChangeValue(e.target.value)} placeholder="—"
        className={`w-28 rounded border border-[#eaeaea] bg-white px-2 py-1.5 text-sm text-right outline-none transition-colors focus:border-black ${filled}`}
      />
      <span className="w-28 text-right text-sm text-zinc-300">—</span>
    </div>
  );
}
