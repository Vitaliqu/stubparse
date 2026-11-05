import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { reportError } from "@/lib/server/monitoring";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Daily cleanup (Vercel Cron, see vercel.json): deletes saved stubs whose retention window has passed,
 * in personal (users/{uid}/documents) and team (teams/{id}/documents) history alike.
 * If the Firestore TTL policy on `expiresAt` is enabled, Firestore deletes them too; this job is the
 * guarantee that works without it. Needs the collection-group index in firestore.indexes.json.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  let deleted = 0;
  try {
    // Work in pages until done or close to the time limit.
    while (Date.now() - started < 45_000) {
      const snap = await adminDb()
        .collectionGroup("documents")
        .where("expiresAt", "<=", Timestamp.now())
        .limit(400)
        .get();
      if (snap.empty) break;
      const batch = adminDb().batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      deleted += snap.size;
      if (snap.size < 400) break;
    }
  } catch (err) {
    reportError(err, { where: "retention-cron" });
    return NextResponse.json({ error: "Cleanup failed", deleted }, { status: 500 });
  }
  return NextResponse.json({ deleted });
}
