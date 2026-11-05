"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { FREE_DOCUMENTS } from "@/lib/plan";

/** Top-bar plan indicator: three free slots, or Pro. */
export function UsageMeter() {
  const { account } = useAuth();
  if (!account) return null;

  if (account.plan !== "free") {
    return (
      <Link href="/app/account" className="rounded-full bg-ink px-2.5 py-1 text-[12px] font-semibold tracking-[0.02em] text-white uppercase">
        {account.plan}
      </Link>
    );
  }

  const left = account.freeRemaining;
  return (
    <Link
      href="/app/account"
      className="flex items-center gap-2.5 rounded-full py-1 pr-1 pl-3 text-[13px] ring-1 ring-line transition-colors hover:bg-canvas"
      aria-label={`${left} of ${FREE_DOCUMENTS} free documents left. Upgrade.`}
    >
      <span className="flex gap-1" aria-hidden>
        {Array.from({ length: FREE_DOCUMENTS }, (_, i) => (
          <span key={i} className={`h-2 w-2 rounded-full ${i < left ? "bg-ink" : "bg-line-2"}`} />
        ))}
      </span>
      <span className="tnum hidden text-muted sm:inline"><span className="font-medium text-ink">{left}</span> of {FREE_DOCUMENTS} free</span>
      <span className="rounded-full bg-ink px-2.5 py-0.5 text-[12px] font-medium text-white">Upgrade</span>
    </Link>
  );
}
