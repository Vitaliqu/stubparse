import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL!;
const API_SECRET  = process.env.API_SECRET!;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const res = await fetch(`${BACKEND_URL}/jobs`, {
    method: "POST",
    headers: { "X-API-Secret": API_SECRET },
    body: form,
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
