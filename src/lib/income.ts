// Income summary across an employee's stubs: pay frequency, averages, annualized income, gaps.
// Pure functions; safe on client and server.

import type { PaystubData } from "@/types/paystub";
import { toNumber } from "@/lib/reconcile";
import { analyzeSeries, type Signal } from "@/lib/integrity";

export type Frequency = "weekly" | "biweekly" | "semimonthly" | "monthly" | "unknown";

export const PERIODS_PER_YEAR: Record<Exclude<Frequency, "unknown">, number> = {
  weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12,
};

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: "Weekly", biweekly: "Every two weeks", semimonthly: "Twice a month", monthly: "Monthly", unknown: "Not enough stubs",
};

export interface PeriodRow {
  payDate: string;
  periodStart: string;
  periodEnd: string;
  gross: number | null;
  net: number | null;
  grossYtd: number | null;
  fileName: string;
}

export interface IncomeSummary {
  employee: string;
  employer: string | null;
  stubCount: number;
  firstPayDate: string | null;
  lastPayDate: string | null;
  frequency: Frequency;
  avgGross: number | null;
  avgNet: number | null;
  minGross: number | null;
  maxGross: number | null;
  annualizedFromAverage: number | null;
  annualizedFromYtd: number | null;
  grossChange: number | null;   // last vs first, as a fraction (-0.2 = 20% drop)
  missingPeriods: number;
  flags: Signal[];
  rows: PeriodRow[];
}

const DAY = 86_400_000;

