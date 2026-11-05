# Contributing to StubParse

Thanks for helping. This guide covers how to get set up and what a pull request needs to be merged.

## Ground rules

- **Never commit a real paystub.** Not in fixtures, screenshots, issues, or test output. Use synthetic data, or anonymize every name, address, ID, and amount. Real samples for local benchmarking go in `bench/fixtures/private/`, which is gitignored.
- **Security issues go through [SECURITY.md](SECURITY.md)**, not public issues.
- Be kind. See the [Code of Conduct](CODE_OF_CONDUCT.md).

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Basic mode needs only the Firebase variables. See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for Stripe, Firestore rules, and the end-to-end tests.

## Good first contributions

- **A layout StubParse misreads.** Add a synthetic fixture to `bench/fixtures/` (the extracted text plus a `.expected.json`), fix the parser, and show the benchmark improving. This is the most valuable kind of PR.
- **A new SEO page.** Provider, format, glossary, and use-case pages are plain data in `src/lib/seo/`. See [docs/SEO.md](docs/SEO.md).
- **Accessibility.** The workspace is used for long checking sessions, so keyboard flow and screen-reader labels matter.

## Before you open a pull request

```bash
npm run lint
npm run typecheck
npm test
npm run bench
npm run build
```

CI runs the same checks plus Playwright. A PR is ready when:

- [ ] All of the above pass
- [ ] New logic has a unit test (math, billing, and integrity rules always do)
- [ ] UI changes follow [DESIGN.md](DESIGN.md): highlighter yellow means "extracted by AI" and nothing else
- [ ] Screenshots are attached for visual changes, using fictional data
- [ ] No secrets, real documents, or personal data are in the diff

## Code style

- TypeScript strict, no `any` without a comment explaining why
- Server-only code lives in `src/lib/server/` and never imports into client components
- Comments explain *why*, not *what*
- Keep pull requests focused: one fix or feature each

## Commit messages

Short and imperative: `Fix YTD parsing for ADP two-column layout`. Reference an issue when there is one.
