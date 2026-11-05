// Shared text utilities and paystub parser — runs on both client and server.
// Uses dynamic field discovery for all line items, plus targeted regex for header fields.

import type { PaystubData } from "@/types/paystub";
import { extractDynamic } from "./dynamic-extractor";

// ── Text normalization (also used by dynamic-extractor) ───────────────────────

export function normalizeText(raw: string): string {
  return raw
    .replace(/\0/g, "rt")        // PDF ligature: "Ove\0ime" → "Overtime"
    .replace(/\r\n|\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function toLines(text: string): string[] {
  return text.split("\n").map((l) => l.trim()).filter(Boolean);
}

// ── Main parser ───────────────────────────────────────────────────────────────
// Delegates to dynamic extractor for all line items.
// Returns the full PaystubData with fields[] populated.

export function parsePaystubText(text: string, fileName: string): PaystubData {
  return extractDynamic(text, fileName);
}
