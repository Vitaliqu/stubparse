// The money path: sign in → parse → free count drops → pay with a Stripe test card → Pro.
//
// Runs only when E2E_JOURNEY=1, against a Firebase project and Stripe *test mode* (it refuses live keys).
// Use a separate Firebase project for tests if you can; the test creates and then deletes its own user.
// Needs: FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY, STRIPE_SECRET_KEY (sk_test_),
// STRIPE_PRICE_PRO_MONTHLY, and a webhook or the built-in sync (the app calls /api/stripe/sync on return).

import { expect, test } from "@playwright/test";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import Stripe from "stripe";
import path from "node:path";

const enabled = process.env.E2E_JOURNEY === "1";
test.skip(!enabled, "Set E2E_JOURNEY=1 with Firebase and Stripe test credentials to run the checkout journey.");

const email = `e2e+${Date.now()}@stubparse.test`;
const password = `E2e-${Math.random().toString(36).slice(2)}-pw`;
let uid = "";

function admin() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      }),
    });
  }
  return { auth: getAuth(), db: getFirestore() };
}

test.beforeAll(async () => {
  if (!enabled) return;
  if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) throw new Error("Refusing to run the journey without a Stripe test key (sk_test_...).");
  uid = (await admin().auth.createUser({ email, password, emailVerified: true })).uid;
});

test.afterAll(async () => {
  if (!enabled || !uid) return;
  const { auth, db } = admin();
  const account = (await db.collection("users").doc(uid).get()).data();
  if (account?.stripeCustomerId) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const subs = await stripe.subscriptions.list({ customer: account.stripeCustomerId, status: "all" });
    await Promise.all(subs.data.filter((s) => s.status !== "canceled").map((s) => stripe.subscriptions.cancel(s.id)));
    await stripe.customers.del(account.stripeCustomerId).catch(() => {});
  }
  await db.recursiveDelete(db.collection("users").doc(uid));
  await auth.deleteUser(uid).catch(() => {});
});

test("sign in, parse a stub, upgrade to Pro", async ({ page }) => {
  test.setTimeout(180_000);

  // Sign in
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByText("3 of 3 free documents left")).toBeVisible();

  // Parse the sample stub in Basic mode
  await page.getByRole("radio", { name: "Basic" }).click();
  await page.setInputFiles('input[type="file"]', path.join(__dirname, "fixtures", "sample-stub.pdf"));
  await page.getByRole("button", { name: /^Parse 1 file/ }).click();
  await expect(page.getByRole("heading", { name: /Results/ })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Earnings add up to gross")).toBeVisible();
  await expect(page.getByText("2 of 3 free documents left")).toBeVisible();

  // Upgrade with a Stripe test card
  await page.goto("/app/account");
  await page.getByRole("radio", { name: "Monthly" }).click();
  await page.getByRole("button", { name: "Choose Pro" }).click();
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 });
  await page.locator("#cardNumber").fill("4242 4242 4242 4242");
  await page.locator("#cardExpiry").fill("12 / 34");
  await page.locator("#cardCvc").fill("123");
  const name = page.locator("#billingName");
  if (await name.isVisible().catch(() => false)) await name.fill("E2E Test");
  const zip = page.locator("#billingPostalCode");
  if (await zip.isVisible().catch(() => false)) await zip.fill("94107");
  await page.getByTestId("hosted-payment-submit-button").click();

  // Back in the app: the plan flips to Pro (sync on return; webhook not required)
  await page.waitForURL(/\/app(\?|$)/, { timeout: 90_000 });
  await expect(page.getByRole("link", { name: "pro", exact: true })).toBeVisible({ timeout: 30_000 });
});
