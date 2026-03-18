import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { parsePaystubText } from "@/lib/regex-parser";

// Vercel: allow up to 60 s for OCR (requires Pro plan; Hobby cap is 10 s)
export const maxDuration = 60;

const ACCEPTED_TYPES = new Set([
  "application/pdf",
  "image/png", "image/jpeg", "image/jpg", "image/webp", "image/bmp", "image/tiff",
]);

async function extractPDFText(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
  return (await pdfParse(buffer)).text;
}

async function extractImageText(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Tesseract = require("tesseract.js") as typeof import("tesseract.js");
  const langPath = path.join(process.cwd(), "public");
  const { data } = await Tesseract.recognize(buffer, "eng", {
    logger: () => {},
    langPath,
    tessedit_pageseg_mode: Tesseract.PSM.SINGLE_COLUMN,
    tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
  } as Parameters<typeof Tesseract.recognize>[2]);
  return data.text;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("paystubs") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const results = await Promise.all(
      files.map(async (file) => {
        if (!ACCEPTED_TYPES.has(file.type)) {
          return { success: false, fileName: file.name, error: `Unsupported type: ${file.type}`, data: null, rawText: "" };
        }
        try {
          const buffer = Buffer.from(await file.arrayBuffer());
          const isPDF = file.type === "application/pdf";
          const text = isPDF ? await extractPDFText(buffer) : await extractImageText(buffer);
          return { success: true, fileName: file.name, fileType: isPDF ? "pdf" : "image", data: parsePaystubText(text, file.name), rawText: text };
        } catch (err) {
          return { success: false, fileName: file.name, error: err instanceof Error ? err.message : "Parse error", data: null, rawText: "" };
        }
      })
    );

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
