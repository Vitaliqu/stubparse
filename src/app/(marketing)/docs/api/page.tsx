import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "API reference",
  alternates: { canonical: "/docs/api" },
  description: "Parse paystub PDFs and images into structured JSON with the StubParse REST API.",
};

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://stubparse.com";

export default function ApiDocs() {
  return (
    <article className="mx-auto max-w-[760px] px-4 py-20 sm:px-6 sm:py-24">
      <h1 className="text-[clamp(2.5rem,6vw,3.75rem)] leading-[1.02] font-semibold tracking-[-0.035em]">API reference</h1>
      <p className="mt-5 text-[19px] leading-[1.55] text-muted">
        One endpoint turns a paystub into structured JSON, with the math checks and integrity signals attached. Available on the{" "}
        <Link href="/pricing" className="text-ink underline underline-offset-4">Business plan</Link>.
      </p>

      <Section title="Authentication">
        <p>Create a key in <Link href="/app/account" className="underline underline-offset-4">Account → API keys</Link>. It&apos;s shown once, so store it somewhere safe. Send it as a bearer token:</p>
        <Code>{`Authorization: Bearer sp_live_...`}</Code>
        <p>Keep keys on your server. Anyone with a key can parse documents on your account.</p>
      </Section>

      <Section title="Parse a document">
        <p><Mono>POST {BASE}/api/v1/parse</Mono></p>
        <p>Upload a file as multipart form data:</p>
        <Code>{`curl ${BASE}/api/v1/parse \\
  -H "Authorization: Bearer $STUBPARSE_KEY" \\
  -F "file=@paystub.pdf"`}</Code>
        <p>Or send JSON with base64 content. Use exactly one of <Mono>pdf</Mono>, <Mono>image</Mono>, or <Mono>text</Mono>:</p>
        <Code>{`curl ${BASE}/api/v1/parse \\
  -H "Authorization: Bearer $STUBPARSE_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "fileName": "maya-oct.pdf", "pdf": "'"$(base64 -i paystub.pdf)"'" }'`}</Code>
        <ul>
          <li><Mono>pdf</Mono>: base64-encoded PDF</li>
          <li><Mono>image</Mono>: <Mono>{`{ "data": "<base64>", "mediaType": "image/png" | "image/jpeg" | "image/webp" }`}</Mono></li>
          <li><Mono>text</Mono>: text you&apos;ve already extracted</li>
        </ul>
        <p>Keep files under 3 MB. Requests over the platform limit of 4.5 MB are rejected before they reach the API, with HTTP 413 and no JSON body. Each successful call uses one document from your plan; failed calls don&apos;t.</p>
      </Section>

      <Section title="Response">
        <Code>{`{
  "object": "paystub",
  "file_name": "maya-oct.pdf",
  "data": {
    "name": "Maya Okafor",
    "payPeriodStart": "2026-10-01",
    "payPeriodEnd": "2026-10-15",
    "checkDate": "2026-10-20",
    "grossPay": "2319.40",
    "netPay": "1614.78",
    "fields": [
      { "section": "Earnings", "label": "Regular", "value": "1960.00", "ytd": "39200.00" },
      { "section": "Taxes", "label": "Federal Income Tax", "value": "231.94", "ytd": "4544.12" }
    ]
  },
  "checks": [
    { "id": "earnings", "status": "pass", "detail": "$2,319.40 = $2,319.40" },
    { "id": "net", "status": "pass", "detail": "$1,614.78 = $1,614.78" },
    { "id": "ytd", "status": "pass", "detail": "11 lines consistent" }
  ],
  "integrity": { "risk": "low", "signals": [] },
  "extracted": { "employee": { ... }, "employer": { ... }, "totals": { ... } },
  "usage": { "documents_used": 128 }
}`}</Code>
        <p>Amounts are strings without currency symbols or thousands separators. <Mono>extracted</Mono> holds the full structured extraction, including employer details.</p>
      </Section>

      <Section title="Errors">
        <p>Errors return a JSON body of the form <Mono>{`{ "error": { "code", "message" } }`}</Mono>.</p>
        <table className="tnum w-full border-collapse text-[14px]">
          <tbody className="divide-y divide-line">
            {[
              ["401", "invalid_key", "Missing, malformed, or revoked key"],
              ["403", "upgrade_required", "The account isn't on Business"],
              ["413", "too_large", "Over the size limit"],
              ["415", "unsupported_type", "File type not supported"],
              ["422", "not_a_paystub", "The document doesn't look like a paystub"],
              ["429", "rate_limited · fair_use", "Over 60 requests a minute, or the monthly fair-use limit"],
              ["502 / 503", "extraction_failed · busy", "Retry with backoff"],
            ].map(([s, c, d]) => (
              <tr key={c}><td className="py-2 pr-4 font-mono">{s}</td><td className="py-2 pr-4 font-mono text-[13px]">{c}</td><td className="py-2 text-muted">{d}</td></tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Limits">
        <ul>
          <li>60 requests per minute per account. A <Mono>Retry-After</Mono> header tells you when to try again.</li>
          <li>Business includes up to 10,000 documents a month for normal use. Contact us for more.</li>
          <li>Documents sent to the API are processed and discarded. Nothing is stored.</li>
        </ul>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="text-[24px] font-semibold tracking-[-0.025em]">{title}</h2>
      <div className="mt-4 space-y-4 text-[16px] leading-[1.7] text-ink-2 [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">{children}</div>
    </section>
  );
}

function Code({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-[14px] bg-ink p-5 font-mono text-[13px] leading-relaxed text-white/90"><code>{children}</code></pre>;
}

function Mono({ children }: { children: React.ReactNode }) {
  return <code className="rounded-md bg-canvas px-1.5 py-0.5 font-mono text-[13.5px] text-ink">{children}</code>;
}
