@echo off
echo =========================================================
echo   CryptoTrace - Forensics ^& Security Engine Launcher
echo =========================================================

REM 1. Activate or create Python virtual environment
if not exist ".venv\Scripts\python.exe" (
    echo [1/3] Creating Python virtual environment...
    python -m venv .venv
    .\.venv\Scripts\pip install fastapi "uvicorn[standard]" requests networkx pydantic base58 pytest python-dotenv reportlab scikit-learn httpx
) else (
    echo [1/3] Using existing Python virtual environment (.venv)
)

REM 2. Start FastAPI Backend on http://localhost:8000
echo [2/3] Starting FastAPI Backend on http://localhost:8000 ...
start "CryptoTrace Backend" cmd /k ".\.venv\Scripts\python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

REM 3. Start Vite React Frontend on http://localhost:5173
if exist "frontend\package.json" (
    echo [3/3] Starting React Frontend on http://localhost:5173 ...
    if not exist "frontend\node_modules" (
        cd frontend && npm install && cd ..
    )
    start "CryptoTrace Frontend" cmd /k "cd frontend && npm run dev"
)

echo.
echo CryptoTrace is launching!
echo - Backend API ^& Swagger Docs: http://localhost:8000/docs
echo - Frontend Dashboard:         http://localhost:5173
pause
