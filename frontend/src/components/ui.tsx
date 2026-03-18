import type { ExportFormat, ToastMessage } from "@/types/paystub";
import { CheckIcon, WarningIcon, XIcon, XlsxIcon, CsvIcon, JsonIcon } from "./icons";

// ── Toast ────────────────────────────────────────────────────────────────────

export function Toast({
  toast,
  onDismiss,
}: {
  toast: NonNullable<ToastMessage>;
  onDismiss: () => void;
}) {
  const styles = {
    success: "bg-emerald-600 border-emerald-500/50",
    error:   "bg-red-600 border-red-500/50",
    warning: "bg-amber-600 border-amber-500/50",
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-md shadow-sm text-sm font-medium text-white max-w-sm transition-all duration-300 border ${styles[toast.type]}`}
    >
      {toast.type === "success" && <CheckIcon />}
      {toast.type === "warning" && <WarningIcon />}
      {toast.type === "error" && <XIcon size={4} />}
      <span>{toast.msg}</span>
      <button onClick={onDismiss} className="ml-auto cursor-pointer opacity-70 hover:opacity-100">
        <XIcon size={4} />
      </button>
    </div>
  );
}

// ── Checkbox ─────────────────────────────────────────────────────────────────

export function Checkbox({
  checked,
  indeterminate = false,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
}) {
  const borderColor = checked
    ? "border-indigo-600 bg-indigo-600"
    : indeterminate
    ? "border-indigo-400 bg-indigo-50"
    : "border-[#eaeaea] bg-white hover:border-indigo-400";

  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded border transition-colors ${borderColor}`}
    >
      {checked && (
        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      )}
      {!checked && indeterminate && (
        <span className="block h-0.5 w-2 rounded bg-indigo-500" />
      )}
    </button>
  );
}

// ── LoadingSpinner ────────────────────────────────────────────────────────────

export function LoadingSpinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Stat ─────────────────────────────────────────────────────────────────────

export function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="text-right">
      <p className="text-[10px] font-medium text-[#666] uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-semibold font-mono ${highlight ? "text-indigo-600" : "text-zinc-700"}`}>
        {value}
      </p>
    </div>
  );
}

// ── ProgressPill ──────────────────────────────────────────────────────────────

export function ProgressPill({ filled, total }: { filled: number; total: number }) {
  const pct = Math.round((filled / total) * 100);
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-zinc-300";

  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-16 rounded-full bg-[#eaeaea] overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-[#666] font-medium">{pct}%</span>
    </div>
  );
}

// ── FormatIcon + FormatBadge ──────────────────────────────────────────────────

export function FormatIcon({ format }: { format: ExportFormat }) {
  if (format === "xlsx") return <XlsxIcon />;
  if (format === "csv") return <CsvIcon />;
  return <JsonIcon />;
}

export function FormatBadge({ format }: { format: ExportFormat }) {
  const styles: Record<ExportFormat, { label: string; cls: string }> = {
    xlsx: { label: "Pivoted", cls: "bg-emerald-100 text-emerald-700" },
    csv:  { label: "Flat",    cls: "bg-sky-100 text-sky-700"         },
    json: { label: "Raw",     cls: "bg-amber-100 text-amber-700"     },
  };
  const { label, cls } = styles[format];
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>{label}</span>
  );
}
