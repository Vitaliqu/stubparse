// Integrity signals: patterns that suggest a paystub was edited, fabricated, or misread.
// These are review prompts, not verdicts. Pure functions; safe on client and server.

import type { PaystubData } from "@/types/paystub";
import { toNumber, money } from "@/lib/reconcile";

/** Facts read from the file itself at parse time (PDFs only). */
export interface FileSignals {
  kind: "pdf" | "image";
  producer: string | null;
  creator: string | null;
  createdAt: string | null;   // ISO
  modifiedAt: string | null;  // ISO
  pageCount: number;
  amountFonts: number;        // distinct fonts used by money amounts
  hasTextLayer: boolean;
}

export type Severity = "risk" | "warn" | "info";

export interface Signal {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
}

type RiskLevel = "high" | "medium" | "low";

const EDITING_TOOLS = /photoshop|illustrator|gimp|canva|affinity|pixelmator|microsoft\s*word|excel|powerpoint|\bpages\b|google\s*docs|libreoffice|openoffice|smallpdf|ilovepdf|sejda|pdfescape|pdf-xchange|pdfelement|nitro|foxit\s*phantom|pdffiller|dochub|docfly|soda\s*pdf|paystub\s*(maker|generator|creator)|stub\s*creator/i;

const findField = (data: PaystubData, section: string, re: RegExp) =>
  data.fields.find((f) => f.section === section && re.test(f.label));

