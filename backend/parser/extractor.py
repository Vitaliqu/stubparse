"""
Paystub extraction pipeline.

  1. Text extraction — PyMuPDF (digital PDF) or Tesseract OCR (image/scan)
  2. LLM extraction  — single model call extracts all fields
  3. Math validation — pure Python arithmetic
"""

import time
import logging
from pathlib import Path
from typing import Generator, Optional

log = logging.getLogger("paystub")

from .models import (
    PaystubResult,
    ExtractedData,
    EmployeeInfo,
    EmployerInfo,
    PayPeriod,
    EarningsItem,
    DeductionItem,
    TaxItem,
    Totals,
    ValidationLayer,
    ValidationStatus,
    ExtractionStatus,
)
from .image_processor import (
    extract_pdf_text,
    is_digital_pdf,
    load_image,
    ocr_image,
    pdf_to_images,
)
from . import ai_engine

MODEL = ai_engine.TEXT_MODEL


# ── Math validation (pure Python) ─────────────────────────────────────────────

def _parse_amt(s) -> Optional[float]:
    if s is None:
        return None
    try:
        return float(str(s).replace("$", "").replace(",", "").strip())
    except (ValueError, AttributeError):
        return None


def _validate_math(data: dict) -> dict:
    totals     = data.get("totals") or {}
    earnings   = [e for e in (data.get("earnings")   or []) if isinstance(e, dict)]
    taxes      = [t for t in (data.get("taxes")      or []) if isinstance(t, dict)]
    deductions = [d for d in (data.get("deductions") or []) if isinstance(d, dict)]

    gross = _parse_amt(totals.get("gross_pay_current"))
    net   = _parse_amt(totals.get("net_pay_current"))

    earn_vals = [v for e in earnings   if (v := _parse_amt(e.get("current_amount"))) is not None]
    tax_vals  = [v for t in taxes      if (v := _parse_amt(t.get("current_amount"))) is not None]
    ded_vals  = [v for d in deductions if (v := _parse_amt(d.get("current_amount"))) is not None]

    checks = []

    if gross is not None and earn_vals:
        earn_sum = sum(earn_vals)
        checks.append({"check_name": "earnings_sum_vs_gross",
                       "passed": abs(earn_sum - gross) < 0.10,
                       "calculated": round(earn_sum, 2), "stated": gross})

    if gross is not None and net is not None and (tax_vals or ded_vals):
        calc_net = gross - sum(tax_vals) - sum(ded_vals)
        checks.append({"check_name": "net_pay_formula",
                       "passed": abs(calc_net - net) < 0.10,
                       "calculated": round(calc_net, 2), "stated": net})

    for item in earnings + taxes + deductions:
        curr_v = _parse_amt(item.get("current_amount"))
        ytd_v  = _parse_amt(item.get("ytd_amount"))
        if curr_v is not None and ytd_v is not None and ytd_v < curr_v - 0.01:
            checks.append({"check_name": f"ytd_gte_current:{item.get('description', '?')}",
                           "passed": False, "calculated": ytd_v, "stated": curr_v})

    failed = [c for c in checks if not c.get("passed", True)]
    conf   = max(0.0, 1.0 - 0.2 * len(failed)) if checks else 0.8

    return {
        "checks": checks,
        "overall_math_confidence": round(conf, 2),
        "summary": (f"{len(checks) - len(failed)}/{len(checks)} math checks passed"
                    if checks else "Insufficient data for math validation"),
    }


# ── Data builders ──────────────────────────────────────────────────────────────

def _build_extracted_data(raw: dict) -> ExtractedData:
    emp      = raw.get("employee")   or {}
    employer = raw.get("employer")   or {}
    pp       = raw.get("pay_period") or {}
    totals   = raw.get("totals")     or {}

    earnings = [
        EarningsItem(**{k: v for k, v in e.items() if k in EarningsItem.model_fields})
        for e in (raw.get("earnings") or []) if isinstance(e, dict)
    ]
    deductions = [
        DeductionItem(**{k: v for k, v in d.items() if k in DeductionItem.model_fields})
        for d in (raw.get("deductions") or []) if isinstance(d, dict)
    ]
    taxes = [
        TaxItem(**{k: v for k, v in t.items() if k in TaxItem.model_fields})
        for t in (raw.get("taxes") or []) if isinstance(t, dict)
    ]

    return ExtractedData(
        employee=EmployeeInfo(**{k: v for k, v in emp.items()      if k in EmployeeInfo.model_fields}),
        employer=EmployerInfo(**{k: v for k, v in employer.items() if k in EmployerInfo.model_fields}),
        pay_period=PayPeriod(**{k: v for k, v in pp.items()        if k in PayPeriod.model_fields}),
        earnings=earnings,
        deductions=deductions,
        taxes=taxes,
        totals=Totals(**{k: v for k, v in totals.items()           if k in Totals.model_fields}),
        check_number=raw.get("check_number"),
        raw_notes=raw.get("raw_notes"),
        extra_fields=raw.get("extra_fields") or None,
    )


