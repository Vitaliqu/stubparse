# StubParse

Free paystub parser. Upload any paystub PDF or image, extract structured payroll data, and export to Excel, CSV, or JSON. No account required.

Live at [stubparse.com](https://stubparse.com)

---

## What It Does

StubParse takes paystub files (PDF or image) and extracts structured payroll data from them — employee name, pay period, check date, gross pay, net pay, earnings breakdown, taxes, deductions, YTD amounts, and more.

It supports two parsing modes:

- **Basic mode** — runs entirely in the browser using PDF.js and Tesseract.js. No files are sent anywhere.
- **AI mode** — uploads the file to a Python backend that uses PyMuPDF or Tesseract for text extraction, then passes the content to Claude (Anthropic) for deep field recognition. Files are processed and immediately discarded — nothing is stored.

After parsing, results are editable in the UI. You can correct any field before exporting. Export formats include:

- **XLSX** — styled Excel spreadsheet, horizontal (one row per employee, periods as columns) or vertical (one row per period, fields as columns)
- **CSV** — flat or pivoted, universal compatibility
- **JSON** — structured array for developers

---

## Architecture

```
stubparse/
├── frontend/                  # Next.js 16 app
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx       # Main UI — upload, parse, results, export
│   │   │   ├── layout.tsx     # HTML shell, metadata, JSON-LD
│   │   │   ├── globals.css    # Tailwind base styles
│   │   │   └── api/
│   │   │       ├── parse/     # Server-side route: basic parsing (no AI)
│   │   │       ├── export/    # Server-side route: XLSX / CSV / JSON generation
│   │   │       └── backend/   # Proxy routes to Python backend (hides API secret)
│   │   │           ├── jobs/  # POST proxy → backend /jobs
│   │   │           └── stream/[jobId]/  # GET proxy → backend /stream/{id}
│   │   ├── components/
│   │   │   ├── UploadSection.tsx   # File input, drag-and-drop, AI toggle
│   │   │   ├── ResultsSection.tsx  # Parsed paystub cards
│   │   │   ├── PaystubCard.tsx     # Single result card with editable fields
│   │   │   ├── ExportPanel.tsx     # Format/layout selector, field picker, download
│   │   │   ├── icons.tsx           # SVG icon components
│   │   │   └── ui.tsx              # Shared UI primitives (checkbox, badge, etc.)
│   │   ├── lib/
│   │   │   ├── pdf-extractor.ts    # Browser-side PDF text extraction via PDF.js
│   │   │   ├── image-ocr.ts        # Browser-side OCR via Tesseract.js
│   │   │   ├── regex-parser.ts     # Rule-based field extraction from raw text
│   │   │   ├── dynamic-extractor.ts # Pattern matching for earnings/taxes/deductions
│   │   │   ├── field-definitions.ts # Export field groups and keys
│   │   │   └── file-utils.ts       # File type helpers
│   │   └── types/
│   │       └── paystub.ts          # PaystubData, FileResult, ExportFormat types
│   ├── public/
│   │   └── pdf.worker.min.mjs     # PDF.js worker (served locally, no CDN)
│   ├── next.config.ts
│   └── package.json
│
├── backend/                   # Python FastAPI server (AI mode)
│   ├── parser/
│   │   ├── extractor.py       # Main extraction engine — PDF/image → structured data
│   │   ├── ai_engine.py       # Claude API integration (text + vision fallback)
│   │   ├── image_processor.py # Image preprocessing for OCR
│   │   └── models.py          # Pydantic models for parsed results
│   ├── server.py              # FastAPI app — endpoints, auth, rate limiting, CORS
│   ├── requirements.txt
│   ├── nixpacks.toml          # Railway deployment config (installs tesseract)
│   └── .env.example
│
├── setup.sh                   # Installs Python deps + frontend Node deps
├── start.sh                   # Starts backend or frontend
└── README.md
```

---

## How Parsing Works

### Basic mode (browser-only)

1. The user drops a PDF or image file.
2. If it's a PDF, **PDF.js** extracts the text layer. If the PDF has no text (scanned), **Tesseract.js** runs OCR on the rendered page image.
3. The raw text is passed through `regex-parser.ts` which uses regular expressions to find known field patterns (gross pay, net pay, check date, pay period, etc.).
4. `dynamic-extractor.ts` scans line by line for earnings, taxes, and deductions using section headers and amount patterns.
5. Results are displayed and editable immediately — no network request was made.

### AI mode (backend)

1. The user enables the "Claude AI" toggle and clicks Parse.
2. The browser POSTs the file to `/api/backend/jobs` (a Next.js server-side proxy route).
3. The proxy adds the `X-API-Secret` header and forwards the request to the Python backend at `POST /jobs`.
4. The backend creates a job ID and starts processing in a thread pool:
   - **PyMuPDF** extracts the text layer from PDFs.
   - If the file is an image (or the PDF has no text), **pytesseract** runs OCR.
   - If OCR also returns nothing (e.g. a low-quality scan), the backend falls back to **Claude vision** — the image is base64-encoded and sent directly to the Claude API for visual extraction.
   - The extracted text is then sent to **Claude Haiku** with a structured prompt that extracts all payroll fields into a typed JSON schema.
5. Results stream back to the browser in real time via **Server-Sent Events** (SSE) through `/api/backend/stream/[jobId]`.
6. The frontend updates the UI progressively as events arrive.

### Export

Export runs entirely server-side in the Next.js API route `/api/export`:
- **XLSX**: Built with ExcelJS. Horizontal layout pivots by pay period (one row per employee, date groups as column headers). Vertical layout puts one row per paystub, fields as columns.
- **CSV**: Same logic, plain text output.
- **JSON**: Nested by employee → pay periods.
- YTD columns are only included for fields that actually have YTD data.

---

## Running Locally

### Prerequisites

- Node.js 18+
- Python 3.10+
- `tesseract` system binary (only needed for AI mode with image files)
  - macOS: `brew install tesseract`
  - Ubuntu: `sudo apt install tesseract-ocr`

### Basic mode only (no AI, no Python)

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Basic parsing works immediately with no API key or backend.

### Full stack (with AI mode)

**1. Install all dependencies**

```bash
./setup.sh
```

This creates a `.venv` in the project root and installs both Python and Node dependencies.

**2. Configure environment variables**

```bash
# Backend
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...        # Required for AI parsing
API_SECRET=your-random-secret       # Shared secret between frontend and backend
ALLOWED_ORIGIN=http://localhost:3000 # CORS allowed origin
```

```bash
# Frontend
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env`:

```env
BACKEND_URL=http://localhost:8000   # Python backend URL (server-side only)
API_SECRET=your-random-secret       # Must match backend API_SECRET
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**3. Start both servers**

```bash
# Terminal 1 — Python backend
./start.sh backend
# Starts uvicorn at http://localhost:8000

# Terminal 2 — Next.js frontend
./start.sh frontend
# Starts Next.js at http://localhost:3000
```

**4. Use AI mode**

Open [http://localhost:3000](http://localhost:3000), upload a paystub, enable the **Claude AI** toggle, and click Parse.

---

## Deploying

### Frontend — Vercel

1. Push the repo to GitHub.
2. Import the project in Vercel. Set the root directory to `frontend`.
3. Add environment variables in the Vercel dashboard:

| Variable | Value |
|---|---|
| `BACKEND_URL` | Your Railway/Render backend URL |
| `API_SECRET` | Same secret as backend |
| `NEXT_PUBLIC_BASE_URL` | Your Vercel deployment URL |

### Backend — Railway

1. Create a new Railway project, connect the repo, set the root directory to `backend`.
2. Railway auto-detects Python via `nixpacks.toml` (which installs the `tesseract` system package).
3. Set the start command to:
   ```
   uvicorn server:app --host 0.0.0.0 --port $PORT
   ```
4. Add environment variables in Railway:

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic key |
| `API_SECRET` | Same secret as frontend |
| `ALLOWED_ORIGIN` | Your Vercel frontend URL |

### Backend — Other hosts (Render, Fly.io, VPS)

Any Python host works. Requirements:
- Python 3.10+
- `tesseract` system package installed
- Environment variables above
- Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`

---

## Environment Variables Reference

### `frontend/.env`

| Variable | Description |
|---|---|
| `BACKEND_URL` | Python backend URL — server-side only, never exposed to the browser |
| `API_SECRET` | Shared secret added to all proxy requests to the backend |
| `NEXT_PUBLIC_BASE_URL` | Public site URL used for OG tags and canonical links |

### `backend/.env`

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude Haiku |
| `API_SECRET` | All requests must include `X-API-Secret: <value>` or get a 401 |
| `ALLOWED_ORIGIN` | CORS allowed origin (your frontend URL) |

---

## Security

- The browser never talks directly to the Python backend. All requests go through Next.js server-side proxy routes that inject the `X-API-Secret` header.
- The backend rejects any request missing or with a wrong `X-API-Secret`.
- CORS is restricted to `ALLOWED_ORIGIN`.
- File uploads are validated by magic bytes (not just extension) and capped at 20 MB.
- Rate limiting: 20 requests/minute per IP on `/jobs` and `/parse`.
- API docs (`/docs`, `/redoc`) are disabled in production.
- Uploaded files are never written to disk — processed in memory and discarded.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| PDF extraction (browser) | PDF.js |
| OCR (browser) | Tesseract.js |
| PDF extraction (backend) | PyMuPDF (fitz) |
| OCR (backend) | pytesseract + Pillow |
| AI extraction | Anthropic Claude Haiku 4.5 |
| Backend framework | FastAPI + uvicorn |
| Rate limiting | slowapi |
| Excel export | ExcelJS |
| Deployment | Vercel (frontend) + Railway (backend) |

---

## License

MIT
