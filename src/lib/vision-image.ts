// Client-side only — never import in server components or API routes.

interface VisionImage {
  data: string; // base64, no data: prefix
  mediaType: "image/jpeg";
}

/** Most pages sent for one stub, and the total base64 budget (keeps requests under the 4.5 MB platform limit). */
const MAX_VISION_PAGES = 5;
const BUDGET = 3_600_000;

// Progressively smaller renders until every page fits the budget together.
const STEPS = [
  { longSide: 2000, quality: 0.85 },
  { longSide: 1600, quality: 0.8 },
  { longSide: 1280, quality: 0.72 },
  { longSide: 1024, quality: 0.65 },
];

function encode(source: CanvasImageSource, width: number, height: number, longSide: number, quality: number): VisionImage {
  const scale = Math.min(1, longSide / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return { data: dataUrl.slice(dataUrl.indexOf(",") + 1), mediaType: "image/jpeg" };
}

async function renderPdfPages(file: File): Promise<HTMLCanvasElement[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer(), verbosity: 0 }).promise;
  const pages: HTMLCanvasElement[] = [];
  for (let p = 1; p <= Math.min(pdf.numPages, MAX_VISION_PAGES); p++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const page: any = await pdf.getPage(p);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: STEPS[0].longSide / Math.max(base.width, base.height) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    pages.push(canvas);
  }
  return pages;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Couldn't open this image.")); };
    img.src = url;
  });
}

/**
 * Downscaled JPEGs of the document for Claude vision: every page of a PDF (up to MAX_VISION_PAGES),
 * or the image itself. Sizes step down until the whole set fits the request budget.
 */
export async function toVisionImages(file: File): Promise<{ images: VisionImage[]; pageCount: number; truncated: boolean }> {
  let sources: { el: CanvasImageSource; w: number; h: number }[];
  let pageCount = 1;
  if (file.type === "application/pdf") {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    pageCount = (await pdfjs.getDocument({ data: await file.arrayBuffer(), verbosity: 0 }).promise).numPages;
    sources = (await renderPdfPages(file)).map((c) => ({ el: c, w: c.width, h: c.height }));
  } else {
    const img = await loadImage(file);
    sources = [{ el: img, w: img.naturalWidth, h: img.naturalHeight }];
  }

  for (const step of STEPS) {
    const images = sources.map((s) => encode(s.el, s.w, s.h, step.longSide, step.quality));
    if (images.reduce((n, i) => n + i.data.length, 0) <= BUDGET) {
      return { images, pageCount, truncated: pageCount > sources.length };
    }
  }
  // Still too big at the smallest step: send as many pages as fit.
  const last = STEPS[STEPS.length - 1];
  const images: VisionImage[] = [];
  let total = 0;
  for (const s of sources) {
    const img = encode(s.el, s.w, s.h, last.longSide, last.quality);
    if (total + img.data.length > BUDGET) break;
    images.push(img);
    total += img.data.length;
  }
  if (!images.length) throw new Error("This page is too detailed to send. Try a smaller scan or a PDF with selectable text.");
  return { images, pageCount, truncated: images.length < pageCount };
}
