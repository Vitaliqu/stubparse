import { BASE_URL } from "@/lib/seo/site";
import { PROVIDER_PAGES, providerName } from "@/lib/seo/providers";
import { FORMAT_PAGES } from "@/lib/seo/formats";
import { USE_CASE_PAGES } from "@/lib/seo/use-cases";
import { GLOSSARY } from "@/lib/seo/glossary";
import { TOOLS } from "@/lib/seo/calculators";

export const dynamic = "force-static";

/** llms.txt: a plain-text map of the site for AI search engines and assistants (llmstxt.org). */
export function GET() {
  const link = (title: string, path: string, note: string) => `- [${title}](${BASE_URL}${path}): ${note}`;
  const body = [
    "# StubParse",
    "",
    "> StubParse turns paystub PDFs and photos into Excel, CSV, or JSON. It reads every earning, tax, deduction, and year-to-date figure, checks that the math adds up, and runs in the browser so files aren't stored. Free for 3 documents; Pro is $5/month; Business ($29/month) adds team seats, income reports, integrity checks, and a REST API.",
    "",
    "## Product",
    link("Home", "/", "What StubParse does and how it works"),
    link("Pricing", "/pricing", "Free, Pro, and Business plans"),
    link("API reference", "/docs/api", "POST /api/v1/parse: paystub PDF or image to JSON"),
    link("Privacy", "/privacy", "What is and isn't sent or stored"),
    "",
    "## Free calculators",
    ...TOOLS.map((t) => link(t.name, `/tools/${t.slug}`, t.description)),
    "",
    "## Paystub glossary",
    ...GLOSSARY.map((t) => link(t.term, `/glossary/${t.slug}`, t.short)),
    "",
    "## Use cases",
    ...USE_CASE_PAGES.map((p) => link(p.h1, `/use-cases/${p.slug}`, p.description)),
    "",
    "## Converters",
    ...FORMAT_PAGES.map((p) => link(p.h1, `/convert/${p.slug}`, p.description)),
    "",
    "## Payroll providers",
    ...PROVIDER_PAGES.map((p) => link(providerName(p.slug), `/paystub-to-excel/${p.slug}`, p.description)),
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
