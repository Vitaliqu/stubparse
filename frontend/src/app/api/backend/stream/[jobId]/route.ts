import { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL!;
const API_SECRET  = process.env.API_SECRET!;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const res = await fetch(`${BACKEND_URL}/stream/${jobId}`, {
    headers: { "X-API-Secret": API_SECRET, Accept: "text/event-stream" },
  });

  return new Response(res.body, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
