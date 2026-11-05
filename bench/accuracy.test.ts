// Field-level accuracy benchmark.
//
//   npm run bench                 Basic mode (rules) on every fixture
//   BENCH_AI=1 npm run bench      also AI mode (needs ANTHROPIC_API_KEY; costs a few cents)
//
// Fixtures: bench/fixtures/<name>.txt (extracted text) + <name>.expected.json (ground truth).
// Put real, anonymized stubs in bench/fixtures/private/ — that folder is gitignored.

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parsePaystubText } from "@/lib/regex-parser";
import { toNumber } from "@/lib/reconcile";
import type { PaystubData } from "@/types/paystub";

interface Expected {
  name?: string;
  payPeriodStart?: string;
  payPeriodEnd?: string;
  checkDate?: string;
  grossPay?: string;
  netPay?: string;
  fields?: Record<string, string>;
}

const ROOT = join(__dirname, "fixtures");
const dirs = [ROOT, join(ROOT, "private")].filter(existsSync);
const fixtures = dirs.flatMap((dir) =>
  readdirSync(dir)
    .filter((f) => f.endsWith(".txt") && existsSync(join(dir, f.replace(/\.txt$/, ".expected.json"))))
    .map((f) => ({
      name: f.replace(/\.txt$/, ""),
      text: readFileSync(join(dir, f), "utf8"),
      expected: JSON.parse(readFileSync(join(dir, f.replace(/\.txt$/, ".expected.json")), "utf8")) as Expected,
    })),
);

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
const sameMoney = (a: string | undefined, b: string) => {
  const x = toNumber(a), y = toNumber(b);
  return x !== null && y !== null && Math.abs(Math.abs(x) - Math.abs(y)) < 0.005;
};

/** Returns [correct, total, misses] for one parsed stub against its ground truth. */
function score(got: PaystubData, exp: Expected): [number, number, string[]] {
  let ok = 0, total = 0;
  const misses: string[] = [];
  const check = (label: string, pass: boolean, gotValue: string | undefined, want: string) => {
    total++;
    if (pass) ok++;
    else misses.push(`${label}: got "${gotValue ?? ""}", want "${want}"`);
  };
  if (exp.name) check("name", norm(got.name) === norm(exp.name), got.name, exp.name);
  for (const k of ["payPeriodStart", "payPeriodEnd", "checkDate"] as const) {
    if (exp[k]) check(k, got[k] === exp[k], got[k], exp[k]!);
  }
  if (exp.grossPay) check("grossPay", sameMoney(got.grossPay, exp.grossPay), got.grossPay, exp.grossPay);
  if (exp.netPay) check("netPay", sameMoney(got.netPay, exp.netPay), got.netPay, exp.netPay);
  for (const [label, value] of Object.entries(exp.fields ?? {})) {
    const f = got.fields.find((x) => norm(x.label) === norm(label)) ?? got.fields.find((x) => norm(x.label).includes(norm(label)));
    check(`field "${label}"`, !!f && sameMoney(f.value, value), f?.value, value);
  }
  return [ok, total, misses];
}

function report(mode: string, rows: { name: string; ok: number; total: number; misses: string[] }[]) {
  const ok = rows.reduce((a, r) => a + r.ok, 0), total = rows.reduce((a, r) => a + r.total, 0);
  const lines = rows.map((r) => `  ${r.name.padEnd(28)} ${String(r.ok).padStart(3)}/${String(r.total).padEnd(3)} ${((r.ok / r.total) * 100).toFixed(0).padStart(4)}%${r.misses.length ? `\n      ${r.misses.join("\n      ")}` : ""}`);
  console.log(`\n${mode} accuracy: ${ok}/${total} fields (${((ok / Math.max(total, 1)) * 100).toFixed(1)}%)\n${lines.join("\n")}\n`);
  return ok / Math.max(total, 1);
}

describe("accuracy benchmark", () => {
  it("has fixtures", () => expect(fixtures.length).toBeGreaterThan(0));

  it("Basic mode", () => {
    const rows = fixtures.map((fx) => {
      const [ok, total, misses] = score(parsePaystubText(fx.text, `${fx.name}.pdf`), fx.expected);
      return { name: fx.name, ok, total, misses };
    });
    const acc = report("Basic mode", rows);
    expect(acc).toBeGreaterThanOrEqual(0); // reported, not gated; track the number over time
  });

  it.runIf(process.env.BENCH_AI === "1" && !!process.env.ANTHROPIC_API_KEY)("AI mode", async () => {
    const { extractPaystub } = await import("@/lib/ai-extractor");
    const { mapBackendResult } = await import("@/lib/parse-client");
    const rows = [];
    for (const fx of fixtures) {
      const raw = await extractPaystub({ text: fx.text });
      const [ok, total, misses] = score(mapBackendResult(raw, `${fx.name}.pdf`), fx.expected);
      rows.push({ name: fx.name, ok, total, misses });
    }
    report("AI mode", rows);
  }, 120_000);
});
