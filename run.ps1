# CryptoTrace AI - PowerShell Launch Script
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "      CryptoTrace AI - Autonomous Forensics Console      " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Start FastAPI Backend in a new PowerShell window
Write-Host "[1/2] Starting FastAPI Backend on http://localhost:8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; Write-Host '--- CryptoTrace Backend ---' -ForegroundColor Cyan; .\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

# 2. Wait 2 seconds for backend initialization
Start-Sleep -Seconds 2

# 3. Start Vite React Frontend in a new PowerShell window
Write-Host "[2/2] Starting Vite Frontend on http://localhost:5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; Write-Host '--- CryptoTrace Frontend ---' -ForegroundColor Green; npm run dev"

# 4. Open Default Web Browser
Start-Sleep -Seconds 2
Write-Host "Opening web browser at http://localhost:5173..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"

Write-Host "CryptoTrace AI is up and running!" -ForegroundColor Green
