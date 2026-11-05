"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { CircleCheck, CircleAlert, TriangleAlert, X, LoaderCircle } from "lucide-react";
import type { ToastMessage } from "@/types/paystub";

// ── Button ───────────────────────────────────────────────────────────────────

type Variant = "primary" | "secondary" | "ghost" | "danger" | "inverse";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:   "bg-ink text-white hover:bg-ink-2 disabled:bg-canvas disabled:text-faint disabled:ring-1 disabled:ring-inset disabled:ring-line",
  secondary: "bg-paper text-ink ring-1 ring-inset ring-line-2 hover:bg-canvas disabled:text-faint",
  ghost:     "text-ink hover:bg-canvas disabled:text-faint",
  danger:    "bg-paper text-bad ring-1 ring-inset ring-line-2 hover:bg-bad-soft",
  inverse:   "bg-white text-ink hover:bg-white/90 disabled:bg-white/40 disabled:text-ink/60",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-[10px]",
  lg: "h-12 px-6 text-[15px] gap-2 rounded-xl",
};

function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `inline-flex shrink-0 cursor-pointer select-none items-center justify-center font-medium tracking-[-0.01em] whitespace-nowrap transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, className = "", children, disabled, ...rest },
  ref,
) {
  return (
    <button ref={ref} className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <Spinner />}
      {children}
    </button>
  );
});

export function ButtonLink({
  href, variant = "primary", size = "md", className = "", children,
}: { href: string; variant?: Variant; size?: Size; className?: string; children: React.ReactNode }) {
  return <Link href={href} className={buttonClass(variant, size, className)}>{children}</Link>;
}

// ── Spinner ──────────────────────────────────────────────────────────────────

export function Spinner({ className = "size-4" }: { className?: string }) {
  return <LoaderCircle aria-hidden className={`${className} animate-spin`} strokeWidth={2} />;
}

// ── Toast ────────────────────────────────────────────────────────────────────

export function Toast({ toast, onDismiss }: { toast: NonNullable<ToastMessage>; onDismiss: () => void }) {
  const Icon = toast.type === "success" ? CircleCheck : toast.type === "warning" ? TriangleAlert : CircleAlert;
  const tone = toast.type === "success" ? "text-ok" : toast.type === "warning" ? "text-warn" : "text-bad";
  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      className="fixed bottom-6 left-1/2 z-50 flex w-[min(92vw,26rem)] -translate-x-1/2 items-start gap-3 rounded-2xl bg-paper px-4 py-3.5 text-sm text-ink shadow-[var(--shadow-pop)] ring-1 ring-line"
    >
      <Icon aria-hidden className={`mt-px size-[18px] shrink-0 ${tone}`} strokeWidth={2} />
      <span className="flex-1 leading-snug">{toast.msg}</span>
      <button onClick={onDismiss} aria-label="Dismiss" className="-m-1 cursor-pointer rounded-md p-1 text-muted hover:bg-canvas hover:text-ink">
        <X className="size-4" strokeWidth={2} />
      </button>
    </div>
  );
}

// ── Checkbox ─────────────────────────────────────────────────────────────────

export function Checkbox({
  checked, indeterminate = false, onChange, label,
}: { checked: boolean; indeterminate?: boolean; onChange: () => void; label?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate && !checked ? "mixed" : checked}
      aria-label={label}
      onClick={onChange}
      className={`flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-[5px] transition-colors ${
        checked || indeterminate ? "bg-ink text-white" : "bg-paper ring-1 ring-inset ring-line-2 hover:ring-muted"
      }`}
    >
      {checked ? (
        <svg viewBox="0 0 12 12" className="size-3" aria-hidden><path d="M2.5 6.2l2.3 2.3L9.5 3.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      ) : indeterminate ? (
        <span className="block h-[1.5px] w-2 rounded bg-white" />
      ) : null}
    </button>
  );
}

// ── Switch ───────────────────────────────────────────────────────────────────

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-[22px] w-[38px] shrink-0 cursor-pointer rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "bg-ok" : "bg-line-2"}`}
    >
      <span className={`absolute top-[2px] left-[2px] size-[18px] rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.2)] transition-transform duration-200 ease-[var(--ease-out-expo)] ${checked ? "translate-x-4" : ""}`} />
    </button>
  );
}

// ── Segmented control ────────────────────────────────────────────────────────

export function Segmented<T extends string>({
  value, options, onChange, label, disabled,
}: {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-0.5 rounded-[10px] bg-canvas p-[3px] ring-1 ring-inset ring-line">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={`flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[7px] px-3 text-[13px] font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-150 disabled:cursor-not-allowed ${
              on ? "bg-paper text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08),0_0_0_0.5px_rgb(0_0_0/0.06)]" : "text-muted hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
