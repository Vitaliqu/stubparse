// Paystub glossary. Plain-English definitions of the terms printed on US pay stubs.
// Figures cited here are long-standing federal rules; anything that changes yearly is described, not quoted.

export interface GlossaryTerm {
  slug: string;
  term: string;
  short: string;        // one-sentence definition (meta description + DefinedTerm)
  body: string[];       // explanation paragraphs
  onStub: string;       // where/how it appears on a stub
  example?: string;
  related: string[];    // other term slugs
}

export const GLOSSARY: GlossaryTerm[] = [
  {
    slug: "gross-pay", term: "Gross pay",
    short: "Gross pay is the total you earned in a pay period before any taxes or deductions come out.",
    body: [
      "Gross pay adds up everything you earned for the period: regular wages or salary, overtime, bonuses, commissions, tips reported through payroll, and paid time off.",
      "It's the starting point for every other number on the stub. Taxes and deductions are subtracted from it to reach net pay.",
    ],
    onStub: "Usually labeled Gross Pay, Total Earnings, or Gross Earnings, often at the bottom of the earnings section with a year-to-date figure beside it.",
    example: "80 regular hours at $24.50 ($1,960.00) plus $147.00 overtime and $212.40 tips is $2,319.40 gross pay.",
    related: ["net-pay", "year-to-date", "overtime-pay", "pay-period"],
  },
  {
    slug: "net-pay", term: "Net pay",
    short: "Net pay is your take-home pay: gross pay minus taxes and deductions.",
    body: [
      "Net pay is the amount actually deposited to your bank account or printed on your check.",
      "The formula is gross pay minus tax withholding minus pre-tax and post-tax deductions. If those don't add up on your stub, something was misprinted or misread.",
    ],
    onStub: "Labeled Net Pay, Take Home Pay, or Net Check, usually the most prominent number on the stub.",
    example: "$2,319.40 gross − $502.15 taxes − $202.47 deductions = $1,614.78 net pay.",
    related: ["gross-pay", "pre-tax-deduction", "post-tax-deduction", "direct-deposit"],
  },
  {
    slug: "year-to-date", term: "Year-to-date (YTD)",
    short: "Year-to-date (YTD) amounts are running totals from January 1 through the current pay date.",
    body: [
      "Most stubs show two columns: what happened this pay period (current) and the total so far this calendar year (YTD).",
      "Each stub's YTD should equal the previous stub's YTD plus this period's current amount. When it doesn't, either a stub is missing or a number is wrong, which is why lenders look at it closely.",
    ],
    onStub: "A column labeled YTD or Year to Date beside each earning, tax, and deduction.",
    example: "If YTD gross was $43,121.80 on the last stub and you earned $2,319.40 this period, YTD gross should now be $45,441.20.",
    related: ["gross-pay", "annualized-income", "pay-period"],
  },
  {
    slug: "pay-period", term: "Pay period",
    short: "A pay period is the span of days a paycheck covers, such as two weeks or half a month.",
    body: [
      "Your stub covers work done between a start date and an end date. You're usually paid a few days after the period ends.",
      "The length of the pay period tells you the pay frequency, which matters when converting a paycheck to annual income.",
    ],
    onStub: "Shown as Pay Period, Period Beginning and Period Ending, or a date range near the top.",
    related: ["pay-frequency", "pay-date", "annualized-income"],
  },
  {
    slug: "pay-frequency", term: "Pay frequency",
    short: "Pay frequency is how often you're paid: weekly, every two weeks, twice a month, or monthly.",
    body: [
      "Weekly pay means 52 paychecks a year, biweekly (every two weeks) 26, semimonthly (twice a month) 24, and monthly 12.",
      "Biweekly and semimonthly are easy to confuse. Biweekly is every 14 days; semimonthly lands on fixed dates such as the 15th and the last day of the month.",
    ],
    onStub: "Sometimes printed as Pay Frequency; otherwise you can infer it from the pay period length.",
    example: "$2,319.40 gross paid twice a month annualizes to $2,319.40 × 24 = $55,665.60.",
    related: ["pay-period", "annualized-income", "pay-date"],
  },
  {
    slug: "pay-date", term: "Pay date (check date)",
    short: "The pay date, or check date, is the day the money is paid out.",
    body: [
      "The pay date is usually a few days after the pay period ends, while payroll is processed.",
      "For taxes, wages count in the year they're paid, so a December period paid in January counts toward the new year.",
    ],
    onStub: "Labeled Pay Date, Check Date, or Payment Date.",
    related: ["pay-period", "direct-deposit"],
  },
  {
    slug: "fica", term: "FICA",
    short: "FICA is the federal payroll tax that funds Social Security and Medicare.",
    body: [
      "FICA stands for the Federal Insurance Contributions Act. It's made up of two taxes: Social Security (6.2% of wages up to an annual cap) and Medicare (1.45% of all wages).",
      "Your employer pays a matching share that doesn't appear in your deductions.",
    ],
    onStub: "Sometimes a single FICA line; more often split into Social Security (or OASDI) and Medicare.",
    related: ["social-security-tax", "medicare-tax", "federal-income-tax-withholding"],
  },
  {
    slug: "social-security-tax", term: "Social Security tax (OASDI)",
    short: "Social Security tax is 6.2% of your wages, up to an annual wage cap, withheld to fund Social Security.",
    body: [
      "Social Security tax, also called OASDI (Old-Age, Survivors, and Disability Insurance), is withheld at 6.2% of covered wages.",
      "It stops for the rest of the year once your earnings pass the annual wage base, which changes each year. Some pre-tax benefits, like health insurance through a cafeteria plan, reduce the wages it applies to.",
    ],
    onStub: "Labeled Social Security, Soc Sec, OASDI, or FICA-SS.",
    example: "On $2,319.40 of covered wages, Social Security is about $143.80.",
    related: ["fica", "medicare-tax", "section-125"],
  },
  {
    slug: "medicare-tax", term: "Medicare tax",
    short: "Medicare tax is 1.45% of all wages, plus an extra 0.9% on high earnings, withheld to fund Medicare.",
    body: [
      "Medicare tax has no wage cap. Employers withhold 1.45% of all covered wages, and an Additional Medicare Tax of 0.9% applies to wages above $200,000 in a year.",
      "Like Social Security, it can be reduced by certain pre-tax benefits.",
    ],
    onStub: "Labeled Medicare, Med, or FICA-Med.",
    example: "On $2,319.40, Medicare is about $33.63.",
    related: ["fica", "social-security-tax"],
  },
  {
    slug: "federal-income-tax-withholding", term: "Federal income tax withholding",
    short: "Federal income tax withholding is the amount your employer sends to the IRS toward your income tax.",
    body: [
      "Unlike FICA, federal income tax withholding isn't a flat rate. It depends on your pay, pay frequency, and the choices on your Form W-4.",
      "It's an estimate of your yearly tax. You settle the difference when you file your return.",
    ],
    onStub: "Labeled Federal Income Tax, Fed Withholding, FIT, or FITW.",
    related: ["w-4", "state-income-tax", "pre-tax-deduction"],
  },
  {
    slug: "state-income-tax", term: "State income tax",
    short: "State income tax withholding is the amount sent to your state toward state income tax.",
    body: [
      "Most states withhold income tax from wages; a handful have no state income tax on wages.",
      "Some cities and counties also withhold local income tax, which appears as a separate line.",
    ],
    onStub: "Labeled with the state, such as CA State Income Tax, NY SIT, or State Withholding.",
    related: ["federal-income-tax-withholding", "state-disability-insurance"],
  },
  {
    slug: "state-disability-insurance", term: "State disability insurance (SDI)",
    short: "State disability insurance is a payroll deduction in some states that funds short-term disability and, in some states, paid family leave.",
    body: [
      "A few states require employee contributions to a state disability or paid-leave program, which shows up as a separate line from income tax.",
      "Rates and wage caps vary by state and change from year to year.",
    ],
    onStub: "Labeled SDI, CA SDI, NJ SDI, FLI, PFL, or similar.",
    related: ["state-income-tax", "post-tax-deduction"],
  },
  {
    slug: "pre-tax-deduction", term: "Pre-tax deduction",
    short: "A pre-tax deduction comes out of your pay before income tax is calculated, lowering your taxable wages.",
    body: [
      "Common pre-tax deductions include traditional 401(k) contributions, health insurance premiums through a cafeteria plan, HSA contributions, and FSA contributions.",
      "Which taxes a deduction reduces depends on its type. For example, traditional 401(k) contributions reduce income tax but not Social Security or Medicare.",
    ],
    onStub: "Listed under Deductions or Pre-Tax Deductions, sometimes marked with an asterisk.",
    related: ["post-tax-deduction", "401k-contribution", "section-125", "net-pay"],
  },
  {
    slug: "post-tax-deduction", term: "Post-tax deduction",
    short: "A post-tax deduction comes out of your pay after taxes are calculated.",
    body: [
      "Roth 401(k) contributions, union dues, some insurance, charitable giving, and wage garnishments are typically taken after tax.",
      "They lower your take-home pay but not your taxable wages.",
    ],
    onStub: "Listed under Deductions or After-Tax Deductions.",
    related: ["pre-tax-deduction", "wage-garnishment", "net-pay"],
  },
  {
    slug: "401k-contribution", term: "401(k) contribution",
    short: "A 401(k) contribution is money you put into your employer's retirement plan straight from your paycheck.",
    body: [
      "Traditional 401(k) contributions are pre-tax for income tax; Roth 401(k) contributions are after tax. Both are capped each year by IRS limits.",
      "An employer match, if any, usually appears separately and doesn't reduce your pay.",
    ],
    onStub: "Labeled 401(k), 401K, Retirement, or Roth 401(k), often as a percentage of pay.",
    related: ["pre-tax-deduction", "post-tax-deduction"],
  },
  {
    slug: "section-125", term: "Section 125 (cafeteria plan)",
    short: "A Section 125 cafeteria plan lets you pay for certain benefits, like health insurance, with pre-tax dollars.",
    body: [
      "Premiums paid through a Section 125 plan are generally excluded from income tax and from Social Security and Medicare wages.",
      "That's why your Social Security wages can be lower than your gross pay.",
    ],
    onStub: "Usually shows as Medical, Dental, or Vision deductions, sometimes marked Sec 125.",
    related: ["pre-tax-deduction", "social-security-tax"],
  },
  {
    slug: "overtime-pay", term: "Overtime pay",
    short: "Overtime pay is extra pay for hours over 40 in a workweek, at least 1.5 times the regular rate for most hourly workers.",
    body: [
      "Under federal law, non-exempt employees earn at least time-and-a-half for hours worked over 40 in a workweek. Some states add daily overtime rules.",
      "Overtime usually appears as its own earnings line with its own hours and rate.",
    ],
    onStub: "Labeled Overtime, OT, or OT 1.5, with hours and a rate.",
    example: "4 overtime hours at a $24.50 base rate pays 4 × $36.75 = $147.00.",
    related: ["gross-pay", "pay-period"],
  },
  {
    slug: "wage-garnishment", term: "Wage garnishment",
    short: "A wage garnishment is money withheld from your pay by legal order to pay a debt, such as child support or back taxes.",
    body: [
      "Garnishments are taken after taxes and are limited by federal and state rules on how much of your pay can be withheld.",
      "They can make net pay much lower than usual compared with gross pay.",
    ],
    onStub: "Labeled Garnishment, Child Support, Levy, or by the agency's name.",
    related: ["post-tax-deduction", "net-pay"],
  },
  {
    slug: "direct-deposit", term: "Direct deposit",
    short: "Direct deposit sends your net pay straight to one or more bank accounts.",
    body: [
      "Many stubs show where your pay went, sometimes split across accounts, with the account numbers masked.",
      "The deposit amounts should add up to net pay.",
    ],
    onStub: "A Direct Deposit, Distribution, or Payout section listing masked account numbers and amounts.",
    related: ["net-pay", "pay-date"],
  },
  {
    slug: "w-4", term: "Form W-4",
    short: "Form W-4 tells your employer how much federal income tax to withhold from your pay.",
    body: [
      "Your W-4 choices, such as filing status, dependents, and extra withholding, determine your federal income tax withholding each pay period.",
      "If too much or too little is withheld, update your W-4 with your employer.",
    ],
    onStub: "Not printed as a line, but some stubs show your filing status or allowances near the top.",
    related: ["federal-income-tax-withholding"],
  },
  {
    slug: "annualized-income", term: "Annualized income",
    short: "Annualized income estimates yearly pay from a shorter stretch, such as one paycheck or year-to-date earnings.",
    body: [
      "There are two common ways to annualize from paystubs: multiply average pay per period by the number of pay periods in a year, or scale year-to-date earnings by how far into the year you are.",
      "Lenders and landlords use annualized income to compare against loan payments or rent. When the two methods disagree a lot, pay is irregular or the stubs aren't typical.",
    ],
    onStub: "Not printed on stubs; calculated from gross pay, pay frequency, and YTD earnings.",
    example: "$45,441.20 YTD on October 20 (day 293) annualizes to about $45,441.20 ÷ 293 × 365 = $56,607.64.",
    related: ["pay-frequency", "year-to-date", "gross-pay"],
  },
  {
    slug: "earnings-statement", term: "Earnings statement",
    short: "An earnings statement is another name for a pay stub: the record of one paycheck's earnings, taxes, and deductions.",
    body: [
      "Payroll providers call it a pay stub, paystub, payslip, pay statement, or earnings statement. They all show the same structure: earnings, taxes, deductions, and net pay, usually with year-to-date totals.",
      "Many states require employers to give employees an earnings statement each payday.",
    ],
    onStub: "The document itself, often titled Earnings Statement or Statement of Earnings.",
    related: ["gross-pay", "net-pay", "year-to-date"],
  },
];

export const findTerm = (slug: string) => GLOSSARY.find((t) => t.slug === slug);
