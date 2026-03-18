import re
import io
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter, ImageOps, ImageChops
import fitz  # PyMuPDF


# ── PDF helpers ───────────────────────────────────────────────────────────────

def extract_pdf_text(pdf_bytes: bytes) -> str:
    """Extract embedded text from a digital PDF."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages = [page.get_text("text") for page in doc if page.get_text("text").strip()]
    doc.close()
    return "\n".join(pages)


def is_digital_pdf(pdf_bytes: bytes, min_chars: int = 50) -> bool:
    """Return True if the PDF has extractable text (not a scan)."""
    return len(extract_pdf_text(pdf_bytes).strip()) >= min_chars


def pdf_to_images(pdf_bytes: bytes, dpi: int = 300) -> list[Image.Image]:
    """Convert all PDF pages to PIL Images."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    images = []
    for page in doc:
        mat = fitz.Matrix(dpi / 72, dpi / 72)
        pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
        images.append(Image.frombytes("RGB", [pix.width, pix.height], pix.samples))
    doc.close()
    return images


def load_image(image_bytes: bytes) -> Image.Image:
    """Load an image from raw bytes."""
    return Image.open(io.BytesIO(image_bytes)).convert("RGB")


# ── Preprocessing helpers ─────────────────────────────────────────────────────

def _upscale(img: Image.Image, target_long: int = 3600) -> Image.Image:
    """Upscale so the longest side reaches target_long pixels."""
    long_side = max(img.width, img.height)
    if long_side < target_long:
        scale = target_long / long_side
        img = img.resize((int(img.width * scale), int(img.height * scale)), Image.LANCZOS)
    return img


def _otsu_threshold(img_gray: Image.Image) -> int:
    """Compute Otsu's binarization threshold from the image histogram."""
    hist  = img_gray.histogram()
    total = sum(hist)
    if total == 0:
        return 128
    sum_all = sum(i * h for i, h in enumerate(hist))
    w_bg, sum_bg, max_var, threshold = 0, 0, 0, 128
    for i, h in enumerate(hist):
        w_bg += h
        if w_bg == 0:
            continue
        w_fg = total - w_bg
        if w_fg == 0:
            break
        sum_bg += i * h
        m_bg = sum_bg / w_bg
        m_fg = (sum_all - sum_bg) / w_fg
        var  = w_bg * w_fg * (m_bg - m_fg) ** 2
        if var > max_var:
            max_var, threshold = var, i
    return threshold


def _binarize(img_gray: Image.Image) -> Image.Image:
    t = _otsu_threshold(img_gray)
    return img_gray.point(lambda p: 255 if p > t else 0, "L")


def _adaptive_threshold(img_gray: Image.Image, block_size: int = 51) -> Image.Image:
    """Local adaptive threshold — handles uneven lighting across the image."""
    blurred = img_gray.filter(ImageFilter.GaussianBlur(radius=block_size // 2))
    diff    = ImageChops.subtract(img_gray, blurred, scale=1, offset=128)
    return diff.point(lambda p: 255 if p >= 128 else 0, "L")


def _deskew(img_gray: Image.Image) -> Image.Image:
    """Correct small rotation angles (±5°) using horizontal projection analysis."""
    try:
        best_angle, best_score = 0.0, -1.0
        for angle_tenths in range(-50, 51, 10):
            angle   = angle_tenths / 10.0
            rotated = img_gray.rotate(angle, expand=False, fillcolor=255)
            w, h    = rotated.size
            pixels  = list(rotated.getdata())
            row_sums = [sum(pixels[r * w:(r + 1) * w]) for r in range(h)]
            if len(row_sums) < 2:
                continue
            mean     = sum(row_sums) / len(row_sums)
            variance = sum((x - mean) ** 2 for x in row_sums) / len(row_sums)
            if variance > best_score:
                best_score, best_angle = variance, angle
        if best_angle != 0.0:
            img_gray = img_gray.rotate(best_angle, expand=True, fillcolor=255)
    except Exception:
        pass
    return img_gray


# ── Preprocessing pipelines ───────────────────────────────────────────────────

def _pipeline_standard(img: Image.Image) -> Image.Image:
    """Denoise → autocontrast → sharpen → deskew → Otsu binarize. Best for clean scans."""
    g = img.convert("L")
    g = g.filter(ImageFilter.MedianFilter(size=3))
    g = ImageOps.autocontrast(g, cutoff=2)
    g = ImageEnhance.Sharpness(g).enhance(3.0)
    g = _deskew(g)
    return _binarize(g).convert("RGB")


def _pipeline_adaptive(img: Image.Image) -> Image.Image:
    """Denoise → sharpen → deskew → local adaptive threshold. Best for photos with shadows."""
    g = img.convert("L")
    g = g.filter(ImageFilter.MedianFilter(size=3))
    g = ImageEnhance.Sharpness(g).enhance(2.0)
    g = _deskew(g)
    return _adaptive_threshold(g).convert("RGB")


# ── OCR ───────────────────────────────────────────────────────────────────────

_LAYOUT_HEADERS = re.compile(
    r'^\s*(?:Hours\s+and\s+Earnings|Taxes?\s+and|Deductions?|Net\s+Pay|Gross\s+Pay)\b',
    re.I | re.M,
)


def _score(text: str) -> int:
    """Score OCR output by paystub relevance: dollar signs, digits, section headers."""
    return (text.count("$") * 3
            + sum(1 for c in text if c.isdigit())
            + len(_LAYOUT_HEADERS.findall(text)) * 10)


def _resolve_tesseract() -> bool:
    """Find and configure the Tesseract binary. Returns True if found."""
    import shutil
    try:
        import pytesseract
    except ImportError:
        return False
    for candidate in [
        "tesseract",
        "/opt/homebrew/bin/tesseract",
        "/usr/local/bin/tesseract",
        "/usr/bin/tesseract",
    ]:
        if shutil.which(candidate) or Path(candidate).is_file():
            pytesseract.pytesseract.tesseract_cmd = candidate
            try:
                pytesseract.get_tesseract_version()
                return True
            except Exception:
                continue
    return False


def ocr_image(img: Image.Image) -> str:
    """
    Extract text from a PIL image using Tesseract OCR.

    Runs two complementary pipelines and returns whichever scores higher:
      - standard:  denoise → autocontrast → sharpen → deskew → Otsu binarize
      - adaptive:  denoise → sharpen → deskew → local adaptive threshold
    PSM 3 (auto layout), OEM 1 (LSTM).
    """
    import logging
    log = logging.getLogger("paystub")

    try:
        import pytesseract
    except ImportError:
        log.warning("  [OCR] pytesseract not installed — skipping")
        return ""

    if not _resolve_tesseract():
        log.warning("  [OCR] Tesseract binary not found — skipping")
        return ""

    base   = _upscale(img.convert("RGB"), target_long=3600)
    config = "--oem 1 --psm 3 --dpi 300"

    best_text, best_score = "", -1
    for pipeline in (_pipeline_standard, _pipeline_adaptive):
        try:
            text = pytesseract.image_to_string(pipeline(base), config=config).strip()
            s    = _score(text)
            if s > best_score:
                best_score, best_text = s, text
        except Exception as e:
            log.warning(f"  [OCR] {pipeline.__name__} failed: {e}")

    log.info(f"  [OCR] score={best_score}  chars={len(best_text)}")
    return best_text
