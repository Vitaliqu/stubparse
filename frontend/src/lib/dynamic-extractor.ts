import type { DynamicField, PaystubData } from "@/types/paystub";
import { normalizeText, toLines } from "./regex-parser";

/** Strip rate notation (e.g. $16.50/hr or 16.50/hour) from a string. */
const stripRate = (s: string) => s.replace(/\$?[\d.]+\s*\/\s*(?:hour|hr)\b/gi, "");

function getAmounts(line: string): string[] {
  // Remove rate amounts before extracting so $16.50/hr doesn't pollute results
  const noRate = stripRate(line);
  const dollar = [...noRate.matchAll(/\$([\d,]+\.\d{2})/g)].map((m) => m[1].replace(/,/g, ""));
  if (dollar.length >= 1) return dollar;
  const all = [...noRate.matchAll(/([\d,]+\.\d{2})/g)].map((m) => m[1].replace(/,/g, ""));
  if (all.length > 0 && all.every((v) => parseFloat(v) === 0)) return [];
  return all;
}

/** If line contains a rate pattern, extract the preceding number as hours. */
function extractHours(line: string): string | null {
  const m = line.match(/\b(\d+\.?\d*)\s+\$?[\d.]+\s*\/\s*(?:hour|hr)\b/i);
  return m ? m[1] : null;
}

const SECTION_PATTERN = new RegExp(
  "^(?:" + [
    "employee\\s+earnings", "hours\\s+(?:and\\s+)?earnings", "earnings?\\s*(?:summary)?",
    "employee\\s+taxes\\s+withheld", "employer\\s+taxes", "employer\\s+contributions",
    "employee\\s+deductions?", "taxes?\\s+(?:and\\s+)?adjustments?",
    "deductions?\\s*(?:summary)?", "contributions?\\s*(?:summary)?",
    "taxes?\\s+withheld", "tax\\s+deductions?",
    "net\\s+pay", "payout\\s+amounts?",
    "summary", "check\\s+(?:stub|detail)",
    "paid\\s+time\\s+off", "sick\\s+(?:policy|time|leave)",
    "benefits?", "bonuses?", "reimbursements?", "adjustments?",
    "hours?\\s+and\\s+rates?", "regular\\s+pay", "overtime",
  ].join("|") + ")$",
  "i"
);

/** Map raw document section headers to canonical section names used by the AI extractor. */
function normalizeSection(raw: string): string {
  const s = raw.toLowerCase().replace(/[&+:|]/g, "").trim();
  if (/\bearnings?\b|\bhours?\s+and\b|\bwages?\b|\bregular\s+pay\b/.test(s)) return "Earnings";
  if (/\btax(es)?\b|\bwithheld\b|\bwithholding\b/.test(s)) return "Taxes";
  if (/\bdeductions?\b|\bbenefits?\b|\bcontributions?\b|\bretirement\b/.test(s)) return "Deductions";
  if (/\bnet\s+pay\b|\bpayout\b|\bsummary\b|\btotals?\b/.test(s)) return "Totals";
  return "Other";
}

function isSectionHeader(line: string): boolean {
  if (getAmounts(line).length > 0) return false;
  if (/^\d/.test(line)) return false;
  const clean = line.replace(/[&+:|]/g, "").trim();
  if (clean.length > 60 || clean.length < 3) return false;
  if (SECTION_PATTERN.test(clean)) return true;
  const words = clean.split(/\s+/);
  if (
    words.length >= 1 &&
    words.length <= 5 &&
    words.every((w) => /^[A-Z]/.test(w)) &&
    !/\d/.test(clean) &&
    clean.length <= 35
  ) return true;
  return false;
}

const SKIP_PATTERN = new RegExp(
  "^(?:" + [
    "current", "ytd", "year.?to.?date", "description", "amount", "pay\\s*period",
    "employee\\s*(?:id|copy)", "direct\\s*deposit", "deposit\\s*advice", "paycheck",
    "rate", "hours?", "employee\\s+tax", "company\\s+tax", "employer\\s+tax",
  ].join("|") + ")$",
  "i"
);

