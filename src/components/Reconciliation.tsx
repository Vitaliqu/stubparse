import { Check as CheckIcon, X, Minus } from "lucide-react";
import type { Check } from "@/lib/reconcile";

const TONE = {
  pass: { dot: "bg-ok text-white", text: "text-ink", Icon: CheckIcon, sr: "Passed" },
  fail: { dot: "bg-bad text-white", text: "text-bad", Icon: X, sr: "Failed" },
  skip: { dot: "bg-line-2 text-muted", text: "text-muted", Icon: Minus, sr: "Not checked" },
} as const;

/** The reconciliation strip: three math checks, each with a live status. */
export function Reconciliation({
  checks, compact = false, stacked = false, revealed = 3, className = "",
}: { checks: Check[]; compact?: boolean; stacked?: boolean; revealed?: number; className?: string }) {
  return (
    <ul aria-label="Math checks" className={`grid gap-x-6 gap-y-2.5 ${stacked ? "" : compact ? "sm:grid-cols-3" : "md:grid-cols-3"} ${className}`}>
      {checks.map((c, i) => {
        const t = TONE[c.status];
        const shown = i < revealed;
        return (
          <li key={c.id} className="flex min-w-0 items-start gap-2.5">
            <span
              className={`mt-px flex size-[18px] shrink-0 items-center justify-center rounded-full transition-[transform,background-color] duration-300 ease-[var(--ease-out-expo)] ${shown ? `${t.dot} scale-100` : "scale-75 bg-line text-transparent"}`}
            >
              <t.Icon aria-hidden className="size-3" strokeWidth={3} />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-medium leading-[18px] text-ink">
                <span className="sr-only">{shown ? t.sr : "Pending"}: </span>
                {c.label}
              </span>
              <span className={`tnum block truncate font-mono text-[12px] leading-5 ${shown ? t.text : "text-faint"}`}>
                {shown ? c.detail : "checking…"}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
