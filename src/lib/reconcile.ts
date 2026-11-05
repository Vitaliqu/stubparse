// Live math checks over a parsed paystub — runs on every edit in the browser.

import type { PaystubData } from "@/types/paystub";

export type CheckStatus = "pass" | "fail" | "skip";

export interface Check {
  id: "earnings" | "net" | "ytd";
  label: string;
  status: CheckStatus;
  detail: string;
}

const TOLERANCE = 0.1;

export const toNumber = (v: string | undefined | null): number | null => {
  if (v === undefined || v === null) return null;
  const n = parseFloat(String(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};

export const money = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const isHoursRow = (label: string) => /\bhours?\b|\bhrs?\b/i.test(label);
const isTotalRow = (label: string) => /\btotal\b|\bgross\b|\bnet\b/i.test(label);

function sumSection(data: PaystubData, section: string): { sum: number; count: number } {
  let sum = 0, count = 0;
  for (const f of data.fields) {
    if (f.section !== section || isHoursRow(f.label) || isTotalRow(f.label)) continue;
    const n = toNumber(f.value);
    if (n === null) continue;
    sum += Math.abs(n);
    count++;
  }
  return { sum, count };
}

export function reconcile(data: PaystubData): Check[] {
  const gross = toNumber(data.grossPay);
  const net = toNumber(data.netPay);
  const earnings = sumSection(data, "Earnings");
  const taxes = sumSection(data, "Taxes");
  const deductions = sumSection(data, "Deductions");

  const checks: Check[] = [];

  if (gross !== null && earnings.count > 0) {
    const ok = Math.abs(earnings.sum - gross) < TOLERANCE;
    checks.push({
      id: "earnings", label: "Earnings add up to gross",
      status: ok ? "pass" : "fail",
      detail: ok ? `${money(earnings.sum)} = ${money(gross)}` : `${money(earnings.sum)} in line items vs ${money(gross)} gross`,
    });
  } else {
    checks.push({ id: "earnings", label: "Earnings add up to gross", status: "skip", detail: "Needs gross pay and earnings lines" });
  }

  if (gross !== null && net !== null && (taxes.count || deductions.count)) {
    const calc = gross - taxes.sum - deductions.sum;
    const ok = Math.abs(calc - net) < TOLERANCE;
    checks.push({
      id: "net", label: "Gross − taxes − deductions = net",
      status: ok ? "pass" : "fail",
      detail: ok ? `${money(calc)} = ${money(net)}` : `Calculated ${money(calc)}, stub says ${money(net)}`,
    });
  } else {
    checks.push({ id: "net", label: "Gross − taxes − deductions = net", status: "skip", detail: "Needs gross, net, and taxes or deductions" });
  }

  const ytdLines = data.fields.filter((f) => f.ytd && toNumber(f.value) !== null && toNumber(f.ytd) !== null && !isHoursRow(f.label));
  const badYtd = ytdLines.filter((f) => toNumber(f.ytd)! < Math.abs(toNumber(f.value)!) - 0.01);
  checks.push(
    ytdLines.length === 0
      ? { id: "ytd", label: "Year-to-date ≥ current", status: "skip", detail: "No YTD amounts" }
      : badYtd.length
      ? { id: "ytd", label: "Year-to-date ≥ current", status: "fail", detail: `${badYtd[0].label}${badYtd.length > 1 ? ` and ${badYtd.length - 1} more` : ""} below current` }
      : { id: "ytd", label: "Year-to-date ≥ current", status: "pass", detail: `${ytdLines.length} line${ytdLines.length > 1 ? "s" : ""} consistent` },
  );

  return checks;
}
