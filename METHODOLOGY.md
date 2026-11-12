# CryptoTrace Forensics Methodology

CryptoTrace turns complex Bitcoin transaction graphs into clear, actionable forensic intelligence. This document explains our detection heuristics, mathematical scoring models, and operational limitations in plain English.

---

## 1. What is a Peel Chain?
When bad actors move illicit cryptocurrency, they avoid transferring all the funds at once. Instead, they "peel" off a small amount (usually under 15%) into a secondary wallet or for spending, while sending the bulk (85%+) to a fresh change address they control. 

This process repeats consecutively across multiple transactions, creating a recognizable pattern called a **peel chain**.
- **Detection Rule**: We identify consecutive 1-input, 2-output transactions where one output is small (< 15%) and the large output continues into the next hop. A chain length of 3 or more hops triggers a high-severity `PEEL_CHAIN` finding.
- **Edge Tagging**: Small payments are tagged `PEEL`; the continuing stash edge is tagged `PEEL_CONTINUATION`.

---

## 2. Proportional Taint Propagation
Blockchains are public, but money mixes with clean coins over time. We calculate **taint** using the industry-standard proportional method:
1. The investigated source wallet starts with a taint value of **1.0 (100%)**.
2. When funds enter a transaction:
   $$\text{Taint Ratio} = \frac{\text{Tainted Input BTC}}{\text{Total Input BTC}}$$
3. Every outgoing address receives a share of taint equal to:
   $$\text{Tainted Output} = \text{Output BTC} \times \text{Taint Ratio}$$
4. **End Receivers**: Addresses holding tainted Bitcoin that have not spent it (leaf wallets) or verified deposit addresses (such as crypto exchanges) are identified as the final destinations.

---

## 3. End-Receiver Confidence Formula
To rank which destination wallet is the true target of the laundered funds, we compute a normalized confidence score between `0.0` and `1.0`:

$$\text{Confidence} = \text{clamp}\Big(0.50 \cdot \text{Taint Share} + 0.20 \cdot \text{Leaf/Exchange} + 0.15 \cdot \text{Peel Branch} + 0.15 \cdot \text{Label Bonus} - 0.20 \cdot \text{Decoy Penalty}\Big)$$

- **Taint Share (50%)**: What fraction of the original stolen funds landed here.
- **Leaf / Exchange (20%)**: High confidence if the wallet is an unspent resting place or a verified exchange cash-out point.
- **Peel Main Branch (15%)**: Bonus if the address terminates the main trunk of a peel chain.
- **Label Bonus (15%)**: Bonus if the address matches known entity registries.
- **Decoy Penalty (-20%)**: Subtracted if the address is connected to low-value dusting or decoy transactions meant to throw off investigators.

---

## 4. Composite Cyber-Risk Score (0–100)
Every address and graph node receives a composite risk score reflecting illicit activity and threat factors:

$$\text{Risk} = 100 \times \Big(0.30 \cdot \text{Mixer} + 0.30 \cdot \text{Sanction} + 0.20 \cdot \text{Ransomware} + 0.10 \cdot \text{Peel Depth} + 0.10 \cdot \text{Adversarial}\Big)$$

- **Mixer (30%)**: Tracing flow through equal-value mixing pools or high-entropy fan-out/fan-in transactions.
- **Sanction (30%)**: Presence of OFAC-sanctioned addresses in the immediate flow.
- **Ransomware (20%)**: Direct linkage to known ransomware extortion wallets.
- **Peel Depth (10%)**: Length and sophistication of multi-hop peel chains.
- **Adversarial (10%)**: Presence of active evasion tactics (dusting, look-alike address poisoning, decoy transactions).

---

## 5. Honest Limitations
*Forensic scores are heuristic probabilities, not absolute legal proof.*
- **CoinJoins & Mixers**: Extreme multi-party mixing breaks deterministic graph links; taint becomes diffuse.
- **Change Address Ambiguity**: Without wallet fingerprints, distinguishing change outputs from merchant payments is probabilistic.
- **Adversarial Poisoning**: Attackers intentionally dust legitimate wallets or use look-alike addresses to confuse forensic tools. CryptoTrace isolates these via adversarial detectors, but human verification remains essential before legal or enforcement actions.
