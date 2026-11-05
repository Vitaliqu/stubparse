"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { Segmented } from "@/components/ui";
import {
  annualFromPaycheck, annualFromYtd, checkNetPay, FREQUENCIES, incomeNeededForRent, rentAffordability, salaryFromHourly,
  type PayFrequency,
} from "@/lib/seo/calculators";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n >= 1000 ? 0 : 2 });
const num = (s: string) => { const n = parseFloat(s.replace(/[$,\s]/g, "")); return Number.isFinite(n) ? n : null; };

/** The interactive calculator for a tool page. */
export function Calculator({ slug }: { slug: string }) {
  switch (slug) {
    case "annual-income-calculator": return <AnnualIncome />;
    case "ytd-income-calculator": return <YtdIncome />;
    case "hourly-to-salary-calculator": return <HourlyToSalary />;
    case "rent-affordability-calculator": return <RentAffordability />;
    case "paystub-checker": return <PaystubChecker />;
    default: return null;
  }
}

function Panel({ inputs, result }: { inputs: React.ReactNode; result: React.ReactNode }) {
  return (
    <div className="grid overflow-hidden rounded-[22px] bg-paper ring-1 ring-line md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-5 p-6 sm:p-8">{inputs}</div>
      <div className="border-t border-line bg-canvas p-6 sm:p-8 md:border-t-0 md:border-l" aria-live="polite">{result}</div>
    </div>
  );
}

function Field({ label, value, onChange, prefix, suffix, hint, type = "number" }: {
  label: string; value: string; onChange: (v: string) => void; prefix?: string; suffix?: string; hint?: string; type?: "number" | "date";
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-[13px] font-medium">{label}</label>
      <div className="mt-1.5 flex h-11 items-center rounded-[10px] bg-paper ring-1 ring-inset ring-line-2 focus-within:ring-2 focus-within:ring-ink">
        {prefix && <span className="pl-3.5 text-[15px] text-muted">{prefix}</span>}
        <input
          id={id}
          type={type}
          inputMode={type === "number" ? "decimal" : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="tnum h-full min-w-0 flex-1 bg-transparent px-3 font-mono text-[15px] outline-none"
        />
        {suffix && <span className="pr-3.5 text-[14px] text-muted">{suffix}</span>}
      </div>
      {hint && <p className="mt-1.5 text-[12px] text-muted">{hint}</p>}
    </div>
  );
}

function Big({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[13px] text-muted">{label}</p>
      <p className="tnum mt-1 font-mono text-[clamp(2rem,5vw,2.75rem)] leading-none font-semibold tracking-[-0.02em]">{value}</p>
      {sub && <p className="mt-2 text-[13px] text-muted">{sub}</p>}
    </div>
  );
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="mt-6 divide-y divide-line border-y border-line">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between py-2.5 text-[14px]"><dt className="text-muted">{k}</dt><dd className="tnum font-mono">{v}</dd></div>
      ))}
    </dl>
  );
}

const Empty = ({ text }: { text: string }) => <p className="text-[15px] text-muted">{text}</p>;

function AnnualIncome() {
  const [pay, setPay] = useState("2319.40");
  const [freq, setFreq] = useState<PayFrequency>("biweekly");
  const amount = num(pay);
  const r = amount !== null && amount > 0 ? annualFromPaycheck(amount, freq) : null;
  return (
    <Panel
      inputs={<>
        <Field label="Pay per paycheck" prefix="$" value={pay} onChange={setPay} hint="Gross pay for income checks; net pay for budgeting." />
        <div>
          <p className="mb-1.5 text-[13px] font-medium">How often you&apos;re paid</p>
          <Segmented label="Pay frequency" value={freq} onChange={setFreq} options={FREQUENCIES.map((f) => ({ value: f.value, label: f.label.replace("Every two weeks", "Biweekly").replace("Twice a month", "Semimonthly") }))} />
        </div>
      </>}
      result={r ? <>
        <Big label="Per year" value={usd(r.annual)} />
        <Rows rows={[["Per month", usd(r.monthly)], ["Per week", usd(r.weekly)]]} />
        <p className="mt-4 text-[12px] text-muted">{FREQUENCIES.find((f) => f.value === freq)!.label}: {usd(amount!)} × {{ weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 }[freq]} paychecks.</p>
      </> : <Empty text="Enter the amount of one paycheck." />}
    />
  );
}

function YtdIncome() {
  const [ytd, setYtd] = useState("45441.20");
  const [date, setDate] = useState("2026-10-20");
  const amount = num(ytd);
  const r = amount !== null && amount > 0 ? annualFromYtd(amount, date) : null;
  return (
    <Panel
      inputs={<>
        <Field label="Year-to-date gross pay" prefix="$" value={ytd} onChange={setYtd} hint="From the YTD column on your latest stub." />
        <Field label="Pay date of that stub" type="date" value={date} onChange={setDate} />
      </>}
      result={r ? <>
        <Big label="Annual pace" value={usd(r.annual)} sub={`Day ${r.day} of the year`} />
        <Rows rows={[["Per month", usd(r.monthly)]]} />
        <p className="mt-4 text-[12px] text-muted">{usd(amount!)} ÷ {r.day} days × 365.</p>
      </> : <Empty text="Enter your YTD gross and the pay date." />}
    />
  );
}

