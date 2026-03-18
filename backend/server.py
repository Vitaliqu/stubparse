"""
StubParse Backend Server
────────────────────────
AI-powered paystub extraction via Claude (Anthropic).
Text extracted via PyMuPDF (digital PDFs) or Tesseract OCR (scans/images).

Endpoints:
  POST /jobs            — start a parse job (file upload or sample name)
  GET  /stream/{job_id} — SSE stream for a job (use with EventSource)
  GET  /health          — server status
  GET  /samples         — list sample files
  POST /parse           — one-shot blocking parse
"""

import json
import uuid
import asyncio
import logging
import os
from pathlib import Path
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(message)s",
    datefmt="%H:%M:%S",
)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from parser import PaystubExtractor, PaystubResult
from parser import ai_engine

# ── Config ────────────────────────────────────────────────────────────────────
SAMPLES_DIR     = Path(__file__).parent / "samples"
MAX_FILE_BYTES  = 20 * 1024 * 1024  # 20 MB
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp"}
ALLOWED_ORIGIN  = os.environ.get("ALLOWED_ORIGIN", "*")
API_SECRET      = os.environ.get("API_SECRET")

_SIGNATURES = {
    ".pdf":  b"%PDF",
    ".png":  b"\x89PNG",
    ".jpg":  b"\xff\xd8\xff",
    ".jpeg": b"\xff\xd8\xff",
}

extractor = PaystubExtractor(samples_dir=str(SAMPLES_DIR))
_executor = ThreadPoolExecutor(max_workers=2)
log = logging.getLogger("paystub")

# In-memory job store: job_id → asyncio.Queue of SSE event dicts
_jobs: dict[str, asyncio.Queue] = {}


# ── Rate limiter ───────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)


# ── Startup ───────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n" + "="*60)
    print("  StubParse Backend")
    print("="*60)
    key_ok = bool(ai_engine._client.api_key)
    print(f"  Model        : {ai_engine.TEXT_MODEL}")
    print(f"  API key      : {'set' if key_ok else 'MISSING — set ANTHROPIC_API_KEY'}")
    print(f"  Samples dir  : {SAMPLES_DIR}")
    print(f"  CORS origin  : {ALLOWED_ORIGIN}")
    print("="*60 + "\n")
    yield
    _executor.shutdown(wait=False)


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="StubParse",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.middleware("http")
async def verify_secret(request: Request, call_next):
    if request.url.path == "/health":
        return await call_next(request)
    if API_SECRET and request.headers.get("X-API-Secret") != API_SECRET:
        return JSONResponse({"detail": "Unauthorized"}, status_code=401)
    return await call_next(request)

origins = [ALLOWED_ORIGIN] if ALLOWED_ORIGIN != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ── Helpers ───────────────────────────────────────────────────────────────────
def _validate_upload(filename: str, size: int, content: bytes | None = None):
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{ext}'. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
        )
    if size > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max: {MAX_FILE_BYTES // 1024 // 1024}MB",
        )
    if content and ext in _SIGNATURES:
        sig = _SIGNATURES[ext]
        if content[:len(sig)] != sig:
            raise HTTPException(status_code=415, detail="File content does not match declared type.")


def _run_extraction(job_id: str, filename: str, file_bytes: bytes, loop: asyncio.AbstractEventLoop):
    """Runs in a thread. Feeds extraction events into the job's queue."""
    queue = _jobs[job_id]
    try:
        for event in extractor.parse_stream(filename, file_bytes):
            loop.call_soon_threadsafe(queue.put_nowait, event)
    except Exception as e:
        loop.call_soon_threadsafe(queue.put_nowait, {"event": "parse_error", "data": {"message": str(e)}})
    finally:
        loop.call_soon_threadsafe(queue.put_nowait, None)  # sentinel → done


async def _sse_stream(job_id: str):
    """Async generator that reads from the job queue and yields SSE text."""
    queue = _jobs.get(job_id)
    if queue is None:
        yield "event: parse_error\ndata: {\"message\": \"Job not found\"}\n\n"
        return

    try:
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=15.0)
            except asyncio.TimeoutError:
                yield ": ping\n\n"
                continue

            if event is None:
                break

            yield f"event: {event['event']}\ndata: {json.dumps(event['data'])}\n\n"
    finally:
        _jobs.pop(job_id, None)

    yield "event: done\ndata: {}\n\n"


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/samples")
async def list_samples():
    if not SAMPLES_DIR.exists():
        return {"samples": [], "error": "Samples directory not found"}
    files = [f.name for f in sorted(SAMPLES_DIR.iterdir()) if f.is_file()]
    return {"samples": files, "count": len(files)}


@app.post("/jobs")
@limiter.limit("20/minute")
async def create_job(
    request: Request,
    file: UploadFile = File(None),
    sample: str = Form(None),
):
    if file is not None:
        content = await file.read()
        filename = file.filename
        _validate_upload(filename, len(content), content)
    elif sample is not None:
        if not SAMPLES_DIR.exists():
            raise HTTPException(status_code=404, detail="Samples directory not found")
        # Path traversal protection
        target = (SAMPLES_DIR / sample).resolve()
        if not str(target).startswith(str(SAMPLES_DIR.resolve())):
            raise HTTPException(status_code=400, detail="Invalid sample name.")
        if not target.exists():
            raise HTTPException(status_code=404, detail=f"Sample '{sample}' not found")
        _validate_upload(sample, target.stat().st_size)
        content = target.read_bytes()
        filename = sample
    else:
        raise HTTPException(status_code=422, detail="Provide either 'file' or 'sample'")

    job_id = str(uuid.uuid4())
    _jobs[job_id] = asyncio.Queue()
    log.info(f"  JOB CREATED  │ id={job_id[:8]}  file={filename}  size={len(content)//1024}KB")

    loop = asyncio.get_running_loop()
    loop.run_in_executor(_executor, _run_extraction, job_id, filename, content, loop)

    return {"job_id": job_id}


@app.get("/stream/{job_id}")
async def stream_job(job_id: str):
    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail="Job not found or already completed")
    log.info(f"  SSE OPEN     │ id={job_id[:8]}  (browser connected)")
    return StreamingResponse(
        _sse_stream(job_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.post("/parse", response_model=PaystubResult)
@limiter.limit("20/minute")
async def parse_paystub(request: Request, file: UploadFile = File(...)):
    content = await file.read()
    _validate_upload(file.filename, len(content), content)
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(_executor, extractor.parse, file.filename, content)
    return result


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=False)
