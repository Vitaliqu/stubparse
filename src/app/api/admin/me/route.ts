import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/admin";

export const runtime = "nodejs";

/** Whether the signed-in user is an admin (used to show the Admin link). */
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    return NextResponse.json({ admin: true });
  } catch {
    return NextResponse.json({ admin: false });
  }
}
