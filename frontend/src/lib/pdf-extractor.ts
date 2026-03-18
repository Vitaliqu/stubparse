// Client-side only — never import in server components or API routes.

type PdfProgress = (msg: string) => void;

async function getLoadedPdf(file: File, pdfjs: typeof import("pdfjs-dist")) {
  const arrayBuffer = await file.arrayBuffer();
  return pdfjs.getDocument({ data: arrayBuffer, verbosity: 0 }).promise;
}

async function extractPageText(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any
): Promise<string> {
  const content = await page.getTextContent();
  let lastY: number | null = null;
  const lines: string[] = [];
  let current = "";

  for (const item of content.items) {
    if (!("str" in item)) continue;
    const y = (item as { transform: number[] }).transform[5];
    if (lastY !== null && Math.abs(y - lastY) > 2) {
      if (current.trim()) lines.push(current.trim());
      current = item.str;
    } else {
      current +=
        (current && !current.endsWith(" ") && item.str && !item.str.startsWith(" ") ? " " : "") +
        item.str;
    }
    lastY = y;
  }
  if (current.trim()) lines.push(current.trim());
  return lines.join("\n");
}

/** Renders a PDF page to a high-resolution Blob for Tesseract. */
async function renderPageToBlob(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  scale = 3.5
): Promise<Blob> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width  = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);

  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport }).promise;

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("canvas.toBlob failed"))),
      "image/png"
    )
  );
}

/** Runs Tesseract on a PDF canvas Blob. */
async function ocrBlob(blob: Blob, onProgress?: PdfProgress): Promise<string> {
  const { extractPdfPageText } = await import("@/lib/image-ocr");
  return extractPdfPageText(blob, onProgress);
}

/** Returns true if text has enough digits to be usable without OCR fallback. */
function textHasEnoughNumbers(text: string): boolean {
  const nonWs = text.replace(/\s/g, "");
  if (nonWs.length < 20) return false;
  const digits = (text.match(/\d/g) ?? []).length;
  return digits / nonWs.length >= 0.04; // ≥4 % digits → looks like real paystub data
}

/** Renders page 1 of a PDF to a JPEG blob URL for preview. Caller must revoke. */
export async function generatePdfPreview(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer, verbosity: 0 }).promise;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const page: any = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement("canvas");
  canvas.width  = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(URL.createObjectURL(b)) : reject(new Error("Preview failed"))),
      "image/jpeg",
      0.85
    )
  );
}

export async function extractPdfText(
  file: File,
  onProgress?: PdfProgress
): Promise<string> {
  onProgress?.("Loading PDF engine…");

  const pdfjs = await import("pdfjs-dist");
  // Worker served locally — no CDN dependency
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  onProgress?.("Parsing PDF…");
  const pdf = await getLoadedPdf(file, pdfjs);

  const pageTexts: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const label = pdf.numPages > 1 ? `page ${p}/${pdf.numPages}` : "";

    onProgress?.(label ? `Reading ${label}…` : "Extracting text…");
    const page = await pdf.getPage(p);
    const text = await extractPageText(page);

    if (textHasEnoughNumbers(text)) {
      // Fast path: text layer is usable
      pageTexts.push(text);
    } else {
      // Fallback: render page image → OCR (handles Gusto / custom-font PDFs)
      onProgress?.(label ? `OCR fallback for ${label}…` : "Rendering page for OCR…");
      const blob = await renderPageToBlob(page, 3.5);
      const ocrText = await ocrBlob(blob, onProgress);
      pageTexts.push(ocrText);
    }
  }

  return pageTexts.join("\n");
}
