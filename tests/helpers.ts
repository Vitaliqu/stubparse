import type { DynamicField, PaystubData } from "@/types/paystub";

export function stub(over: Partial<PaystubData> & { fields?: DynamicField[] } = {}): PaystubData {
  return {
    fileName: "stub.pdf",
    name: "Maya Okafor",
    payPeriodStart: "2026-10-01",
    payPeriodEnd: "2026-10-15",
    checkDate: "2026-10-20",
    payoutMethod: "",
    grossPay: "2319.40",
    netPay: "1614.78",
    fields: [
      { section: "Earnings", label: "Regular", value: "1960.00", ytd: "39200.00" },
      { section: "Earnings", label: "Regular Hours", value: "80.00", ytd: "" },
      { section: "Earnings", label: "Overtime", value: "147.00", ytd: "2205.00" },
      { section: "Earnings", label: "Tips", value: "212.40", ytd: "4036.20" },
      { section: "Taxes", label: "Federal Income Tax", value: "231.94", ytd: "4544.12" },
      { section: "Taxes", label: "Social Security", value: "143.80", ytd: "2817.35" },
      { section: "Taxes", label: "Medicare", value: "33.63", ytd: "658.90" },
      { section: "Taxes", label: "CA State Income Tax", value: "92.78", ytd: "1817.65" },
      { section: "Deductions", label: "401(k)", value: "115.97", ytd: "2272.06" },
      { section: "Deductions", label: "Health Insurance", value: "86.50", ytd: "1730.00" },
      { section: "Totals", label: "Gross pay", value: "2319.40", ytd: "45441.20" },
      { section: "Totals", label: "Net pay", value: "1614.78", ytd: "31601.12" },
    ],
    ...over,
  };
}

export const setField = (s: PaystubData, label: string, value: string, col: "value" | "ytd" = "value"): PaystubData => ({
  ...s,
  fields: s.fields.map((f) => (f.label === label ? { ...f, [col]: value } : f)),
});
