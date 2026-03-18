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
    title: "Header Info",
    fields: [
      { key: "name",           label: "Employee Name" },
      { key: "payPeriodStart", label: "Pay Period Start" },
      { key: "payPeriodEnd",   label: "Pay Period End" },
      { key: "checkDate",      label: "Check / Pay Date" },
      { key: "payoutMethod",   label: "Payout Method" },
    ],
  },
  {
    id: "summary",
    title: "Summary",
    fields: [
      { key: "grossPay", label: "Gross Pay" },
      { key: "netPay",   label: "Net Pay" },
    ],
  },
];

export const HEADER_DISPLAY_FIELDS: { key: keyof PaystubData; label: string }[] = [
  { key: "name",           label: "Employee" },
  { key: "payPeriodStart", label: "Period Start" },
  { key: "payPeriodEnd",   label: "Period End" },
  { key: "checkDate",      label: "Pay Date" },
  { key: "payoutMethod",   label: "Payout" },
];
