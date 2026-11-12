# CryptoTrace AI 🛡️⚡

> **An Explainable, Cybersecurity-Driven Blockchain Forensics & Investigation Decision-Support System**

CryptoTrace AI empowers cybercrime investigators, AML compliance officers, and forensic analysts to trace suspicious cryptocurrency transactions, de-anonymize adversarial laundering structures (peel chains, mixers, dusting attacks, look-alike address poisoning), rank probable end-receivers with probabilistic taint math, and produce court-admissible, tamper-evident forensic PDF dossiers anchored by a SHA-256 Merkle chain of custody.

---

## 🏛️ Architecture Overview

```
                                  [ User / Web Browser ]
                                             │
                                    (React 19 + Vite)
                        ┌────────────────────┴────────────────────┐
                        │   CryptoTrace AI SaaS Console           │
                        │  - Flow Trail / Force-Directed Graph    │
                        │  - Ranked End-Receivers Intelligence    │
                        │  - Explainable Heuristic Breakdown      │
                        │  - Tamper-Evident Chain of Custody      │
                        └────────────────────┬────────────────────┘
                                             │ HTTP REST / JSON
                                             ▼
                        ┌─────────────────────────────────────────┐
                        │        FastAPI Forensics Engine         │
                        │  (Python 3.10+, SQLite, NetworkX)       │
                        ├─────────────────────────────────────────┤
                        │ 1. Security Layer (Regex & Base58 Check)│
                        │ 2. Modular Data Collector (Blockstream) │
                        │ 3. Directed Graph Builder (MultiDiGraph)│
                        │ 4. Adversarial Detectors (Dust/Decoy)   │
                        │ 5. Forensics Heuristics (Peel/Mixer)    │
                        │ 6. Proportional Taint & Risk Scoring    │
                        │ 7. Tamper-Evident SHA-256 Audit Chain   │
                        │ 8. ReportLab Court-Admissible PDF Engine│
                        └────────────────────┬────────────────────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
            [ SQLite Repository ]                       [ Public Blockchain APIs ]
            - investigations.db                         - Blockstream Info (BTC)
            - Persistent Case Ledger                    - Mempool.space (BTC)
            - Forensic Results JSON                     - Etherscan (ETH)
```

---

## 🎯 3-Phase Development Approach

1. **Phase 1: Core Application & Blockchain Investigation**
   - Professional dark-themed SaaS interface (Dashboard, Investigations, Explorer, Risk Intel, Reports & Evidence).
   - Local development authentication with multi-persona switching.
   - NetworkX directed multi-hop graph builder supporting 5+ hops.
   - Investigation lifecycle management backed by persistent SQLite storage.
   - Modular blockchain ingestion with offline deterministic demo fallback.

2. **Phase 2: Forensic Intelligence & Suspicious Pattern Detection**
   - Union-Find common-input clustering ($c_1, c_2, \dots$).
   - 5-Hop peel chain structuring detector.
   - Mixer and equal-denomination distribution heuristics (8-output fan-out, 6-input fan-in).
   - Multi-perspective taint propagation (Proportional Taint + Strict Poison Taint).
   - End-receiver ranking with explainable confidence weights and composite cyber-risk scores.

3. **Phase 3: Cybersecurity, Evidence Integrity & Reporting**
   - Adversarial deception detection: dusting attacks (micro-satoshi spam), look-alike address poisoning, and micro-value decoy edges.
   - Tamper-evident hash-chained audit log with live SHA-256 verification and demo tamper simulation.
   - Automated court-admissible PDF forensic dossier generation using ReportLab.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.10+** (tested on Python 3.11 / 3.15)
- **Node.js 18+** & **npm**

### 1. Backend Setup
```bash
# Navigate to project root
cd cryptotrace

# Activate Python virtual environment
.\.venv\Scripts\activate   # Windows
# or: source .venv/bin/activate  # macOS / Linux

# Run automated test suite
pytest backend/tests

# Launch FastAPI backend
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
The FastAPI backend will start at `http://localhost:8000`. You can inspect interactive Swagger documentation at `http://localhost:8000/docs`.

