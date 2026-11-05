import { describe, expect, it } from "vitest";
import { reconcile, toNumber, money } from "@/lib/reconcile";
import { setField, stub } from "./helpers";

const status = (s: ReturnType<typeof stub>) => Object.fromEntries(reconcile(s).map((c) => [c.id, c.status]));

describe("reconcile", () => {
  it("passes all three checks on a consistent stub", () => {
    expect(status(stub())).toEqual({ earnings: "pass", net: "pass", ytd: "pass" });
  });

  it("ignores hours rows when summing earnings", () => {
    const s = setField(stub(), "Regular Hours", "999");
    expect(status(s).earnings).toBe("pass");
  });

  it("fails the earnings check when a line item is wrong", () => {
    expect(status(setField(stub(), "Tips", "250.00")).earnings).toBe("fail");
  });

  it("fails the net check when net pay doesn't follow", () => {
    expect(status(stub({ netPay: "1700.00" })).net).toBe("fail");
  });

  it("fails the YTD check when YTD is below current", () => {
    expect(status(setField(stub(), "Medicare", "10.00", "ytd")).ytd).toBe("fail");
  });

  it("skips checks when data is missing", () => {
    expect(status(stub({ grossPay: "", fields: [] }))).toEqual({ earnings: "skip", net: "skip", ytd: "skip" });
  });

  it("tolerates currency formatting", () => {
    expect(toNumber("$1,234.56")).toBe(1234.56);
    expect(toNumber("abc")).toBeNull();
    expect(money(1234.5)).toBe("$1,234.50");
  });
});
