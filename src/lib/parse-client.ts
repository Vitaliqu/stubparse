// Client-side parsing pipeline: Basic (in-browser rules) and AI (browser text extraction + Claude).

import type { PaystubData, DynamicField } from "@/types/paystub";

const AI_PARSE_URL = "/api/ai-parse";

/** Strip $ and thousands commas from a monetary string: "$1,234.56" → "1234.56" */
function stripCurrency(v: unknown): string {
  if (v !== null && typeof v === "object") {
    // Flatten objects like {hours: "8", balance: "40"} → "hours: 8, balance: 40"
    return Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `${k}: ${val}`)
      .join(", ");
  }
  return String(v ?? "").replace(/^\$/, "").replace(/,/g, "");
}

function pushIfSet(fields: DynamicField[], section: string, label: string, value: unknown, ytd = "") {
  if (value !== null && value !== undefined && value !== "") {
    fields.push({ section, label, value: stripCurrency(value), ytd: ytd ? stripCurrency(ytd) : "" });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapBackendResult(result: any, fileName: string): PaystubData {
  const d = result.extracted_data ?? {};
  const fields: DynamicField[] = [];

  // Earnings / Taxes / Deductions — with YTD
  for (const e of (d.earnings ?? [])) {
    if (!e.description) continue;
    const hasHours = !!e.hours;
    const payLabel = hasHours
      ? e.description.replace(/\bHours?\b/i, "Pay").trim() || e.description
      : e.description;
    fields.push({ section: "Earnings", label: payLabel, value: stripCurrency(e.current_amount), ytd: stripCurrency(e.ytd_amount) });
    if (hasHours) fields.push({ section: "Earnings", label: e.description, value: String(e.hours), ytd: "" });
  }
  for (const t of (d.taxes ?? [])) {
    if (t.description) fields.push({ section: "Taxes", label: t.description, value: stripCurrency(t.current_amount), ytd: stripCurrency(t.ytd_amount) });
  }
  for (const dd of (d.deductions ?? [])) {
    if (dd.description) fields.push({ section: "Deductions", label: dd.description, value: stripCurrency(dd.current_amount), ytd: stripCurrency(dd.ytd_amount) });
  }

  // Totals — current + YTD pairs
  const tot = d.totals ?? {};
  pushIfSet(fields, "Totals", "Gross pay",        tot.gross_pay_current,        tot.gross_pay_ytd        ?? "");
  pushIfSet(fields, "Totals", "Net pay",          tot.net_pay_current,          tot.net_pay_ytd          ?? "");
  pushIfSet(fields, "Totals", "Total taxes",      tot.total_taxes_current,      tot.total_taxes_ytd      ?? "");
  pushIfSet(fields, "Totals", "Total deductions", tot.total_deductions_current, tot.total_deductions_ytd ?? "");

  // Employee extras
  const empl = d.employee ?? {};
  pushIfSet(fields, "Employee", "Employee ID", empl.employee_id);
  pushIfSet(fields, "Employee", "Department",  empl.department);
  pushIfSet(fields, "Employee", "Position",    empl.position);
  pushIfSet(fields, "Employee", "SSN last 4",  empl.ssn_last4);
  pushIfSet(fields, "Employee", "Address",     empl.address);

  // Employer
  const er = d.employer ?? {};
  pushIfSet(fields, "Employer", "Employer name",    er.name);
  pushIfSet(fields, "Employer", "Employer address", er.address);
  pushIfSet(fields, "Employer", "EIN",              er.ein);
  pushIfSet(fields, "Employer", "Employer phone",   er.phone);

  // Check number / notes
  pushIfSet(fields, "Other", "Check number", d.check_number);
  pushIfSet(fields, "Other", "Notes",        d.raw_notes);

  // Extra fields: pair *_current/*_ytd keys as Earnings rows; rest go to Other
  const toTitleCase = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const extra = d.extra_fields ?? {};
  const usedExtraKeys = new Set<string>();
  for (const k of Object.keys(extra)) {
    if (usedExtraKeys.has(k) || !k.endsWith("_current")) continue;
    const base   = k.slice(0, -"_current".length);
    const ytdKey = `${base}_ytd`;
    fields.push({ section: "Earnings", label: toTitleCase(base), value: stripCurrency(extra[k]), ytd: stripCurrency(extra[ytdKey] ?? "") });
    usedExtraKeys.add(k);
    usedExtraKeys.add(ytdKey);
  }
  for (const [k, v] of Object.entries(extra)) {
    if (!usedExtraKeys.has(k)) pushIfSet(fields, "Other", toTitleCase(k), v);
  }

  return {
    fileName,
    name: empl.name ?? "",
    payPeriodStart: d.pay_period?.start_date ?? "",
    payPeriodEnd:   d.pay_period?.end_date   ?? "",
    checkDate:      d.pay_period?.pay_date   ?? "",
    payoutMethod:   (() => {
      const fromExtra = Object.entries(extra).find(([k]) =>
        /payout|payment.?method|bank|direct.?deposit/i.test(k)
      );
      return String(fromExtra?.[1] ?? d.pay_period?.pay_frequency ?? "");
    })(),
    grossPay: stripCurrency(tot.gross_pay_current),
    netPay:   stripCurrency(tot.net_pay_current),
    fields,
  };
}

/** Thrown when the server refuses a parse because of the plan limit. */
export class QuotaError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

type AuthedFetch = (input: string, init?: RequestInit) => Promise<Response>;

/** Parses one file in AI mode. Metering happens server-side on success. */
export async function parseWithAI(file: File, report: (msg: string) => void, authedFetch: AuthedFetch): Promise<{ data: PaystubData; rawText: string }> {
  // Text extraction runs in the browser; only the text (or a downscaled image) is sent to the server.
  const isPDF = file.type === "application/pdf";
  const { extractPdfText } = await import("@/lib/pdf-extractor");
  const { extractImageText } = await import("@/lib/image-ocr");
  report(isPDF ? "Extracting PDF text…" : "Preprocessing image…");
  const rawText = isPDF ? await extractPdfText(file, report) : await extractImageText(file, report);

  let body: object;
  if (rawText.trim()) {
    body = { fileName: file.name, text: rawText };
    report("AI: extracting fields…");
  } else {
    const { toVisionImages } = await import("@/lib/vision-image");
    report("AI: no text found, preparing pages…");
    const { images, pageCount, truncated } = await toVisionImages(file);
    body = { fileName: file.name, images };
    report(truncated ? `AI: reading the first ${images.length} of ${pageCount} pages…` : images.length > 1 ? `AI: reading ${images.length} pages…` : "AI: reading image…");
  }

  const res = await authedFetch(AI_PARSE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 402 || json.code === "fair_use") throw new QuotaError(json.error, json.code ?? "limit_reached");
  if (res.status === 413) throw new Error(json.error ?? "This document is too large to send for AI reading (about 4.5 MB per request). Try Basic mode, or a smaller or lower-resolution scan.");
  if (!res.ok) throw new Error(json.error ?? `AI server error: ${res.status} ${res.statusText}`);
  return { data: mapBackendResult(json, file.name), rawText };
}

/** Records one Basic-mode document against the plan before parsing it. */
export async function consumeBasicDocument(authedFetch: AuthedFetch): Promise<void> {
  const res = await authedFetch("/api/usage/consume", { method: "POST" });
  const json = await res.json().catch(() => ({}));
  if (res.status === 402 || json.code === "fair_use") throw new QuotaError(json.error, json.code ?? "limit_reached");
  if (!res.ok) throw new Error(json.error ?? "Couldn't check your plan. Try again.");
}

/** Parses one file in Basic mode, entirely in the browser. */
export async function parseWithBasic(file: File, report: (msg: string) => void): Promise<{ data: PaystubData; rawText: string }> {
  const { parsePaystubText } = await import("@/lib/regex-parser");
  const { extractPdfText } = await import("@/lib/pdf-extractor");
  const { extractImageText } = await import("@/lib/image-ocr");
  const isPDF = file.type === "application/pdf";
  report(isPDF ? "Extracting PDF text…" : "Preprocessing image…");
  const rawText = isPDF ? await extractPdfText(file, report) : await extractImageText(file, report);
  report("Parsing fields…");
  return { data: parsePaystubText(rawText, file.name), rawText };
}
