# CryptoTrace — Blockchain Forensics & End-Receiver Intelligence Engine

**CodeSpark 2026 | Domain: Blockchain + Cybersecurity**

CryptoTrace traces illicit cryptocurrency flows across multi-hop laundering topologies (fan-out mixers, consolidation hubs, 5-hop peel chains), ranks the most probable end receivers with explainable attribution confidence and a 5-component cyber-risk score, detects adversarial anti-forensic traps (`DUSTING`, `LOOKALIKE` address poisoning, and `DECOY` micro-edges), and seals every investigative step in a court-admissible SHA-256 hash-chained audit log.

---

## Quick Start (One Command)

### Windows
```powershell
.\run.bat
```

### Linux / macOS
```bash
chmod +x run.sh && ./run.sh
```

---

## Manual Setup & Run Steps

### 1. Backend (FastAPI + NetworkX)
```powershell
python -m venv .venv
.\.venv\Scripts\activate   # Linux/macOS: source .venv/bin/activate
pip install fastapi "uvicorn[standard]" requests networkx pydantic base58 pytest python-dotenv reportlab scikit-learn httpx

# Start the backend server on http://localhost:8000
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend (React + Vite + vis-network)
```powershell
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

### 3. Run Automated Tests (`pytest`)
```powershell
.\.venv\Scripts\python -m pytest backend/tests/ -v
```

---

## API Endpoints (Frozen Contract)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check (`{"status": "ok"}`) |
| `POST` | `/trace` | Run full 8-step forensics, adversarial detection, taint ranking & risk scoring |
| `GET` | `/audit` | Retrieve all SHA-256 hash-chained audit entries |
| `GET` | `/audit/verify` | Verify integrity of the entire hash chain (`valid`, `broken_at`, `message`) |
| `POST` | `/audit/tamper` | **DEMO ONLY:** Tamper with an entry in memory to demonstrate live tamper detection |
| `POST` | `/audit/reset` | Reset the audit chain between demo runs |
| `GET` | `/audit/certificate` | Export court-ready cryptographic Chain-of-Custody Certificate |

---

## Architecture & Team Modules

- **P1 (Data & Backend Lead):** `backend/main.py`, `backend/chain_client.py`, `backend/sample_loader.py`, `backend/graph_builder.py`, `backend/data/sample_scenario.json`, `backend/data/example_response.json`
- **P2 (Forensics Brain):** `backend/heuristics.py`, `backend/taint.py`, `backend/scoring.py`, `backend/data/labels.json`, `backend/tests/test_heuristics.py`, `METHODOLOGY.md`, `QA_FORENSICS.md`
- **P3 (Security Layer):** `backend/security.py`, `backend/audit_log.py`, `backend/audit_routes.py`, `backend/tests/test_security.py`, `backend/tests/test_audit.py`, `SECURITY_QA.md`
- **P4 (Frontend & Story):** `frontend/`, `SLIDES.md`, `slides.html`, `DEMO_SCRIPT.md`