function cleanLabel(line: string, empName = ""): string {
  let s = line
    .replace(/\$?[\d.]+\s*\/\s*(?:hour|hr)\b/gi, "")  // strip rate FIRST (e.g. $16.50/hr)
    .replace(/\$?[\d,]+\.\d{2}/g, "")      // then strip all money amounts
    .replace(/^[\d.]+\s+/, "")              // strip leading plain number (hours)
    .replace(/\|/g, " ");

  if (empName && s.startsWith(empName)) {
    s = s.slice(empName.length).replace(/^\s*\d*\s+/, "").trim();
  }
  if (/^SSN\s*:/i.test(s)) s = s.replace(/^.*?(?=[A-Z][a-z])/, "");
  s = s.replace(/^.*?\b(?:St|Ave|Blvd|Rd|Dr|Ln|Ct|Way)\b\s+/i, "");
  s = s.replace(/\s+[^A-Za-z()]+$/, "");
  s = s.replace(/\s+\d+(\.\d+)?\s*$/, "");

  return s
    .replace(/[:]?\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

const DATE_RE = /\b([A-Za-z]+\s+\d{1,2}[,.]?\s*\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})\b/g;

const MONTH_MAP: Record<string, string> = {
  jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",
  jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12",
};

function toISODate(raw: string): string {
  const s = raw.replace(/\s+/g, " ").trim();
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // MM/DD/YYYY or MM/DD/YY
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const [, m, d, y] = slash;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // "Feb 14, 2025" or "February 14 2025"
  const alpha = s.match(/^([A-Za-z]+)\s+(\d{1,2})[,.]?\s*(\d{4})$/);
  if (alpha) {
    const [, mon, d, y] = alpha;
    const mm = MONTH_MAP[mon.slice(0, 3).toLowerCase()];
    if (mm) return `${y}-${mm}-${d.padStart(2, "0")}`;
  }
  return s; // fallback: return as-is
}

function getDatesNear(idx: number, lines: string[]): string[] {
  const window = lines.slice(idx, idx + 3).join(" ");
  return [...window.matchAll(DATE_RE)].map((m) => toISODate(m[1]));
}

const NAME_STOP = new Set([
  "pay", "date", "period", "ssn", "social", "security", "medicare",
  "federal", "state", "city", "local", "hours", "hour", "tax", "taxes",
  "earnings", "payout", "amounts", "amount", "current", "ytd", "bank",
  "ach", "check", "net", "gross", "tips", "regular", "overtime",
  "employee", "adjustments", "statement", "for", "and",
  "jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec",
  "january","february","march","april","june","july","august",
  "september","october","november","december",
]);

function parseName(line: string): string {
  if (!line || /^\d/.test(line)) return "";
  const words = line.trim().split(/\s+/);
  const out: string[] = [];
  for (const word of words) {
    if (word.includes(",")) break;
    const clean = word.replace(/[^A-Za-z]/g, "");
    if (NAME_STOP.has(clean.toLowerCase())) break;
    if (/^\d/.test(word) || !/^[A-Z]/.test(word) || clean.length < 2) break;
    if (/^[A-Z]{2}$/.test(clean)) break;
    out.push(word);
  }
  return out.length >= 2 ? out.join(" ") : "";
}

function isValidName(candidate: string): boolean {
  if (!candidate) return false;
  const first = candidate.split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, "");
  return !NAME_STOP.has(first);
}

