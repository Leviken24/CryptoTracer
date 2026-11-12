@echo off
echo ========================================================
echo       CryptoTrace AI - Autonomous Forensics Engine
echo ========================================================
echo Starting FastAPI Backend on http://localhost:8000 ...
start "CryptoTrace Backend" cmd /k ".\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

echo Starting Vite React Frontend on http://localhost:5173 ...
cd frontend
npm run dev
