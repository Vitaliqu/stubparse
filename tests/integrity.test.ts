import { describe, expect, it } from "vitest";
import { analyzeStub, riskLevel, type FileSignals } from "@/lib/integrity";
import { setField, stub } from "./helpers";

const NOW = new Date("2026-11-04T12:00:00Z");
const ids = (signals: ReturnType<typeof analyzeStub>) => signals.map((s) => s.id);

const pdf = (over: Partial<FileSignals> = {}): FileSignals => ({
  kind: "pdf", producer: "Payroll Engine 4.2", creator: null, createdAt: "2026-10-20T08:00:00Z", modifiedAt: "2026-10-20T08:00:00Z",
  pageCount: 1, amountFonts: 1, hasTextLayer: true, ...over,
});

describe("analyzeStub", () => {
  it("finds nothing on a clean stub from payroll software", () => {
    const signals = analyzeStub(stub(), pdf(), NOW);
    expect(signals).toEqual([]);
    expect(riskLevel(signals)).toBe("low");
  });

  it("flags net above gross as high risk", () => {
    const signals = analyzeStub(stub({ netPay: "3000.00" }), null, NOW);
    expect(ids(signals)).toContain("net-over-gross");
    expect(riskLevel(signals)).toBe("high");
  });

  it("flags implausible Social Security and Medicare rates", () => {
    let s = setField(stub(), "Social Security", "300.00");
    s = setField(s, "Medicare", "80.00");
    expect(ids(analyzeStub(s, null, NOW))).toEqual(expect.arrayContaining(["ss-high", "medicare-high"]));
  });

  it("flags editing tools, later modification, and mixed amount fonts", () => {
    const signals = analyzeStub(stub(), pdf({ producer: "Adobe Photoshop 25.0", modifiedAt: "2026-10-28T10:00:00Z", amountFonts: 3 }), NOW);
    expect(ids(signals)).toEqual(expect.arrayContaining(["editing-tool", "modified-later", "mixed-fonts"]));
    expect(riskLevel(signals)).toBe("medium");
  });

  it("flags date problems", () => {
    expect(ids(analyzeStub(stub({ payPeriodStart: "2026-10-15", payPeriodEnd: "2026-10-01" }), null, NOW))).toContain("period-reversed");
    expect(ids(analyzeStub(stub({ checkDate: "2026-12-30" }), null, NOW))).toContain("future-date");
  });

  it("notes round numbers without raising risk", () => {
    const signals = analyzeStub(stub({ grossPay: "3000.00", netPay: "2100.00", fields: [] }), null, NOW);
    expect(ids(signals)).toContain("round-amounts");
    expect(riskLevel(signals)).toBe("low");
  });
});
