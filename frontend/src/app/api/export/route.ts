import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import type { PaystubData } from "@/types/paystub";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function parseDate(s: string): Date {
  if (!s) return new Date(0);
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  const p = s.split("/");
  if (p.length === 3) return new Date(+p[2], +p[0] - 1, +p[1]);
  return new Date(0);
}

function shortDate(s: string): string {
  if (!s) return "";
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${MONTHS[+iso[2] - 1]} ${+iso[3]}`;
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (mdy) return `${MONTHS[+mdy[1] - 1]} ${+mdy[2]}`;
  const named = s.match(/^([A-Za-z]+\s+\d{1,2})[,.]?\s*\d{4}/);
  if (named) return named[1].trim();
  return (s.split(",")[0] ?? s).trim();
}

function makePeriodLabel(row: PaystubData): string {
  const s = shortDate(row.payPeriodStart);
  const e = shortDate(row.payPeriodEnd);
  if (!s) return shortDate(row.checkDate) || row.fileName;
  if (!e) return s;
  const [sM]     = s.split(" ");
  const [eM, eD] = e.split(" ");
  return sM === eM ? `${s}–${eD}` : `${s}–${e}`;
}

function periodKey(row: PaystubData): string {
  return `${row.payPeriodStart}||${row.payPeriodEnd}`;
}

function groupByEmployee(rows: PaystubData[]): Map<string, PaystubData[]> {
  const map = new Map<string, PaystubData[]>();
  for (const r of rows) {
    const key = r.name?.trim() || r.fileName;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return map;
}

function collectPeriods(rows: PaystubData[]): { key: string; label: string }[] {
  const seen = new Set<string>();
  const out: { key: string; label: string }[] = [];
  for (const r of rows) {
    const k = periodKey(r);
    if (!seen.has(k)) { seen.add(k); out.push({ key: k, label: makePeriodLabel(r) }); }
  }
  return out;
}

function stubFor(stubs: PaystubData[], key: string): PaystubData | undefined {
  return stubs.find((s) => periodKey(s) === key);
}

function collectDynamicLabels(rows: PaystubData[], filter?: string[] | null): string[] {
  const filterSet = filter != null ? new Set(filter) : null;
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const r of rows) {
    for (const f of r.fields) {
      if (filterSet && !filterSet.has(f.label)) continue;
      if (!seen.has(f.label)) { seen.add(f.label); labels.push(f.label); }
    }
  }
  return labels;
}

/** Labels that have at least one non-empty YTD value across all rows. */
function collectLabelsWithYtd(rows: PaystubData[], labels: string[]): Set<string> {
  const labelSet = new Set(labels);
  const withYtd = new Set<string>();
  for (const r of rows) {
    for (const f of r.fields) {
      if (labelSet.has(f.label) && f.ytd && f.ytd !== "") withYtd.add(f.label);
    }
  }
  return withYtd;
}

/** Strip leading $ and thousands commas from monetary strings. */
function stripCurrency(v: string): string {
  return v.replace(/^\$/, "").replace(/,/g, "");
}

function dynValue(stub: PaystubData | undefined, label: string): string {
  return stripCurrency(stub?.fields.find((f) => f.label === label)?.value ?? "");
}
function dynYtd(stub: PaystubData | undefined, label: string): string {
  return stripCurrency(stub?.fields.find((f) => f.label === label)?.ytd ?? "");
}

/** Section priority for export ordering — info fields first, financials after. */
const SECTION_ORDER: Record<string, number> = {
  Employee:   0,
  Employer:   1,
  Other:      2,
  Earnings:   3,
  Taxes:      4,
  Deductions: 5,
  Totals:     6,
};

function fill(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}
function thin(argb = "FFE5E7EB"): Partial<ExcelJS.Border> { return { style: "thin",   color: { argb } }; }
function medium(argb = "FF0F2744"): Partial<ExcelJS.Border> { return { style: "medium", color: { argb } }; }

function styleHeaderCell(
  cell: ExcelJS.Cell,
  argb: string,
  leftMed = false,
  align: "center" | "left" = "center",
) {
  cell.font      = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
  cell.fill      = fill(argb);
  cell.alignment = { vertical: "middle", horizontal: align, wrapText: false };
  cell.border    = {
    top: thin(), bottom: thin(),
    left:  leftMed ? medium() : thin(),
    right: thin(),
  };
}

function styleDataCell(cell: ExcelJS.Cell, bg: string, leftMed = false) {
  cell.fill      = fill(bg);
  cell.alignment = { vertical: "middle" };
  cell.border    = {
    top: thin(), bottom: thin(),
    left:  leftMed ? medium() : thin(),
    right: thin(),
  };
}

const PERIOD_COLORS = ["FF1E3A5F", "FF374151"];

async function buildXLSX(
  sorted: PaystubData[],
  headerKeys: Set<string> | null,
  dynamicLabels: string[],
  includeYTD: boolean,
  labelsWithYtd: Set<string>,
): Promise<Buffer> {
  const inc = (k: string) => headerKeys === null || headerKeys.has(k);

  const empGroups = groupByEmployee(sorted);
  const periods   = collectPeriods(sorted);

  type FixedCol = { header: string; width: number; getValue: (stubs: PaystubData[]) => string };
  const fixedCols: FixedCol[] = [];
  if (inc("name"))         fixedCols.push({ header: "Employee",      width: 22, getValue: (s) => s[0].name });
  if (inc("payoutMethod")) fixedCols.push({ header: "Payout Method", width: 15, getValue: (s) => s[0].payoutMethod });

  type SubCol = { subHeader: string; width: number; getValue: (stub: PaystubData | undefined) => string };
  const subCols: SubCol[] = [];
  if (inc("checkDate")) subCols.push({ subHeader: "Check Date", width: 13, getValue: (s) => s?.checkDate ?? "" });
  if (inc("grossPay"))  subCols.push({ subHeader: "Gross Pay",  width: 12, getValue: (s) => stripCurrency(s?.grossPay ?? "") });
  if (inc("netPay"))    subCols.push({ subHeader: "Net Pay",    width: 12, getValue: (s) => stripCurrency(s?.netPay   ?? "") });
  for (const dl of dynamicLabels) {
    subCols.push({ subHeader: dl,           width: 14, getValue: (s) => dynValue(s, dl) });
    if (includeYTD && labelsWithYtd.has(dl)) subCols.push({ subHeader: `${dl} YTD`, width: 14, getValue: (s) => dynYtd(s, dl) });
  }

  const totalCols = fixedCols.length + periods.length * subCols.length;
  if (totalCols === 0) return Buffer.from(await new ExcelJS.Workbook().xlsx.writeBuffer()) as Buffer;

  const wb = new ExcelJS.Workbook();
  wb.creator = "StubParse";
  wb.created = new Date();
  const ws = wb.addWorksheet("Paystubs");

  let widthIdx = 1;
  for (const fc of fixedCols)         { ws.getColumn(widthIdx++).width = fc.width; }
  for (let pi = 0; pi < periods.length; pi++) {
    for (const sc of subCols)          { ws.getColumn(widthIdx++).width = sc.width; }
  }

  const r1 = ws.getRow(1); r1.height = 20;
  const r2 = ws.getRow(2); r2.height = 18;

  for (let fi = 0; fi < fixedCols.length; fi++) {
    const col = fi + 1;
    const argb = "FF1E3A5F";
    styleHeaderCell(r1.getCell(col), argb, col === 1, "left");
    styleHeaderCell(r2.getCell(col), argb, col === 1, "left");
    r1.getCell(col).value = fixedCols[fi].header;
    ws.mergeCells(1, col, 2, col);
  }

  for (let pi = 0; pi < periods.length; pi++) {
    const { label } = periods[pi];
    const argb      = PERIOD_COLORS[pi % PERIOD_COLORS.length];
    const startCol  = fixedCols.length + pi * subCols.length + 1;
    const endCol    = startCol + subCols.length - 1;

    for (let ci = startCol; ci <= endCol; ci++) {
      styleHeaderCell(r1.getCell(ci), argb, ci === startCol);
    }
    r1.getCell(startCol).value = label;
    if (subCols.length > 1) ws.mergeCells(1, startCol, 1, endCol);

    for (let si = 0; si < subCols.length; si++) {
      const col  = startCol + si;
      const cell = r2.getCell(col);
      styleHeaderCell(cell, argb, col === startCol);
      cell.font = { bold: true, color: { argb: "FFB8C8DC" }, size: 9 };
      cell.value = subCols[si].subHeader;
    }
  }

  let rowNum = 3;
  for (const [, stubs] of empGroups) {
    const row = ws.getRow(rowNum);
    row.height = 16;
    const bg   = (rowNum - 3) % 2 === 0 ? "FFEFF6FF" : "FFFFFFFF";

    for (let fi = 0; fi < fixedCols.length; fi++) {
      const col  = fi + 1;
      const cell = row.getCell(col);
      cell.value = fixedCols[fi].getValue(stubs);
      styleDataCell(cell, bg, col === 1);
    }

    for (let pi = 0; pi < periods.length; pi++) {
      const stub     = stubFor(stubs, periods[pi].key);
      const startCol = fixedCols.length + pi * subCols.length + 1;
      for (let si = 0; si < subCols.length; si++) {
        const col  = startCol + si;
        const cell = row.getCell(col);
        cell.value = subCols[si].getValue(stub);
        styleDataCell(cell, bg, col === startCol);
      }
    }

    rowNum++;
  }

  ws.views = [{ state: "frozen", xSplit: fixedCols.length, ySplit: 2 }];

  return Buffer.from(await wb.xlsx.writeBuffer()) as Buffer;
}

function csvEscape(v: string): string {
  return v.includes(",") || v.includes('"') || v.includes("\n")
    ? `"${v.replace(/"/g, '""')}"`
    : v;
}

