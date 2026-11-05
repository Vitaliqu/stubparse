import { describe, expect, it } from "vitest";
import { annualFromPaycheck, annualFromYtd, checkNetPay, dayOfYear, incomeNeededForRent, rentAffordability, salaryFromHourly } from "@/lib/seo/calculators";
import { GLOSSARY } from "@/lib/seo/glossary";
import { PROVIDER_PAGES } from "@/lib/seo/providers";
import { USE_CASE_PAGES } from "@/lib/seo/use-cases";
import { FORMAT_PAGES } from "@/lib/seo/formats";

describe("calculators", () => {
  it("annualizes a paycheck by frequency", () => {
    expect(annualFromPaycheck(2319.4, "semimonthly").annual).toBe(55665.6);
    expect(annualFromPaycheck(1000, "biweekly").annual).toBe(26000);
    expect(annualFromPaycheck(1000, "weekly").monthly).toBe(4333.33);
  });

  it("annualizes YTD by day of year", () => {
    expect(dayOfYear("2026-10-20")).toBe(293);
    expect(annualFromYtd(45441.2, "2026-10-20")?.annual).toBe(56607.64);
    expect(annualFromYtd(1000, "not-a-date")).toBeNull();
  });

  it("converts hourly to salary with overtime", () => {
    expect(salaryFromHourly(24.5, 40).annual).toBe(50960);
    expect(salaryFromHourly(24.5, 40, 4).weekly).toBe(1127);
  });

  it("applies the rent multiple both ways", () => {
    expect(rentAffordability(6000).maxRent).toBe(2000);
    expect(incomeNeededForRent(2000, 3)).toEqual({ monthly: 6000, annual: 72000 });
  });

  it("checks net pay", () => {
    expect(checkNetPay(2319.4, 502.15, 202.47, 1614.78)).toMatchObject({ ok: true, difference: 0 });
    expect(checkNetPay(2319.4, 502.15, 202.47, 1700)).toMatchObject({ ok: false, difference: 85.22 });
  });
});

describe("SEO content integrity", () => {
  const all = [...PROVIDER_PAGES, ...USE_CASE_PAGES, ...FORMAT_PAGES];

  it("has unique slugs, titles, and descriptions within each section", () => {
    for (const set of [PROVIDER_PAGES, USE_CASE_PAGES, FORMAT_PAGES]) {
      const slugs = set.map((p) => p.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    }
    expect(new Set(all.map((p) => p.title)).size).toBe(all.length);
    expect(new Set(all.map((p) => p.description)).size).toBe(all.length);
  });

  it("keeps titles and descriptions inside search-result lengths", () => {
    for (const p of all) {
      expect(p.title.length, p.slug).toBeLessThanOrEqual(60);
      expect(p.description.length, p.slug).toBeLessThanOrEqual(170);
    }
  });

  it("glossary cross-links only to terms that exist", () => {
    const slugs = new Set(GLOSSARY.map((t) => t.slug));
    for (const t of GLOSSARY) for (const r of t.related) expect(slugs.has(r), `${t.slug} → ${r}`).toBe(true);
  });
});