def _make_layer(layer: int, name: str, status: str,
                confidence: float, notes: str, details: dict) -> ValidationLayer:
    return ValidationLayer(
        layer=layer, name=name,
        status=ValidationStatus(status),
        confidence=round(confidence, 3),
        notes=notes, details=details,
    )


# ── Extractor ──────────────────────────────────────────────────────────────────

class PaystubExtractor:
    def __init__(self, samples_dir: str = None):
        self.samples_dir = samples_dir

    def _get_text(self, filename: str, file_bytes: bytes) -> tuple[str, str]:
        """Extract raw text. Returns (text, mode_description)."""
        ext = Path(filename).suffix.lower()

        if ext == ".pdf" and is_digital_pdf(file_bytes):
            return extract_pdf_text(file_bytes), "digital PDF (PyMuPDF)"

        pil_img  = pdf_to_images(file_bytes)[0] if ext == ".pdf" else load_image(file_bytes)
        ocr_text = ocr_image(pil_img)

        ocr_score = ocr_text.count("$") * 3 + sum(1 for c in ocr_text if c.isdigit())
        quality   = "high" if len(ocr_text.strip()) >= 150 and ocr_score >= 15 else "low"
        log.info(f"  [OCR] quality={quality}  chars={len(ocr_text)}  score={ocr_score}")
        return ocr_text, f"image → Tesseract OCR ({quality} quality)"

    def _get_vision_bytes(self, filename: str, file_bytes: bytes) -> tuple[bytes, str]:
        """Return (image_bytes, media_type) suitable for Claude vision."""
        import io
        ext = Path(filename).suffix.lower()
        if ext == ".pdf":
            pil = pdf_to_images(file_bytes)[0]
            buf = io.BytesIO()
            pil.save(buf, format="PNG")
            return buf.getvalue(), "image/png"
        media_type = ai_engine._MEDIA_TYPES.get(ext, "image/png")
        return file_bytes, media_type

    def parse_stream(self, filename: str, file_bytes: bytes) -> Generator[dict, None, None]:
        """
        Yields SSE-compatible dicts as each stage completes.
        Events: 'start' | 'layer_start' | 'layer' | 'result' | 'parse_error'
        """
        start_ms = int(time.time() * 1000)
        layers: list[ValidationLayer] = []

        log.info("━" * 50)
        log.info(f"  JOB START  │ {filename}")
        log.info("━" * 50)
        yield {"event": "start", "data": {"filename": filename, "total_layers": 2}}

        # ── Text extraction ───────────────────────────────────────────────────
        log.info("  [PRE] Extracting text...")
        try:
            raw_text, mode = self._get_text(filename, file_bytes)
            log.info(f"  [PRE] Done ✓  mode={mode}  chars={len(raw_text)}")
        except Exception as e:
            log.error(f"  [PRE] FAILED: {e}")
            yield {"event": "parse_error", "data": {"message": f"Text extraction failed: {e}"}}
            return

        yield {"event": "ocr_preview", "data": {"raw_text": raw_text, "mode": mode}}

        # ── Vision fallback when OCR returns nothing ──────────────────────────
        use_vision = not raw_text.strip()
        extracted = None

        if use_vision:
            log.info("  [OCR] Empty — falling back to Claude vision")
            img_bytes, media_type = self._get_vision_bytes(filename, file_bytes)
            yield {"event": "layer_start", "data": {"layer": 1, "name": "LLM Field Extraction"}}
            is_paystub, extracted = ai_engine.extract_vision(img_bytes, media_type)
            if not is_paystub:
                yield {"event": "parse_error",
                       "data": {"message": "Document does not appear to be a paystub. No text could be extracted."}}
                return
        else:
            # ── Paystub verification ──────────────────────────────────────────
            log.info("  [VER] Verifying document is a paystub...")
            is_paystub, reason = ai_engine.verify_paystub(raw_text)
            log.info(f"  [VER] is_paystub={is_paystub}  reason={reason!r}")
            if not is_paystub:
                yield {"event": "parse_error",
                       "data": {"message": f"Document does not appear to be a paystub. {reason}"}}
                return

        # ── Layer 1: LLM field extraction ─────────────────────────────────────
        t = time.time()
        if not use_vision:
            yield {"event": "layer_start", "data": {"layer": 1, "name": "LLM Field Extraction"}}
        log.info(f"  [L1 →] LLM extraction  (model={MODEL})...")

        if not use_vision:
            extracted = ai_engine.extract(raw_text)

        if not extracted:
            yield {"event": "parse_error", "data": {"message": "LLM extraction returned no data."}}
            return

        # Score how many key fields were found
        key_checks = {
            "employee.name":            (extracted.get("employee") or {}).get("name"),
            "employer.name":            (extracted.get("employer") or {}).get("name"),
            "pay_period.pay_date":      (extracted.get("pay_period") or {}).get("pay_date"),
            "totals.gross_pay_current": (extracted.get("totals") or {}).get("gross_pay_current"),
            "totals.net_pay_current":   (extracted.get("totals") or {}).get("net_pay_current"),
            "earnings":                 extracted.get("earnings") or None,
        }
        found   = [k for k, v in key_checks.items() if v]
        missing = [k for k, v in key_checks.items() if not v]
        conf    = round(len(found) / len(key_checks), 3)

        log.info(f"  [L1 ✓] conf={conf:.2f}  found={found}  missing={missing}  ({time.time()-t:.1f}s)")
        log.info(f"         employee={( extracted.get('employee') or {}).get('name')}  "
                 f"employer={(extracted.get('employer') or {}).get('name')}")
        log.info(f"         earn={len(extracted.get('earnings') or [])}  "
                 f"tax={len(extracted.get('taxes') or [])}  "
                 f"ded={len(extracted.get('deductions') or [])}")
        log.info(f"         gross={(extracted.get('totals') or {}).get('gross_pay_current')}  "
                 f"net={(extracted.get('totals') or {}).get('net_pay_current')}")

        l1 = _make_layer(1, "LLM Field Extraction",
                         "passed" if conf >= 0.5 else "warning",
                         conf,
                         f"Extracted {len(found)}/{len(key_checks)} key fields.",
                         {"found": found, "missing": missing,
                          "extra_fields": list((extracted.get("extra_fields") or {}).keys())})
        layers.append(l1)
        yield {"event": "layer", "data": l1.model_dump()}

        extracted_data = _build_extracted_data(extracted)

        # ── Layer 2: Math validation (pure Python) ────────────────────────────
        t = time.time()
        yield {"event": "layer_start", "data": {"layer": 2, "name": "Mathematical Consistency"}}
        log.info("  [L2 →] Math validation...")

        math   = _validate_math(extracted)
        checks = math.get("checks") or []
        failed = [c for c in checks if not c.get("passed", True)]

        if len(failed) >= 3:
            math_status = "failed"
        elif failed:
            math_status = "warning"
        else:
            math_status = "passed"

        l2 = _make_layer(2, "Mathematical Consistency",
                         math_status,
                         math["overall_math_confidence"],
                         math["summary"],
                         {"checks": checks, "failed_count": len(failed)})
        log.info(f"  [L2 ✓] {math_status.upper()}  conf={l2.confidence:.2f}  "
                 f"{math['summary']}  ({time.time()-t:.3f}s)")
        layers.append(l2)
        yield {"event": "layer", "data": l2.model_dump()}

        # ── Final result ──────────────────────────────────────────────────────
        overall_conf = round(sum(l.confidence for l in layers) / len(layers), 3)
        has_warning  = any(l.status == ValidationStatus.WARNING for l in layers)
        has_failed   = any(l.status == ValidationStatus.FAILED  for l in layers)

        if has_failed or conf < 0.3:
            final_status = ExtractionStatus.FAILED
        elif has_warning or conf < 0.8:
            final_status = ExtractionStatus.PARTIAL
        else:
            final_status = ExtractionStatus.SUCCESS

        result = PaystubResult(
            status=final_status,
            overall_confidence=overall_conf,
            extracted_data=extracted_data,
            validation_layers=layers,
            warnings=[],
            errors=[],
            model_used=MODEL,
            processing_time_ms=int(time.time() * 1000) - start_ms,
        )

        elapsed = result.processing_time_ms / 1000
        log.info("━" * 50)
        log.info(f"  DONE  │ status={result.status}  conf={overall_conf}  time={elapsed:.1f}s")
        log.info("━" * 50)
        yield {"event": "result", "data": result.model_dump()}

    def parse(self, filename: str, file_bytes: bytes) -> PaystubResult:
        """One-shot parse — collects all stream events and returns final result."""
        result = None
        for event in self.parse_stream(filename, file_bytes):
            if event["event"] == "result":
                result = PaystubResult(**event["data"])
            elif event["event"] == "parse_error" and result is None:
                result = PaystubResult(
                    status=ExtractionStatus.FAILED,
                    overall_confidence=0.0,
                    extracted_data=ExtractedData(),
                    validation_layers=[],
                    errors=[event["data"].get("message", "Unknown error")],
                    model_used=MODEL,
                )
        return result