const parseDate = (s: string): Date | null => {
  if (!s) return null;
  const iso = /^\d{4}-\d{2}-\d{2}/.test(s) ? `${s.slice(0, 10)}T12:00:00Z` : s;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

const normalizeName = (n: string) => n.trim().replace(/\s+/g, " ").toLowerCase();

const employerOf = (s: PaystubData) =>
  s.fields.find((f) => f.section === "Employer" && /employer\s*name/i.test(f.label))?.value || null;

const grossYtdOf = (s: PaystubData) =>
  toNumber(s.fields.find((f) => f.section === "Totals" && /gross/i.test(f.label))?.ytd);

/** Infers pay frequency from period lengths first, then from gaps between pay dates. */
export function detectFrequency(stubs: PaystubData[]): Frequency {
  const lengths = stubs
    .map((s) => {
      const a = parseDate(s.payPeriodStart), b = parseDate(s.payPeriodEnd);
      return a && b && b >= a ? Math.round((b.getTime() - a.getTime()) / DAY) + 1 : null;
    })
    .filter((n): n is number => n !== null);
  const len = median(lengths);
  if (len !== null) {
    if (len <= 8) return "weekly";
    if (len === 14) return "biweekly";
    if (len >= 15 && len <= 16) return "semimonthly";
    if (len >= 27) return "monthly";
  }

  const dates = stubs.map((s) => parseDate(s.checkDate)).filter((d): d is Date => !!d).sort((a, b) => a.getTime() - b.getTime());
  const gaps = dates.slice(1).map((d, i) => Math.round((d.getTime() - dates[i].getTime()) / DAY));
  const gap = median(gaps);
  if (gap === null) return len !== null && len > 16 && len < 27 ? "monthly" : "unknown";
  if (gap <= 9) return "weekly";
  if (gap <= 14.5) return "biweekly";
  if (gap <= 17) {
    // 15–16 day gaps are twice-monthly when pay days repeat on the same dates of the month
    const days = new Set(dates.map((d) => d.getUTCDate()));
    return days.size <= 3 ? "semimonthly" : "biweekly";
  }
  if (gap <= 35) return "monthly";
  return "unknown";
}

export function summarizeEmployee(employee: string, stubs: PaystubData[]): IncomeSummary {
  const rows: PeriodRow[] = stubs
    .map((s) => ({
      payDate: s.checkDate, periodStart: s.payPeriodStart, periodEnd: s.payPeriodEnd,
      gross: toNumber(s.grossPay), net: toNumber(s.netPay), grossYtd: grossYtdOf(s), fileName: s.fileName,
    }))
    .sort((a, b) => (parseDate(a.payDate)?.getTime() ?? 0) - (parseDate(b.payDate)?.getTime() ?? 0));

  const grosses = rows.map((r) => r.gross).filter((n): n is number => n !== null);
  const nets = rows.map((r) => r.net).filter((n): n is number => n !== null);
  const frequency = detectFrequency(stubs);
  const avgGross = avg(grosses);

  // YTD-based annualization from the latest stub that has a YTD figure
  const latestWithYtd = [...rows].reverse().find((r) => r.grossYtd !== null && parseDate(r.payDate));
  let annualizedFromYtd: number | null = null;
  if (latestWithYtd) {
    const d = parseDate(latestWithYtd.payDate)!;
    const dayOfYear = Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / DAY) + 1;
    if (dayOfYear >= 14) annualizedFromYtd = (latestWithYtd.grossYtd! / dayOfYear) * 365;
  }

  // Missing periods: gaps much longer than the expected spacing
  let missingPeriods = 0;
  if (frequency !== "unknown") {
    const expected = 365 / PERIODS_PER_YEAR[frequency];
    const dates = rows.map((r) => parseDate(r.payDate)).filter((d): d is Date => !!d);
    for (let i = 1; i < dates.length; i++) {
      const gap = (dates[i].getTime() - dates[i - 1].getTime()) / DAY;
      if (gap > expected * 1.5) missingPeriods += Math.round(gap / expected) - 1;
    }
  }

  const first = grosses[0], last = grosses[grosses.length - 1];
  const grossChange = grosses.length >= 2 && first ? (last - first) / first : null;

  const flags: Signal[] = [...analyzeSeries(stubs)];
  if (grossChange !== null && grossChange <= -0.15) {
    flags.push({ id: "gross-drop", severity: "warn", title: "Gross pay dropped", detail: `The latest stub is ${Math.round(-grossChange * 100)}% below the first one.` });
  }
  if (missingPeriods > 0) {
    flags.push({ id: "missing-periods", severity: "info", title: `${missingPeriods} pay period${missingPeriods > 1 ? "s" : ""} missing`, detail: "There are gaps between pay dates longer than the pay frequency." });
  }
  if (avgGross && annualizedFromYtd && frequency !== "unknown") {
    const fromAvg = avgGross * PERIODS_PER_YEAR[frequency];
    const spread = Math.abs(fromAvg - annualizedFromYtd) / Math.max(fromAvg, annualizedFromYtd);
    if (spread > 0.2) {
      flags.push({ id: "annualized-mismatch", severity: "info", title: "The two annualized figures disagree", detail: "Income from these stubs differs from the year-to-date pace by more than 20%. Pay may be irregular, or the stubs don't cover a typical stretch." });
    }
  }

  return {
    employee,
    employer: stubs.map(employerOf).find(Boolean) ?? null,
    stubCount: stubs.length,
    firstPayDate: rows[0]?.payDate || null,
    lastPayDate: rows[rows.length - 1]?.payDate || null,
    frequency,
    avgGross,
    avgNet: avg(nets),
    minGross: grosses.length ? Math.min(...grosses) : null,
    maxGross: grosses.length ? Math.max(...grosses) : null,
    annualizedFromAverage: avgGross !== null && frequency !== "unknown" ? avgGross * PERIODS_PER_YEAR[frequency] : null,
    annualizedFromYtd,
    grossChange,
    missingPeriods,
    flags,
    rows,
  };
}

/** Groups stubs by employee name and summarizes each group. */
export function buildIncomeReport(stubs: PaystubData[]): IncomeSummary[] {
  const groups = new Map<string, { name: string; stubs: PaystubData[] }>();
  for (const s of stubs) {
    const key = s.name ? normalizeName(s.name) : "__unknown__";
    if (!groups.has(key)) groups.set(key, { name: s.name?.trim() || "Unnamed employee", stubs: [] });
    groups.get(key)!.stubs.push(s);
  }
  return [...groups.values()].map((g) => summarizeEmployee(g.name, g.stubs)).sort((a, b) => a.employee.localeCompare(b.employee));
}
