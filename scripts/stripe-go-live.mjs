// Sets up Stripe live mode to mirror the test-mode catalog: products, prices, billing portal, webhook.
// Idempotent: prices are found by lookup_key and the webhook by URL, so re-running creates nothing twice.
//   1. Put STRIPE_LIVE_SECRET_KEY=sk_live_... in .env.live (git-ignored).
//   2. node scripts/stripe-go-live.mjs
// Writes the live env values to .env.live. Copy them into Vercel's Production environment.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import Stripe from "stripe";

const ENV_FILE = ".env.live";
const env = {};
if (existsSync(ENV_FILE)) {
  for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
const key = process.env.STRIPE_LIVE_SECRET_KEY || env.STRIPE_LIVE_SECRET_KEY;
if (!key?.startsWith("sk_live_") && !key?.startsWith("rk_live_")) {
  console.error(`Set STRIPE_LIVE_SECRET_KEY=sk_live_... in ${ENV_FILE}. Refusing to run with a non-live key.`);
  process.exit(1);
}

const ORIGIN = "https://stubparse.com";
const stripe = new Stripe(key);

const CATALOG = [
  {
    name: "StubParse Pro",
    description: "Unlimited paystub documents, saved history, and labels.",
    tier: "pro",
    prices: [
      { env: "STRIPE_PRICE_PRO_MONTHLY", lookup: "stubparse_pro_monthly", amount: 500, interval: "month" },
      { env: "STRIPE_PRICE_PRO_YEARLY", lookup: "stubparse_pro_yearly", amount: 5000, interval: "year" },
    ],
  },
  {
    name: "StubParse Business",
    description: "Income reports, integrity checks, and API access.",
    tier: "business",
    prices: [
      { env: "STRIPE_PRICE_BUSINESS_MONTHLY", lookup: "stubparse_business_monthly", amount: 2900, interval: "month" },
      { env: "STRIPE_PRICE_BUSINESS_YEARLY", lookup: "stubparse_business_yearly", amount: 29000, interval: "year" },
    ],
  },
];
const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

const out = {};
const portalProducts = [];

for (const product of CATALOG) {
  const lookups = product.prices.map((p) => p.lookup);
  const existing = (await stripe.prices.list({ lookup_keys: lookups, active: true, expand: ["data.product"] })).data;
  let productId = existing[0]?.product?.id;
  if (!productId) {
    productId = (await stripe.products.create({ name: product.name, description: product.description, metadata: { tier: product.tier } })).id;
    console.log(`created product ${product.name} ${productId}`);
  }
  const ids = [];
  for (const p of product.prices) {
    let price = existing.find((e) => e.lookup_key === p.lookup);
    if (!price) {
      price = await stripe.prices.create({
        product: productId, currency: "usd", unit_amount: p.amount, recurring: { interval: p.interval },
        lookup_key: p.lookup, metadata: { tier: product.tier },
      });
      console.log(`created price ${p.lookup} ${price.id}`);
    }
    out[p.env] = price.id;
    ids.push(price.id);
  }
  portalProducts.push({ product: productId, prices: ids });
}
out.STRIPE_PRICE_ID = out.STRIPE_PRICE_PRO_MONTHLY;

const portalParams = {
  business_profile: { headline: "Manage your StubParse plan", privacy_policy_url: `${ORIGIN}/privacy`, terms_of_service_url: `${ORIGIN}/terms` },
  features: {
    customer_update: { enabled: true, allowed_updates: ["email", "address"] },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: { enabled: true, mode: "at_period_end", proration_behavior: "none" },
    subscription_update: { enabled: true, default_allowed_updates: ["price"], proration_behavior: "create_prorations", products: portalProducts },
  },
  metadata: { app: "stubparse" },
};
const portals = (await stripe.billingPortal.configurations.list({ limit: 100 })).data;
const portal = portals.find((c) => c.metadata?.app === "stubparse");
out.STRIPE_PORTAL_CONFIGURATION = portal
  ? (await stripe.billingPortal.configurations.update(portal.id, portalParams)).id
  : (await stripe.billingPortal.configurations.create(portalParams)).id;
console.log(`portal configuration ${out.STRIPE_PORTAL_CONFIGURATION}`);

const url = `${ORIGIN}/api/stripe/webhook`;
const hooks = (await stripe.webhookEndpoints.list({ limit: 100 })).data;
const hook = hooks.find((h) => h.url === url);
if (hook) {
  await stripe.webhookEndpoints.update(hook.id, { enabled_events: WEBHOOK_EVENTS, disabled: false });
  console.log(`webhook ${hook.id} already exists; its signing secret is only shown once, so keep the one in ${ENV_FILE}`);
  if (env.STRIPE_WEBHOOK_SECRET) out.STRIPE_WEBHOOK_SECRET = env.STRIPE_WEBHOOK_SECRET;
} else {
  const created = await stripe.webhookEndpoints.create({ url, enabled_events: WEBHOOK_EVENTS, description: "StubParse subscription sync" });
  out.STRIPE_WEBHOOK_SECRET = created.secret;
  console.log(`created webhook ${created.id}`);
}

const merged = { ...env, ...out };
writeFileSync(ENV_FILE, Object.entries(merged).map(([k, v]) => `${k}=${v}`).join("\n") + "\n", { mode: 0o600 });
console.log(`\nWrote ${Object.keys(out).length} live values to ${ENV_FILE}. Set them, plus STRIPE_SECRET_KEY=<live key>, in Vercel Production.`);
