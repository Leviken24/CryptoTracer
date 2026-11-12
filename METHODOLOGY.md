# CryptoTrace Forensics Methodology - Enterprise Intelligence Grade

CryptoTrace turns raw Bitcoin transaction graphs into court-admissible forensic intelligence. This document explains our multi-layered detection heuristics, mathematical scoring engines, and graph-theoretic models in plain English.

---

## 1. Multi-Hop Peel Chain Detection
Illicit actors avoid moving large sums in single transfers. Instead, they "peel" small fractions (< 15%) into intermediary cash-out wallets while passing the bulk (85%+) along a succession of unspent change addresses.
- **Heuristic**: Identifies consecutive 1-input, 2-output transactions where one output is small (< 15%) and the large output is repeatedly forwarded into the same pattern.
- **Threshold**: Requires a sequence length of $\ge 3$ consecutive hops to trigger a high-severity `PEEL_CHAIN` finding.
- **Edge Tagging**: Peels are tagged `PEEL`; continuing stash edges are tagged `PEEL_CONTINUATION`.

---

## 2. Programmatic Script & Bot Timing Detection
Human wallet users exhibit natural variance in transaction timing. Automated laundering syndicates (such as ransomware extortion cartels) execute laundering scripts using programmed cron schedules.
- **Temporal Analysis**: Calculates the coefficient of variation ($\text{CV} = \sigma / \mu$) across consecutive hop intervals ($\Delta t$).
- **Trigger**: When consecutive hops occur at regular intervals (e.g. constant 600-second pauses with low variance), CryptoTrace flags an `AUTOMATED_SCRIPT` finding.

---

## 3. Network Science & Money Mule Detection
In modern cybercrime rings, funds pass through intermediary bridge addresses ("money mules") connecting disparate clusters.
- **Betweenness Centrality**: We evaluate the graph-theoretic betweenness centrality of every address in the transaction network:
  $$C_B(v) = \sum_{s \ne v \ne t} \frac{\sigma_{st}(v)}{\sigma_{st}}$$
- **Money Mule Identification**: Non-exchange addresses with disproportionately high betweenness are flagged with the `MONEY_MULE` tag as critical routing bottlenecks.

---

## 4. Dual-Perspective Taint Accounting
CryptoTrace computes two distinct industry standards for taint tracking:

### A. Proportional Taint (Academic & Regulatory Standard)
Preserves mathematical conservation of mass:
$$\text{Taint Ratio} = \frac{\text{Tainted Input BTC}}{\text{Total Input BTC}}$$
$$\text{Output Taint} = \text{Output BTC} \times \text{Taint Ratio}$$

### B. Strict Poison Taint (Law Enforcement & OFAC Standard)
Binary attribution tracking: if even a single dirty satoshi touches an address, the address is flagged as tainted for emergency asset freezing.

---

## 5. End-Receiver Confidence Scoring
To identify where stolen funds landed, we compute a normalized confidence score:

$$\text{Confidence} = \text{clamp}\Big(0.50 \cdot \text{Taint Share} + 0.20 \cdot \text{Leaf/Exchange} + 0.15 \cdot \text{Peel Branch} + 0.15 \cdot \text{Label Bonus} - 0.20 \cdot \text{Decoy Penalty}\Big)$$

- **Taint Share (50%)**: Proportional share of the original stolen capital.
- **Leaf / Exchange (20%)**: Bonus if wallet is an unspent resting place or verified exchange cash-out deposit point.
- **Peel Main Branch (15%)**: Bonus if address is fed directly by the peel chain continuation.
- **Label Bonus (15%)**: Bonus if address matches recognized entity databases.
- **Decoy Penalty (-20%)**: Deducted if address is connected to adversarial dusting or decoy transactions.

---

## 6. Composite Cyber-Risk Score & Compliance Mandates
Every address and graph node receives an objective risk score:

$$\text{Risk} = 100 \times \Big(0.30 \cdot \text{Mixer} + 0.30 \cdot \text{Sanction} + 0.20 \cdot \text{Ransomware} + 0.10 \cdot \text{Peel Depth} + 0.10 \cdot \text{Adversarial}\Big)$$

Each score maps directly to an automated compliance tier:
- **$\ge 80$ (Critical Risk)**: `IMMEDIATE_ASSET_FREEZE_AND_SAR_FILING`
- **$60–79$ (High Risk)**: `BLOCK_TRANSACTION_AND_ENHANCED_DUE_DILIGENCE`
- **$40–59$ (Elevated Risk)**: `FLAG_FOR_MANUAL_COMPLIANCE_REVIEW`
- **$< 40$ (Low / Moderate Risk)**: `ROUTINE_MONITORING`

---

## 7. Court-Admissible Forensic Dossier Export
The engine includes a formal incident reporter compiling:
1. Executive case attribution and primary targets
2. High-severity laundering modus operandi matrix
3. Critical chain of custody money trail with timestamps and transaction hashes
4. Actionable subpoena recommendations for centralized exchange compliance teams
