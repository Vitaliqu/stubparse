import * as Sentry from "@sentry/nextjs";
import { initAnalytics } from "@/lib/analytics";

// Browser error monitoring (no-op until NEXT_PUBLIC_SENTRY_DSN is set) and analytics (no-op until NEXT_PUBLIC_POSTHOG_KEY is set).
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    // Keep paystub data out of Sentry: no user info, request bodies, AI prompts/outputs, or local variables.
    dataCollection: { userInfo: false, httpBodies: [], genAI: { inputs: false, outputs: false }, stackFrameVariables: false },
    // Paystub contents live in inputs and the DOM; keep them out of breadcrumbs.
    beforeBreadcrumb: (crumb) => (crumb.category === "ui.input" ? null : crumb),
  });
}

initAnalytics();

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
