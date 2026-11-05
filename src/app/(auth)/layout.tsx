import Link from "next/link";
import { Wordmark } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="mx-auto flex h-16 w-full max-w-[1200px] items-center px-4 sm:px-6">
        <Wordmark />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-[6vh] pb-16 sm:items-center sm:pt-0">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
      <footer className="pb-8 text-center text-[12px] text-muted">
        <Link href="/privacy" className="hover:text-ink">Privacy</Link>
        <span className="mx-2" aria-hidden>·</span>
        <Link href="/terms" className="hover:text-ink">Terms</Link>
      </footer>
    </div>
  );
}
