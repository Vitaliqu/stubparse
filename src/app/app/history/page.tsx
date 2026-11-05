"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Trash2, LineChart, Download, FolderOpen, Lock, Tag, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { deleteDocuments, historyScope, updateDocument, watchHistory, type SavedDocument } from "@/lib/history";
import { reconcile, toNumber, money } from "@/lib/reconcile";
import { canUse } from "@/lib/plan";
import { stashReport } from "@/lib/report-stash";
import { track } from "@/lib/analytics";
import { HEADER_EXPORT_KEYS } from "@/lib/field-definitions";
import { Button, ButtonLink, Checkbox, Spinner, Toast } from "@/components/ui";
import type { ToastMessage } from "@/types/paystub";

export default function HistoryPage() {
  const router = useRouter();
  const { user, account } = useAuth();
  const [docs, setDocs] = useState<SavedDocument[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [label, setLabel] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<null | "delete" | "export">(null);
  const [toast, setToast] = useState<ToastMessage>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);

  const isPaid = !!account && account.plan !== "free";
  const scope = useMemo(() => (user ? historyScope(user.uid, account) : null), [user, account]);
  const isTeam = scope?.kind === "team";
  const isBusiness = canUse(account?.plan, "income-report");

  useEffect(() => {
    if (!scope) return;
    track("history_opened", { team: scope.kind === "team" });
    return watchHistory(scope, setDocs, () => setError("Couldn't load your history. Refresh to try again."));
  }, [scope]);

  const labels = useMemo(() => [...new Set((docs ?? []).map((d) => d.label).filter(Boolean))].sort(), [docs]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (docs ?? []).filter((d) => {
      if (label && d.label !== label) return false;
      if (!needle) return true;
      return [d.data.name, d.fileName, d.label, d.data.checkDate].some((v) => v?.toLowerCase().includes(needle));
    });
  }, [docs, q, label]);

  const selectedDocs = filtered.filter((d) => selected.has(d.id));
  const allOn = filtered.length > 0 && filtered.every((d) => selected.has(d.id));
  const someOn = filtered.some((d) => selected.has(d.id));

  const showToast = (t: ToastMessage) => { setToast(t); setTimeout(() => setToast(null), 3500); };

  const remove = async () => {
    if (!scope || !selectedDocs.length) return;
    if (!window.confirm(`Delete ${selectedDocs.length} saved stub${selectedDocs.length > 1 ? "s" : ""}? This can't be undone.`)) return;
    setBusy("delete");
    try {
      await deleteDocuments(scope, selectedDocs.map((d) => d.id));
      setSelected(new Set());
      showToast({ type: "success", msg: "Deleted." });
    } catch {
      showToast({ type: "error", msg: "Couldn't delete. Try again." });
    } finally {
      setBusy(null);
    }
  };

  const exportXlsx = async () => {
    setBusy("export");
    try {
      const rows = selectedDocs.map((d) => d.data);
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows, format: "xlsx", layout: "vertical", fields: HEADER_EXPORT_KEYS,
          dynamicLabels: [...new Set(rows.flatMap((r) => r.fields.map((f) => f.label)))], includeYTD: true,
        }),
      });
      if (!res.ok) throw new Error();
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url; a.download = `${label || "paystubs"}.xlsx`.replace(/[^\w.\- ]+/g, ""); a.click();
      URL.revokeObjectURL(url);
      track("export_downloaded", { format: "xlsx", from: "history", stubs: rows.length });
    } catch {
      showToast({ type: "error", msg: "Export failed. Try again." });
    } finally {
      setBusy(null);
    }
  };

  const report = () => {
    stashReport(selectedDocs.map((d) => d.data));
    track("report_created", { stubs: selectedDocs.length, from: "history" });
    router.push("/app/report");
  };

  const saveLabel = async (d: SavedDocument, value: string) => {
    setEditingLabel(null);
    if (!scope || value === d.label) return;
    await updateDocument(scope, d.id, { label: value.trim().slice(0, 120) }).catch(() => showToast({ type: "error", msg: "Couldn't save the label." }));
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10">
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-semibold tracking-[-0.03em]">History</h1>
          <p className="mt-1 text-[14px] text-muted">
            {isTeam ? `Shared with ${account?.team?.name}. ` : ""}Extracted data from parsed stubs. The files themselves are never saved.
          </p>
        </div>
        <ButtonLink href="/app" variant="secondary">Parse more</ButtonLink>
      </div>

      {!isPaid && account && (docs?.length ?? 0) === 0 && (
        <section className="mt-8 flex flex-col items-start gap-4 rounded-[14px] bg-paper p-6 ring-1 ring-line sm:flex-row sm:items-center">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-canvas"><Lock aria-hidden className="size-5" strokeWidth={1.75} /></span>
          <div className="flex-1">
            <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Keep every stub you parse</h2>
            <p className="mt-1 text-[14px] text-muted">Pro saves the extracted data so you can come back, re-export, and group stubs by client.</p>
          </div>
          <ButtonLink href="/pricing">See plans</ButtonLink>
        </section>
      )}

      {(isPaid || (docs?.length ?? 0) > 0) && (
        <>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <label className="relative min-w-[220px] flex-1 sm:max-w-sm">
              <span className="sr-only">Search history</span>
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" strokeWidth={2} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search employee, file, or label"
                className="h-10 w-full rounded-[10px] bg-paper pr-3 pl-9 text-[14px] ring-1 ring-inset ring-line-2 outline-none placeholder:text-faint focus:ring-2 focus:ring-ink"
              />
            </label>
            {labels.length > 0 && (
              <label>
                <span className="sr-only">Filter by label</span>
                <select
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="h-10 rounded-[10px] bg-paper px-3 text-[14px] ring-1 ring-inset ring-line-2 outline-none focus:ring-2 focus:ring-ink"
                >
                  <option value="">All labels</option>
                  {labels.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </label>
            )}
            <p className="tnum ml-auto text-[13px] text-muted">{filtered.length} stub{filtered.length === 1 ? "" : "s"}</p>
          </div>

          {selectedDocs.length > 0 && (
            <div className="sticky top-[64px] z-20 mt-4 flex flex-wrap items-center gap-2 rounded-[14px] bg-ink px-4 py-2.5 text-white shadow-[var(--shadow-pop)]">
              <span className="tnum mr-2 text-[14px] font-medium">{selectedDocs.length} selected</span>
              <BarButton onClick={() => router.push(`/app?open=${selectedDocs.slice(0, 60).map((d) => d.id).join(",")}`)} icon={<FolderOpen className="size-4" strokeWidth={2} />}>Open</BarButton>
              <BarButton onClick={exportXlsx} disabled={busy !== null} icon={busy === "export" ? <Spinner /> : <Download className="size-4" strokeWidth={2} />}>Export XLSX</BarButton>
              {isBusiness
                ? <BarButton onClick={report} icon={<LineChart className="size-4" strokeWidth={2} />}>Income report</BarButton>
                : <Link href="/pricing" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-white/60 hover:text-white"><Lock className="size-3.5" strokeWidth={2} />Income report</Link>}
              <span className="ml-auto" />
              <BarButton onClick={remove} disabled={busy !== null} icon={busy === "delete" ? <Spinner /> : <Trash2 className="size-4" strokeWidth={2} />}>Delete</BarButton>
            </div>
          )}

          <div className="mt-4 overflow-hidden rounded-[14px] bg-paper ring-1 ring-line">
            {docs === null && !error && <div className="flex items-center justify-center gap-2 py-16 text-[14px] text-muted"><Spinner /> Loading history…</div>}
            {error && <p role="alert" className="px-5 py-10 text-center text-[14px] text-bad">{error}</p>}
            {docs !== null && docs.length === 0 && (
              <div className="px-6 py-16 text-center">
                <p className="text-[17px] font-semibold tracking-[-0.02em]">Nothing saved yet</p>
                <p className="mt-1 text-[14px] text-muted">Stubs you parse appear here automatically.</p>
              </div>
            )}
            {docs !== null && docs.length > 0 && filtered.length === 0 && (
              <p className="px-6 py-12 text-center text-[14px] text-muted">No stubs match “{q || label}”.</p>
            )}
            {filtered.length > 0 && (
              <div className="overflow-x-auto">
                <table className="tnum w-full min-w-[820px] border-collapse text-[14px]">
                  <thead>
                    <tr className="border-b border-line text-left text-[12px] text-muted">
                      <th className="w-12 py-2.5 pl-4"><Checkbox checked={allOn} indeterminate={!allOn && someOn} onChange={() => setSelected(allOn ? new Set() : new Set(filtered.map((d) => d.id)))} label="Select all" /></th>
                      <th className="py-2.5 pr-4 font-medium">Employee</th>
                      <th className="py-2.5 pr-4 font-medium">Label</th>
                      <th className="py-2.5 pr-4 font-medium">Pay date</th>
                      <th className="py-2.5 pr-4 text-right font-medium">Gross</th>
                      <th className="py-2.5 pr-4 text-right font-medium">Net</th>
                      <th className="py-2.5 pr-4 font-medium">Checks</th>
                      <th className="py-2.5 pr-4 font-medium">Added</th>
                      {isTeam && <th className="py-2.5 pr-4 font-medium">By</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtered.map((d) => {
                      const checks = reconcile(d.data);
                      const failed = checks.filter((c) => c.status === "fail").length;
                      const passed = checks.filter((c) => c.status === "pass").length;
                      const on = selected.has(d.id);
                      return (
                        <tr key={d.id} className={on ? "bg-canvas/70" : "hover:bg-canvas/40"}>
                          <td className="py-2.5 pl-4"><Checkbox checked={on} onChange={() => setSelected((p) => { const n = new Set(p); if (n.has(d.id)) n.delete(d.id); else n.add(d.id); return n; })} label={`Select ${d.data.name || d.fileName}`} /></td>
                          <td className="max-w-[16rem] py-2.5 pr-4">
                            <Link href={`/app?open=${d.id}`} className="block truncate font-medium hover:underline">{d.data.name || "Unnamed employee"}</Link>
                            <span className="block truncate text-[12px] text-muted">{d.fileName}</span>
                          </td>
                          <td className="py-2.5 pr-4">
                            {editingLabel === d.id ? (
                              <input
                                autoFocus
                                defaultValue={d.label}
                                maxLength={120}
                                aria-label="Label"
                                onBlur={(e) => saveLabel(d, e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditingLabel(null); }}
                                className="h-8 w-40 rounded-lg px-2 text-[13px] ring-2 ring-ink outline-none"
                              />
                            ) : (
                              <button onClick={() => setEditingLabel(d.id)} className="inline-flex max-w-[11rem] cursor-pointer items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[13px] text-ink-2 hover:bg-canvas">
                                {d.label ? <><Tag aria-hidden className="size-3 shrink-0" strokeWidth={2} /><span className="truncate">{d.label}</span></> : <span className="text-faint">Add label</span>}
                              </button>
                            )}
                          </td>
                          <td className="py-2.5 pr-4 font-mono text-[13px] whitespace-nowrap">{d.data.checkDate || "—"}</td>
                          <td className="py-2.5 pr-4 text-right font-mono text-[13px]">{fmt(d.data.grossPay)}</td>
                          <td className="py-2.5 pr-4 text-right font-mono text-[13px] font-semibold">{fmt(d.data.netPay)}</td>
                          <td className="py-2.5 pr-4">
                            {failed ? <span className="rounded-full bg-bad-soft px-2 py-0.5 text-[12px] font-medium text-bad">{failed} issue{failed > 1 ? "s" : ""}</span>
                              : passed ? <span className="inline-flex items-center gap-1 text-[12px] font-medium text-ok"><Check aria-hidden className="size-3.5" strokeWidth={2.5} />Balanced</span>
                              : <span className="text-[12px] text-muted">Unchecked</span>}
                          </td>
                          <td className="py-2.5 pr-4 text-[13px] whitespace-nowrap text-muted">{new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                          {isTeam && <td className="max-w-[12rem] truncate py-2.5 pr-4 text-[13px] text-muted">{d.createdByEmail ?? "—"}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const fmt = (v: string) => { const n = toNumber(v); return n === null ? "—" : money(n); };

function BarButton({ onClick, disabled, icon, children }: { onClick: () => void; disabled?: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} disabled={disabled} className="text-white hover:bg-white/10 disabled:text-white/40">
      {icon}{children}
    </Button>
  );
}
