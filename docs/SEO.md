# SEO playbook

StubParse uses the programmatic-SEO model large marketplaces like Airbnb run on. A structured catalog of genuinely useful pages, one per search intent, is generated from data, organized into hubs, connected by internal links, and described to search engines with structured data. This document covers what's built, how to grow it, and what to measure.

## What's built

| Section | URL pattern | Pages | Search intent | Source |
|---|---|---|---|---|
| Payroll providers | `/paystub-to-excel/[provider]` | 23 | "ADP paystub to Excel", "Paycom pay stub" | `src/lib/seo/providers.ts` |
| Converters | `/convert/[format]` | 6 | "PDF paystub to Excel", "paystub to CSV" | `src/lib/seo/formats.ts` |
| Use cases | `/use-cases/[slug]` | 8 | "verify income from paystubs", "paystubs for mortgage" | `src/lib/seo/use-cases.ts` |
| Free calculators | `/tools/[tool]` | 5 | "annual income calculator", "3x rent calculator" | `src/lib/seo/calculators.ts` |
| Glossary | `/glossary/[term]` | 22 | "what is YTD on a paystub", "what is OASDI" | `src/lib/seo/glossary.ts` |
| Hubs | `/paystub-to-excel`, `/convert`, `/use-cases`, `/tools`, `/glossary` | 5 | category browsing; spreads link authority | — |

Every page is statically generated at build time.

**On every page:**
- a unique title (60 characters or fewer) and meta description (170 or fewer), plus a self-referencing canonical
- one H1
- Open Graph and Twitter tags, with a share image generated per page
- breadcrumbs, both visible and as `BreadcrumbList`

**Structured data by page type:**

| Page type | Structured data |
|---|---|
| Landing pages | `FAQPage` + `HowTo` |
| Calculators | `WebApplication` + `FAQPage` |
| Glossary terms | `DefinedTerm` (in a `DefinedTermSet`) |
| Hubs | `ItemList` |
| Root | `Organization`, `WebSite`, and `SoftwareApplication` with prices |

**Discovery:**
- `sitemap.xml` lists every indexable URL.
- `robots.txt` keeps `/app` and `/api` out.
- `/llms.txt` gives AI search engines (ChatGPT, Perplexity, Google AI Overviews) a clean map of the site.

**Internal linking:**
- Every page links to its hub and to sibling pages.
- Glossary terms link to related terms and to a matching calculator.
- Calculators link to the terms they use.
- The footer links every hub from every page.
- Most pages are two clicks from the homepage.

## Guardrails (run in CI)

- `npm test` checks that SEO content has unique slugs, titles, and descriptions, that lengths fit search results, and that glossary cross-links resolve.
- `npm run seo:audit -- <url>` crawls the built site like a search engine. It fails on non-200 pages, missing or duplicate titles and descriptions, wrong canonicals, pages without exactly one H1, invalid JSON-LD, or broken internal links.
- `npm run test:e2e` covers the sitemap, robots, `llms.txt`, calculators, glossary navigation, and CSP.

## Launch steps (yours)

1. **Google Search Console:** add the `stubparse.com` domain property, put the verification code in `GOOGLE_SITE_VERIFICATION` (or verify by DNS), deploy, then submit `https://stubparse.com/sitemap.xml`.
2. **Bing Webmaster Tools:** import from Search Console, or set `BING_SITE_VERIFICATION`. Bing also feeds ChatGPT search and DuckDuckGo.
3. **Request indexing** in Search Console for the five hubs and the five calculators. The rest will follow the internal links.
4. **Check Core Web Vitals** in PageSpeed Insights for `/`, one calculator, and one provider page after deploying.

## Growing it (in order of expected return)

1. **Calculators earn links.** People share and embed useful tools. Next tools to build:
   - take-home pay estimate by state
   - overtime calculator
   - pay-raise and percentage calculator
   - "biweekly vs semimonthly" explainer calculator
   - debt-to-income ratio for loan applicants

   Each one targets a query with real volume.
2. **Provider pages need real detail to rank.** Today's generated pages are accurate but generic. For the providers that bring traffic, add a real anonymized stub screenshot, the actual section labels that provider uses, and common extraction pitfalls. Unique facts are what separate a programmatic page from thin content.
3. **State pages (`/paystub/[state]`).** Each covers state income tax, SDI or paid-leave deductions, local taxes, and pay-stub requirements. Write them from official state sources and cite them; tax facts must be exact.
4. **Comparison pages.** "Paystub to Excel: StubParse vs copying by hand vs generic OCR". Only make factual comparisons; never invent competitor claims.
5. **Fresh content signals.** When figures change yearly (Social Security wage base, contribution limits), update the glossary and bump `UPDATED` in `src/app/sitemap.ts`.
6. **Backlinks.** Get listed in bookkeeping and property-manager tool directories, offer the calculators to personal-finance writers, and answer paystub questions on Reddit and Quora with links to the glossary.

## How to add a page

- **Provider:** add one entry to `PROVIDERS` in `src/lib/seo/providers.ts`, with a slug, name, category, and a true, specific `note`. The page, hub entry, share image, sitemap entry, and `llms.txt` line are generated.
- **Use case / converter:** add an entry to `src/lib/seo/use-cases.ts` or `formats.ts`, plus a label in `src/lib/seo/sections.ts`.
- **Glossary term:** add to `GLOSSARY`. Link only to existing slugs (a test enforces it).
- **Calculator:** add pure math to `calculators.ts` (with a unit test), metadata to `TOOLS`, and a form to `Calculator.tsx`.

Run `npm test` and `npm run seo:audit` afterwards.

## What to measure

In Search Console, weekly:
- impressions and clicks per section; filter by URL prefix (`/tools/`, `/glossary/`, `/paystub-to-excel/`)
- queries with high impressions but low click-through rate: rewrite those titles and descriptions
- pages "Crawled – currently not indexed": usually too generic, so enrich them first

In PostHog: sign-ups whose first page was an SEO page, by section. That tells you which kind of page to make more of.
