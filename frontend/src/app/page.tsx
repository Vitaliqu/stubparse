"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { PaystubData, FileResult, ExportFormat, ToastMessage, DynamicField } from "@/types/paystub";
import { HEADER_EXPORT_KEYS, type ExportGroupDef } from "@/lib/field-definitions";
import { isAcceptedFile, isImageFile } from "@/lib/file-utils";
import { Toast } from "@/components/ui";
import { UploadSection } from "@/components/UploadSection";
import { ResultsSection } from "@/components/ResultsSection";
import { ExportPanel } from "@/components/ExportPanel";

const JOBS_URL   = "/api/backend/jobs";
const STREAM_URL = "/api/backend/stream";

/** Strip $ and thousands commas from a monetary string: "$1,234.56" → "1234.56" */
function stripCurrency(v: unknown): string {
  if (v !== null && typeof v === "object") {
    // Flatten objects like {hours: "8", balance: "40"} → "hours: 8, balance: 40"
    return Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `${k}: ${val}`)
      .join(", ");
  }
  return String(v ?? "").replace(/^\$/, "").replace(/,/g, "");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pushIfSet(fields: DynamicField[], section: string, label: string, value: unknown, ytd = "") {
  if (value !== null && value !== undefined && value !== "") {
    fields.push({ section, label, value: stripCurrency(value), ytd: ytd ? stripCurrency(ytd) : "" });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBackendResult(result: any, fileName: string): PaystubData {
  const d = result.extracted_data ?? {};
  const fields: DynamicField[] = [];

  // Earnings / Taxes / Deductions — with YTD
  for (const e of (d.earnings ?? [])) {
    if (!e.description) continue;
    const hasHours = !!e.hours;
    const payLabel = hasHours
      ? e.description.replace(/\bHours?\b/i, "Pay").trim() || e.description
      : e.description;
    fields.push({ section: "Earnings", label: payLabel, value: stripCurrency(e.current_amount), ytd: stripCurrency(e.ytd_amount) });
    if (hasHours) fields.push({ section: "Earnings", label: e.description, value: String(e.hours), ytd: "" });
  }
  for (const t of (d.taxes ?? [])) {
    if (t.description) fields.push({ section: "Taxes", label: t.description, value: stripCurrency(t.current_amount), ytd: stripCurrency(t.ytd_amount) });
  }
  for (const dd of (d.deductions ?? [])) {
    if (dd.description) fields.push({ section: "Deductions", label: dd.description, value: stripCurrency(dd.current_amount), ytd: stripCurrency(dd.ytd_amount) });
  }

  // Totals — current + YTD pairs
  const tot = d.totals ?? {};
  pushIfSet(fields, "Totals", "Gross Pay",        tot.gross_pay_current,        tot.gross_pay_ytd        ?? "");
  pushIfSet(fields, "Totals", "Net Pay",          tot.net_pay_current,          tot.net_pay_ytd          ?? "");
  pushIfSet(fields, "Totals", "Total Taxes",      tot.total_taxes_current,      tot.total_taxes_ytd      ?? "");
  pushIfSet(fields, "Totals", "Total Deductions", tot.total_deductions_current, tot.total_deductions_ytd ?? "");

  // Employee extras
  const empl = d.employee ?? {};
  pushIfSet(fields, "Employee", "Employee ID", empl.employee_id);
  pushIfSet(fields, "Employee", "Department",  empl.department);
  pushIfSet(fields, "Employee", "Position",    empl.position);
  pushIfSet(fields, "Employee", "SSN Last 4",  empl.ssn_last4);
  pushIfSet(fields, "Employee", "Address",     empl.address);

  // Employer
  const er = d.employer ?? {};
  pushIfSet(fields, "Employer", "Employer Name",    er.name);
  pushIfSet(fields, "Employer", "Employer Address", er.address);
  pushIfSet(fields, "Employer", "EIN",              er.ein);
  pushIfSet(fields, "Employer", "Employer Phone",   er.phone);

  // Check number / notes
  pushIfSet(fields, "Other", "Check Number", d.check_number);
  pushIfSet(fields, "Other", "Notes",        d.raw_notes);

  // Extra fields: pair *_current/*_ytd keys as Earnings rows; rest go to Other
  const toTitleCase = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const extra = d.extra_fields ?? {};
  const usedExtraKeys = new Set<string>();
  for (const k of Object.keys(extra)) {
    if (usedExtraKeys.has(k) || !k.endsWith("_current")) continue;
    const base   = k.slice(0, -"_current".length);
    const ytdKey = `${base}_ytd`;
    fields.push({ section: "Earnings", label: toTitleCase(base), value: stripCurrency(extra[k]), ytd: stripCurrency(extra[ytdKey] ?? "") });
    usedExtraKeys.add(k);
    usedExtraKeys.add(ytdKey);
  }
  for (const [k, v] of Object.entries(extra)) {
    if (!usedExtraKeys.has(k)) pushIfSet(fields, "Other", toTitleCase(k), v);
  }

  return {
    fileName,
    name: empl.name ?? "",
    payPeriodStart: d.pay_period?.start_date ?? "",
    payPeriodEnd:   d.pay_period?.end_date   ?? "",
    checkDate:      d.pay_period?.pay_date   ?? "",
    payoutMethod:   (() => {
      const fromExtra = Object.entries(extra).find(([k]) =>
        /payout|payment.?method|bank|direct.?deposit/i.test(k)
      );
      return String(fromExtra?.[1] ?? d.pay_period?.pay_frequency ?? "");
    })(),
    grossPay: stripCurrency(tot.gross_pay_current),
    netPay:   stripCurrency(tot.net_pay_current),
    fields,
  };
}

async function parseWithBackend(file: File, report: (msg: string) => void): Promise<{ data: PaystubData; rawText: string }> {
  report("Uploading to AI server…");
  const form = new FormData();
  form.append("file", file);
  const jobRes = await fetch(JOBS_URL, { method: "POST", body: form });
  if (!jobRes.ok) throw new Error(`Backend error: ${jobRes.status} ${jobRes.statusText}`);
  const { job_id } = await jobRes.json();

  return new Promise((resolve, reject) => {
    let rawText = "";
    const es = new EventSource(`${STREAM_URL}/${job_id}`);
    es.addEventListener("start", () => report("AI extraction started…"));
    es.addEventListener("ocr_preview", (e: MessageEvent) => {
      rawText = JSON.parse(e.data).raw_text ?? "";
      report("Text extracted, running AI…");
    });
    es.addEventListener("layer_start", (e: MessageEvent) => {
      const d = JSON.parse(e.data);
      report(`Layer ${d.layer}: ${d.name}…`);
    });
    es.addEventListener("result", (e: MessageEvent) => {
      es.close();
      resolve({ data: mapBackendResult(JSON.parse(e.data), file.name), rawText });
    });
    es.addEventListener("parse_error", (e: MessageEvent) => {
      es.close();
      reject(new Error(JSON.parse(e.data).message ?? "Backend parse error"));
    });
    es.addEventListener("done", () => es.close());
    es.onerror = () => { es.close(); reject(new Error("Lost connection to AI server")); };
  });
}

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [results, setResults] = useState<FileResult[]>([]);
  const [editedData, setEditedData] = useState<PaystubData[]>([]);

  const [aiMode, setAiMode] = useState(false);

  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<ToastMessage>(null);

  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("xlsx");
  const [exportLayout, setExportLayout] = useState<"horizontal" | "vertical">("horizontal");
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(HEADER_EXPORT_KEYS));
  const [selectedDynamicFields, setSelectedDynamicFields] = useState<Set<string>>(new Set());
  const [includeYTD, setIncludeYTD] = useState(true);
  const [showFieldSelector, setShowFieldSelector] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);
  const previewUrls = useRef<Map<string, string>>(new Map());
  const pdfPreviews = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const imgs = previewUrls.current;
    const pdfs = pdfPreviews.current;
    return () => {
      imgs.forEach((url) => URL.revokeObjectURL(url));
      pdfs.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const showToast = useCallback((t: ToastMessage) => {
    setToast(t);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const getPreview = (file: File): string => {
    const key = `${file.name}::${file.size}`;
    if (!previewUrls.current.has(key)) {
      previewUrls.current.set(key, URL.createObjectURL(file));
    }
    return previewUrls.current.get(key)!;
  };

  const revokeFilePreview = (file: File) => {
    const key = `${file.name}::${file.size}`;
    if (isImageFile(file)) {
      const url = previewUrls.current.get(key);
      if (url) { URL.revokeObjectURL(url); previewUrls.current.delete(key); }
    } else {
      const url = pdfPreviews.current.get(key);
      if (url) { URL.revokeObjectURL(url); pdfPreviews.current.delete(key); }
    }
  };

  const dynamicSections = useMemo(() => {
    const map = new Map<string, string[]>();
    const seen = new Map<string, Set<string>>();
    for (const row of editedData) {
      for (const f of row.fields) {
        if (!seen.has(f.section)) { seen.set(f.section, new Set()); map.set(f.section, []); }
        if (!seen.get(f.section)!.has(f.label)) {
          seen.get(f.section)!.add(f.label);
          map.get(f.section)!.push(f.label);
        }
      }
    }
    return [...map.entries()].map(([section, labels]) => ({ section, labels }));
  }, [editedData]);

  const addFiles = useCallback((incoming: File[]) => {
    const valid = incoming.filter(isAcceptedFile);
    const invalidCount = incoming.length - valid.length;
    if (invalidCount > 0) {
      showToast({ type: "warning", msg: `${invalidCount} unsupported file${invalidCount > 1 ? "s" : ""} ignored.` });
    }
    setFiles((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.name}::${f.size}`));
      const duplicates: string[] = [];
      const fresh = valid.filter((f) => {
        const key = `${f.name}::${f.size}`;
        if (existingKeys.has(key)) { duplicates.push(f.name); return false; }
        return true;
      });
      if (duplicates.length) {
        showToast({ type: "warning", msg: `Duplicate${duplicates.length > 1 ? "s" : ""} skipped: ${duplicates.join(", ")}` });
      }
      if (!fresh.length) return prev;
      setResults([]);
      setEditedData([]);
      return [...prev, ...fresh];
    });
  }, [showToast]);

  const removeFile = (index: number) => {
    const file = files[index];
    revokeFilePreview(file);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setResults([]);
    setEditedData([]);
  };

  const clearAllFiles = () => {
    files.forEach(revokeFilePreview);
    setFiles([]);
    setResults([]);
    setEditedData([]);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const handleParse = async () => {
    if (!files.length) return;
    setLoading(true);
    setProgress("Starting…");

    try {
      const fileResults: FileResult[] = [];

      for (let idx = 0; idx < files.length; idx++) {
        const file = files[idx];
        const prefix = files.length > 1 ? `[${idx + 1}/${files.length}] ` : "";
        const report = (msg: string) => setProgress(prefix + msg);

        try {
          if (aiMode) {
            // ── Backend AI mode ────────────────────────────────────────────
            const isPDF = file.type === "application/pdf";
            const { data, rawText } = await parseWithBackend(file, report);
            let previewUrl: string | undefined;
            if (isPDF) {
              const { generatePdfPreview } = await import("@/lib/pdf-extractor");
              previewUrl = await generatePdfPreview(file).catch(() => undefined);
              if (previewUrl) pdfPreviews.current.set(`${file.name}::${file.size}`, previewUrl);
            } else {
              previewUrl = getPreview(file);
            }
            fileResults.push({
              success: true,
              fileName: file.name,
              fileType: isPDF ? "pdf" : "image",
              data,
              rawText,
              aiFieldCount: data.fields.length,
              previewUrl,
            });
          } else {
            // ── Client-side mode ───────────────────────────────────────────
            const { parsePaystubText } = await import("@/lib/regex-parser");
            const { extractPdfText, generatePdfPreview } = await import("@/lib/pdf-extractor");
            const { extractImageText } = await import("@/lib/image-ocr");
            const isPDF = file.type === "application/pdf";

            report(isPDF ? "Extracting PDF text…" : "Preprocessing image…");
            const rawText = isPDF
              ? await extractPdfText(file, report)
              : await extractImageText(file, report);

            report("Parsing fields…");
            const data = parsePaystubText(rawText, file.name);

            let previewUrl: string | undefined;
            if (isPDF) {
              previewUrl = await generatePdfPreview(file).catch(() => undefined);
              if (previewUrl) pdfPreviews.current.set(`${file.name}::${file.size}`, previewUrl);
            } else {
              previewUrl = getPreview(file);
            }

            fileResults.push({
              success: true,
              fileName: file.name,
              fileType: isPDF ? "pdf" : "image",
              data,
              rawText,
              previewUrl,
            });
          }
        } catch (err) {
          fileResults.push({
            success: false,
            fileName: file.name,
            error: err instanceof Error ? err.message : "Parse failed",
            data: null,
            rawText: "",
          });
        }
      }

      setResults(fileResults);
      const parsed = fileResults.filter((r) => r.success && r.data).map((r) => ({ ...r.data! }));
      setEditedData(parsed);

      const allLabels = new Set<string>();
      for (const r of fileResults) {
        if (r.data) r.data.fields.forEach((f) => allLabels.add(f.label));
      }
      setSelectedDynamicFields(allLabels);

      if (fileResults.length === 1 && fileResults[0].success) {
        setExpandedCards(new Set([fileResults[0].fileName]));
      }

      showToast({
        type: "success",
        msg: `Parsed ${parsed.length} of ${fileResults.length} file${fileResults.length > 1 ? "s" : ""} successfully.`,
      });

      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      showToast({ type: "error", msg: err instanceof Error ? err.message : "Parse failed" });
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const updateHeaderField = (dataIndex: number, key: keyof PaystubData, value: string) => {
    setEditedData((prev) =>
      prev.map((row, i) => (i === dataIndex ? { ...row, [key]: value } : row))
    );
  };

  const updateDynamicField = (
    dataIndex: number,
    fieldIndex: number,
    col: "value" | "ytd",
    value: string,
  ) => {
    setEditedData((prev) =>
      prev.map((row, i) => {
        if (i !== dataIndex) return row;
        const fields = [...row.fields];
        fields[fieldIndex] = { ...fields[fieldIndex], [col]: value };
        return { ...row, fields };
      })
    );
  };

  const handleExport = async () => {
    if (!editedData.length) return;
    setExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: editedData,
          format: exportFormat,
          layout: exportLayout,
          fields: [...selectedFields],
          dynamicLabels: [...selectedDynamicFields],
          includeYTD,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        showToast({ type: "error", msg: j.error ?? "Export failed" });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `paystubs.${exportFormat}`; link.click();
      URL.revokeObjectURL(url);
      showToast({ type: "success", msg: `Downloaded paystubs.${exportFormat}` });
    } catch {
      showToast({ type: "error", msg: "Network error during export" });
    } finally {
      setExporting(false);
    }
  };

  const toggleField = (key: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next;
    });
  };

  const toggleGroup = (group: ExportGroupDef) => {
    const keys = group.fields.map((f) => f.key as string);
    const allOn = keys.every((k) => selectedFields.has(k));
    setSelectedFields((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => (allOn ? next.delete(k) : next.add(k)));
      return next;
    });
  };

  const toggleDynamicField = (label: string) => {
    setSelectedDynamicFields((prev) => {
      const next = new Set(prev); next.has(label) ? next.delete(label) : next.add(label); return next;
    });
  };

  const toggleDynamicSection = (labels: string[]) => {
    setSelectedDynamicFields((prev) => {
      const allOn = labels.every((l) => prev.has(l));
      const next = new Set(prev);
      labels.forEach((l) => (allOn ? next.delete(l) : next.add(l)));
      return next;
    });
  };

  const selectAllFields = () => {
    setSelectedFields(new Set(HEADER_EXPORT_KEYS));
    setSelectedDynamicFields(new Set(dynamicSections.flatMap((s) => s.labels)));
  };

  const clearAllFields = () => {
    setSelectedFields(new Set());
    setSelectedDynamicFields(new Set());
  };

  const toggleExpand = (fileName: string, index: number) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(fileName)) { next.delete(fileName); }
      else {
        next.add(fileName);
        setTimeout(() => document.getElementById(`card-${index}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      }
      return next;
    });
  };

  const expandAll = () => setExpandedCards(new Set(results.filter((r) => r.success).map((r) => r.fileName)));
  const collapseAll = () => setExpandedCards(new Set());

  const hasResults = results.some((r) => r.success && r.data) || results.some((r) => !r.success);

  return (
    <div className="bg-white font-sans">
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}

      <UploadSection
        files={files}
        dragging={dragging}
        loading={loading}
        progress={progress}
        aiMode={aiMode}
        onToggleAI={() => setAiMode((v) => !v)}
        onAddFiles={addFiles}
        onRemoveFile={removeFile}
        onClearAll={clearAllFiles}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onParse={handleParse}
        getPreview={getPreview}
      />

      {hasResults && (
        <ResultsSection
          results={results}
          editedData={editedData}
          expandedCards={expandedCards}
          containerRef={resultsRef}
          onToggleExpand={toggleExpand}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
          onUpdateHeader={updateHeaderField}
          onUpdateDynamic={updateDynamicField}
        />
      )}

      {editedData.length > 0 && (
        <ExportPanel
          editedData={editedData}
          exportFormat={exportFormat}
          exportLayout={exportLayout}
          selectedFields={selectedFields}
          selectedDynamicFields={selectedDynamicFields}
          dynamicSections={dynamicSections}
          includeYTD={includeYTD}
          showFieldSelector={showFieldSelector}
          exporting={exporting}
          onSetFormat={setExportFormat}
          onSetLayout={setExportLayout}
          onToggleField={toggleField}
          onToggleGroup={toggleGroup}
          onToggleDynamicField={toggleDynamicField}
          onToggleDynamicSection={toggleDynamicSection}
          onSelectAllFields={selectAllFields}
          onClearAllFields={clearAllFields}
          onToggleYTD={() => setIncludeYTD((v) => !v)}
          onToggleFieldSelector={() => setShowFieldSelector((v) => !v)}
          onExport={handleExport}
        />
      )}

      <FeatureGrid />
      <Footer />
    </div>
  );
}

