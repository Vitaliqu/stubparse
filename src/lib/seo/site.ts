// Site-wide SEO constants and structured-data (schema.org JSON-LD) builders.

export const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://stubparse.com").replace(/\/$/, "");
const SITE_NAME = "StubParse";
const abs = (path: string) => `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

export interface Crumb { name: string; path: string }

export const breadcrumbLd = (crumbs: Crumb[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: abs(c.path) })),
});

export const faqLd = (faq: { q: string; a: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});

export const howToLd = (name: string, steps: { name: string; text: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "HowTo",
  name,
  step: steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.name, text: s.text })),
});

export const definedTermLd = (term: string, description: string, path: string) => ({
  "@context": "https://schema.org",
  "@type": "DefinedTerm",
  name: term,
  description,
  url: abs(path),
  inDefinedTermSet: { "@type": "DefinedTermSet", name: "StubParse paystub glossary", url: abs("/glossary") },
});

export const itemListLd = (name: string, items: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name,
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, url: abs(it.path) })),
});

export const calculatorLd = (name: string, description: string, path: string) => ({
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name,
  description,
  url: abs(path),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: SITE_NAME, url: BASE_URL },
});

/** Site identity for the root layout: Organization + WebSite + the product itself. */
export const siteGraphLd = (description: string) => ({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": `${BASE_URL}/#org`, name: SITE_NAME, url: BASE_URL, logo: abs("/icon.svg") },
    { "@type": "WebSite", "@id": `${BASE_URL}/#site`, name: SITE_NAME, url: BASE_URL, publisher: { "@id": `${BASE_URL}/#org` } },
    {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      url: BASE_URL,
      description,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      publisher: { "@id": `${BASE_URL}/#org` },
      offers: [
        { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
        { "@type": "Offer", name: "Pro", price: "5", priceCurrency: "USD" },
        { "@type": "Offer", name: "Business", price: "29", priceCurrency: "USD" },
      ],
    },
  ],
});

/** Serialize JSON-LD safely for a <script> tag (no closing-tag injection). */
export const jsonLd = (data: unknown) => ({ __html: JSON.stringify(data).replace(/</g, "\\u003c") });
