import type { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/seo/site";
import { PROVIDER_PAGES } from "@/lib/seo/providers";
import { FORMAT_PAGES } from "@/lib/seo/formats";
import { USE_CASE_PAGES } from "@/lib/seo/use-cases";
import { GLOSSARY } from "@/lib/seo/glossary";
import { TOOLS } from "@/lib/seo/calculators";

// No lastModified: an identical date on every URL teaches Google to ignore the field.
// Add per-page dates here only when they reflect real content changes.
export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" | "yearly" = "monthly") =>
    ({ url: `${BASE_URL}${path}`, changeFrequency, priority });
  return [
    page("", 1, "weekly"),
    page("/pricing", 0.9),
    page("/paystub-to-excel", 0.8), ...PROVIDER_PAGES.map((p) => page(`/paystub-to-excel/${p.slug}`, 0.7)),
    page("/convert", 0.8), ...FORMAT_PAGES.map((p) => page(`/convert/${p.slug}`, 0.7)),
    page("/use-cases", 0.8), ...USE_CASE_PAGES.map((p) => page(`/use-cases/${p.slug}`, 0.7)),
    page("/tools", 0.8), ...TOOLS.map((t) => page(`/tools/${t.slug}`, 0.8)),
    page("/glossary", 0.7), ...GLOSSARY.map((t) => page(`/glossary/${t.slug}`, 0.6)),
    page("/docs/api", 0.5),
    page("/privacy", 0.2, "yearly"),
    page("/terms", 0.2, "yearly"),
  ];
}
