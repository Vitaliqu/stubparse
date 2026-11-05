import Link from "next/link";
import { Wordmark } from "@/components/brand";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="mx-auto flex h-16 w-full max-w-[1200px] items-center px-4 sm:px-6"><Wordmark /></header>
      <main className="flex flex-1 items-center justify-center px-4 pb-24 text-center">
        <div>
          <p className="tnum font-mono text-[13px] text-muted">404</p>
          <h1 className="mt-3 text-[clamp(2rem,5vw,3rem)] leading-[1.05] font-semibold tracking-[-0.035em]">This page isn&apos;t on the stub.</h1>
          <p className="mx-auto mt-4 max-w-[36ch] text-[16px] text-muted">The link may be old or mistyped.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/" className="inline-flex h-10 items-center rounded-[10px] bg-ink px-4 text-sm font-medium text-white hover:bg-ink-2">Home</Link>
            <Link href="/app" className="inline-flex h-10 items-center rounded-[10px] bg-paper px-4 text-sm font-medium ring-1 ring-inset ring-line-2 hover:bg-canvas">Workspace</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
