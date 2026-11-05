"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f7", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif", color: "#0b0b0c", textAlign: "center" }}>
        <div>
          <h1 style={{ fontSize: 28, letterSpacing: "-0.03em", margin: 0 }}>Something went wrong</h1>
          <p style={{ color: "#6e6e73", fontSize: 15, marginTop: 12 }}>The error has been reported. Please try again.</p>
          <button onClick={reset} style={{ marginTop: 24, height: 40, padding: "0 16px", borderRadius: 10, border: 0, background: "#0b0b0c", color: "#fff", fontSize: 14, cursor: "pointer" }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
