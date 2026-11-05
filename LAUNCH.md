# Launch checklist

The code is ready. These are the steps only you can take, roughly in order. Each needs an account, a payment, a legal decision, or access to real customers.

## 1. Accounts and services

- [ ] **Deploy the Firestore rules now: `npm run deploy:rules`.** Your project currently allows anyone to read and write the database. See the security note in the hand-off.
- [ ] **Deploy the Firestore indexes and turn on TTL** for `documents.expiresAt` and `errorLog.expiresAt` (commands in the README). Retention cleanup needs the index.
- [ ] **Set `ADMIN_EMAILS`** to your own (verified) email so `/app/admin` works.
- [ ] **Set `CRON_SECRET`.** Both daily jobs, lifecycle email and retention cleanup, refuse to run without it.
- [ ] **Vercel Pro plan.** Hobby is for non-commercial use only, and taking payments makes this commercial.
- [ ] **Firebase**
  - [ ] Turn on Google, Apple, Email/Password, and Email link sign-in.
  - [ ] Add `stubparse.com` under Authentication → Settings → Authorized domains.
  - [ ] Deploy `firestore.rules`.
  - [ ] Branded auth emails: under Authentication → Templates, customize the sender name, and use a custom SMTP or domain so sign-in links come from `@stubparse.com`.
- [ ] **Stripe live mode**
  - [ ] Create the Pro and Business products in live mode with the same four prices: $5/mo, $50/yr, $29/mo, $290/yr.
  - [ ] Create a live customer-portal configuration that allows switching between them.
  - [ ] Turn on Stripe Tax and set `STRIPE_AUTOMATIC_TAX=1`.
  - [ ] Add a live webhook endpoint at `https://stubparse.com/api/stripe/webhook` with the four subscription and checkout events.
  - [ ] Put the live keys and IDs in Vercel's Production environment. Keep the test values in Preview.
- [ ] **Resend:** verify the `stubparse.com` domain (SPF, DKIM), then set `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_UNSUBSCRIBE_SECRET` (required, 32+ characters: `openssl rand -base64 48`), and `CRON_SECRET`.
- [ ] **Upstash Redis** (free tier is fine): set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Without it, per-minute limits only count per server instance. Daily and monthly plan caps still hold.
- [ ] **Bot protection (App Check + reCAPTCHA Enterprise)**
  - [ ] Google Cloud → reCAPTCHA Enterprise: create a website key for `stubparse.com` and set `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`.
  - [ ] Firebase → App Check: register the web app with that key; enforce for **Firestore** and **Authentication** once traffic shows valid tokens.
  - [ ] Firebase → Authentication → Settings: turn on **reCAPTCHA** protection for email/password sign-up (audit first, then enforce).
  - [ ] Set `APP_CHECK_ENFORCE=1` in Vercel so the API routes require App Check too.
- [ ] **Sentry:** create a Next.js project and set the DSNs. Add alerts for new issues and for errors on `/api/stripe/webhook`.
- [ ] **PostHog:** set `NEXT_PUBLIC_POSTHOG_KEY`, then build the funnel `signed_up → parse_completed → checkout_started → upgraded`.
- [ ] **Anthropic:** set a production key with a monthly spend limit.

## 2. Mailboxes and legal

- [ ] Create real `support@stubparse.com` and `privacy@stubparse.com` mailboxes. The site links to both.
- [ ] Have a lawyer review the Terms and Privacy pages. They were drafted from what the product actually does, but they aren't legal advice. Pay particular attention to:
  - Income reports used for lending or tenancy. FCRA-style obligations may apply to *your customers*. The terms disclaim them; a lawyer should confirm that's enough.
  - Anthropic and the other processors named on the privacy page (data processing terms).
  - State privacy laws (CCPA/CPRA) and, if you serve the EU, GDPR. Self-serve deletion is already built.
- [ ] Business entity, bank account, and sales-tax registration where Stripe Tax says you owe.

## 3. Deploy

- [ ] Point Vercel at the repo root and leave **Root Directory** empty.
- [ ] Add every variable from `.env.example` for Production.
- [ ] Deploy, then smoke-test on production:
  - [ ] Sign up with each method.
  - [ ] Parse in Basic and AI modes. The free count should go down.
  - [ ] After 3 documents, the paywall should appear.
  - [ ] Upgrade with a real card, refund yourself in Stripe, and check that the plan changes.
  - [ ] Switch plans in the portal and cancel.
  - [ ] As Business: create an API key, `curl` `/api/v1/parse`, revoke the key.
  - [ ] As Business: create a team, invite a second account, accept the invite, check shared history, remove the member. Cancel the owner's plan and confirm the member loses Business.
  - [ ] AI mode on a multi-page scanned PDF with no text layer.
  - [ ] Open `/app/admin`, look up a test user, grant documents, check the audit log.
  - [ ] Run `npm run test:e2e` with `E2E_JOURNEY=1` against Stripe test mode.
  - [ ] Open the income report and print it to PDF.
  - [ ] Delete a test account.
- [ ] Confirm `/api/cron/lifecycle` and `/api/cron/retention` appear under Vercel → Settings → Cron Jobs.

## 4. Accuracy before marketing

- [ ] Collect 50–100 real, anonymized stubs across ADP, Gusto, Paychex, Square, QuickBooks, and others.
- [ ] Add them to `bench/fixtures/private/` with expected answers.
- [ ] Run `npm run bench` and `BENCH_AI=1 npm run bench`. Fix the worst misses.
- [ ] Publish the AI-mode accuracy only once you can back the number.

## 5. Getting customers

- [ ] Search Console and Bing Webmaster Tools: verify (`GOOGLE_SITE_VERIFICATION`, `BING_SITE_VERIFICATION`), submit `sitemap.xml`, and request indexing for the hubs and calculators. Full steps in `docs/SEO.md`.
- [ ] Find 5–10 early users in bookkeeping and property-management communities, and offer Business free for feedback.
- [ ] Ask happy users for a quote you can use. Add real testimonials only; the site has none on purpose.
- [ ] Watch the PostHog funnel weekly. The biggest drop-off is the next thing to fix.
