// Server-side only — AI paystub extraction via Claude.

import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";

const client = new Anthropic();

const MAX_TEXT_CHARS = 20_000;

const SCHEMA = `{
  "employee": {
    "name": null,
    "address": null,
    "employee_id": null,
    "ssn_last4": null,
    "department": null,
    "position": null
  },
  "employer": {
    "name": null,
    "address": null,
    "ein": null,
    "phone": null
  },
  "pay_period": {
    "start_date": null,
    "end_date": null,
    "pay_date": null,
    "pay_frequency": null
  },
  "earnings": [
    {"description": "name", "hours": "40.0", "rate": "$X.XX/hr", "current_amount": "$X.XX", "ytd_amount": "$X.XX"}
  ],
  "taxes": [
    {"description": "tax name", "current_amount": "$X.XX", "ytd_amount": "$X.XX"}
  ],
  "deductions": [
    {"description": "deduction name", "current_amount": "$X.XX", "ytd_amount": "$X.XX"}
  ],
  "totals": {
    "gross_pay_current": null,
    "gross_pay_ytd": null,
    "total_taxes_current": null,
    "total_taxes_ytd": null,
    "total_deductions_current": null,
    "total_deductions_ytd": null,
    "net_pay_current": null,
    "net_pay_ytd": null
  },
  "check_number": null,
  "extra_fields": {}
}`;

const RULES = `RULES:
- taxes = government withholdings ONLY: Federal/State Income Tax, Social Security, Medicare, SDI, CPP, EI, etc.
- deductions = voluntary ONLY: 401(k), health/dental/vision insurance, union dues, FSA, parking, etc.
- Dollar amounts: "$1,234.56" format. Dates: YYYY-MM-DD.
- extra_fields: any additional paystub data not in the schema (payroll_id, pay_rate, accrued_vacation, etc.)
- Return ONLY valid JSON, no markdown, no explanation.`;

const textPrompt = (text: string) => `Extract all fields from this paystub text.

TEXT:
---
${text}
---

Return ONLY this JSON structure (null for anything not found — never invent values):
${SCHEMA}

${RULES}`;

const VISION_PROMPT = `This is a paystub document (an image or a PDF). Extract all fields and return JSON.

If this is NOT a paystub, return: {"is_paystub": false, "reason": "..."}

If it IS a paystub, return {"is_paystub": true, ...} using this structure (null for anything not found — never invent values):
${SCHEMA}

${RULES}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;

// ── Claude helpers ────────────────────────────────────────────────────────────

async function chat(messages: Anthropic.MessageParam[], maxTokens: number): Promise<string> {
  const response = await client.messages.create({ model: MODEL, max_tokens: maxTokens, messages });
  return response.content.map((b) => (b.type === "text" ? b.text : "")).join("");
}

function stripFences(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```")) s = s.slice(s.indexOf("\n") + 1);
  if (s.endsWith("```")) s = s.slice(0, s.lastIndexOf("```"));
  return s;
}

function parseJson(raw: string): Json {
  const cleaned = stripFences(raw);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}") + 1;
  if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end));
  throw new Error("No JSON object found");
}

/** Call the model and parse a JSON response. Retries up to 3 times. */
async function chatJson(messages: Anthropic.MessageParam[], maxTokens = 4096): Promise<Json> {
  let lastRaw = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const raw = await chat(messages, maxTokens);
    lastRaw = raw;
    try {
      return parseJson(raw);
    } catch {
      // fall through to retry
    }
    const cleaned = stripFences(raw);
    const truncated = cleaned.indexOf("{") >= 0 && cleaned.lastIndexOf("}") < cleaned.indexOf("{");
    messages = [
      ...messages,
      { role: "assistant", content: raw },
      {
        role: "user",
        content: truncated
          ? "Your response was cut off. Continue from where you stopped and finish the JSON. " +
            "Output ONLY the remaining JSON text to complete the object."
          : "Invalid JSON. Reply ONLY with a single valid JSON object. " +
            "No markdown, no explanation, nothing outside the braces.",
      },
    ];
  }
  throw new Error(`Model returned non-JSON after 3 attempts: ${lastRaw.slice(0, 400)}`);
}

// ── Paystub verification (keyword-based, no LLM) ──────────────────────────────

