#!/usr/bin/env bash
set -e

echo "========================================================"
echo "      CryptoTrace AI - Autonomous Forensics Engine"
echo "========================================================"

# Start backend
echo "Starting FastAPI Backend on http://localhost:8000 ..."
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Start frontend
echo "Starting Vite React Frontend on http://localhost:5173 ..."
cd frontend && npm run dev &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
