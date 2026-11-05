"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownToLine, FileText, ImageIcon, X, Sparkles, ScanText, Lock, LineChart, Check } from "lucide-react";
import type { PaystubData, FileResult, ExportFormat, ToastMessage } from "@/types/paystub";
import { HEADER_EXPORT_KEYS, type ExportGroupDef } from "@/lib/field-definitions";
import { isAcceptedFile, isImageFile } from "@/lib/file-utils";
import { consumeBasicDocument, parseWithAI, parseWithBasic, QuotaError } from "@/lib/parse-client";
import { clearPendingFiles, peekPendingFiles } from "@/lib/pending-files";
import { redirectToStripe } from "@/lib/billing";
import { useAuth } from "@/lib/auth-context";
import { canUse, FREE_DOCUMENTS, TIERS } from "@/lib/plan";
import { historyScope, saveDocument, updateDocument, loadDocuments } from "@/lib/history";
import { usePrefs } from "@/lib/prefs";
import { analyzeSeries, analyzeStub, type FileSignals, type Signal } from "@/lib/integrity";
import { track } from "@/lib/analytics";
import { stashReport } from "@/lib/report-stash";
import { Button, Segmented, Toast } from "@/components/ui";
import { PaystubCard } from "@/components/app/PaystubCard";
import { ExportRail } from "@/components/app/ExportRail";

interface Item {
  id: string;
  result: FileResult;
  data: PaystubData | null;
  savedId?: string;
  label?: string;
}

const fileKey = (f: File) => `${f.name}::${f.size}::${f.lastModified}`;
/** Files are read in the browser, so this guards memory and OCR time, not upload size. */
const MAX_FILE_MB = 25;
const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0);

export default function WorkspacePage() {
  return (
    <Suspense>
      <Workspace />
    </Suspense>
  );
}

