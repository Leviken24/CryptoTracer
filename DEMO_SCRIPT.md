# CryptoTrace - 4-Minute Live Demo Pitch Script
**Hackathon:** CodeSpark 2026 | **Track:** Blockchain + Cybersecurity  
**Team Roles:** P1 (Backend), P2 (Forensics Brain), P3 (Security Layer), P4 (Frontend & Pitch Lead)

---

### ⏱️ Timeline & Presentation Flow (Total: 4:00)

| Time | Segment | Speaker | Screen Action | Key Talking Points |
|---|---|---|---|---|
| **0:00 - 0:20** | **The Hook** | **P4** | Open `http://localhost:5173` showing clean dashboard | "When ransomware strikes, attackers don't just hold Bitcoin—they launder it through peel chains and mixers. Standard explorers show overwhelming raw hashes. CryptoTrace transforms raw blockchain chaos into actionable risk intelligence." |
| **0:20 - 0:50** | **The Trace** | **P4** | Click **"Run Demo Flow"** (or Trace) | "Here is a real ransomware extortion wallet. With one click, our engine traverses 5+ hops, resolving hundreds of inputs and outputs into a directed topological graph with proportional taint tracking." |
| **0:50 - 1:20** | **Forensic Attribution** | **P2** | Switch to **Findings Tab**, hover Peel Chain & Mixer nodes | "Notice what our heuristics immediately detected: a structured 8-output CoinJoin mixer fan-out, followed by a 5-hop peel chain peeling 8% per hop to evade automated thresholds." |
| **1:20 - 1:50** | **Ranked End-Receivers** | **P2** | Click **End-Receivers Tab**, click **#1 Ranked Wallet** | "Rather than guessing, our taint propagation ranks candidate off-ramps. Look at Wallet #1: 91% confidence, holding 47% of dirty funds, terminating directly at an identified ExchangeX deposit. Clicking highlights the exact critical path in gold." |
| **1:50 - 2:30** | **Adversarial Security Layer** | **P3** | Click **Findings Tab**, highlight Dusting & Lookalike | "Criminals don't play fair. They poison trails. CryptoTrace actively flags adversarial attacks: 15 dust transactions sent to confuse clustering, an address poisoning lookalike mirroring the exchange wallet, and low-value decoy edges." |
| **2:30 - 3:10** | **Chain-of-Custody Audit** | **P3** | Click **Audit Chain Tab**, click **DEMO: Tamper**, then **Verify Chain** | "Evidence must hold up in court. Every API response and score is cryptographically hashed into an immutable SHA-256 chain. Watch this: if someone tampers with evidence in memory, clicking Verify instantly turns bright red: *Tamper Detected at Entry 0*." |
| **3:10 - 3:40** | **Live Mode & Resilience** | **P1** | Toggle to Live Mode (or show offline cache) | "CryptoTrace runs fully offline in venue conditions, but can switch seamlessly to live Blockstream & Mempool.space nodes with dual-source validation and rate-limit backoff." |
| **3:40 - 4:00** | **Impact & Close** | **P4** | Click **Print Report**, open **Slides** | "CryptoTrace bridges raw cryptography and court-admissible law enforcement intelligence. Next on our roadmap: Ethereum/EVM bridge tracing, Neo4j clustering, and automated ML anomaly classification. Thank you!" |

---

### 💡 Rehearsal Tips for the Team
1. **P4 Controls the Laptop**: Keep mouse movements smooth. Do not click frantically.
2. **One Click Highlights**: When P2 talks about Wallet #1, P4 clicks the card so the golden path lights up on the screen right on cue.
3. **The Tamper Moment**: When P3 says "Watch this", click **DEMO: Tamper**. The banner flashes red immediately—judges love this visual evidence of chain-of-custody.
4. **Offline Safety**: Always present in Sample mode on localhost so poor conference Wi-Fi cannot ruin the pitch.
