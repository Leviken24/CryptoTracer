#!/usr/bin/env bash
set -e

echo "========================================================="
echo "  CryptoTrace - Forensics & Security Engine Launcher"
echo "========================================================="

if [ ! -d ".venv" ]; then
  echo "[1/3] Creating Python virtual environment..."
  python3 -m venv .venv
  source .venv/bin/activate
  pip install fastapi "uvicorn[standard]" requests networkx pydantic base58 pytest python-dotenv reportlab scikit-learn httpx
else
  source .venv/bin/activate
fi

echo "[2/3] Starting FastAPI Backend on http://localhost:8000 ..."
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

if [ -f "frontend/package.json" ]; then
  echo "[3/3] Starting React Frontend on http://localhost:5173 ..."
  cd frontend
  if [ ! -d "node_modules" ]; then
    npm install
  fi
  npm run dev &
  FRONTEND_PID=$!
  cd ..
fi

trap "kill $BACKEND_PID ${FRONTEND_PID:-} 2>/dev/null || true" EXIT
wait