function extractName(lines: string[]): string {
  // Explicit "Employee Name:" label — require colon or "name" keyword to avoid
  // matching "Employee Social Security" etc.
  for (const line of lines) {
    const m =
      line.match(/employee\s+name\s*[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i) ??
      line.match(/\bname\s*:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i);
    if (m && isValidName(m[1])) return m[1].trim();
  }
  const hIdx = lines.findIndex((l) => /earnings\s*statement/i.test(l));
  if (hIdx >= 0) {
    for (const l of lines.slice(hIdx + 1, hIdx + 8)) {
      const n = parseName(l); if (n) return n;
    }
  }
  for (const l of lines.slice(0, 12)) {
    if (/earnings\s*statement/i.test(l)) continue;
    const n = parseName(l); if (n) return n;
  }
  return "";
}

function extractPayoutMethod(lines: string[]): string {
  for (let i = 0; i < lines.length; i++) {
    if (!/payout\s+amount/i.test(lines[i])) continue;
    const after = lines[i].replace(/.*payout\s+amounts?\s*/i, "");
    const same  = after.replace(/\s*\$[\d,]+\.?\d*.*/, "").trim();
    if (same.length >= 2) return same;
    const next  = (lines[i + 1] ?? "").replace(/\s*\$[\d,]+\.?\d*.*/, "").trim();
    if (next.length >= 2) return next;
  }
  // Gusto "Payout Amounts" section: "Bank of America  $740.86"
  const pidx = lines.findIndex((l) => /payout\s+amounts?/i.test(l));
  if (pidx >= 0) {
    for (const l of lines.slice(pidx + 1, pidx + 4)) {
      const m = l.match(/^([A-Za-z][^$\d]+?)\s+\$?([\d,]+\.\d{2})/);
      if (m) return m[1].trim();
    }
  }
  return "";
}

// Labels that belong in Taxes regardless of which section they were found in
const TAX_LABEL_RE = /\b(?:federal|medicare|social\s*security|state\s*income\s*tax|city\s*withholding|sdi|sui|futa|ett|payroll\s*tax|income\s*tax|ny\s*state|new\s*york\s*city|ca\s*state|disability\s*insurance)\b/i;
// Labels that belong in Deductions
const DED_LABEL_RE = /\b(?:401\(k\)|403\(b\)|hsa|dental|vision|medical|health(?:\s+insurance)?|insurance|retirement|garnish|flex\s*spend|fsa|union\s*dues|life\s*insurance)\b/i;
// Labels that belong in Totals
const TOTALS_LABEL_RE = /^(?:gross\s*pay|net\s*pay|total\s*(?:earnings|taxes?|deductions?|pay)|take.?home)\b/i;

export function extractDynamic(rawText: string, fileName: string): PaystubData {
  const lines = toLines(normalizeText(rawText));
  const fields: DynamicField[] = [];

  let section = "Other";
  const name = extractName(lines);
  let payPeriodStart = "", payPeriodEnd = "", checkDate = "";
  let grossPay = "", netPay = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ── Date fields — checked FIRST so "Pay Date" / "Pay Period" lines are not
    //    misclassified as section headers by the isSectionHeader fallback below.
    // Gusto combined: "Pay period: Jul 12, 2019 - Jul 25, 2019  Pay Day: Aug 2, 2019"
    if (/pay\s*period.*pay\s*(?:date|day)/i.test(line)) {
      const dates = getDatesNear(i, lines);
      payPeriodStart = payPeriodStart || (dates[0] ?? "");
      payPeriodEnd   = payPeriodEnd   || (dates[1] ?? "");
      checkDate      = checkDate      || (dates[2] ?? "");
      continue;
    }
    if (/pay\s*period\s*(?:start|begin)/i.test(line)) {
      payPeriodStart = payPeriodStart || (getDatesNear(i, lines)[0] ?? ""); continue;
    }
    if (/pay\s*period\s*end/i.test(line)) {
      payPeriodEnd = payPeriodEnd || (getDatesNear(i, lines)[0] ?? ""); continue;
    }
    if (/pay\s*period/i.test(line)) {
      const dates = getDatesNear(i, lines);
      payPeriodStart = payPeriodStart || (dates[0] ?? "");
      payPeriodEnd   = payPeriodEnd   || (dates[1] ?? "");
      continue;
    }
    if (/pay\s*(?:date|day)|check\s*date|payment\s*date/i.test(line)) {
      checkDate = checkDate || (getDatesNear(i, lines)[0] ?? ""); continue;
    }

    // ── Section header
    if (isSectionHeader(line)) {
      section = normalizeSection(line);
      continue;
    }

    // ── Skip column-label rows
    if (SKIP_PATTERN.test(line.trim())) continue;

    // ── Must have at least one dollar amount to be a data row
    const amounts = getAmounts(line);
    if (amounts.length === 0) continue;

    const label = cleanLabel(line, name);
    if (!label || label.length < 2 || SKIP_PATTERN.test(label)) continue;

    // For lines that appear to have two separate entries (Gusto 2-col tax table),
    // the OCR may merge them: "Federal Income Tax $120.78 $362.34 Social Security $91.76 $275.28"
    const splitFields = trySplitTwoColumnLine(line, section);
    if (splitFields) {
      fields.push(...splitFields);
    } else {
      const value = amounts[0] ?? "";
      const ytd   = amounts[1] ?? "";

      // If this line has a rate (e.g. $16.50/hr), the label likely says "X Hours"
      // but the amounts are pay, not count. Rename pay field → "X Pay", hours field → "X Hours".
      const hours = extractHours(line);
      if (hours) {
        const payLabel = label.replace(/\bHours?\b/i, "Pay").trim();
        fields.push({ section, label: payLabel !== label ? payLabel : label, value, ytd });
        fields.push({ section, label, value: hours, ytd: "" });
      } else {
        fields.push({ section, label, value, ytd });
      }
    }
  }

  // ── Post-process: reclassify fields that ended up in the wrong section
  for (const f of fields) {
    if (TOTALS_LABEL_RE.test(f.label)) {
      f.section = "Totals";
    } else if (TAX_LABEL_RE.test(f.label) && f.section !== "Totals") {
      f.section = "Taxes";
    } else if (DED_LABEL_RE.test(f.label) && f.section !== "Totals") {
      f.section = "Deductions";
    }
  }

  // Mirror gross/net from fields (prefer non-zero values)
  for (const f of fields) {
    if (!grossPay && f.value && parseFloat(f.value) !== 0 &&
      /gross\s*(?:pay|earnings?)|total\s*(?:gross|earnings?)|total\s*pay/i.test(f.label)) {
      grossPay = f.value;
    }
    if (!netPay && f.value && parseFloat(f.value) !== 0 &&
      /net\s*(?:pay|earnings?|check|wages?)|check\s*amount|take.?home|direct\s*deposit\s*total/i.test(f.label)) {
      netPay = f.value;
    }
  }

  // Deduplicate (first occurrence wins)
  const seen = new Set<string>();
  const deduped = fields.filter((f) => {
    const key = `${f.section}::${f.label}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });

  return {
    fileName, name, payPeriodStart, payPeriodEnd, checkDate,
    payoutMethod: extractPayoutMethod(lines),
    grossPay, netPay, fields: deduped,
  };
}

const KNOWN_LABELS = [
  "federal income tax", "social security", "medicare", "state income tax",
  "city withholding", "sdi", "sui", "futa", "ett",
  "ca state income tax", "ny state income tax",
  "guideline", "401(k)", "403(b)", "hsa",
];

function trySplitTwoColumnLine(line: string, section: string): DynamicField[] | null {
  const amounts = getAmounts(line);
  if (amounts.length < 4) return null;

  // Strip all amounts to get remaining label text
  const noAmounts = line.replace(/\$?[\d,]+\.\d{2}/g, " ").replace(/\s+/g, " ").trim();

  // Try to find two known label substrings
  let splitIdx = -1;
  for (const lbl of KNOWN_LABELS) {
    const idx = noAmounts.toLowerCase().indexOf(lbl, 3); // skip first few chars
    if (idx > 3) { splitIdx = idx; break; }
  }
  if (splitIdx < 0) return null;

  const label1 = cleanLabel(noAmounts.slice(0, splitIdx));
  const label2 = cleanLabel(noAmounts.slice(splitIdx));
  if (!label1 || !label2 || label1.length < 2 || label2.length < 2) return null;

  return [
    { section, label: label1, value: amounts[0], ytd: amounts[1] },
    { section, label: label2, value: amounts[2], ytd: amounts[3] },
  ];
}
