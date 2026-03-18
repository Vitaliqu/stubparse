"use client";

import type { PaystubData, ExportFormat } from "@/types/paystub";
import { EXPORT_GROUPS, HEADER_EXPORT_KEYS, type ExportGroupDef } from "@/lib/field-definitions";
import { DownloadIcon, SlidersIcon, ChevronDown } from "./icons";
import { LoadingSpinner, Checkbox, FormatIcon, FormatBadge } from "./ui";

interface DynamicSection {
  section: string;
  labels: string[];
}

interface Props {
  editedData: PaystubData[];
  exportFormat: ExportFormat;
  exportLayout: "horizontal" | "vertical";
  selectedFields: Set<string>;
  selectedDynamicFields: Set<string>;
  dynamicSections: DynamicSection[];
  includeYTD: boolean;
  showFieldSelector: boolean;
  exporting: boolean;
  onSetFormat: (f: ExportFormat) => void;
  onSetLayout: (l: "horizontal" | "vertical") => void;
  onToggleField: (key: string) => void;
  onToggleGroup: (group: ExportGroupDef) => void;
  onToggleDynamicField: (label: string) => void;
  onToggleDynamicSection: (labels: string[]) => void;
  onSelectAllFields: () => void;
  onClearAllFields: () => void;
  onToggleYTD: () => void;
  onToggleFieldSelector: () => void;
  onExport: () => void;
}

