// Error reporting. Sends to Sentry when configured, always logs, and records a short per-user
// error log (errorLog, 30-day expiry) so support can see what went wrong for a given account.

import * as Sentry from "@sentry/nextjs";

const ERROR_LOG_DAYS = 30;

export function reportError(err: unknown, context?: Record<string, unknown> & { uid?: string; where?: string }) {
  console.error("[error]", err, context ?? "");
  if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(err, context ? { extra: context, user: context.uid ? { id: context.uid } : undefined } : undefined);
  }
  if (context?.uid) {
    // Fire and forget; never let logging break the request.
    void (async () => {
      try {
        const [{ adminDb }, { Timestamp }] = await Promise.all([import("@/lib/firebase/admin"), import("firebase-admin/firestore")]);
        await adminDb().collection("errorLog").add({
          uid: context.uid,
          where: context.where ?? null,
          message: (err instanceof Error ? err.message : String(err)).slice(0, 500),
          at: Date.now(),
          expiresAt: Timestamp.fromMillis(Date.now() + ERROR_LOG_DAYS * 86_400_000),
        });
      } catch { /* logging is best effort */ }
    })();
  }
}
