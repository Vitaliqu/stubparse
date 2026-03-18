// ── Dynamic field — one line item from any paystub section ───────────────────
export interface DynamicField {
  section: string;   // "Earnings", "Taxes and Adjustments", "Deductions", …
  label: string;     // "Regular Pay", "Federal Income Tax", …
  value: string;     // current-period amount, plain number without $ or commas
  ytd: string;       // year-to-date amount, same format; empty if not present
}

// ── Core paystub record ───────────────────────────────────────────────────────
// Header fields (name, dates) are targeted extractions.
// grossPay / netPay are mirrored from fields[] for quick display in summary rows.
// fields[] holds EVERY line item found — earnings, taxes, deductions, etc.
export interface PaystubData {
  fileName: string;
  name: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  checkDate: string;
  payoutMethod: string;
  grossPay: string;
  netPay: string;
  fields: DynamicField[];
}

export interface FileResult {
  success: boolean;
  fileName: string;
  fileType?: "pdf" | "image";
  data: PaystubData | null;
  rawText: string;
  error?: string;
  aiFieldCount?: number; // fields added or filled by AI (undefined = AI not used)
  previewUrl?: string;   // blob URL for document preview (revoke when done)
}

export type ExportFormat = "xlsx" | "csv" | "json";

export type ToastMessage = {
  type: "success" | "error" | "warning";
  msg: string;
} | null;