function buildCSV(
  sorted: PaystubData[],
  headerKeys: Set<string> | null,
  dynamicLabels: string[],
  includeYTD: boolean,
  labelsWithYtd: Set<string>,
): string {
  const inc = (k: string) => headerKeys === null || headerKeys.has(k);
  const empGroups = groupByEmployee(sorted);
  const periods   = collectPeriods(sorted);

  const header: string[] = [];
  if (inc("name"))         header.push("Employee");
  if (inc("payoutMethod")) header.push("Payout Method");
  for (const { label } of periods) {
    if (inc("checkDate")) header.push(`${label} Check Date`);
    if (inc("grossPay"))  header.push(`${label} Gross Pay`);
    if (inc("netPay"))    header.push(`${label} Net Pay`);
    for (const dl of dynamicLabels) {
      header.push(`${label} ${dl}`);
      if (includeYTD && labelsWithYtd.has(dl)) header.push(`${label} ${dl} YTD`);
    }
  }

  const rows: string[][] = [header];
  for (const [, stubs] of empGroups) {
    const row: string[] = [];
    if (inc("name"))         row.push(stubs[0].name);
    if (inc("payoutMethod")) row.push(stubs[0].payoutMethod);
    for (const { key } of periods) {
      const stub = stubFor(stubs, key);
      if (inc("checkDate")) row.push(stub?.checkDate ?? "");
      if (inc("grossPay"))  row.push(stripCurrency(stub?.grossPay ?? ""));
      if (inc("netPay"))    row.push(stripCurrency(stub?.netPay   ?? ""));
      for (const dl of dynamicLabels) {
        row.push(dynValue(stub, dl));
        if (includeYTD && labelsWithYtd.has(dl)) row.push(dynYtd(stub, dl));
      }
    }
    rows.push(row);
  }

  return rows.map((r) => r.map(csvEscape).join(",")).join("\n");
}

