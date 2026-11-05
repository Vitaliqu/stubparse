# Architecture

How StubParse is put together: the source layout, the Firestore data model, and how billing, teams, metering and retention work. For the quick tour, see the [README](../README.md).

## Source layout

```
src/
├── app/
│   ├── (marketing)/              # landing, pricing, privacy, terms, docs/api,
│   │                             # paystub-to-excel, convert, use-cases, glossary, tools
│   ├── (auth)/                   # sign-in, sign-up, sign-in/complete (magic link)
│   ├── app/                      # signed-in product
│   │   ├── page.tsx              #   workspace: parse, review, export
│   │   ├── history/              #   saved stubs, labels, bulk export / report
│   │   ├── report/               #   income report (Business)
│   │   ├── join/                 #   accept a team invite
│   │   ├── admin/                #   internal support view (ADMIN_EMAILS only)
│   │   └── account/              #   plan, invoices, preferences, team, API keys, delete
│   └── api/
│       ├── account/              # GET plan (+ welcome email) · DELETE account
│       ├── usage/consume/        # meter a Basic-mode document
│       ├── ai-parse/             # auth + quota + Claude extraction + metering
│       ├── export/               # XLSX / CSV / JSON
│       ├── stripe/               # checkout · portal · sync · invoices · webhook
│       ├── keys/                 # API key management (Business)
│       ├── team/                 # team · invites · members · join (Business)
│       ├── admin/                # user lookup and support actions
│       ├── v1/parse/             # public REST API (Business)
│       ├── email/unsubscribe/    # signed unsubscribe links
│       └── cron/                 # lifecycle emails · retention cleanup (Vercel Cron)
├── components/{marketing,app,auth}/ …
└── lib/
    ├── plan.ts                   # tiers, prices, feature gates (shared)
    ├── reconcile.ts              # the three math checks
    ├── income.ts                 # frequency, averages, annualized income
    ├── integrity.ts              # edited/inconsistent-stub signals
    ├── history.ts · prefs.ts     # Firestore history + preferences (client)
    ├── parse-client.ts           # Basic + AI parsing pipeline (browser)
    ├── ai-extractor.ts           # Claude extraction (server; text, image, PDF)
    ├── analytics.ts              # PostHog (no-op without a key)
    ├── seo/                      # programmatic SEO: page data, JSON-LD, OG images, calculators
    └── server/
        ├── account.ts            # auth, quotas, Stripe sync, webhook dedupe
        ├── stripe.ts             # price catalog, subscription mapping
        ├── api-keys.ts           # hashed keys
        ├── team.ts               # seats, invites, inherited plan
        ├── admin.ts              # admin gate, user report, support actions
        ├── ratelimit.ts          # Upstash, or in-memory fallback
        ├── email.ts              # Resend lifecycle email
        └── monitoring.ts         # Sentry + per-user error log
tests/                            # unit tests (vitest) · e2e/ (Playwright)
bench/                            # field-accuracy benchmark + fixtures
firestore.rules                   # data access rules
firestore.indexes.json            # collection-group index + TTL for retention
vercel.json                       # cron schedule
```

## Data model (Firestore)

| Path | Written by | Contents |
|---|---|---|
| `users/{uid}` | server | email, `docsUsed`, monthly usage, `bonusDocs`, Stripe customer, `subscription { tier, interval, status, … }`, `team { id, name, role, tier }`, email log, opt-out |
| `users/{uid}/documents/{id}` | client (paid plans) | extracted `data`, `label`, file name, file signals, `expiresAt`. **Never the file.** |
| `users/{uid}/settings/prefs` | client | `saveHistory`, `retentionMonths` |
| `teams/{id}` | server | name, `ownerUid`, `tier` (copied from the owner's subscription) |
| `teams/{id}/members/{uid}` · `invites/{id}` | server | membership; hashed invite tokens (14-day expiry) |
| `teams/{id}/documents/{id}` | members | shared team history, same shape as personal history, plus `createdBy` |
| `apiKeys/{sha256}` | server | owner `uid`, name, prefix, last used |
| `stripe_events/{eventId}` | server | processed webhook ids (dedupe) |
| `errorLog/{id}` · `adminLog/{id}` | server | per-user errors (30-day expiry) · admin actions |

The rules in `firestore.rules` allow saving history only on a paid plan (own or team). Owners and members can always read and delete what they can see.

## Teams

Business includes 5 seats. The owner pays; members inherit Business while the owner's subscription is active, because every subscription sync copies the owner's tier onto the team and each member's `users/{uid}.team`. An invite is a one-time link bound to the invited email. When a user is in a team, history reads and writes go to the team's shared collection.

## Retention

Each saved stub gets `expiresAt` from the saver's preference (default 12 months; 3, 6, 12, 24, or never). Expired stubs are hidden immediately, deleted daily by `/api/cron/retention`, and also by Firestore TTL once you enable it.

## Admin

`/app/admin` is visible only to verified emails in `ADMIN_EMAILS`. Look up a user by email, uid, or Stripe customer id; see plan, usage, team, saved-stub count, and recent errors. Grant documents, reset monthly usage, re-sync billing, or disable sign-in. Every action is recorded in `adminLog`.

## Billing

Stripe is the source of truth. The webhook claims each event id once, then **re-reads the customer's subscriptions from Stripe** and stores the right one. Retries and out-of-order delivery can't leave a stale plan. `/api/stripe/sync` does the same on demand: after checkout, and whenever the account page opens. A missed webhook never leaves a paying user on Free.

## Metering

| Mode | Runs | Counted |
|---|---|---|
| Basic | in the browser | before each file, via `/api/usage/consume` |
| AI | browser text extraction, then Claude on the server | on success, inside `/api/ai-parse` |
| API | server | on success, inside `/api/v1/parse` |

Free accounts get 3 documents in total. Paid plans have a monthly fair-use ceiling (`PRO_MONTHLY_LIMIT`, `BUSINESS_MONTHLY_LIMIT`). Basic-mode metering can be bypassed by a determined user, since parsing happens on their device. AI and API usage, the paths that cost money, are enforced on the server.