### 2. Frontend Setup
```bash
# In a separate terminal:
cd frontend

# Start Vite development server
npm run dev
```
Open your browser to `http://localhost:5173`.

### 3. One-Click Launch Scripts
- **Windows**: Double-click `run.bat`
- **Linux / macOS**: Run `./run.sh`

---

## ⚙️ Environment Variables & API Configuration

| Variable | Default Value | Description |
|---|---|---|
| `BLOCKSTREAM_API_URL` | `https://blockstream.info/api` | Primary Bitcoin API endpoint |
| `MEMPOOL_API_URL` | `https://mempool.space/api` | Secondary Bitcoin verification endpoint |
| `ETHERSCAN_API_KEY` | `""` | Optional Etherscan API key for live Ethereum traces |
| `CRYPTOTRACE_DEMO_MODE` | `true` | When enabled, provides rich synthetic offline datasets |

---

## 🔍 Frozen API Contract

The backend adheres strictly to the frozen contract specified in Section 5 of `PROJECT_CONTEXT.md`:

- `POST /trace`: Runs the 8-step forensic pipeline on a target address or transaction hash.
- `GET /health`: Engine status and version info.
- `GET /audit`: Returns the full SHA-256 cryptographic audit chain.
- `GET /audit/verify`: Verifies Merkle linkages and returns `{ "valid": true/false, "broken_at": null/idx }`.
- `POST /audit/tamper`: Modifies an in-memory audit entry to demonstrate tamper detection in court/trials.
- `POST /audit/reset`: Clears the audit chain between investigation sessions.

---

## 🧪 Forensic Heuristic Rules & Formulas

| Heuristic | Algorithmic Rule | Detection Tag |
|---|---|---|
| **Common-Input Ownership** | All input addresses of a single transaction belong to one entity (Union-Find). | `CLUSTER` |
| **Peel Chain** | 1 input, 2 outputs (one $< 15\%$ peeled, one large continuation output spent in identical fashion for $\ge 3$ consecutive hops). | `PEEL_CHAIN` |
| **Mixer Pattern** | $\ge 5$ outputs within $1\%$ of the same value, or $\ge 8$ equal outputs from one source. | `MIXER_PATTERN` / `FAN_OUT` |
| **Dusting Attack** | One transaction sends $\le 0.00001$ BTC to $\ge 10$ distinct addresses simultaneously. | `DUSTING` |
| **Address Poisoning** | Two distinct addresses sharing identical first 4 and last 4 body characters. | `LOOKALIKE` |
| **Decoy Edge** | Value is $< 0.1\%$ of the graph's largest edge; pruned from end-receiver rankings. | `DECOY` |

### Taint & Confidence Formulation
- **Proportional Taint Share**: $\tau_v = \sum_{u \in \text{in}(v)} \text{value}(u \to v) \times \frac{\tau_u}{\text{total\_input}(v)}$
- **Attribution Confidence**: $\text{Conf} = 0.50 \cdot \tau_{\text{share}} + 0.20 \cdot \mathbf{1}_{\text{leaf/exchange}} + 0.15 \cdot \mathbf{1}_{\text{peel\_main}} + 0.15 \cdot \text{label\_bonus} - 0.20 \cdot \mathbf{1}_{\text{decoy}}$
- **Cyber-Risk Score (0–100)**: $100 \times (0.30 \cdot \text{mixer} + 0.30 \cdot \text{sanction} + 0.20 \cdot \text{ransomware} + 0.10 \cdot \text{peel\_depth} + 0.10 \cdot \text{adversarial})$

---

## 🔒 Security & Limitations Notice
- **Authentication**: For this evaluation, authentication is implemented as a local client-side session stored in `localStorage` with persona switching. It is designed for demonstration and should be replaced with OAuth2/OIDC & JWT in production.
- **Offline Reliability**: When public blockchain APIs are unreachable or rate-limited, CryptoTrace AI automatically switches to deterministic forensics mode using realistic synthetic multi-hop scenarios.

---

## 📜 License
Developed for CodeSpark 2026 Blockchain Forensics & Cybersecurity Hackathon. Free and open-source under the MIT License.
