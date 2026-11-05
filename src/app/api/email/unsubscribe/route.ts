import { NextResponse } from "next/server";
import { usersCol } from "@/lib/server/account";
import { verifyUnsubscribeToken } from "@/lib/server/email";

export const runtime = "nodejs";

async function unsubscribe(req: Request) {
  const url = new URL(req.url);
  const uid = url.searchParams.get("u") ?? "";
  const token = url.searchParams.get("t") ?? "";
  if (!uid || !verifyUnsubscribeToken(uid, token)) return null;
  await usersCol().doc(uid).set({ emailOptOut: true }, { merge: true });
  return uid;
}

/** Link in the email footer. */
export async function GET(req: Request) {
  const ok = await unsubscribe(req).catch(() => null);
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>StubParse</title></head>
<body style="margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0b0b0c">
<div style="max-width:420px;padding:32px;background:#fff;border:1px solid #e5e5ea;border-radius:16px;text-align:center">
<h1 style="margin:0 0 10px;font-size:24px;letter-spacing:-0.02em">${ok ? "You're unsubscribed" : "This link didn't work"}</h1>
<p style="margin:0;font-size:15px;line-height:1.6;color:#6e6e73">${ok ? "You won't get product emails from StubParse. Receipts and security emails still arrive." : "It may be incomplete. Reply to any email from us and we'll take you off the list."}</p>
<p style="margin:20px 0 0"><a href="/" style="color:#0b0b0c;font-size:14px">Back to StubParse</a></p></div></body></html>`;
  return new NextResponse(html, { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

/** One-click unsubscribe (RFC 8058) from mail clients. */
export async function POST(req: Request) {
  const ok = await unsubscribe(req).catch(() => null);
  return NextResponse.json({ unsubscribed: !!ok }, { status: ok ? 200 : 400 });
}
