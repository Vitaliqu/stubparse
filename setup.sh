#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "========================================"
echo "  StubParse — Setup"
echo "========================================"

# ── Backend ───────────────────────────────
echo ""
echo "[1/2] Installing Python dependencies..."
cd "$ROOT/backend"
pip3 install -r requirements.txt --break-system-packages 2>/dev/null || pip3 install -r requirements.txt

if [ ! -f "$ROOT/backend/.env" ]; then
  cp "$ROOT/backend/.env.example" "$ROOT/backend/.env"
  echo ""
  echo "  Created backend/.env from .env.example"
  echo "  → Set ANTHROPIC_API_KEY and API_SECRET in backend/.env"
fi

# ── Frontend ──────────────────────────────
echo ""
echo "[2/2] Installing frontend dependencies..."
cd "$ROOT/frontend"
npm install

if [ ! -f "$ROOT/frontend/.env" ]; then
  cp "$ROOT/frontend/.env.example" "$ROOT/frontend/.env"
  echo ""
  echo "  Created frontend/.env from .env.example"
  echo "  → Set API_SECRET in frontend/.env (must match backend)"
fi

echo ""
echo "[done] Setup complete!"
echo ""
echo "========================================"
echo "  Next steps:"
echo "  1. Add ANTHROPIC_API_KEY to backend/.env"
echo "  2. Set a matching API_SECRET in both .env files"
echo "  3. Start backend:  ./start.sh backend"
echo "  4. Start frontend: ./start.sh frontend"
echo "========================================"
