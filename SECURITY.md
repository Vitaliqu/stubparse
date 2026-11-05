# Security

## Reporting a vulnerability

Please **don't open a public issue** for security problems. Report them privately through GitHub: **Security → Report a vulnerability** on this repository. Include steps to reproduce and the impact you expect.

You'll get an acknowledgement within 3 working days. Fixes for confirmed issues ship as soon as they're ready, and reporters are credited in the release notes unless they'd rather not be.

**In scope:** this codebase and the hosted app at stubparse.com: authentication, billing, metering, data access, the REST API, and anything that exposes another user's data. **Out of scope:** denial of service, automated scanner output without a demonstrated impact, and missing headers that don't lead to an exploit.

## Security model

- **Secrets stay on the server.** Only `NEXT_PUBLIC_*` values (the Firebase web config, which is public by design) reach the browser. Everything else is read only by route handlers.
- **Every account route** verifies the Firebase ID token. With `APP_CHECK_ENFORCE=1` it also requires a Firebase App Check token (reCAPTCHA Enterprise), so scripts can't replay a stolen session.
- **Metering is reserve-then-refund.** A document is counted atomically before Claude is called and refunded if extraction fails, so parallel requests can't overspend a plan. Paid plans also have daily ceilings (`PRO_DAILY_LIMIT`, `BUSINESS_DAILY_LIMIT`) kept in Firestore, so they hold across all server instances even without Upstash.
- **Team invites** require a verified email that matches the invited address. Password sign-ups get a verification email automatically.
- **Headers:** a strict Content-Security-Policy (only Firebase, reCAPTCHA, Tesseract's files on jsDelivr, PostHog, and Sentry), plus HSTS, `frame-ancestors 'none'`, `nosniff`, and a locked-down referrer and permissions policy. An end-to-end test fails if a page triggers a CSP violation.
- **Customer API keys** are stored only as SHA-256 hashes and shown once.
- **Unsubscribe links** are HMAC-signed with `EMAIL_UNSUBSCRIBE_SECRET` (32+ characters). Product email stays off until it's set.
- **Dependencies:** `npm audit --omit=dev` reports 0 vulnerabilities. A few transitive packages are pinned with `overrides` in `package.json`; re-check after upgrades.

## Privacy design

- Files are opened in the browser and never uploaded. Basic mode sends nothing. AI mode sends extracted text, or downscaled page images (up to five) for scans with no text. The API receives the document you send and discards it.
- History stores extracted figures only, only on paid plans with the preference on, and expires after the chosen retention window (12 months by default).
- Sentry strips request bodies, user info, and AI inputs and outputs. PostHog masks text and has session recording off.
- Account deletion is self-serve and removes everything except Stripe's invoice records.
