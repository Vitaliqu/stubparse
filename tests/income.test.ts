import { describe, expect, it } from "vitest";
import { buildIncomeReport, detectFrequency, summarizeEmployee } from "@/lib/income";
import { setField, stub } from "./helpers";

const period = (start: string, end: string, pay: string, gross: string, ytd: string) =>
  setField(stub({ payPeriodStart: start, payPeriodEnd: end, checkDate: pay, grossPay: gross }), "Gross pay", ytd, "ytd");

describe("detectFrequency", () => {
  it("reads period length first", () => {
    expect(detectFrequency([stub({ payPeriodStart: "2026-10-01", payPeriodEnd: "2026-10-07" })])).toBe("weekly");
    expect(detectFrequency([stub({ payPeriodStart: "2026-10-01", payPeriodEnd: "2026-10-14" })])).toBe("biweekly");
    expect(detectFrequency([stub({ payPeriodStart: "2026-10-01", payPeriodEnd: "2026-10-15" })])).toBe("semimonthly");
    expect(detectFrequency([stub({ payPeriodStart: "2026-10-01", payPeriodEnd: "2026-10-31" })])).toBe("monthly");
  });

  it("falls back to gaps between pay dates", () => {
    const s = (d: string) => stub({ payPeriodStart: "", payPeriodEnd: "", checkDate: d });
    expect(detectFrequency([s("2026-09-04"), s("2026-09-18"), s("2026-10-02")])).toBe("biweekly");
    expect(detectFrequency([s("2026-09-15"), s("2026-09-30"), s("2026-10-15")])).toBe("semimonthly");
    expect(detectFrequency([s("2026-08-31"), s("2026-09-30"), s("2026-10-31")])).toBe("monthly");
    expect(detectFrequency([s("2026-10-20")])).toBe("unknown");
  });
});

describe("summarizeEmployee", () => {
  const stubs = [
    period("2026-09-01", "2026-09-15", "2026-09-20", "2284.10", "40821.95"),
    period("2026-09-16", "2026-09-30", "2026-10-05", "2301.75", "43123.70"),
    period("2026-10-01", "2026-10-15", "2026-10-20", "2319.40", "45443.10"),
  ];
  const r = summarizeEmployee("Maya Okafor", stubs);

  it("averages and annualizes from pay periods", () => {
    expect(r.frequency).toBe("semimonthly");
    expect(r.avgGross).toBeCloseTo(2301.75, 2);
    expect(r.annualizedFromAverage).toBeCloseTo(55242, 2);
  });

  it("annualizes from the latest YTD pace", () => {
    // Oct 20 is day 293 of 2026
    expect(r.annualizedFromYtd).toBeCloseTo((45443.1 / 293) * 365, 2);
  });

  it("finds no YTD jump when stubs follow on", () => {
    expect(r.flags.filter((f) => f.id.startsWith("ytd-jump"))).toHaveLength(0);
  });

  it("flags a YTD figure that doesn't follow from the previous stub", () => {
    const tampered = [...stubs.slice(0, 2), period("2026-10-01", "2026-10-15", "2026-10-20", "2319.40", "52000.00")];
    expect(summarizeEmployee("Maya", tampered).flags.some((f) => f.id.startsWith("ytd-jump") && f.severity === "risk")).toBe(true);
  });

  it("counts missing periods and flags drops", () => {
    const gappy = [
      period("2026-08-01", "2026-08-15", "2026-08-20", "2400.00", "36000.00"),
      period("2026-10-01", "2026-10-15", "2026-10-20", "1800.00", "41000.00"),
      period("2026-10-16", "2026-10-31", "2026-11-05", "1800.00", "42800.00"),
    ];
    const g = summarizeEmployee("Sam", gappy);
    expect(g.missingPeriods).toBeGreaterThanOrEqual(2);
    expect(g.flags.some((f) => f.id === "gross-drop")).toBe(true);
  });
});

describe("buildIncomeReport", () => {
  it("groups by employee name, case- and space-insensitively", () => {
    const report = buildIncomeReport([stub({ name: "Maya Okafor" }), stub({ name: "maya  okafor" }), stub({ name: "Sam Lee" })]);
    expect(report.map((r) => [r.employee, r.stubCount])).toEqual([["Maya Okafor", 2], ["Sam Lee", 1]]);
  });
});