function verifyPaystub(rawText: string): { isPaystub: boolean; reason: string } {
  if (!rawText.trim()) return { isPaystub: false, reason: "No text could be extracted from the document." };

  const t = rawText.toLowerCase();
  const has = (...keys: string[]) => keys.some((k) => t.includes(k));
  const indicators: Record<string, boolean> = {
    "gross pay": has("gross pay", "gross earnings", "total earnings", "gross wages"),
    "net pay":   has("net pay", "take home", "check amount", "net wages", "net check"),
    "pay date":  has("pay date", "pay period", "payment date", "check date", "payroll date"),
    "taxes":     has("federal", "medicare", "social security", "withholding", "income tax", "fica"),
    "earnings":  has("earnings", "regular pay", "hourly", "salary", "overtime", "wages"),
  };

  const found   = Object.keys(indicators).filter((k) => indicators[k]);
  const missing = Object.keys(indicators).filter((k) => !indicators[k]);
  if (found.length >= 3) return { isPaystub: true, reason: `Paystub indicators found: ${found.join(", ")}.` };
  return { isPaystub: false, reason: `Not enough paystub indicators. Missing: ${missing.join(", ")}.` };
}

// ── Math validation ───────────────────────────────────────────────────────────

function parseAmt(s: unknown): number | null {
  if (s === null || s === undefined) return null;
  const n = parseFloat(String(s).replace(/\$/g, "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function validateMath(data: Json) {
  const totals = data.totals ?? {};
  const items = (k: string): Json[] => (Array.isArray(data[k]) ? data[k] : []).filter((x: unknown) => x && typeof x === "object");
  const earnings = items("earnings"), taxes = items("taxes"), deductions = items("deductions");

  const gross = parseAmt(totals.gross_pay_current);
  const net   = parseAmt(totals.net_pay_current);
  const amounts = (list: Json[]) => list.map((x) => parseAmt(x.current_amount)).filter((v): v is number => v !== null);
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const earnVals = amounts(earnings), taxVals = amounts(taxes), dedVals = amounts(deductions);

  const checks: Json[] = [];

  if (gross !== null && earnVals.length) {
    const earnSum = sum(earnVals);
    checks.push({ check_name: "earnings_sum_vs_gross", passed: Math.abs(earnSum - gross) < 0.1, calculated: round2(earnSum), stated: gross });
  }

  if (gross !== null && net !== null && (taxVals.length || dedVals.length)) {
    const calcNet = gross - sum(taxVals) - sum(dedVals);
    checks.push({ check_name: "net_pay_formula", passed: Math.abs(calcNet - net) < 0.1, calculated: round2(calcNet), stated: net });
  }

  for (const item of [...earnings, ...taxes, ...deductions]) {
    const curr = parseAmt(item.current_amount);
    const ytd  = parseAmt(item.ytd_amount);
    if (curr !== null && ytd !== null && ytd < curr - 0.01) {
      checks.push({ check_name: `ytd_gte_current:${item.description ?? "?"}`, passed: false, calculated: ytd, stated: curr });
    }
  }

  const failed = checks.filter((c) => !c.passed);
  const conf = checks.length ? Math.max(0, 1 - 0.2 * failed.length) : 0.8;
  return {
    checks,
    failed,
    confidence: round2(conf),
    summary: checks.length
      ? `${checks.length - failed.length}/${checks.length} math checks passed`
      : "Insufficient data for math validation",
  };
}

// ── Result building ───────────────────────────────────────────────────────────

const pick = (obj: unknown, keys: string[]): Json => {
  const src = obj && typeof obj === "object" ? (obj as Json) : {};
  return Object.fromEntries(keys.map((k) => [k, src[k] ?? null]));
};

const pickList = (list: unknown, keys: string[]): Json[] =>
  (Array.isArray(list) ? list : []).filter((x) => x && typeof x === "object").map((x) => pick(x, keys));

function buildExtractedData(raw: Json): Json {
  const extra = raw.extra_fields && typeof raw.extra_fields === "object" && Object.keys(raw.extra_fields).length
    ? raw.extra_fields
    : null;
  return {
    employee:   pick(raw.employee, ["name", "address", "employee_id", "ssn_last4", "department", "position"]),
    employer:   pick(raw.employer, ["name", "address", "ein", "phone"]),
    pay_period: pick(raw.pay_period, ["start_date", "end_date", "pay_date", "pay_frequency"]),
    earnings:   pickList(raw.earnings, ["description", "hours", "rate", "current_amount", "ytd_amount"]),
    deductions: pickList(raw.deductions, ["description", "current_amount", "ytd_amount"]),
    taxes:      pickList(raw.taxes, ["description", "current_amount", "ytd_amount"]),
    totals: pick(raw.totals, [
      "gross_pay_current", "gross_pay_ytd", "total_deductions_current", "total_deductions_ytd",
      "total_taxes_current", "total_taxes_ytd", "net_pay_current", "net_pay_ytd",
    ]),
    check_number: raw.check_number ?? null,
    raw_notes:    raw.raw_notes ?? null,
    extra_fields: extra,
  };
}

export class NotAPaystubError extends Error {}

export type ExtractInput =
  | { text: string }
  | { image: { data: string; mediaType: "image/png" | "image/jpeg" | "image/webp" } }
  | { images: { data: string; mediaType: "image/png" | "image/jpeg" | "image/webp" }[] } // pages of one stub, in order
  | { pdf: string }; // base64 PDF, read by Claude directly

/**
 * Full pipeline: verify → LLM extraction → math validation.
 * Returns { status, overall_confidence, extracted_data, validation_layers, model_used, … } (mapped to PaystubData by mapBackendResult).
 */
export async function extractPaystub(input: ExtractInput): Promise<Json> {
  const startMs = Date.now();
  let extracted: Json;

  if ("text" in input) {
    const { isPaystub, reason } = verifyPaystub(input.text);
    if (!isPaystub) throw new NotAPaystubError(`Document does not appear to be a paystub. ${reason}`);
    extracted = await chatJson([{ role: "user", content: textPrompt(input.text.trim().slice(0, MAX_TEXT_CHARS)) }]);
  } else {
    const sources: Anthropic.ContentBlockParam[] = "pdf" in input
      ? [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: input.pdf } }]
      : "images" in input
      ? input.images.map((im) => ({ type: "image" as const, source: { type: "base64" as const, media_type: im.mediaType, data: im.data } }))
      : [{ type: "image", source: { type: "base64", media_type: input.image.mediaType, data: input.image.data } }];
    const note = "images" in input && input.images.length > 1
      ? `These ${input.images.length} images are consecutive pages of ONE paystub. Combine them into a single result.\n\n`
      : "";
    extracted = await chatJson([{ role: "user", content: [...sources, { type: "text", text: note + VISION_PROMPT }] }], 6000);
    if (extracted.is_paystub === false) {
      throw new NotAPaystubError(`Document does not appear to be a paystub. ${extracted.reason ?? ""}`.trim());
    }
  }

  // Layer 1: score how many key fields were found
  const keyChecks: Record<string, unknown> = {
    "employee.name":            extracted.employee?.name,
    "employer.name":            extracted.employer?.name,
    "pay_period.pay_date":      extracted.pay_period?.pay_date,
    "totals.gross_pay_current": extracted.totals?.gross_pay_current,
    "totals.net_pay_current":   extracted.totals?.net_pay_current,
    "earnings":                 Array.isArray(extracted.earnings) && extracted.earnings.length ? extracted.earnings : null,
  };
  const found   = Object.keys(keyChecks).filter((k) => keyChecks[k]);
  const missing = Object.keys(keyChecks).filter((k) => !keyChecks[k]);
  const conf    = Math.round((found.length / Object.keys(keyChecks).length) * 1000) / 1000;

  const l1 = {
    layer: 1,
    name: "LLM Field Extraction",
    status: conf >= 0.5 ? "passed" : "warning",
    confidence: conf,
    notes: `Extracted ${found.length}/${Object.keys(keyChecks).length} key fields.`,
    details: { found, missing, extra_fields: Object.keys(extracted.extra_fields ?? {}) },
  };

  // Layer 2: math validation
  const math = validateMath(extracted);
  const l2 = {
    layer: 2,
    name: "Mathematical Consistency",
    status: math.failed.length >= 3 ? "failed" : math.failed.length ? "warning" : "passed",
    confidence: math.confidence,
    notes: math.summary,
    details: { checks: math.checks, failed_count: math.failed.length },
  };

  const layers = [l1, l2];
  const overall = Math.round(((l1.confidence + l2.confidence) / 2) * 1000) / 1000;
  const status =
    layers.some((l) => l.status === "failed") || conf < 0.3 ? "failed"
    : layers.some((l) => l.status === "warning") || conf < 0.8 ? "partial"
    : "success";

  return {
    status,
    overall_confidence: overall,
    extracted_data: buildExtractedData(extracted),
    validation_layers: layers,
    warnings: [],
    errors: [],
    model_used: MODEL,
    processing_time_ms: Date.now() - startMs,
  };
}