async function buildXLSXVertical(
  sorted: PaystubData[],
  headerKeys: Set<string> | null,
  dynamicLabels: string[],
  includeYTD: boolean,
  labelsWithYtd: Set<string>,
): Promise<Buffer> {
  const inc = (k: string) => headerKeys === null || headerKeys.has(k);

  type Col = { header: string; width: number; getValue: (s: PaystubData) => string };
  const cols: Col[] = [];
  if (inc("name"))         cols.push({ header: "Employee",      width: 22, getValue: (s) => s.name });
  if (inc("payoutMethod")) cols.push({ header: "Payout Method", width: 15, getValue: (s) => s.payoutMethod });
  cols.push({ header: "Pay Period", width: 20, getValue: (s) => makePeriodLabel(s) });
  if (inc("checkDate")) cols.push({ header: "Check Date", width: 13, getValue: (s) => s.checkDate ?? "" });
  if (inc("grossPay"))  cols.push({ header: "Gross Pay",  width: 12, getValue: (s) => stripCurrency(s.grossPay ?? "") });
  if (inc("netPay"))    cols.push({ header: "Net Pay",    width: 12, getValue: (s) => stripCurrency(s.netPay   ?? "") });
  for (const dl of dynamicLabels) {
    cols.push({ header: dl, width: 14, getValue: (s) => dynValue(s, dl) });
    if (includeYTD && labelsWithYtd.has(dl)) cols.push({ header: `${dl} YTD`, width: 14, getValue: (s) => dynYtd(s, dl) });
  }

  if (cols.length === 0) return Buffer.from(await new ExcelJS.Workbook().xlsx.writeBuffer()) as Buffer;

  const wb = new ExcelJS.Workbook();
  wb.creator = "StubParse";
  wb.created = new Date();
  const ws = wb.addWorksheet("Paystubs");

  cols.forEach((c, i) => { ws.getColumn(i + 1).width = c.width; });

  const headerRow = ws.getRow(1);
  headerRow.height = 20;
  cols.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.header;
    styleHeaderCell(cell, "FF1E3A5F", i === 0, "left");
  });

  sorted.forEach((stub, ri) => {
    const row = ws.getRow(ri + 2);
    row.height = 16;
    const bg = ri % 2 === 0 ? "FFEFF6FF" : "FFFFFFFF";
    cols.forEach((c, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = c.getValue(stub);
      styleDataCell(cell, bg, ci === 0);
    });
  });

  ws.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];
  return Buffer.from(await wb.xlsx.writeBuffer()) as Buffer;
}

