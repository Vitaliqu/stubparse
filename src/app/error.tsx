"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <div className="flex min-h-[70dvh] items-center justify-center px-4 text-center">
      <div>
        <h1 className="text-[32px] font-semibold tracking-[-0.03em]">Something went wrong</h1>
        <p className="mx-auto mt-3 max-w-[40ch] text-[15px] text-muted">The error has been reported. Try again, and if it keeps happening, email support@stubparse.com.</p>
        <button onClick={reset} className="mt-6 inline-flex h-10 cursor-pointer items-center rounded-[10px] bg-ink px-4 text-sm font-medium text-white hover:bg-ink-2">Try again</button>
      </div>
    </div>
  );
}
