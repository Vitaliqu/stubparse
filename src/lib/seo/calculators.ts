// Pure calculator functions behind the free tools (unit-tested).

import { PERIODS_PER_YEAR, type Frequency } from "@/lib/income";

export type PayFrequency = Exclude<Frequency, "unknown">;

export const FREQUENCIES: { value: PayFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every two weeks" },
  { value: "semimonthly", label: "Twice a month" },
  { value: "monthly", label: "Monthly" },
];

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Paycheck → yearly, monthly, weekly. */
export function annualFromPaycheck(perPeriod: number, frequency: PayFrequency) {
  const annual = perPeriod * PERIODS_PER_YEAR[frequency];
  return { annual: round2(annual), monthly: round2(annual / 12), weekly: round2(annual / 52) };
}

/** Day of year for a YYYY-MM-DD date (1-based, UTC). */
export function dayOfYear(iso: string): number | null {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86_400_000) + 1;
}

/** Year-to-date earnings → annualized at the current pace. */
export function annualFromYtd(ytd: number, payDate: string) {
  const day = dayOfYear(payDate);
  if (!day) return null;
  const annual = (ytd / day) * 365;
  return { annual: round2(annual), monthly: round2(annual / 12), day };
}

/** Hourly rate → salary, with optional weekly overtime at 1.5×. */
export function salaryFromHourly(rate: number, hoursPerWeek: number, overtimePerWeek = 0, weeksPerYear = 52) {
  const weekly = rate * hoursPerWeek + rate * 1.5 * overtimePerWeek;
  const annual = weekly * weeksPerYear;
  return { weekly: round2(weekly), monthly: round2(annual / 12), annual: round2(annual) };
}

/** Rent affordability with an income multiple (rent × multiple ≤ monthly gross income). */
export function rentAffordability(monthlyGross: number, multiple = 3) {
  return { maxRent: round2(monthlyGross / multiple), monthlyGross: round2(monthlyGross) };
}
export function incomeNeededForRent(rent: number, multiple = 3) {
  const monthly = rent * multiple;
  return { monthly: round2(monthly), annual: round2(monthly * 12) };
}

/** Does net pay follow from gross, taxes, and deductions? */
export function checkNetPay(gross: number, taxes: number, deductions: number, net: number) {
  const expected = round2(gross - taxes - deductions);
  const difference = round2(net - expected);
  return { expected, difference, ok: Math.abs(difference) < 0.01, takeHomeRate: gross > 0 ? round2((net / gross) * 100) : null };
}

interface ToolMeta {
  slug: string;
  name: string;
  title: string;        // <title>
  description: string;
  intro: string;
  how: string[];        // "How it works" bullets
  faq: { q: string; a: string }[];
}

export const TOOLS: ToolMeta[] = [
  {
    slug: "annual-income-calculator",
    name: "Annual income from a paycheck",
    title: "Annual Income Calculator from a Paycheck",
    description: "Turn one paycheck into yearly, monthly, and weekly income for weekly, biweekly, semimonthly, or monthly pay. Free, no sign-up.",
    intro: "Enter what one paycheck pays and how often you're paid. The calculator multiplies by the number of paychecks in a year.",
    how: ["Weekly pay has 52 paychecks a year, every two weeks 26, twice a month 24, and monthly 12.", "Use gross pay for income checks (lenders and landlords use gross); use net pay for budgeting."],
    faq: [
      { q: "Is biweekly the same as twice a month?", a: "No. Biweekly is every two weeks (26 paychecks); twice a month is semimonthly (24 paychecks). The difference is about 8% of a year's pay." },
      { q: "Should I use gross or net pay?", a: "Gross for income requirements such as rent or loans; net to see what you actually take home." },
    ],
  },
  {
    slug: "ytd-income-calculator",
    name: "Annual income from year-to-date earnings",
    title: "YTD Income Calculator: Annualize Year-to-Date Earnings",
    description: "Estimate annual income from the year-to-date gross on your latest paystub and its pay date. Free, no sign-up.",
    intro: "Your latest paystub shows year-to-date gross earnings. This calculator works out your annual pace from how far into the year that pay date is.",
    how: ["Annual pace = YTD gross ÷ day of the year × 365.", "It's most reliable later in the year and when pay is steady; early-year results swing more."],
    faq: [
      { q: "Why does this differ from paycheck × 26?", a: "Raises, bonuses, overtime, or unpaid time off change your YTD pace. When the two methods disagree a lot, your pay isn't steady." },
      { q: "Which date should I use?", a: "The pay date (check date) on the stub that shows the YTD figure." },
    ],
  },
  {
    slug: "hourly-to-salary-calculator",
    name: "Hourly to salary",
    title: "Hourly to Salary Calculator (with Overtime)",
    description: "Convert an hourly wage to weekly, monthly, and annual pay, including overtime at time-and-a-half. Free, no sign-up.",
    intro: "Enter your hourly rate and usual hours. Add overtime hours if you regularly work more than 40 a week.",
    how: ["Weekly pay = rate × regular hours + rate × 1.5 × overtime hours.", "Annual pay assumes the same week every week; lower weeks per year for unpaid time off."],
    faq: [
      { q: "How is overtime calculated?", a: "Federal law requires at least 1.5× the regular rate for hours over 40 in a workweek for most hourly employees. Some states add daily overtime." },
      { q: "Does this include taxes?", a: "No. It's gross pay before taxes and deductions." },
    ],
  },
  {
    slug: "rent-affordability-calculator",
    name: "Rent affordability (3× rule)",
    title: "Rent Affordability Calculator: The 3× Income Rule",
    description: "See the most rent you qualify for under the 3× income rule, or the income needed for a given rent. For renters and landlords.",
    intro: "Many landlords ask that monthly gross income be about three times the rent. Check either direction: rent from income, or income from rent.",
    how: ["Maximum rent = monthly gross income ÷ multiple.", "Some landlords use 2.5× or 3.5×; change the multiple to match."],
    faq: [
      { q: "Is the 3× rule a law?", a: "No. It's a common screening guideline, and landlords set their own criteria within fair-housing rules." },
      { q: "Should I use gross or net income?", a: "Gross. The rule compares rent to pre-tax monthly income." },
    ],
  },
  {
    slug: "paystub-checker",
    name: "Paystub math checker",
    title: "Paystub Checker: Does Your Net Pay Add Up?",
    description: "Check that gross pay minus taxes and deductions equals net pay on a paystub. Spot errors in seconds. Free, no sign-up.",
    intro: "Enter the totals from a paystub. The checker confirms that net pay follows from gross pay, taxes, and deductions, and shows the difference if it doesn't.",
    how: ["Net pay should equal gross pay − total taxes − total deductions.", "Upload the stub to StubParse to check every line, not just the totals."],
    faq: [
      { q: "Why might my numbers not add up?", a: "A misread number, a deduction listed elsewhere on the stub, reimbursements added after net pay, or an error on the stub itself." },
      { q: "What's a normal take-home percentage?", a: "It varies widely with taxes, benefits, and retirement contributions; 65–80% of gross is common." },
    ],
  },
];

export const findTool = (slug: string) => TOOLS.find((t) => t.slug === slug);