function Workspace() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, account, authedFetch } = useAuth();
  const [prefs] = usePrefs(user?.uid);
  const [batchLabel, setBatchLabel] = useState("");

  // Files dropped on the landing page before sign-in start in the queue (validated when dropped)
  const [queue, setQueue] = useState<File[]>(() => [...peekPendingFiles()]);
  const [items, setItems] = useState<Item[]>([]);
  const [aiMode, setAiMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [dragging, setDragging] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<ToastMessage>(null);
  const [limitHit, setLimitHit] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [layout, setLayout] = useState<"horizontal" | "vertical">("horizontal");
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(HEADER_EXPORT_KEYS));
  const [selectedDynamic, setSelectedDynamic] = useState<Set<string>>(new Set());
  const [includeYTD, setIncludeYTD] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const urls = useRef<string[]>([]);

  const isPaid = !!account && account.plan !== "free";
  const isBusiness = canUse(account?.plan, "integrity");
  const saving = isPaid && prefs.saveHistory;
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const scope = useMemo(() => (user ? historyScope(user.uid, account) : null), [user, account]);
  const freeLeft = account?.freeRemaining ?? FREE_DOCUMENTS;
  const outOfFree = !!account && !isPaid && freeLeft === 0;

  const showToast = useCallback((t: ToastMessage) => {
    setToast(t);
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const addFiles = useCallback((incoming: File[]) => {
    const accepted = incoming.filter(isAcceptedFile);
    const tooBig = accepted.filter((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    const valid = accepted.filter((f) => f.size <= MAX_FILE_MB * 1024 * 1024);
    const wrongType = incoming.length - accepted.length;
    if (tooBig.length) {
      showToast({ type: "warning", msg: tooBig.length === 1
        ? `${tooBig[0].name} is ${mb(tooBig[0].size)} MB. Files up to ${MAX_FILE_MB} MB are supported; try exporting a smaller PDF or a lower-resolution scan.`
        : `${tooBig.length} files are over ${MAX_FILE_MB} MB and were skipped. Try smaller PDFs or lower-resolution scans.` });
    } else if (wrongType) {
      showToast({ type: "warning", msg: `${wrongType} file${wrongType > 1 ? "s" : ""} skipped. Use PDF, PNG, JPG, WEBP, BMP, or TIFF.` });
    }
    setQueue((prev) => {
      const keys = new Set(prev.map(fileKey));
      return [...prev, ...valid.filter((f) => !keys.has(fileKey(f)))];
    });
  }, [showToast]);

  useEffect(() => clearPendingFiles(), []);

  useEffect(() => {
    if (params.get("upgraded") === "1") {
      router.replace("/app");
      // Confirm the subscription with Stripe directly instead of waiting for the webhook.
      authedFetch("/api/stripe/sync", { method: "POST" })
        .then((r) => (r.ok ? r.json() : null))
        .then((s) => showToast(s?.plan && s.plan !== "free"
          ? { type: "success", msg: `Welcome to ${s.plan === "business" ? "Business" : "Pro"}. Parse as many stubs as you need.` }
          : { type: "warning", msg: "Payment received. Your plan will update in a moment." }))
        .catch(() => {});
    }
  }, [params, router, showToast, authedFetch]);

  // Open stubs from history: /app?open=id1,id2
  useEffect(() => {
    const open = params.get("open");
    if (!open || !scope) return;
    router.replace("/app");
    loadDocuments(scope, open.split(",").filter(Boolean)).then((docs) => {
      const loaded: Item[] = docs.map((d) => ({
        id: `saved::${d.id}`,
        savedId: d.id,
        label: d.label,
        data: d.data,
        result: { success: true, fileName: d.fileName, fileType: d.fileType, data: null /* no pristine copy: earlier edits are indistinguishable from AI values */, rawText: "", fileSignals: d.fileSignals, ...(d.mode === "ai" ? { aiFieldCount: d.data.fields.length } : {}) },
      }));
      setItems((prev) => [...loaded, ...prev.filter((p) => !loaded.some((l) => l.id === p.id))]);
      setSelectedDynamic((prev) => { const n = new Set(prev); loaded.forEach((l) => l.data!.fields.forEach((f) => n.add(f.label))); return n; });
      if (loaded.length === 1) setExpanded(new Set([loaded[0].id]));
    }).catch(() => showToast({ type: "error", msg: "Couldn't open those stubs from history." }));
  }, [params, scope, router, showToast]);

  const upgrade = async () => {
    setUpgrading(true);
    try {
      await redirectToStripe(authedFetch, "checkout");
    } catch (e) {
      showToast({ type: "error", msg: e instanceof Error ? e.message : "Couldn't start checkout." });
      setUpgrading(false);
    }
  };

  const preview = async (file: File): Promise<string | undefined> => {
    let url: string | undefined;
    if (isImageFile(file)) url = URL.createObjectURL(file);
    else {
      const { generatePdfPreview } = await import("@/lib/pdf-extractor");
      url = await generatePdfPreview(file).catch(() => undefined);
    }
    if (url) urls.current.push(url);
    return url;
  };

  const parse = async () => {
    if (!queue.length || loading) return;
    setLoading(true);
    const batch = [...queue];
    const done: Item[] = [];
    let blocked = false;

    for (let i = 0; i < batch.length; i++) {
      const file = batch[i];
      const id = `${fileKey(file)}::${Date.now()}`;
      const report = (msg: string) => setProgress(`${batch.length > 1 ? `${i + 1} of ${batch.length} · ` : ""}${msg}`);
      const isPDF = file.type === "application/pdf";

      if (blocked) {
        done.push({ id, data: null, result: { success: false, fileName: file.name, rawText: "", data: null, error: "Not parsed. You've used your free documents." } });
        continue;
      }
      try {
        let parsed: { data: PaystubData; rawText: string };
        if (aiMode) {
          parsed = await parseWithAI(file, report, authedFetch);
        } else {
          await consumeBasicDocument(authedFetch);
          parsed = await parseWithBasic(file, report);
        }
        const fileSignals = await readFileSignals(file);
        const result: FileResult = {
          success: true, fileName: file.name, fileType: isPDF ? "pdf" : "image",
          data: parsed.data, rawText: parsed.rawText, previewUrl: await preview(file), fileSignals,
          ...(aiMode ? { aiFieldCount: parsed.data.fields.length } : {}),
        };
        const label = batchLabel.trim().slice(0, 120);
        done.push({ id, result, data: parsed.data, label });
        if (saving && scope && user) {
          // Save in the background so a slow connection never holds up parsing.
          const saveScope = scope;
          saveDocument(saveScope, {
            fileName: file.name, fileType: isPDF ? "pdf" : "image", mode: aiMode ? "ai" : "basic",
            label, data: parsed.data, fileSignals,
          }, { retentionMonths: prefs.retentionMonths, email: user.email })
            .then((savedId) => setItems((prev) => prev.map((it) => {
              if (it.id !== id) return it;
              // Edits made while the save was in flight: push them now (idempotent if repeated).
              if (it.data && it.data !== parsed.data) updateDocument(saveScope, savedId, { data: it.data }).catch(() => {});
              return { ...it, savedId };
            })))
            .catch(() => showToast({ type: "warning", msg: `Couldn't save ${file.name} to history. It's still here to export.` }));
        }
      } catch (err) {
        if (err instanceof QuotaError) { blocked = true; setLimitHit(true); track("limit_reached"); }
        done.push({ id, data: null, result: { success: false, fileName: file.name, rawText: "", data: null, error: err instanceof Error ? err.message : "Couldn't parse this file." } });
      }
    }

    setItems((prev) => [...done, ...prev]);
    setQueue([]);
    const ok = done.filter((d) => d.data);
    setSelectedDynamic((prev) => {
      const next = new Set(prev);
      ok.forEach((d) => d.data!.fields.forEach((f) => next.add(f.label)));
      return next;
    });
    if (ok.length === 1) setExpanded(new Set([ok[0].id]));
    setLoading(false);
    setProgress("");
    track("parse_completed", { files: done.length, parsed: ok.length, mode: aiMode ? "ai" : "basic" });
    const savedNote = saving && ok.length ? " Saving to history." : "";
    if (ok.length) showToast({ type: ok.length === done.length ? "success" : "warning", msg: `Parsed ${ok.length} of ${done.length} file${done.length > 1 ? "s" : ""}.${savedNote}` });
    else if (!blocked) showToast({ type: "error", msg: "No files could be parsed." });
  };

  const updateData = (id: string, fn: (d: PaystubData) => PaystubData) =>
    setItems((prev) => prev.map((it) => {
      if (it.id !== id || !it.data) return it;
      const data = fn(it.data);
      // Persist edits to history, debounced per stub
      if (it.savedId && scope) {
        const savedId = it.savedId;
        clearTimeout(saveTimers.current.get(id));
        saveTimers.current.set(id, setTimeout(() => updateDocument(scope, savedId, { data }).catch(() => {}), 900));
      }
      return { ...it, data };
    }));

  const parsed = items.filter((it) => it.data);
  const failed = items.filter((it) => !it.data);

  // Integrity signals per stub, plus cross-stub YTD checks for each employee (Business)
  const integrity = useMemo(() => {
    const map = new Map<string, Signal[]>();
    if (!isBusiness) return map;
    const byEmployee = new Map<string, Item[]>();
    for (const it of parsed) {
      map.set(it.id, analyzeStub(it.data!, it.result.fileSignals ?? null));
      const key = (it.data!.name || "").trim().toLowerCase();
      if (key) byEmployee.set(key, [...(byEmployee.get(key) ?? []), it]);
    }
    for (const group of byEmployee.values()) {
      if (group.length < 2) continue;
      for (const sig of analyzeSeries(group.map((g) => g.data!))) {
        const it = group.find((g) => sig.detail.startsWith(`${g.data!.checkDate}:`));
        if (it) map.set(it.id, [...(map.get(it.id) ?? []), sig]);
      }
    }
    return map;
  }, [parsed, isBusiness]);

  const openReport = () => {
    stashReport(parsed.map((it) => it.data!));
    track("report_created", { stubs: parsed.length });
    router.push("/app/report");
  };

  const dynamicSections = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const it of parsed) for (const f of it.data!.fields) {
      if (!map.has(f.section)) map.set(f.section, []);
      if (!map.get(f.section)!.includes(f.label)) map.get(f.section)!.push(f.label);
    }
    return [...map.entries()].map(([section, labels]) => ({ section, labels }));
  }, [parsed]);

  const exportFile = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: parsed.map((it) => it.data), format, layout,
          fields: [...selectedFields], dynamicLabels: [...selectedDynamic], includeYTD,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Export failed. Try again.");
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url; a.download = `paystubs.${format}`; a.click();
      URL.revokeObjectURL(url);
      showToast({ type: "success", msg: `Downloaded paystubs.${format}` });
      track("export_downloaded", { format, layout, stubs: parsed.length });
    } catch (e) {
      showToast({ type: "error", msg: e instanceof Error ? e.message : "Export failed." });
    } finally {
      setExporting(false);
    }
  };

  const toggle = <T,>(set: React.Dispatch<React.SetStateAction<Set<T>>>, v: T) =>
    set((prev) => { const n = new Set(prev); if (n.has(v)) n.delete(v); else n.add(v); return n; });

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const hasWork = queue.length > 0 || items.length > 0;
  const overQuota = !isPaid && account && queue.length > freeLeft && freeLeft > 0;

  return (
    <div
      className="ws-grid mx-auto grid max-w-[1440px] gap-x-6 gap-y-4 px-4 py-6 sm:px-6 lg:py-8"
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }}
      onDrop={onDrop}
    >
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
      <input
        ref={inputRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp,.tiff,.tif" className="sr-only" tabIndex={-1} aria-hidden
        onChange={(e) => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = ""; }}
      />

      <div className="min-w-0 space-y-4 [grid-area:intake]">
        {(outOfFree || limitHit) && !isPaid && <Paywall onUpgrade={upgrade} upgrading={upgrading} />}

        <Dropzone compact={hasWork} dragging={dragging} disabled={outOfFree} onBrowse={() => inputRef.current?.click()} />

        {queue.length > 0 && (
          <Queue files={queue} disabled={loading} onRemove={(i) => setQueue((q) => q.filter((_, j) => j !== i))} onClear={() => setQueue([])} />
        )}

        {failed.map((it) => (
          <div key={it.id} role="alert" className="flex items-start gap-3 rounded-[14px] bg-paper px-4 py-3 ring-1 ring-line">
            <span className="mt-1 size-2 shrink-0 rounded-full bg-bad" aria-hidden />
            <p className="min-w-0 flex-1 text-[14px]"><span className="font-medium">{it.result.fileName}</span> <span className="text-muted">— {it.result.error}</span></p>
            <button onClick={() => setItems((p) => p.filter((x) => x.id !== it.id))} aria-label={`Dismiss ${it.result.fileName}`} className="cursor-pointer rounded-md p-1 text-muted hover:bg-canvas hover:text-ink">
              <X className="size-4" strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>

      <div className="min-w-0 [grid-area:results]">
        {parsed.length > 0 && (
          <section aria-labelledby="results-h" className="space-y-3 pt-2">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="results-h" className="text-[20px] font-semibold tracking-[-0.02em]">
                Results <span className="tnum font-normal text-muted">{parsed.length}</span>
              </h2>
              <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[13px]">
                {isBusiness ? (
                  <button onClick={openReport} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 font-medium ring-1 ring-line hover:bg-paper">
                    <LineChart aria-hidden className="size-3.5" strokeWidth={2} /> Income report
                  </button>
                ) : (
                  <Link href="/pricing" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-muted ring-1 ring-line hover:bg-paper hover:text-ink">
                    <Lock aria-hidden className="size-3.5" strokeWidth={2} /> Income report
                  </Link>
                )}
                <button onClick={() => setExpanded(new Set(parsed.map((p) => p.id)))} className="cursor-pointer font-medium hover:underline">Expand all</button>
                <button onClick={() => setExpanded(new Set())} className="cursor-pointer text-muted hover:underline">Collapse</button>
                <button onClick={() => { setItems([]); setExpanded(new Set()); }} className="cursor-pointer text-muted hover:text-bad hover:underline">Clear</button>
              </div>
            </div>
            {parsed.map((it, i) => (
              <PaystubCard
                key={it.id}
                index={i}
                result={it.result}
                data={it.data!}
                label={it.label}
                saved={!!it.savedId}
                integrity={isBusiness ? integrity.get(it.id) ?? [] : null}
                expanded={expanded.has(it.id)}
                onToggle={() => toggle(setExpanded, it.id)}
                onUpdateHeader={(key, value) => updateData(it.id, (d) => ({ ...d, [key]: value }))}
                onUpdateField={(fi, col, value) => updateData(it.id, (d) => {
                  const fields = [...d.fields];
                  fields[fi] = { ...fields[fi], [col]: value };
                  const f = fields[fi];
                  // Keep the header totals in step with the Totals rows they mirror
                  const patch: Partial<PaystubData> = {};
                  if (col === "value" && f.section === "Totals" && /^gross pay$/i.test(f.label)) patch.grossPay = value;
                  if (col === "value" && f.section === "Totals" && /^net pay$/i.test(f.label)) patch.netPay = value;
                  return { ...d, ...patch, fields };
                })}
              />
            ))}
          </section>
        )}
      </div>

      <aside className="space-y-4 self-start [grid-area:rail] lg:sticky lg:top-[80px]" aria-label="Parse and export">
        <section aria-labelledby="parse-h" className="rounded-[14px] bg-paper p-4 ring-1 ring-line">
          <h2 id="parse-h" className="text-[15px] font-semibold tracking-[-0.01em]">Extraction</h2>
          <div className="mt-3">
            <Segmented
              label="Extraction mode"
              value={aiMode ? "ai" : "basic"}
              onChange={(v) => setAiMode(v === "ai")}
              disabled={loading}
              options={[
                { value: "ai", label: <><Sparkles aria-hidden className="size-3.5" strokeWidth={2} />AI</> },
                { value: "basic", label: <><ScanText aria-hidden className="size-3.5" strokeWidth={2} />Basic</> },
              ]}
            />
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-muted">
            {aiMode
              ? "Your browser extracts the text; Claude reads every field. Best for unusual layouts and scans."
              : "Rules for common payroll layouts. Runs entirely in your browser."}
          </p>

          <div className="mt-4">
            <label htmlFor="batch-label" className="text-[12px] font-medium text-muted">Client or label <span className="font-normal">(optional)</span></label>
            <input
              id="batch-label"
              value={batchLabel}
              onChange={(e) => setBatchLabel(e.target.value)}
              placeholder="e.g. Harbor & Pine, Q4"
              maxLength={120}
              className="mt-1.5 h-9 w-full rounded-[10px] bg-paper px-3 text-[14px] ring-1 ring-inset ring-line-2 outline-none placeholder:text-faint focus:ring-2 focus:ring-ink"
            />
          </div>

          <Button size="lg" className="mt-4 w-full" onClick={parse} loading={loading} disabled={!queue.length || outOfFree}>
            {loading ? <span className="truncate">{progress || "Starting…"}</span> : queue.length ? `Parse ${queue.length} file${queue.length > 1 ? "s" : ""}` : "Add files to parse"}
          </Button>
          {overQuota && (
            <p className="mt-2 text-[12px] leading-relaxed text-warn">
              You have {freeLeft} free document{freeLeft > 1 ? "s" : ""} left. The first {freeLeft} will be parsed. <button onClick={upgrade} className="cursor-pointer font-medium underline">Upgrade</button> to parse all {queue.length}.
            </p>
          )}
          {!isPaid && account && !outOfFree && !overQuota && (
            <p className="tnum mt-2 text-center text-[12px] text-muted">{freeLeft} of {FREE_DOCUMENTS} free documents left</p>
          )}
          {isPaid && (
            <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[12px] text-muted">
              {saving ? <><Check aria-hidden className="size-3.5 text-ok" strokeWidth={2.5} /> Results save to <Link href="/app/history" className="underline underline-offset-2 hover:text-ink">history</Link></> : <>History saving is off · <Link href="/app/account" className="underline underline-offset-2 hover:text-ink">Settings</Link></>}
            </p>
          )}
        </section>

        {parsed.length > 0 && (
          <ExportRail
            count={parsed.length}
            format={format}
            layout={layout}
            selectedFields={selectedFields}
            selectedDynamic={selectedDynamic}
            dynamicSections={dynamicSections}
            includeYTD={includeYTD}
            exporting={exporting}
            onFormat={setFormat}
            onLayout={setLayout}
            onToggleField={(k) => toggle(setSelectedFields, k)}
            onToggleGroup={(g: ExportGroupDef) => {
              const keys = g.fields.map((f) => f.key as string);
              const allOn = keys.every((k) => selectedFields.has(k));
              setSelectedFields((prev) => { const n = new Set(prev); keys.forEach((k) => (allOn ? n.delete(k) : n.add(k))); return n; });
            }}
            onToggleDynamic={(l) => toggle(setSelectedDynamic, l)}
            onToggleSection={(labels) => setSelectedDynamic((prev) => {
              const allOn = labels.every((l) => prev.has(l));
              const n = new Set(prev); labels.forEach((l) => (allOn ? n.delete(l) : n.add(l))); return n;
            })}
            onSelectAll={() => { setSelectedFields(new Set(HEADER_EXPORT_KEYS)); setSelectedDynamic(new Set(dynamicSections.flatMap((s) => s.labels))); }}
            onClearAll={() => { setSelectedFields(new Set()); setSelectedDynamic(new Set()); }}
            onToggleYTD={() => setIncludeYTD((v) => !v)}
            onExport={exportFile}
          />
        )}
      </aside>
    </div>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────────

function Dropzone({ compact, dragging, disabled, onBrowse }: { compact: boolean; dragging: boolean; disabled: boolean; onBrowse: () => void }) {
  return (
    <button
      type="button"
      onClick={onBrowse}
      disabled={disabled}
      className={`group flex w-full cursor-pointer flex-col items-center justify-center rounded-[14px] border border-dashed text-center transition-[background-color,border-color,padding] duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
        compact ? "gap-1 px-6 py-6" : "gap-3 px-6 py-20 sm:py-28"
      } ${dragging ? "border-ink bg-paper" : "border-line-2 bg-paper/60 hover:border-muted hover:bg-paper"}`}
    >
      <span className={`flex items-center justify-center rounded-2xl bg-ink text-white transition-transform duration-200 group-hover:-translate-y-0.5 ${compact ? "mb-1 size-9 rounded-xl" : "size-14"}`}>
        <ArrowDownToLine aria-hidden className={compact ? "size-4" : "size-6"} strokeWidth={1.75} />
      </span>
      <span className={`font-semibold tracking-[-0.02em] ${compact ? "text-[15px]" : "text-[24px]"}`}>
        {dragging ? "Drop to add" : compact ? "Add more paystubs" : "Drop paystubs here"}
      </span>
      <span className="text-[14px] text-muted">
        {compact ? "Drop files or click to browse" : "PDF or photo — PNG, JPG, WEBP, BMP, TIFF. Or click to choose files."}
      </span>
    </button>
  );
}

function Queue({ files, disabled, onRemove, onClear }: { files: File[]; disabled: boolean; onRemove: (i: number) => void; onClear: () => void }) {
  return (
    <section aria-label="Files to parse" className="overflow-hidden rounded-[14px] bg-paper ring-1 ring-line">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <h2 className="text-[13px] font-medium">Ready to parse <span className="tnum font-normal text-muted">{files.length}</span></h2>
        <button onClick={onClear} disabled={disabled} className="cursor-pointer text-[13px] text-muted hover:text-ink disabled:cursor-not-allowed">Clear</button>
      </div>
      <ul className="divide-y divide-line">
        {files.map((f, i) => (
          <li key={`${f.name}::${f.size}::${f.lastModified}`} className="flex items-center gap-3 px-4 py-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-canvas text-muted">
              {isImageFile(f) ? <ImageIcon aria-hidden className="size-4" strokeWidth={1.75} /> : <FileText aria-hidden className="size-4" strokeWidth={1.75} />}
            </span>
            <span className="min-w-0 flex-1 truncate text-[14px]">{f.name}</span>
            <span className="tnum shrink-0 font-mono text-[12px] text-muted">{f.size < 1024 * 1024 ? `${(f.size / 1024).toFixed(0)} KB` : `${(f.size / 1024 / 1024).toFixed(1)} MB`}</span>
            <button onClick={() => onRemove(i)} disabled={disabled} aria-label={`Remove ${f.name}`} className="cursor-pointer rounded-md p-1 text-muted hover:bg-canvas hover:text-ink disabled:cursor-not-allowed">
              <X className="size-4" strokeWidth={2} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Paywall({ onUpgrade, upgrading }: { onUpgrade: () => void; upgrading: boolean }) {
  return (
    <section aria-labelledby="paywall-h" className="flex flex-col gap-5 rounded-[14px] bg-ink p-6 text-white sm:flex-row sm:items-center sm:p-7">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
        <Lock aria-hidden className="size-5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="paywall-h" className="text-[19px] font-semibold tracking-[-0.02em]">You&apos;ve used your {FREE_DOCUMENTS} free documents</h2>
        <p className="mt-1 text-[14px] text-white/65">Pro is ${TIERS.pro.monthly} a month for unlimited parsing and saved history. Results already here can still be edited and exported.</p>
      </div>
      <Button variant="inverse" size="lg" onClick={onUpgrade} loading={upgrading}>Upgrade to Pro</Button>
    </section>
  );
}

async function readFileSignals(file: File): Promise<FileSignals | null> {
  if (file.type !== "application/pdf") {
    return { kind: "image", producer: null, creator: null, createdAt: null, modifiedAt: null, pageCount: 1, amountFonts: 0, hasTextLayer: false };
  }
  try {
    const { extractPdfSignals } = await import("@/lib/pdf-extractor");
    return await extractPdfSignals(file);
  } catch {
    return null;
  }
}