function FeatureGrid() {
  const features = [
    {
      title: "100% Free Forever",
      desc: "No hidden fees, no subscriptions, no token costs. Free now and always.",
      dot: "bg-emerald-500",
    },
    {
      title: "No Data Stored",
      desc: "Basic mode runs fully in your browser. AI mode sends files to our server for processing — nothing is stored after parsing.",
      dot: "bg-sky-500",
    },
    {
      title: "Multi-Format Export",
      desc: "Download as Excel (pivoted by date), CSV, or JSON — whichever fits your workflow.",
      dot: "bg-indigo-500",
    },
    {
      title: "PDF & Image Support",
      desc: "Upload PDFs or scanned images (PNG, JPG, WEBP). Advanced OCR extracts text automatically.",
      dot: "bg-amber-400",
    },
  ];

  return (
    <section className="border-t border-[#eaeaea] bg-white py-16">
      <div className="mx-auto max-w-5xl px-4">
        <div className="text-center mb-10">
          <h2 className="text-xl font-semibold text-black">Why use StubParse?</h2>
          <p className="mt-2 text-[#666] text-sm">
            Everything you need to process payroll data — nothing you don&apos;t.
          </p>
        </div>
        <div className="grid gap-px border border-[#eaeaea] rounded-md sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="bg-white p-6">
              <div className={`h-2 w-2 rounded-full ${f.dot} mb-3`} />
              <h3 className="text-sm font-medium text-black">{f.title}</h3>
              <p className="mt-1.5 text-xs text-[#666] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#eaeaea] bg-white py-8">
      <div className="mx-auto max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#666]">
        <span className="font-medium text-black">StubParse</span>
        <span>Supports Square Payroll · Gusto · ADP · Paychex · Intuit QuickBooks and more.</span>
        <span>© {new Date().getFullYear()} stubparse.com</span>
      </div>
    </footer>
  );
}
