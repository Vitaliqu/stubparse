"use client";

// Hands a set of stubs to the income report page (survives a refresh, not a new tab).

import type { PaystubData } from "@/types/paystub";

const KEY = "stubparse:report";

export function stashReport(stubs: PaystubData[]) {
  try { sessionStorage.setItem(KEY, JSON.stringify(stubs)); } catch { /* storage unavailable */ }
}

export function readReport(): PaystubData[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PaystubData[]) : [];
  } catch {
    return [];
  }
}
