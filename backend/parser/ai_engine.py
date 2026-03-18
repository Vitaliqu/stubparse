"""
AI extraction engine.
Uses Claude Haiku (cheapest/fastest) — single call extracts all paystub fields.
"""

import os
import json
import base64
import logging
from typing import Any

import anthropic

log = logging.getLogger("paystub")

TEXT_MODEL = "claude-haiku-4-5"
_client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY") or None)

_EXTRACT_PROMPT = """Extract all fields from this paystub text.

TEXT:
---
{text}
---

Return ONLY this JSON structure (null for anything not found — never invent values):
{{
  "employee": {{
    "name": null,
    "address": null,
    "employee_id": null,
    "ssn_last4": null,
    "department": null,
    "position": null
  }},
  "employer": {{
    "name": null,
    "address": null,
    "ein": null,
    "phone": null
  }},
  "pay_period": {{
    "start_date": null,
    "end_date": null,
    "pay_date": null,
    "pay_frequency": null
  }},
  "earnings": [
    {{"description": "name", "hours": "40.0", "rate": "$X.XX/hr", "current_amount": "$X.XX", "ytd_amount": "$X.XX"}}
  ],
  "taxes": [
    {{"description": "tax name", "current_amount": "$X.XX", "ytd_amount": "$X.XX"}}
  ],
  "deductions": [
    {{"description": "deduction name", "current_amount": "$X.XX", "ytd_amount": "$X.XX"}}
  ],
  "totals": {{
    "gross_pay_current": null,
    "gross_pay_ytd": null,
    "total_taxes_current": null,
    "total_taxes_ytd": null,
    "total_deductions_current": null,
    "total_deductions_ytd": null,
    "net_pay_current": null,
    "net_pay_ytd": null
  }},
  "check_number": null,
  "extra_fields": {{}}
}}

RULES:
- taxes = government withholdings ONLY: Federal/State Income Tax, Social Security, Medicare, SDI, CPP, EI, etc.
- deductions = voluntary ONLY: 401(k), health/dental/vision insurance, union dues, FSA, parking, etc.
- Dollar amounts: "$1,234.56" format. Dates: YYYY-MM-DD.
- extra_fields: any additional paystub data not in the schema (payroll_id, pay_rate, accrued_vacation, etc.)
- Return ONLY valid JSON, no markdown, no explanation."""


def _chat(messages: list[dict], temperature: float = 0.05, max_tokens: int = 2000) -> str:
    response = _client.messages.create(
        model=TEXT_MODEL,
        max_tokens=max_tokens,
        temperature=temperature,
        messages=messages,
    )
    return response.content[0].text


def _strip_fences(raw: str) -> str:
    s = raw.strip()
    if s.startswith("```"):
        s = s[s.find("\n") + 1:]
    if s.endswith("```"):
        s = s[:s.rfind("```")]
    return s


def _parse_json(raw: str) -> Any:
    cleaned = _strip_fences(raw)
    start = cleaned.find("{")
    end = cleaned.rfind("}") + 1
    if start >= 0 and end > start:
        return json.loads(cleaned[start:end])
    raise ValueError("No JSON object found")


def _chat_json(messages: list[dict], temperature: float = 0.05, max_tokens: int = 2000) -> Any:
    """Call model and parse JSON response. Retries up to 3 times."""
    last_raw = ""
    for attempt in range(3):
        raw = _chat(messages, temperature, max_tokens)
        last_raw = raw
        try:
            return _parse_json(raw)
        except (ValueError, json.JSONDecodeError):
            pass

        # Check if response was truncated (started JSON but no closing brace)
        cleaned = _strip_fences(raw)
        truncated = cleaned.find("{") >= 0 and cleaned.rfind("}") < cleaned.find("{")
        if truncated:
            messages = messages + [
                {"role": "assistant", "content": raw},
                {"role": "user", "content":
                    "Your response was cut off. Continue from where you stopped and finish the JSON. "
                    "Output ONLY the remaining JSON text to complete the object."},
            ]
        else:
            messages = messages + [
                {"role": "assistant", "content": raw},
                {"role": "user", "content":
                    "Invalid JSON. Reply ONLY with a single valid JSON object. "
                    "No markdown, no explanation, nothing outside the braces."},
            ]
    raise ValueError(f"Model returned non-JSON after 3 attempts:\n{last_raw[:400]}")


def verify_paystub(raw_text: str) -> tuple[bool, str]:
    """
    Keyword-based paystub verification — no LLM, instant, reliable.
    Requires at least 3 of 5 mandatory indicator groups to be present.
    Returns (is_paystub, reason).
    """
    if not raw_text.strip():
        return False, "No text could be extracted from the document."

    t = raw_text.lower()

    indicators = {
        "gross pay":   any(k in t for k in ("gross pay", "gross earnings", "total earnings", "gross wages")),
        "net pay":     any(k in t for k in ("net pay", "take home", "check amount", "net wages", "net check")),
        "pay date":    any(k in t for k in ("pay date", "pay period", "payment date", "check date", "payroll date")),
        "taxes":       any(k in t for k in ("federal", "medicare", "social security", "withholding", "income tax", "fica")),
        "earnings":    any(k in t for k in ("earnings", "regular pay", "hourly", "salary", "overtime", "wages")),
    }

    found   = [k for k, v in indicators.items() if v]
    missing = [k for k, v in indicators.items() if not v]

    if len(found) >= 3:
        return True, f"Paystub indicators found: {', '.join(found)}."
    return False, f"Not enough paystub indicators. Missing: {', '.join(missing)}."


def extract(raw_text: str) -> dict:
    """Extract all paystub fields from raw text. Returns structured dict."""
    prompt = _EXTRACT_PROMPT.format(text=raw_text.strip()[:4000])
    try:
        return _chat_json([{"role": "user", "content": prompt}])
    except Exception as e:
        log.error(f"  [LLM] Extraction failed: {e}")
        return {}


_VISION_PROMPT = """This is an image of a paystub. Extract all fields and return JSON.

If this is NOT a paystub, return: {"is_paystub": false, "reason": "..."}

If it IS a paystub, return {"is_paystub": true, ...} using this structure:
""" + _EXTRACT_PROMPT.split("Return ONLY this JSON structure")[1].split("RULES:")[0].strip() + """

RULES:
- taxes = government withholdings ONLY: Federal/State Income Tax, Social Security, Medicare, SDI, etc.
- deductions = voluntary ONLY: 401(k), health/dental/vision insurance, FSA, parking, etc.
- Dollar amounts: "$1,234.56" format. Dates: YYYY-MM-DD.
- extra_fields: any additional data not in the schema.
- Return ONLY valid JSON, no markdown, no explanation."""

_MEDIA_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
}


def extract_vision(image_bytes: bytes, media_type: str) -> tuple[bool, dict]:
    """
    Extract paystub fields directly from an image using Claude vision.
    Returns (is_paystub, extracted_data_dict).
    """
    b64 = base64.standard_b64encode(image_bytes).decode()
    messages = [{
        "role": "user",
        "content": [
            {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64}},
            {"type": "text", "text": _VISION_PROMPT},
        ],
    }]
    try:
        result = _chat_json(messages, max_tokens=3000)
        if not result.get("is_paystub", True):
            log.info(f"  [VISION] Not a paystub: {result.get('reason')}")
            return False, {}
        return True, result
    except Exception as e:
        log.error(f"  [VISION] Failed: {e}")
        return False, {}
