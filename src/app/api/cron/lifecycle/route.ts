import { NextResponse } from "next/server";
import { usersCol } from "@/lib/server/account";
import { emailConfigured, sendLifecycleEmail } from "@/lib/server/email";
import { reportError } from "@/lib/server/monitoring";
import { FREE_DOCUMENTS, tierOf, type AccountDoc } from "@/lib/plan";

export const runtime = "nodejs";
export const maxDuration = 60;

const DAY = 86_400_000;

/**
 * Daily lifecycle emails (Vercel Cron, see vercel.json):
 * - activation: signed up 1–7 days ago and hasn't parsed anything
 * - limit: on Free with one document left
 * Each email is sent at most once per account.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!emailConfigured()) return NextResponse.json({ skipped: "email not configured" });

  const now = Date.now();
  // Single-field range query: no composite index needed. Everything else is filtered here.
  const snap = await usersCol().where("createdAt", ">=", now - 30 * DAY).limit(2000).get();
  let sent = 0, failed = 0;

  for (const d of snap.docs) {
    const doc = d.data() as AccountDoc;
    if (!doc.email || doc.emailOptOut || tierOf(doc) !== "free") continue;
    const age = now - doc.createdAt;
    let kind: "activation" | "limit" | null = null;
    if (doc.docsUsed === 0 && age >= DAY && age <= 7 * DAY && !doc.emails?.activation) kind = "activation";
    else if (doc.docsUsed === FREE_DOCUMENTS - 1 && !doc.emails?.limit) kind = "limit";
    if (!kind) continue;
    try {
      if (await sendLifecycleEmail(d.id, doc.email, kind, doc)) sent++;
    } catch (err) {
      failed++;
      reportError(err, { where: "lifecycle-cron", kind });
    }
  }

  return NextResponse.json({ scanned: snap.size, sent, failed });
}
