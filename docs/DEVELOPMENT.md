# Development

Everything needed to run, test and operate StubParse locally. Start with the [quick start in the README](../README.md#quick-start).

## Setup

```bash
npm install
cp .env.example .env      # fill in at least Firebase, Stripe, Anthropic
npm run dev
```

| Command | What it does |
|---|---|
| `npm test` | unit tests: math checks, income report, integrity, plans, billing mapping |
| `npm run bench` | Basic-mode field accuracy on `bench/fixtures` (`BENCH_AI=1` adds AI mode) |
| `npm run lint` · `npm run typecheck` | static checks |
| `npm run build` | production build |
| `npm run test:e2e` | Playwright against the production build (`npm run build` first; `E2E_CHANNEL=chrome` to use installed Chrome) |

CI (`.github/workflows/ci.yml`) runs all of the above on every push and pull request.

## End-to-end tests

`tests/e2e/public.spec.ts` covers public pages and API guards and needs no secrets. `tests/e2e/journey.spec.ts` signs in, parses the sample stub, watches the free count drop, pays with Stripe's test card, and checks the plan turns Pro. It creates and deletes its own user. It runs only with `E2E_JOURNEY=1` and refuses anything but a `sk_test_` Stripe key. Point it at a separate Firebase project for testing if you can. In CI, add the `E2E_*`, Firebase, and Stripe test secrets listed in the workflow.

## Accuracy benchmark

`bench/fixtures/` holds synthetic stubs: extracted text plus a `.expected.json` with the right answers. They're synthetic, so they prove the harness, not real-world accuracy. To measure what matters, add real anonymized stubs to `bench/fixtures/private/` (gitignored) in the same format, and run `npm run bench` before and after every parser change.

## Stripe locally

```bash
stripe listen \
  --api-key "$(grep '^STRIPE_SECRET_KEY=' .env | cut -d= -f2- | tr -d '\"')" \
  --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted \
  --forward-to localhost:3000/api/stripe/webhook
```

Put the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET` and restart the dev server. Test card: `4242 4242 4242 4242`, any future date, any CVC.

## Firestore rules

```bash
npm run deploy:rules        # uses the Firebase Admin key in .env
# or: npx firebase-tools deploy --only firestore:rules --project <project-id>
```

Redeploy them whenever `firestore.rules` changes. History saving fails without the current rules.

Indexes and TTL (needed for retention cleanup):

```bash
npx firebase-tools deploy --only firestore:indexes --project <project-id>
# or enable TTL directly:
gcloud firestore fields ttls update expiresAt --collection-group=documents --enable-ttl --project=<project-id>
gcloud firestore fields ttls update expiresAt --collection-group=errorLog --enable-ttl --project=<project-id>
```