function HourlyToSalary() {
  const [rate, setRate] = useState("24.50");
  const [hours, setHours] = useState("40");
  const [ot, setOt] = useState("0");
  const [weeks, setWeeks] = useState("52");
  const r = useMemo(() => {
    const a = num(rate), h = num(hours), o = num(ot) ?? 0, w = num(weeks) ?? 52;
    return a && h ? salaryFromHourly(a, h, o, w) : null;
  }, [rate, hours, ot, weeks]);
  return (
    <Panel
      inputs={<>
        <Field label="Hourly rate" prefix="$" value={rate} onChange={setRate} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hours per week" value={hours} onChange={setHours} />
          <Field label="Overtime hours" value={ot} onChange={setOt} hint="Paid at 1.5×" />
        </div>
        <Field label="Paid weeks per year" value={weeks} onChange={setWeeks} hint="52 if you're paid for every week." />
      </>}
      result={r ? <>
        <Big label="Per year" value={usd(r.annual)} />
        <Rows rows={[["Per month", usd(r.monthly)], ["Per week", usd(r.weekly)]]} />
      </> : <Empty text="Enter your rate and hours." />}
    />
  );
}

function RentAffordability() {
  const [mode, setMode] = useState<"income" | "rent">("income");
  const [income, setIncome] = useState("6000");
  const [rent, setRent] = useState("2000");
  const [multiple, setMultiple] = useState("3");
  const m = num(multiple) || 3;
  const a = num(income), b = num(rent);
  return (
    <Panel
      inputs={<>
        <Segmented label="Calculate" value={mode} onChange={setMode} options={[{ value: "income", label: "Rent I can afford" }, { value: "rent", label: "Income I need" }]} />
        {mode === "income"
          ? <Field label="Monthly gross income" prefix="$" value={income} onChange={setIncome} hint="Before taxes. Use the annual income calculator if you know your paycheck." />
          : <Field label="Monthly rent" prefix="$" value={rent} onChange={setRent} />}
        <Field label="Income multiple" value={multiple} onChange={setMultiple} suffix="× rent" hint="3× is the most common; some landlords use 2.5× or 3.5×." />
      </>}
      result={mode === "income"
        ? a ? <><Big label="Maximum rent" value={usd(rentAffordability(a, m).maxRent)} sub={`${usd(a)} ÷ ${m}`} /></> : <Empty text="Enter your monthly gross income." />
        : b ? (() => { const r = incomeNeededForRent(b, m); return <><Big label="Monthly income needed" value={usd(r.monthly)} /><Rows rows={[["Per year", usd(r.annual)]]} /></>; })() : <Empty text="Enter the monthly rent." />}
    />
  );
}

function PaystubChecker() {
  const [g, setG] = useState("2319.40");
  const [t, setT] = useState("502.15");
  const [d, setD] = useState("202.47");
  const [n, setN] = useState("1614.78");
  const vals = [num(g), num(t), num(d), num(n)];
  const r = vals.every((v) => v !== null) ? checkNetPay(vals[0]!, vals[1]!, vals[2]!, vals[3]!) : null;
  return (
    <Panel
      inputs={<>
        <Field label="Gross pay" prefix="$" value={g} onChange={setG} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Total taxes" prefix="$" value={t} onChange={setT} />
          <Field label="Total deductions" prefix="$" value={d} onChange={setD} />
        </div>
        <Field label="Net pay on the stub" prefix="$" value={n} onChange={setN} />
      </>}
      result={r ? <>
        <p className={`flex items-center gap-2 text-[17px] font-semibold ${r.ok ? "text-ok" : "text-bad"}`}>
          <span className={`flex size-6 items-center justify-center rounded-full text-white ${r.ok ? "bg-ok" : "bg-bad"}`}>{r.ok ? <Check className="size-3.5" strokeWidth={3} /> : <X className="size-3.5" strokeWidth={3} />}</span>
          {r.ok ? "Net pay adds up" : "Net pay doesn't add up"}
        </p>
        <Rows rows={[["Expected net pay", usd(r.expected)], ["Net pay on the stub", usd(vals[3]!)], ["Difference", usd(r.difference)], ...(r.takeHomeRate !== null ? [["Take-home rate", `${r.takeHomeRate}%`] as [string, string]] : [])]} />
        <p className="mt-4 text-[13px] text-muted">To check every line item, not just totals, <Link href="/sign-up" className="font-medium text-ink underline underline-offset-4">drop the stub into StubParse</Link>.</p>
      </> : <Empty text="Enter the four totals from your stub." />}
    />
  );
}
