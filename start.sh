#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
TARGET="${1:-backend}"

case "$TARGET" in
  backend)
    echo ""
    echo "========================================"
    echo "  StubParse — Backend"
    echo "  http://localhost:8000"
    echo "========================================"
    echo ""
    cd "$ROOT/backend"
    uvicorn server:app --reload --host 0.0.0.0 --port 8000
    ;;
  frontend)
    echo ""
    echo "========================================"
    echo "  StubParse — Frontend"
    echo "  http://localhost:3000"
    echo "========================================"
    echo ""
    cd "$ROOT/frontend"
    npm run dev
    ;;
  *)
    echo "Usage: ./start.sh [backend|frontend]"
    exit 1
    ;;
esac