export function ExportPanel({
  editedData, exportFormat, exportLayout, selectedFields, selectedDynamicFields, dynamicSections,
  includeYTD, showFieldSelector, exporting,
  onSetFormat, onSetLayout, onToggleField, onToggleGroup,
  onToggleDynamicField, onToggleDynamicSection,
  onSelectAllFields, onClearAllFields,
  onToggleYTD, onToggleFieldSelector, onExport,
}: Props) {
  const layoutDescriptions: Record<"horizontal" | "vertical", string> = {
    horizontal: "One row per employee — pay periods expand as columns. Best for comparing periods side-by-side.",
    vertical:   "One row per pay period — fields expand as columns. Best for filtering and sorting by date.",
  };

  const formatDescriptions: Record<ExportFormat, string> = {
    xlsx: "Excel spreadsheet with styled headers and frozen panes.",
    csv:  "Plain CSV — compatible with any spreadsheet app.",
    json: "Structured JSON array — for developers or further processing.",
  };

  const totalDynamic = dynamicSections.reduce((a, s) => a + s.labels.length, 0);
  const totalFields  = HEADER_EXPORT_KEYS.length + totalDynamic;
  const selectedTotal = selectedFields.size + selectedDynamicFields.size;
  const noneSelected = selectedTotal === 0;

  return (
    <section className="mx-auto max-w-3xl px-4 pb-12 space-y-4">
      <div className="overflow-hidden rounded-md border border-[#eaeaea] bg-white">
        <div className="border-b border-[#eaeaea] px-5 py-4">
          <h2 className="text-base font-medium text-black">Export Options</h2>
          <p className="mt-0.5 text-xs text-[#666]">
            Choose format, select fields, then download your file.
          </p>
        </div>

        <div className="px-5 py-4 border-b border-[#eaeaea]">
          <p className="mb-2.5 text-xs font-medium uppercase tracking-wide text-[#666]">
            File Format
          </p>
          <div className="flex gap-2 flex-wrap">
            {(["xlsx", "csv", "json"] as ExportFormat[]).map((fmt) => (
              <button
                key={fmt}
                onClick={() => onSetFormat(fmt)}
                className={`flex cursor-pointer items-center gap-2 rounded border px-4 py-2.5 text-sm font-medium transition-all ${
                  exportFormat === fmt
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-[#eaeaea] bg-white text-zinc-600 hover:border-indigo-400 hover:text-indigo-600"
                }`}
              >
                <FormatIcon format={fmt} />
                {fmt.toUpperCase()}
                <FormatBadge format={fmt} />
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-[#666]">{formatDescriptions[exportFormat]}</p>
        </div>

        {exportFormat !== "json" && (
          <div className="px-5 py-4 border-b border-[#eaeaea]">
            <p className="mb-2.5 text-xs font-medium uppercase tracking-wide text-[#666]">
              Layout
            </p>
            <div className="flex gap-2">
              {(["horizontal", "vertical"] as const).map((layout) => (
                <button
                  key={layout}
                  onClick={() => onSetLayout(layout)}
                  className={`flex cursor-pointer items-center gap-2 rounded border px-4 py-2.5 text-sm font-medium transition-all ${
                    exportLayout === layout
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-[#eaeaea] bg-white text-zinc-600 hover:border-indigo-400 hover:text-indigo-600"
                  }`}
                >
                  {layout === "horizontal" ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                      <rect x="1" y="1" width="4" height="12" rx="1" fill="currentColor" opacity=".4"/>
                      <rect x="6" y="1" width="3" height="12" rx="1" fill="currentColor" opacity=".7"/>
                      <rect x="10" y="1" width="3" height="12" rx="1" fill="currentColor"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                      <rect x="1" y="1" width="12" height="4" rx="1" fill="currentColor" opacity=".4"/>
                      <rect x="1" y="6" width="12" height="3" rx="1" fill="currentColor" opacity=".7"/>
                      <rect x="1" y="10" width="12" height="3" rx="1" fill="currentColor"/>
                    </svg>
                  )}
                  {layout.charAt(0).toUpperCase() + layout.slice(1)}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-[#666]">{layoutDescriptions[exportLayout]}</p>
          </div>
        )}

        <div className="px-5 py-4 border-b border-[#eaeaea]">
          <button
            onClick={onToggleFieldSelector}
            className="flex w-full cursor-pointer items-center justify-between text-sm font-medium text-black"
          >
            <span className="flex items-center gap-2">
              <SlidersIcon />
              Fields to Export
              <span className="rounded border border-[#eaeaea] bg-[#fafafa] px-2 py-0.5 text-xs font-medium text-[#666]">
                {selectedTotal} / {totalFields}
              </span>
            </span>
            <ChevronDown open={showFieldSelector} />
          </button>

          {showFieldSelector && (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <button onClick={onSelectAllFields} className="cursor-pointer text-xs text-black font-medium hover:underline">
                  Select all
                </button>
                <span className="text-zinc-300">·</span>
                <button onClick={onClearAllFields} className="cursor-pointer text-xs text-[#666] hover:underline">
                  Clear all
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {EXPORT_GROUPS.map((group) => (
                  <FieldGroupSelector
                    key={group.id}
                    group={group}
                    selectedFields={selectedFields}
                    onToggleField={onToggleField}
                    onToggleGroup={onToggleGroup}
                  />
                ))}
              </div>

              {dynamicSections.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-[#666] uppercase tracking-wide">
                      Line Items
                    </p>
                    {selectedDynamicFields.size > 0 && (
                      <label className="flex cursor-pointer items-center gap-2">
                        <div
                          onClick={onToggleYTD}
                          className={`relative h-5 w-9 rounded-full transition-colors duration-200 cursor-pointer ${
                            includeYTD ? "bg-indigo-600" : "bg-zinc-200"
                          }`}
                        >
                          <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                            includeYTD ? "translate-x-4" : ""
                          }`} />
                        </div>
                        <span className="text-xs font-medium text-zinc-600">Include YTD</span>
                      </label>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {dynamicSections.map(({ section, labels }) => (
                      <DynamicSectionSelector
                        key={section}
                        section={section}
                        labels={labels}
                        selectedDynamicFields={selectedDynamicFields}
                        onToggleDynamicField={onToggleDynamicField}
                        onToggleDynamicSection={onToggleDynamicSection}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4">
          <button
            onClick={onExport}
            disabled={exporting || noneSelected}
            className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded bg-indigo-600 py-3 text-base font-medium text-white transition-all hover:bg-indigo-500 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? (
              <>
                <LoadingSpinner />
                Generating {exportFormat.toUpperCase()}…
              </>
            ) : (
              <>
                <DownloadIcon />
                Download {editedData.length} paystub{editedData.length > 1 ? "s" : ""} as {exportFormat.toUpperCase()}
              </>
            )}
          </button>
          {noneSelected && (
            <p className="mt-2 text-center text-xs text-zinc-500">
              Select at least one field to export.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function FieldGroupSelector({
  group, selectedFields, onToggleField, onToggleGroup,
}: {
  group: ExportGroupDef;
  selectedFields: Set<string>;
  onToggleField: (key: string) => void;
  onToggleGroup: (group: ExportGroupDef) => void;
}) {
  const keys = group.fields.map((f) => f.key as string);
  const allOn  = keys.every((k) => selectedFields.has(k));
  const someOn = keys.some((k)  => selectedFields.has(k));

  return (
    <div className="rounded border border-[#eaeaea] bg-[#fafafa] p-3">
      <label className="flex cursor-pointer items-center gap-2 mb-2">
        <Checkbox checked={allOn} indeterminate={!allOn && someOn} onChange={() => onToggleGroup(group)} />
        <span className="text-xs font-medium text-black">{group.title}</span>
      </label>
      <div className="space-y-1.5 pl-1">
        {group.fields.map((f) => (
          <label key={f.key} className="flex cursor-pointer items-center gap-2">
            <Checkbox checked={selectedFields.has(f.key as string)} onChange={() => onToggleField(f.key as string)} />
            <span className="text-xs text-zinc-600">{f.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function DynamicSectionSelector({
  section, labels, selectedDynamicFields, onToggleDynamicField, onToggleDynamicSection,
}: {
  section: string;
  labels: string[];
  selectedDynamicFields: Set<string>;
  onToggleDynamicField: (label: string) => void;
  onToggleDynamicSection: (labels: string[]) => void;
}) {
  const allOn  = labels.every((l) => selectedDynamicFields.has(l));
  const someOn = labels.some((l)  => selectedDynamicFields.has(l));

  return (
    <div className="rounded border border-[#eaeaea] bg-[#fafafa] p-3">
      <label className="flex cursor-pointer items-center gap-2 mb-2">
        <Checkbox checked={allOn} indeterminate={!allOn && someOn} onChange={() => onToggleDynamicSection(labels)} />
        <span className="text-xs font-medium text-black">{section}</span>
        <span className="ml-auto text-[10px] text-[#666]">{labels.length}</span>
      </label>
      <div className="space-y-1.5 pl-1 max-h-40 overflow-y-auto">
        {labels.map((label) => (
          <label key={label} className="flex cursor-pointer items-center gap-2">
            <Checkbox checked={selectedDynamicFields.has(label)} onChange={() => onToggleDynamicField(label)} />
            <span className="text-xs text-zinc-600 truncate" title={label}>{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
