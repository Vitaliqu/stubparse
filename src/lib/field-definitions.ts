import type { PaystubData } from "@/types/paystub";

export type ExportGroupDef = {
  id: string;
  title: string;
  fields: { key: keyof PaystubData; label: string }[];
};

export const HEADER_EXPORT_KEYS: (keyof PaystubData)[] = [
  "name", "payPeriodStart", "payPeriodEnd", "checkDate", "payoutMethod",
  "grossPay", "netPay",
];

export const EXPORT_GROUPS: ExportGroupDef[] = [
  {
    id: "header",
    title: "Header info",
    fields: [
      { key: "name",           label: "Employee name" },
      { key: "payPeriodStart", label: "Pay period start" },
      { key: "payPeriodEnd",   label: "Pay period end" },
      { key: "checkDate",      label: "Check / pay date" },
      { key: "payoutMethod",   label: "Payout method" },
    ],
  },
  {
    id: "summary",
    title: "Summary",
    fields: [
      { key: "grossPay", label: "Gross pay" },
      { key: "netPay",   label: "Net pay" },
    ],
  },
];

export const HEADER_DISPLAY_FIELDS: { key: keyof PaystubData; label: string }[] = [
  { key: "name",           label: "Employee" },
  { key: "payPeriodStart", label: "Period start" },
  { key: "payPeriodEnd",   label: "Period end" },
  { key: "checkDate",      label: "Pay date" },
  { key: "payoutMethod",   label: "Payout" },
];
