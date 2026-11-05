// Lifecycle email via Resend. A no-op until RESEND_API_KEY and EMAIL_FROM are set.

import { createHmac, timingSafeEqual } from "crypto";
import { Resend } from "resend";
import { usersCol } from "@/lib/server/account";
import { FREE_DOCUMENTS, TIERS, type AccountDoc } from "@/lib/plan";

type LifecycleEmail = "welcome" | "activation" | "limit";

const BASE = (process.env.NEXT_PUBLIC_BASE_URL || "https://stubparse.com").replace(/\/$/, "");
let client: Resend | null = null;

/** Marketing email needs a sender and a dedicated secret for signing unsubscribe links. */
export const emailConfigured = () =>
  !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && (process.env.EMAIL_UNSUBSCRIBE_SECRET?.length ?? 0) >= 32);

function secret(): string {
  const s = process.env.EMAIL_UNSUBSCRIBE_SECRET;
  if (!s || s.length < 32) throw new Error("EMAIL_UNSUBSCRIBE_SECRET must be set to a random string of at least 32 characters.");
  return s;
}

export function unsubscribeToken(uid: string) {
  return createHmac("sha256", secret()).update(`unsub:${uid}`).digest("base64url");
}

export function verifyUnsubscribeToken(uid: string, token: string) {
  if ((process.env.EMAIL_UNSUBSCRIBE_SECRET?.length ?? 0) < 32) return false;
  const expected = Buffer.from(unsubscribeToken(uid));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

const unsubscribeUrl = (uid: string) => `${BASE}/api/email/unsubscribe?u=${encodeURIComponent(uid)}&t=${unsubscribeToken(uid)}`;

interface Content { subject: string; heading: string; body: string[]; cta: { label: string; href: string } }

const CONTENT: Record<LifecycleEmail, Content> = {
  welcome: {
    subject: "Your first three paystubs are on us",
    heading: "Welcome to StubParse",
    body: [
      `Drop a paystub PDF or photo into your workspace and you'll have every line item, with the math checked, in under a minute. Your first ${FREE_DOCUMENTS} documents are free.`,
      "Files are read in your browser and never stored.",
    ],
    cta: { label: "Open your workspace", href: `${BASE}/app` },
  },
  activation: {
    subject: "Parse your first paystub in a minute",
    heading: "You haven't parsed a stub yet",
    body: [
      "Drag a paystub PDF or a photo of one into your workspace. StubParse pulls out the earnings, taxes, deductions, and year-to-date figures, and checks that they add up.",
      "Then export to Excel, CSV, or JSON.",
    ],
    cta: { label: "Parse a paystub", href: `${BASE}/app` },
  },
  limit: {
    subject: "One free document left",
    heading: "You're almost through your free documents",
    body: [
      `Pro is $${TIERS.pro.monthly} a month for unlimited documents and saved history. Business adds income reports, integrity checks, and API access.`,
      "Whatever you've already parsed stays yours to edit and export.",
    ],
    cta: { label: "See plans", href: `${BASE}/pricing` },
  },
};

function render(c: Content, uid: string) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const html = `<!doctype html><html><body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0b0b0c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:16px;border:1px solid #e5e5ea"><tr><td style="padding:36px 32px">
<p style="margin:0 0 24px;font-size:15px;font-weight:600;letter-spacing:-0.02em">StubParse</p>
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;letter-spacing:-0.03em">${esc(c.heading)}</h1>
${c.body.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#1d1d1f">${esc(p)}</p>`).join("")}
<p style="margin:24px 0 0"><a href="${c.cta.href}" style="display:inline-block;background:#0b0b0c;color:#fff;text-decoration:none;font-size:15px;font-weight:500;padding:12px 20px;border-radius:10px">${esc(c.cta.label)}</a></p>
</td></tr></table>
<p style="margin:20px 0 0;font-size:12px;color:#6e6e73">You're getting this because you have a StubParse account. <a href="${unsubscribeUrl(uid)}" style="color:#6e6e73">Unsubscribe</a></p>
</td></tr></table></body></html>`;
  const text = `${c.heading}\n\n${c.body.join("\n\n")}\n\n${c.cta.label}: ${c.cta.href}\n\nUnsubscribe: ${unsubscribeUrl(uid)}`;
  return { html, text };
}

/** Sends one lifecycle email at most once per account; respects opt-out. Returns whether it sent. */
export async function sendLifecycleEmail(uid: string, to: string, kind: LifecycleEmail, doc?: AccountDoc): Promise<boolean> {
  if (!emailConfigured()) return false;
  const ref = usersCol().doc(uid);
  const account = doc ?? ((await ref.get()).data() as AccountDoc | undefined);
  if (!account || account.emailOptOut || account.emails?.[kind]) return false;

  client ??= new Resend(process.env.RESEND_API_KEY);
  const { html, text } = render(CONTENT[kind], uid);
  const { error } = await client.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: CONTENT[kind].subject,
    html,
    text,
    headers: { "List-Unsubscribe": `<${unsubscribeUrl(uid)}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  });
  if (error) throw new Error(`Resend: ${error.message}`);
  await ref.set({ emails: { [kind]: Date.now() } }, { merge: true });
  return true;
}

/** Team invite email. Transactional, so it ignores marketing opt-out. Returns false when email isn't configured. */
export async function sendInviteEmail(to: string, teamName: string, inviter: string | null, link: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return false;
  client ??= new Resend(process.env.RESEND_API_KEY);
  const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const who = inviter ? esc(inviter) : "A teammate";
  const html = `<!doctype html><html><body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0b0b0c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:16px;border:1px solid #e5e5ea"><tr><td style="padding:36px 32px">
<p style="margin:0 0 24px;font-size:15px;font-weight:600;letter-spacing:-0.02em">StubParse</p>
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;letter-spacing:-0.03em">Join ${esc(teamName)} on StubParse</h1>
<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#1d1d1f">${who} invited you to their team. You'll get the Business plan and the team's shared history of parsed paystubs.</p>
<p style="margin:24px 0 0"><a href="${link}" style="display:inline-block;background:#0b0b0c;color:#fff;text-decoration:none;font-size:15px;font-weight:500;padding:12px 20px;border-radius:10px">Accept invite</a></p>
<p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#6e6e73">Sign in with ${esc(to)} to accept. The invite expires in 14 days.</p>
</td></tr></table></td></tr></table></body></html>`;
  const { error } = await client.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: `Join ${teamName} on StubParse`,
    html,
    text: `${inviter ?? "A teammate"} invited you to ${teamName} on StubParse.\n\nAccept: ${link}\n\nSign in with ${to}. The invite expires in 14 days.`,
  });
  if (error) throw new Error(`Resend: ${error.message}`);
  return true;
}
