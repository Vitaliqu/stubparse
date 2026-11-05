import * as Sentry from "@sentry/nextjs";

// Server and edge error monitoring. A no-op until SENTRY_DSN is set.
export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    // Keep paystub data out of Sentry: no user info, request bodies, AI prompts/outputs, or local variables.
    dataCollection: { userInfo: false, httpBodies: [], genAI: { inputs: false, outputs: false }, stackFrameVariables: false },
    // Never ship request bodies: they can contain paystub text.
    beforeSend(event) {
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        if (event.request.headers) delete event.request.headers.authorization;
      }
      return event;
    },
  });
}

export const onRequestError = Sentry.captureRequestError;