const parseDate = (s: string | undefined | null): Date | null => {
  if (!s) return null;
  const iso = /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
  const d = iso ? new Date(`${iso}T12:00:00Z`) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

const DAY = 86_400_000;

/** Signals for one stub. `now` is injectable for tests. */
export function analyzeStub(data: PaystubData, file: FileSignals | null, now = new Date()): Signal[] {
  const out: Signal[] = [];
  const gross = toNumber(data.grossPay);
  const net = toNumber(data.netPay);

  // ── Amounts ────────────────────────────────────────────────────────────────
  if (gross !== null && net !== null && net > gross + 0.01) {
    out.push({ id: "net-over-gross", severity: "risk", title: "Net pay is higher than gross pay", detail: `Net ${money(net)} exceeds gross ${money(gross)}.` });
  }

  const ss = findField(data, "Taxes", /social\s*security|oasdi|fica\b(?!.*med)/i);
  const med = findField(data, "Taxes", /medicare/i);
  const grossYtd = toNumber(data.fields.find((f) => f.section === "Totals" && /gross/i.test(f.label))?.ytd);
  const SS_WAGE_BASE = 184_500; // 2026
  if (gross && ss) {
    const rate = Math.abs(toNumber(ss.value) ?? 0) / gross;
    const underBase = grossYtd === null || grossYtd < SS_WAGE_BASE;
    if (rate > 0.0635) {
      out.push({ id: "ss-high", severity: "warn", title: "Social Security is above 6.2% of gross", detail: `${(rate * 100).toFixed(2)}% withheld. The employee rate is 6.2%.` });
    } else if (underBase && rate > 0 && rate < 0.04) {
      out.push({ id: "ss-low", severity: "info", title: "Social Security is well below 6.2% of gross", detail: `${(rate * 100).toFixed(2)}% withheld. Pre-tax benefits can lower it, but not usually this much.` });
    }
  }
  if (gross && med) {
    const rate = Math.abs(toNumber(med.value) ?? 0) / gross;
    if (rate > 0.024) {
      out.push({ id: "medicare-high", severity: "warn", title: "Medicare is above the expected rate", detail: `${(rate * 100).toFixed(2)}% withheld. The rate is 1.45%, or 2.35% on high earnings.` });
    } else if (rate > 0 && rate < 0.01) {
      out.push({ id: "medicare-low", severity: "info", title: "Medicare is below the expected rate", detail: `${(rate * 100).toFixed(2)}% withheld. The rate is 1.45%.` });
    }
  }
  if (gross && net !== null && gross > 0) {
    const kept = net / gross;
    if (kept < 0.3) out.push({ id: "net-low", severity: "info", title: "Net pay is under 30% of gross", detail: `${Math.round(kept * 100)}% of gross was paid out. Check for garnishments or misread deductions.` });
  }
  const round = (n: number | null) => n !== null && n >= 500 && Math.abs(n % 100) < 0.005;
  if (round(gross) && round(net)) {
    out.push({ id: "round-amounts", severity: "info", title: "Gross and net are both round numbers", detail: `${money(gross!)} and ${money(net!)}. Real payroll rarely lands on even hundreds after taxes.` });
  }

  // ── Dates ──────────────────────────────────────────────────────────────────
  const start = parseDate(data.payPeriodStart);
  const end = parseDate(data.payPeriodEnd);
  const pay = parseDate(data.checkDate);
  if (start && end && end < start) {
    out.push({ id: "period-reversed", severity: "risk", title: "Pay period ends before it starts", detail: `${data.payPeriodStart} to ${data.payPeriodEnd}.` });
  }
  if (end && pay && pay.getTime() < end.getTime() - DAY) {
    out.push({ id: "paid-early", severity: "info", title: "Pay date is before the period ends", detail: `Paid ${data.checkDate} for a period ending ${data.payPeriodEnd}. Some employers do this; most don't.` });
  }
  if (pay && pay.getTime() > now.getTime() + 7 * DAY) {
    out.push({ id: "future-date", severity: "warn", title: "Pay date is in the future", detail: `${data.checkDate} hasn't happened yet.` });
  }
  if (start && end && end >= start) {
    const days = Math.round((end.getTime() - start.getTime()) / DAY) + 1;
    if (![7, 14, 15, 16, 28, 29, 30, 31].includes(days) && days > 1) {
      out.push({ id: "period-length", severity: "info", title: `Pay period is ${days} days`, detail: "Common periods are weekly, every two weeks, twice a month, or monthly." });
    }
  }

  // ── The file itself ────────────────────────────────────────────────────────
  if (file?.kind === "pdf") {
    const tool = [file.producer, file.creator].find((v) => v && EDITING_TOOLS.test(v));
    if (tool) {
      out.push({ id: "editing-tool", severity: "warn", title: "Made or saved with a general editing tool", detail: `The file reports "${tool}". Payroll systems usually generate stubs directly.` });
    }
    const c = parseDate(file.createdAt), m = parseDate(file.modifiedAt);
    if (c && m && m.getTime() - c.getTime() > 60_000) {
      out.push({ id: "modified-later", severity: "warn", title: "File was modified after it was created", detail: `Created ${c.toISOString().slice(0, 10)}, modified ${m.toISOString().slice(0, 10)}.` });
    }
    if (file.amountFonts >= 3) {
      out.push({ id: "mixed-fonts", severity: "warn", title: `Amounts use ${file.amountFonts} different fonts`, detail: "Edited numbers often come out in a different font from the rest of the stub." });
    }
    if (!file.hasTextLayer) {
      out.push({ id: "no-text-layer", severity: "info", title: "PDF has no text layer", detail: "It's a scan or a flattened image, so file-level checks are limited." });
    }
  } else if (file?.kind === "image") {
    out.push({ id: "image-file", severity: "info", title: "Photo or scan", detail: "File-level checks only apply to PDFs. Amounts and dates were still checked." });
  }

  return out;
}

/** Cross-stub signals for one employee's stubs: YTD should grow by each period's current amount. */
export function analyzeSeries(stubs: PaystubData[]): Signal[] {
  const out: Signal[] = [];
  const dated = stubs
    .map((s) => ({ s, pay: parseDate(s.checkDate), ytd: toNumber(s.fields.find((f) => f.section === "Totals" && /gross/i.test(f.label))?.ytd), cur: toNumber(s.grossPay) }))
    .filter((x) => x.pay && x.ytd !== null && x.cur !== null)
    .sort((a, b) => a.pay!.getTime() - b.pay!.getTime());

  for (let i = 1; i < dated.length; i++) {
    const prev = dated[i - 1], cur = dated[i];
    if (prev.pay!.getUTCFullYear() !== cur.pay!.getUTCFullYear()) continue; // YTD resets
    const expected = prev.ytd! + cur.cur!;
    const diff = cur.ytd! - expected;
    if (Math.abs(diff) > 1) {
      out.push({
        id: `ytd-jump-${i}`,
        severity: Math.abs(diff) > cur.cur! * 0.5 ? "risk" : "warn",
        title: "Year-to-date gross doesn't follow from the previous stub",
        detail: `${cur.s.checkDate}: expected ${money(expected)} (${money(prev.ytd!)} + ${money(cur.cur!)}), stub shows ${money(cur.ytd!)}.`,
      });
    }
  }
  return out;
}

export function riskLevel(signals: Signal[]): RiskLevel {
  if (signals.some((s) => s.severity === "risk")) return "high";
  if (signals.filter((s) => s.severity === "warn").length >= 1) return "medium";
  return "low";
}
