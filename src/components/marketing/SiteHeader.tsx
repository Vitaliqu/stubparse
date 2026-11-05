"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/brand";
import { ButtonLink } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";

const NAV = [
  { href: "/#how", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/tools", label: "Free tools" },
];

export function SiteHeader() {
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className={`sticky top-0 z-40 bg-paper transition-[box-shadow] duration-200 ${scrolled ? "shadow-[0_1px_0_var(--color-line)]" : ""}`}>
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-8 px-4 sm:px-6">
        <Wordmark />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-3 py-1.5 text-[14px] text-muted transition-colors hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className={`ml-auto flex items-center gap-2 transition-opacity duration-200 ${loading ? "opacity-0" : "opacity-100"}`}>
          {user ? (
            <ButtonLink href="/app" size="sm">Open workspace</ButtonLink>
          ) : (
            <>
              <Link href="/sign-in" className="rounded-md px-3 py-1.5 text-[14px] text-ink transition-colors hover:bg-canvas">Sign in</Link>
              <ButtonLink href="/sign-up" size="sm">Start free</ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
