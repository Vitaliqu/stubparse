// Public pages and API guards. No accounts or secrets needed; runs on every CI build.

import { expect, test } from "@playwright/test";

test("landing page shows the offer and the sample demo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Paystubs in.");
  await expect(page.getByRole("button", { name: "Choose paystubs" })).toBeVisible();
  await expect(page.getByLabel("Sample paystub")).toBeVisible();
  await expect(page.getByRole("heading", { name: "It checks the math before you do." })).toBeVisible();
});

test("the interactive math demo reacts to edits", async ({ page }) => {
  await page.goto("/");
  const tips = page.getByRole("textbox", { name: "Tips" });
  await tips.fill("999.00");
  await expect(page.getByText("in line items vs $2,319.40 gross")).toBeVisible();
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByText("in line items vs $2,319.40 gross")).toHaveCount(0);
});

test("pricing toggles between monthly and yearly", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByText("$290", { exact: true })).toBeVisible();
  await page.getByRole("radio", { name: "Monthly" }).click();
  await expect(page.getByText("$29", { exact: true })).toBeVisible();
  await expect(page.getByText("$5", { exact: true })).toBeVisible();
});

test("sign-up offers every sign-in method", async ({ page }) => {
  await page.goto("/sign-up");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Apple" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Email me a sign-in link instead" })).toBeVisible();
});

test("signed-out visitors are sent to sign-in from the app, keeping the destination", async ({ page }) => {
  await page.goto("/app/history");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fapp%2Fhistory/);
});

test("SEO and docs pages render", async ({ page }) => {
  for (const [path, heading] of [
    ["/paystub-to-excel/adp", "Turn ADP paystubs into a spreadsheet"],
    ["/use-cases/income-verification", "Verify income from paystubs in minutes"],
    ["/docs/api", "API reference"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
  }
});

test("free calculators compute in the browser", async ({ page }) => {
  await page.goto("/tools/annual-income-calculator");
  await page.getByLabel("Pay per paycheck").fill("1000");
  await page.getByRole("radio", { name: "Weekly", exact: true }).click();
  await expect(page.getByText("$52,000")).toBeVisible();

  await page.goto("/tools/paystub-checker");
  await page.getByLabel("Net pay on the stub").fill("1700");
  await expect(page.getByText("Net pay doesn't add up")).toBeVisible();
});

test("glossary terms link to related terms and tools", async ({ page }) => {
  await page.goto("/glossary/year-to-date");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What is Year-to-date?");
  await page.getByRole("link", { name: "Annualized income" }).first().click();
  await expect(page).toHaveURL(/\/glossary\/annualized-income$/);
});

test("SEO plumbing: sitemap, robots, llms.txt", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect((sitemap.match(/<loc>/g) ?? []).length).toBeGreaterThan(60);
  expect(sitemap).toContain("/tools/paystub-checker");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /app");
  expect(robots).toContain("Sitemap:");
  const llms = await request.get("/llms.txt");
  expect(llms.headers()["content-type"]).toContain("text/plain");
  expect(await llms.text()).toContain("## Paystub glossary");
});

test("unknown pages return a branded 404", async ({ page }) => {
  const res = await page.goto("/definitely-not-here");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("isn't on the stub");
});

test("security headers are set and pages load without CSP violations", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (m) => { if (/Content Security Policy|Refused to (load|execute|connect|frame)/i.test(m.text())) violations.push(m.text()); });
  page.on("pageerror", (e) => { if (/Content Security Policy/i.test(e.message)) violations.push(e.message); });

  const res = await page.goto("/");
  const h = res!.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["content-security-policy"]).toContain("object-src 'none'");
  expect(h["strict-transport-security"]).toContain("max-age=");
  expect(h["x-content-type-options"]).toBe("nosniff");

  for (const path of ["/", "/pricing", "/sign-up", "/sign-in", "/docs/api", "/paystub-to-excel/gusto"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  expect(violations, violations.join("\n")).toEqual([]);
});

test("account APIs reject anonymous requests", async ({ request }) => {
  for (const [method, path] of [
    ["GET", "/api/account"], ["POST", "/api/usage/consume"], ["POST", "/api/ai-parse"], ["GET", "/api/keys"],
    ["GET", "/api/team"], ["POST", "/api/stripe/checkout"], ["GET", "/api/stripe/invoices"], ["DELETE", "/api/account"],
  ] as const) {
    const res = await request.fetch(path, { method });
    expect(res.status(), `${method} ${path}`).toBe(401);
  }
  const api = await request.post("/api/v1/parse", { data: { text: "x" } });
  expect(api.status()).toBe(401);
  expect((await api.json()).error.code).toBe("invalid_key");
  expect((await request.get("/api/admin/me")).ok()).toBe(true);
  expect((await (await request.get("/api/admin/me")).json()).admin).toBe(false);
  expect((await request.get("/api/cron/lifecycle")).status()).toBe(401);
  expect((await request.get("/api/cron/retention")).status()).toBe(401);
});
