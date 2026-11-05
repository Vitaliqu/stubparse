// Fictional sample paystub used for every marketing demonstration. Not a real person or employer.

export const SAMPLE = {
  employer: "Harbor & Pine Bakery LLC",
  employerAddress: "418 Alder St, Sacramento, CA 95814",
  employee: "Maya Okafor",
  employeeId: "E-20417",
  periodStart: "Oct 1",
  periodEnd: "15, 2026",
  payDate: "Oct 20, 2026",
  earnings: [
    { label: "Regular",  hours: "80.00", rate: "24.50", current: "1,960.00", ytd: "39,200.00" },
    { label: "Overtime", hours: "4.00",  rate: "36.75", current: "147.00",   ytd: "2,205.00" },
    { label: "Tips",     hours: "",      rate: "",      current: "212.40",   ytd: "4,036.20" },
  ],
  gross: { current: "2,319.40", ytd: "45,441.20" },
  taxes: [
    { label: "Federal income tax", current: "231.94", ytd: "4,544.12" },
    { label: "Social Security",    current: "143.80", ytd: "2,817.35" },
    { label: "Medicare",           current: "33.63",  ytd: "658.90" },
    { label: "CA state income tax", current: "92.78", ytd: "1,817.65" },
  ],
  deductions: [
    { label: "401(k) 5%",        current: "115.97", ytd: "2,272.06" },
    { label: "Health insurance", current: "86.50",  ytd: "1,730.00" },
  ],
  net: { current: "1,614.78", ytd: "31,601.12" },
} as const;

/** Rows the hero stage lifts from the stub into the spreadsheet, in reading order. */
export const STAGE_ROWS: { key: string; label: string; current: string; ytd: string; strong?: boolean }[] = [
  { key: "employee", label: "Employee",            current: SAMPLE.employee, ytd: "" },
  { key: "payDate",  label: "Pay date",            current: "2026-10-20",    ytd: "" },
  ...SAMPLE.earnings.map((e) => ({ key: `e-${e.label}`, label: `${e.label} pay`, current: e.current, ytd: e.ytd })),
  { key: "gross",    label: "Gross pay",           current: SAMPLE.gross.current, ytd: SAMPLE.gross.ytd, strong: true },
  ...SAMPLE.taxes.map((t) => ({ key: `t-${t.label}`, label: t.label, current: t.current, ytd: t.ytd })),
  ...SAMPLE.deductions.map((d) => ({ key: `d-${d.label}`, label: d.label, current: d.current, ytd: d.ytd })),
  { key: "net",      label: "Net pay",             current: SAMPLE.net.current, ytd: SAMPLE.net.ytd, strong: true },
];
