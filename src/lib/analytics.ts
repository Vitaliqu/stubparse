"use client";

// Product analytics. A no-op until NEXT_PUBLIC_POSTHOG_KEY is set.

import posthog from "posthog-js";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
let started = false;

export function initAnalytics() {
  if (!KEY || started || typeof window === "undefined") return;
  posthog.init(KEY, {
    api_host: HOST,
    person_profiles: "identified_only",
    capture_pageview: "history_change",
    autocapture: false,
    // Never record document contents: inputs are masked and session recording stays off.
    disable_session_recording: true,
    mask_all_text: true,
  });
  started = true;
}

type AnalyticsEvent =
  | "signed_up" | "signed_in" | "files_added" | "parse_completed" | "parse_failed" | "limit_reached"
  | "export_downloaded" | "checkout_started" | "upgraded" | "history_opened" | "report_created" | "api_key_created";

export function track(event: AnalyticsEvent, props?: Record<string, unknown>) {
  if (!started) return;
  posthog.capture(event, props);
}

export function identify(uid: string, props?: Record<string, unknown>) {
  if (!started) return;
  posthog.identify(uid, props);
}

export function resetAnalytics() {
  if (started) posthog.reset();
}
