"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogOut, Settings, History } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { Spinner } from "@/components/ui";
import { NotConfigured } from "@/components/auth/NotConfigured";
import { useAuth } from "@/lib/auth-context";
import { UsageMeter } from "./UsageMeter";

const NAV = [
  { href: "/app", label: "Workspace" },
  { href: "/app/history", label: "History" },
  { href: "/app/account", label: "Account" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { configured, user, loading, authedFetch } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    authedFetch("/api/admin/me").then((r) => r.json()).then((j) => setIsAdmin(!!j.admin)).catch(() => {});
  }, [user, authedFetch]);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Keep the query string (invite links carry their token there)
    if (configured && !loading && !user) router.replace(`/sign-in?next=${encodeURIComponent(pathname + window.location.search)}`);
  }, [configured, loading, user, pathname, router]);

  if (!configured) {
    return <div className="flex min-h-dvh items-center justify-center bg-canvas p-4"><div className="max-w-md"><NotConfigured /></div></div>;
  }
  if (loading || !user) {
    return <div className="flex min-h-dvh items-center justify-center bg-canvas text-muted"><Spinner className="size-5" /></div>;
  }

  return (
    <div className="min-h-dvh bg-canvas print:bg-paper">
      <header className="sticky top-0 z-30 border-b border-line bg-paper print:hidden">
        <div className="mx-auto flex h-14 max-w-[1440px] min-w-0 items-center gap-3 px-4 sm:gap-6 sm:px-6">
          <Wordmark href="/app" />
          <nav aria-label="App" className="hidden items-center gap-1 sm:flex">
            {[...NAV, ...(isAdmin ? [{ href: "/app/admin", label: "Admin" }] : [])].map((n) => {
              const on = pathname === n.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={on ? "page" : undefined}
                  className={`rounded-lg px-2.5 py-1.5 text-[14px] transition-colors ${on ? "bg-canvas font-medium text-ink" : "text-muted hover:text-ink"}`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex min-w-0 items-center gap-2.5 sm:gap-3">
            <UsageMeter />
            <AccountMenu />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

function AccountMenu() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  const initial = (user?.displayName || user?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex size-8 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-ink text-[13px] font-semibold text-white ring-offset-2 transition-shadow hover:ring-2 hover:ring-line-2"
      >
        {user?.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
        ) : initial}
      </button>
      {open && (
        <div role="menu" className="absolute top-10 right-0 w-64 rounded-[14px] bg-paper p-1.5 shadow-[var(--shadow-pop)] ring-1 ring-line">
          <div className="px-3 py-2.5">
            <p className="truncate text-[14px] font-medium">{user?.displayName || "Signed in"}</p>
            <p className="truncate text-[13px] text-muted">{user?.email}</p>
          </div>
          <div className="my-1 h-px bg-line" />
          <Link role="menuitem" href="/app/history" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] hover:bg-canvas">
            <History aria-hidden className="size-4 text-muted" strokeWidth={1.75} /> History
          </Link>
          <Link role="menuitem" href="/app/account" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] hover:bg-canvas">
            <Settings aria-hidden className="size-4 text-muted" strokeWidth={1.75} /> Account & billing
          </Link>
          <button
            role="menuitem"
            onClick={async () => { await signOut(); router.replace("/"); }}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[14px] hover:bg-canvas"
          >
            <LogOut aria-hidden className="size-4 text-muted" strokeWidth={1.75} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
