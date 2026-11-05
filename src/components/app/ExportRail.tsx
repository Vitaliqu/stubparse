"use client";

import { useState } from "react";
import { ChevronDown, Download, FileSpreadsheet, Braces, FileText, Columns3, Rows3 } from "lucide-react";
import type { ExportFormat } from "@/types/paystub";
import { EXPORT_GROUPS, HEADER_EXPORT_KEYS, type ExportGroupDef } from "@/lib/field-definitions";
import { Button, Checkbox, Segmented, Switch } from "@/components/ui";

interface DynamicSection { section: string; labels: string[] }

interface Props {
  count: number;
  format: ExportFormat;
  layout: "horizontal" | "vertical";
  selectedFields: Set<string>;
  selectedDynamic: Set<string>;
  dynamicSections: DynamicSection[];
  includeYTD: boolean;
  exporting: boolean;
  onFormat: (f: ExportFormat) => void;
  onLayout: (l: "horizontal" | "vertical") => void;
  onToggleField: (key: string) => void;
  onToggleGroup: (group: ExportGroupDef) => void;
  onToggleDynamic: (label: string) => void;
  onToggleSection: (labels: string[]) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onToggleYTD: () => void;
  onExport: () => void;
}

const FORMAT_NOTE: Record<ExportFormat, string> = {
  xlsx: "Styled headers and frozen panes.",
  csv: "Plain text for any spreadsheet or tool.",
  json: "Structured array, grouped by employee.",
};
const LAYOUT_NOTE = {
  horizontal: "One row per employee, periods as column groups.",
  vertical: "One row per stub, fields as columns.",
};

export function ExportRail(p: Props) {
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const totalDynamic = p.dynamicSections.reduce((a, s) => a + s.labels.length, 0);
  const total = HEADER_EXPORT_KEYS.length + totalDynamic;
  const selected = p.selectedFields.size + p.selectedDynamic.size;

  return (
    <section aria-labelledby="export-h" className="rounded-[14px] bg-paper ring-1 ring-line">
      <div className="px-4 pt-4 pb-3">
        <h2 id="export-h" className="text-[15px] font-semibold tracking-[-0.01em]">Export</h2>
        <p className="mt-0.5 text-[13px] text-muted">{p.count} stub{p.count === 1 ? "" : "s"} ready</p>
      </div>

      <div className="space-y-4 border-t border-line px-4 py-4">
        <div>
          <p className="mb-2 text-[12px] font-medium text-muted">Format</p>
          <Segmented
            label="Export format"
            value={p.format}
            onChange={p.onFormat}
            options={[
              { value: "xlsx", label: <><FileSpreadsheet aria-hidden className="size-3.5" strokeWidth={2} />XLSX</> },
              { value: "csv", label: <><FileText aria-hidden className="size-3.5" strokeWidth={2} />CSV</> },
              { value: "json", label: <><Braces aria-hidden className="size-3.5" strokeWidth={2} />JSON</> },
            ]}
          />
          <p className="mt-1.5 text-[12px] text-muted">{FORMAT_NOTE[p.format]}</p>
        </div>

        {p.format !== "json" && (
          <div>
            <p className="mb-2 text-[12px] font-medium text-muted">Layout</p>
            <Segmented
              label="Export layout"
              value={p.layout}
              onChange={p.onLayout}
              options={[
                { value: "horizontal", label: <><Columns3 aria-hidden className="size-3.5" strokeWidth={2} />Horizontal</> },
                { value: "vertical", label: <><Rows3 aria-hidden className="size-3.5" strokeWidth={2} />Vertical</> },
              ]}
            />
            <p className="mt-1.5 text-[12px] text-muted">{LAYOUT_NOTE[p.layout]}</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-medium" aria-hidden>Include year-to-date</span>
          <Switch checked={p.includeYTD} onChange={p.onToggleYTD} label="Include year-to-date" />
        </div>
      </div>

      <div className="border-t border-line">
        <button
          onClick={() => setFieldsOpen((v) => !v)}
          aria-expanded={fieldsOpen}
          className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-[13px] font-medium hover:bg-canvas/60"
        >
          <span>Fields <span className="tnum ml-1 font-normal text-muted">{selected} of {total}</span></span>
          <ChevronDown aria-hidden className={`size-4 text-muted transition-transform ${fieldsOpen ? "rotate-180" : ""}`} strokeWidth={2} />
        </button>
        {fieldsOpen && (
          <div className="max-h-[50vh] space-y-4 overflow-y-auto px-4 pb-4">
            <div className="flex gap-3 text-[12px]">
              <button onClick={p.onSelectAll} className="cursor-pointer font-medium hover:underline">Select all</button>
              <button onClick={p.onClearAll} className="cursor-pointer text-muted hover:underline">Clear</button>
            </div>
            {EXPORT_GROUPS.map((g) => {
              const keys = g.fields.map((f) => f.key as string);
              const all = keys.every((k) => p.selectedFields.has(k));
              const some = keys.some((k) => p.selectedFields.has(k));
              return (
                <FieldGroup key={g.id} title={g.title} all={all} some={some} onToggleAll={() => p.onToggleGroup(g)}>
                  {g.fields.map((f) => (
                    <FieldRow key={f.key} label={f.label} checked={p.selectedFields.has(f.key as string)} onChange={() => p.onToggleField(f.key as string)} />
                  ))}
                </FieldGroup>
              );
            })}
            {p.dynamicSections.map(({ section, labels }) => {
              const all = labels.every((l) => p.selectedDynamic.has(l));
              const some = labels.some((l) => p.selectedDynamic.has(l));
              return (
                <FieldGroup key={section} title={section} all={all} some={some} onToggleAll={() => p.onToggleSection(labels)}>
                  {labels.map((l) => <FieldRow key={l} label={l} checked={p.selectedDynamic.has(l)} onChange={() => p.onToggleDynamic(l)} />)}
                </FieldGroup>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-line p-4">
        <Button className="w-full" size="lg" onClick={p.onExport} loading={p.exporting} disabled={selected === 0}>
          {!p.exporting && <Download aria-hidden className="size-4" strokeWidth={2} />}
          {p.exporting ? `Preparing ${p.format.toUpperCase()}…` : `Download ${p.format.toUpperCase()}`}
        </Button>
        {selected === 0 && <p className="mt-2 text-center text-[12px] text-muted">Select at least one field to export.</p>}
      </div>
    </section>
  );
}

function FieldGroup({ title, all, some, onToggleAll, children }: { title: string; all: boolean; some: boolean; onToggleAll: () => void; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2.5 pb-1.5">
        <Checkbox checked={all} indeterminate={!all && some} onChange={onToggleAll} label={`All ${title}`} />
        <span className="text-[13px] font-semibold">{title}</span>
      </div>
      <div className="space-y-1 pl-[28px]">{children}</div>
    </div>
  );
}

function FieldRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center gap-2.5">
      <Checkbox checked={checked} onChange={onChange} label={label} />
      <span className="truncate text-[13px] text-ink-2" title={label}>{label}</span>
    </div>
  );
}
