// Client-side only — never import in server components or API routes.

export type OcrProgress = (msg: string) => void;

function medianFilter(gray: Uint8Array<ArrayBufferLike>, w: number, h: number): Uint8Array<ArrayBufferLike> {
  const out = new Uint8Array(gray.length);
  const win = new Uint8Array(9);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let k = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = Math.min(Math.max(y + dy, 0), h - 1);
          const nx = Math.min(Math.max(x + dx, 0), w - 1);
          win[k++] = gray[ny * w + nx];
        }
      }
      for (let i = 1; i < 9; i++) {
        const tmp = win[i]; let j = i - 1;
        while (j >= 0 && win[j] > tmp) { win[j + 1] = win[j--]; }
        win[j + 1] = tmp;
      }
      out[y * w + x] = win[4];
    }
  }
  return out;
}

function otsuThreshold(gray: Uint8Array<ArrayBufferLike>): number {
  const hist = new Int32Array(256);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;

  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];

  let sumB = 0, wB = 0, maxVar = 0, threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const v = wB * wF * (mB - mF) ** 2;
    if (v > maxVar) { maxVar = v; threshold = t; }
  }
  return threshold;
}

function detectSkewAngle(binary: Uint8Array<ArrayBufferLike>, w: number, h: number): number {
  const STEP = 0.5, MAX = 5;
  const cx = w / 2, cy = h / 2;
  let best = -Infinity, bestAngle = 0;

  for (let deg = -MAX; deg <= MAX; deg += STEP) {
    const rad = (deg * Math.PI) / 180;
    const sinA = Math.sin(rad), cosA = Math.cos(rad);
    const profile = new Float32Array(h);

    for (let y = 0; y < h; y += 4) {
      for (let x = 0; x < w; x += 4) {
        if (binary[y * w + x] === 0) {
          const ry = Math.round((x - cx) * sinA + (y - cy) * cosA + cy);
          if (ry >= 0 && ry < h) profile[ry]++;
        }
      }
    }

    let mean = 0;
    for (let i = 0; i < h; i++) mean += profile[i];
    mean /= h;
    let variance = 0;
    for (let i = 0; i < h; i++) variance += (profile[i] - mean) ** 2;
    if (variance > best) { best = variance; bestAngle = deg; }
  }
  return bestAngle;
}

async function runTesseract(blob: Blob, psm: string, onProgress?: OcrProgress): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") {
        onProgress?.(`Recognizing… ${Math.round(m.progress * 100)}%`);
      }
    },
  });
  await worker.setParameters({
    tessedit_pageseg_mode: psm as never,
    tessedit_ocr_engine_mode: "1" as never,  // LSTM only
    preserve_interword_spaces: "1" as never,
  });
  try {
    const { data } = await worker.recognize(blob);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

function preprocessImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const TARGET_W = 2800;
      const scale = img.naturalWidth < TARGET_W ? TARGET_W / img.naturalWidth : 1;
      const w = Math.round(img.naturalWidth  * scale);
      const h = Math.round(img.naturalHeight * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);

      const imgData = ctx.getImageData(0, 0, w, h);
      const px  = imgData.data;
      const len = w * h;

      // ① Grayscale
      let gray: Uint8Array<ArrayBufferLike> = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        const o = i * 4;
        gray[i] = Math.round(0.2126 * px[o] + 0.7152 * px[o + 1] + 0.0722 * px[o + 2]);
      }

      // ② Median filter
      gray = medianFilter(gray, w, h);

      // ③ Otsu threshold
      const T = otsuThreshold(gray);
      const binary = new Uint8Array(len);
      for (let i = 0; i < len; i++) binary[i] = gray[i] < T ? 0 : 255;

      // ④ Deskew (only if ≥2°)
      const skewDeg = detectSkewAngle(binary, w, h);
      let finalBinary = binary;

      if (Math.abs(skewDeg) >= 2) {
        for (let i = 0; i < len; i++) {
          const o = i * 4;
          px[o] = px[o + 1] = px[o + 2] = gray[i]; px[o + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);

        const rot = document.createElement("canvas");
        rot.width = w; rot.height = h;
        const rctx = rot.getContext("2d", { willReadFrequently: true })!;
        rctx.fillStyle = "#ffffff";
        rctx.fillRect(0, 0, w, h);
        rctx.translate(w / 2, h / 2);
        rctx.rotate((-skewDeg * Math.PI) / 180);
        rctx.drawImage(canvas, -w / 2, -h / 2);
        rctx.setTransform(1, 0, 0, 1, 0, 0);

        const rotPx = rctx.getImageData(0, 0, w, h).data;
        const rotGray: Uint8Array<ArrayBufferLike> = new Uint8Array(len);
        for (let i = 0; i < len; i++) rotGray[i] = rotPx[i * 4];

        const T2 = otsuThreshold(rotGray);
        finalBinary = new Uint8Array(len);
        for (let i = 0; i < len; i++) finalBinary[i] = rotGray[i] < T2 ? 0 : 255;
      }

      // ⑤ Write binary to canvas
      const outData = ctx.createImageData(w, h);
      for (let i = 0; i < len; i++) {
        const o = i * 4;
        outData.data[o] = outData.data[o + 1] = outData.data[o + 2] = finalBinary[i];
        outData.data[o + 3] = 255;
      }
      ctx.putImageData(outData, 0, 0);

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
        "image/png"
      );
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
    img.src = url;
  });
}

function preprocessPdfPage(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const TARGET_W = 2800;
      const scale = img.naturalWidth < TARGET_W ? TARGET_W / img.naturalWidth : 1;
      const w = Math.round(img.naturalWidth  * scale);
      const h = Math.round(img.naturalHeight * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);

      const imgData = ctx.getImageData(0, 0, w, h);
      const px  = imgData.data;
      const len = w * h;

      const THRESHOLD = 235;
      for (let i = 0; i < len; i++) {
        const o = i * 4;
        const lum = Math.round(0.2126 * px[o] + 0.7152 * px[o + 1] + 0.0722 * px[o + 2]);
        const v = lum < THRESHOLD ? 0 : 255;
        px[o] = px[o + 1] = px[o + 2] = v;
        px[o + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);

      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        "image/png"
      );
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
    img.src = url;
  });
}

export async function extractImageText(file: File, onProgress?: OcrProgress): Promise<string> {
  onProgress?.("Preprocessing image…");
  const processedBlob = await preprocessImage(file);
  onProgress?.("Loading OCR engine…");
  return runTesseract(processedBlob, "3", onProgress);
}

export async function extractPdfPageText(blob: Blob, onProgress?: OcrProgress): Promise<string> {
  onProgress?.("Preparing page for OCR…");
  const processedBlob = await preprocessPdfPage(blob);
  onProgress?.("Loading OCR engine…");
  return runTesseract(processedBlob, "3", onProgress);
}