function buildCSVVertical(
  sorted: PaystubData[],
  headerKeys: Set<string> | null,
  dynamicLabels: string[],
  includeYTD: boolean,
  labelsWithYtd: Set<string>,
): string {
  const inc = (k: string) => headerKeys === null || headerKeys.has(k);

  const header: string[] = [];
  if (inc("name"))         header.push("Employee");
  if (inc("payoutMethod")) header.push("Payout Method");
  header.push("Pay Period");
  if (inc("checkDate")) header.push("Check Date");
  if (inc("grossPay"))  header.push("Gross Pay");
  if (inc("netPay"))    header.push("Net Pay");
  for (const dl of dynamicLabels) {
    header.push(dl);
    if (includeYTD && labelsWithYtd.has(dl)) header.push(`${dl} YTD`);
  }

  const rows: string[][] = [header];
  for (const stub of sorted) {
    const row: string[] = [];
    if (inc("name"))         row.push(stub.name);
    if (inc("payoutMethod")) row.push(stub.payoutMethod);
    row.push(makePeriodLabel(stub));
    if (inc("checkDate")) row.push(stub.checkDate ?? "");
    if (inc("grossPay"))  row.push(stripCurrency(stub.grossPay ?? ""));
    if (inc("netPay"))    row.push(stripCurrency(stub.netPay   ?? ""));
    for (const dl of dynamicLabels) {
      row.push(dynValue(stub, dl));
      if (includeYTD && labelsWithYtd.has(dl)) row.push(dynYtd(stub, dl));
    }
    rows.push(row);
  }

  return rows.map((r) => r.map(csvEscape).join(",")).join("\n");
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const {
      rows,
      format = "xlsx",
      layout = "horizontal",
      fields,
      dynamicLabels,
      includeYTD = true,
    }: {
      rows: PaystubData[];
      format: "xlsx" | "csv" | "json";
      layout: "horizontal" | "vertical";
      fields?: string[];
      dynamicLabels?: string[] | null;
      includeYTD?: boolean;
    } = await req.json();

    if (!rows?.length) return NextResponse.json({ error: "No data provided" }, { status: 400 });

    const sorted = [...rows].sort(
      (a, b) => parseDate(a.payPeriodStart).getTime() - parseDate(b.payPeriodStart).getTime()
    );

    const headerKeys: Set<string> | null = fields != null ? new Set(fields) : null;
    const filteredDynamic = collectDynamicLabels(sorted, dynamicLabels);
    const labelsWithYtd   = collectLabelsWithYtd(sorted, filteredDynamic);
    const inc = (k: string) => headerKeys === null || headerKeys.has(k);

    if (format === "json") {
      const empGroups = groupByEmployee(sorted);
      const periods   = collectPeriods(sorted);

      const out = [...empGroups.entries()].map(([employeeName, stubs]) => {
        const obj: Record<string, unknown> = {};
        if (inc("name"))         obj.name        = employeeName;
        if (inc("payoutMethod")) obj.payoutMethod = stubs[0].payoutMethod;

        const periodsObj: Record<string, unknown> = {};
        for (const { key, label } of periods) {
          const stub = stubFor(stubs, key);
          if (!stub) continue;
          const p: Record<string, unknown> = {};
          if (inc("checkDate")) p.checkDate = stub.checkDate;
          if (inc("grossPay"))  p.grossPay  = stripCurrency(stub.grossPay);
          if (inc("netPay"))    p.netPay    = stripCurrency(stub.netPay);
          if (filteredDynamic.length) {
            p.fields = stub.fields
              .filter((f) => filteredDynamic.includes(f.label))
              .sort((a, b) => (SECTION_ORDER[a.section] ?? 99) - (SECTION_ORDER[b.section] ?? 99))
              .map((f) => ({ ...f, value: stripCurrency(f.value), ytd: stripCurrency(f.ytd) }));
          }
          periodsObj[label] = p;
        }
        obj.periods = periodsObj;
        return obj;
      });

      return new NextResponse(JSON.stringify(out, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": 'attachment; filename="paystubs.json"',
        },
      });
    }

    if (format === "csv") {
      const csv = layout === "vertical"
        ? buildCSVVertical(sorted, headerKeys, filteredDynamic, includeYTD, labelsWithYtd)
        : buildCSV(sorted, headerKeys, filteredDynamic, includeYTD, labelsWithYtd);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="paystubs.csv"',
        },
      });
    }

    const buffer = layout === "vertical"
      ? await buildXLSXVertical(sorted, headerKeys, filteredDynamic, includeYTD, labelsWithYtd)
      : await buildXLSX(sorted, headerKeys, filteredDynamic, includeYTD, labelsWithYtd);
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="paystubs.xlsx"',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
