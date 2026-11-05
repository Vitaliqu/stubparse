import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const dev = process.env.NODE_ENV !== "production";
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const posthog = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
const posthogAssets = posthog.replace("://us.i.", "://us-assets.i.").replace("://eu.i.", "://eu-assets.i.");

/**
 * Content-Security-Policy. Only the origins the app actually talks to:
 * Firebase (auth iframe, identity, Firestore, App Check), reCAPTCHA, Tesseract's OCR files on jsDelivr,
 * PostHog, and Sentry. Stripe Checkout is a full-page redirect, so it needs nothing here.
 * 'unsafe-inline' for scripts is required by Next.js inline bootstrapping without per-request nonces.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${dev ? " 'unsafe-eval'" : ""} blob: https://cdn.jsdelivr.net https://apis.google.com https://www.google.com https://www.gstatic.com https://www.recaptcha.net ${posthogAssets}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.googleusercontent.com https://www.gstatic.com",
  "font-src 'self' data:",
  `connect-src 'self'${dev ? " ws: http://localhost:*" : ""} https://cdn.jsdelivr.net https://*.googleapis.com https://www.google.com https://www.recaptcha.net ${posthog} ${posthogAssets} https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io`,
  `frame-src 'self' https://*.firebaseapp.com${authDomain ? ` https://${authDomain}` : ""} https://accounts.google.com https://appleid.apple.com https://www.google.com https://recaptcha.google.com https://www.recaptcha.net`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  // COOP allows popups so Firebase Google/Apple sign-in can complete; no COEP (it blocks the Firebase auth iframe).
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy",       value: csp },
          { key: "Strict-Transport-Security",     value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Cross-Origin-Opener-Policy",    value: "same-origin-allow-popups" },
          { key: "X-Frame-Options",               value: "DENY" },
          { key: "X-Content-Type-Options",        value: "nosniff" },
          { key: "Referrer-Policy",               value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",            value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },

  turbopack: {},

  webpack(config) {
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    return config;
  },
};

// Source-map upload to Sentry only when the project is configured for it.
export default process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
    })
  : nextConfig;
