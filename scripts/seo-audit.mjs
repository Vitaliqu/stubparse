// SEO crawler: checks every sitemap URL the way a search engine would.
//   node scripts/seo-audit.mjs http://localhost:3000
// Fails (exit 1) on: non-200 pages, missing/duplicate titles or descriptions, wrong canonicals,
// zero or multiple H1s, invalid JSON-LD, or internal links that don't resolve.

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const siteUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://stubparse.com").replace(/\/$/, "");

const xml = await (await fetch(`${base}/sitemap.xml`)).text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(siteUrl, base));
const problems = [];
const titles = new Map(), descriptions = new Map();
const links = new Set();
let schemaBlocks = 0;

const attr = (html, re) => (html.match(re) ?? [])[1]?.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"');

for (const url of urls) {
  const res = await fetch(url, { redirect: "manual" });
  const path = url.replace(base, "") || "/";
  if (res.status !== 200) { problems.push(`${path}: HTTP ${res.status}`); continue; }
  const html = await res.text();

  const title = attr(html, /<title>([^<]*)<\/title>/);
  const desc = attr(html, /<meta name="description" content="([^"]*)"/);
  const canonical = attr(html, /<link rel="canonical" href="([^"]*)"/);
  const h1s = (html.match(/<h1[\s>]/g) ?? []).length;

  if (!title) problems.push(`${path}: missing <title>`);
  else (titles.get(title) ?? titles.set(title, []).get(title)).push(path);
  if (!desc) problems.push(`${path}: missing meta description`);
  else (descriptions.get(desc) ?? descriptions.set(desc, []).get(desc)).push(path);
  if (title && title.length > 70) problems.push(`${path}: title ${title.length} chars`);
  if (!canonical) problems.push(`${path}: missing canonical`);
  else if (canonical.replace(siteUrl, "").replace(/\/$/, "") !== path.replace(/\/$/, "")) problems.push(`${path}: canonical points to ${canonical}`);
  if (h1s !== 1) problems.push(`${path}: ${h1s} <h1> elements`);
  if (!/<meta property="og:image"/.test(html)) problems.push(`${path}: missing og:image`);

  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); schemaBlocks++; } catch { problems.push(`${path}: invalid JSON-LD`); }
  }
  for (const m of html.matchAll(/href="(\/[^"#?]*)/g)) links.add(m[1]);
}

for (const [t, paths] of titles) if (paths.length > 1) problems.push(`duplicate title "${t}": ${paths.join(", ")}`);
for (const [, paths] of descriptions) if (paths.length > 1) problems.push(`duplicate description on ${paths.join(", ")}`);

const skip = (p) => p.startsWith("/_next") || p.startsWith("/app") || p.startsWith("/api") || /\.(png|svg|ico|mjs|js|css|txt|xml)$/.test(p);
for (const link of [...links].filter((l) => !skip(l))) {
  const res = await fetch(`${base}${link}`, { redirect: "manual" });
  if (res.status !== 200) problems.push(`broken internal link ${link}: HTTP ${res.status}`);
}

console.log(`Crawled ${urls.length} sitemap URLs, ${links.size} internal links, ${schemaBlocks} JSON-LD blocks.`);
if (problems.length) {
  console.log(`${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log("No problems found.");
