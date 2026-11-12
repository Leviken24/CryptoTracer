# CryptoTrace — Security & Chain-of-Custody Q&A (P3 — Enterprise Edition)

## 10 Likely Judge Questions & Winning Answers

### 1. What if the blockchain API lies, gets hacked, or serves manipulated balances?
**Answer:** We treat external blockchain APIs as untrusted. `security.validate_response()` enforces strict schema validation, non-negative amount checks, cryptographic 64-hex `txid` checks, **value conservation** ($\sum \text{outputs} \le \sum \text{inputs}$, catching artificial inflation), and a **dual-source consensus cross-check** (`blockstream.info` vs `mempool.space`) that flags any discrepancy in output counts or satoshi amounts.

### 2. How does your hash-chained audit log work, and why is it court-admissible?
**Answer:** Every pipeline step appends an immutable entry whose SHA-256 hash covers `idx | ts | action | payload_hash | prev_hash`, starting from a 64-zero Genesis `prev_hash`. Because each entry locks in the cryptographic hash of the previous step, modifying even a single byte in memory breaks the hash link at that exact index. We also provide a `/audit/certificate` endpoint that exports a full **Forensic Chain-of-Custody Certificate** comparing recorded vs. recomputed SHA-256 hashes step by step.

### 3. How is the audit log 100% reproducible across independent investigators?
**Answer:** Every step's payload is canonicalized with `json.dumps(payload, sort_keys=True)` before SHA-256 hashing. Re-running the same trace in sample mode produces the exact same `payload_hash`, `hash` sequence, and Merkle-style `chain_fingerprint` every single time.

### 4. What is a dusting attack, and how does your detector go beyond basic threshold checks?
**Answer:** In a dusting attack, an adversary broadcasts tiny amounts of Bitcoin ("dust", $\le 1,000$ satoshis / $0.00001$ BTC) to $\ge 10$ wallets in a single transaction hoping victims accidentally spend the dust alongside their real UTXOs—falsely merging unrelated wallets under common-input-ownership clustering. Our `DUSTING` detector not only flags transactions sending $\le 0.00001$ BTC to $\ge 10$ addresses, it also cross-references the graph to identify **which active trace hop** (e.g., `P2`) was targeted for cluster poisoning.

### 5. What is address poisoning (look-alike address spoofing), and how do you attribute the attacker vs. the victim?
**Answer:** Attackers use vanity address generators to craft a spoofed address matching the first 4 and last 4 characters of a victim's real counterparty (after the `bc1q` prefix) and send a tiny transaction so the victim copies the wrong address from their transaction history. Our `LOOKALIKE` detector strips the protocol prefix (`bc1q` or legacy version char), matches first-4 and last-4 body characters, calculates the exact prefix/suffix match length and middle-character divergence, and uses **chronological transaction timestamps** to automatically distinguish the legitimate counterparty (`E1`) from the attacker's spoofed look-alike (`E1X`).

### 6. What is a decoy edge, and why do you prune it from ranking while keeping it visible?
**Answer:** Laundering syndicates inject sub-$0.1\%$ micro-transfers to random dead-end wallets to create false branches and waste investigators' time. Our `DECOY` detector flags any edge below $0.1\%$ of the peak transaction flow (excluding already-flagged dusting transactions), tags the edge `"DECOY"` so `taint.py` applies a $-0.20$ confidence penalty, and reports its exact percentage of peak flow (e.g., `0.0002% of peak flow`).

### 7. How do you validate user inputs before touching any network API or graph?
**Answer:** `security.validate_input()` enforces four layers of defense:
1. **Private Key Guard:** Immediately blocks accidental submission of WIF (`5H/5J/5K/K/L`) or extended private keys (`xprv/yprv/zprv`) so users never leak secrets.
2. **64-Hex TXID Verification:** Validates 64-character hexadecimal transaction hashes and rejects null coinbase hashes (`00...00`).
3. **BIP-173 / BIP-350 Bech32 & Bech32m Polymod Checksum:** Runs the full generator polynomial checksum algorithm on real SegWit (`bc1q...`) and Taproot (`bc1p...`) addresses to catch single-character typos, while seamlessly recognizing offline synthetic test addresses.
4. **Legacy Base58Check Verification:** Decodes and verifies the 4-byte double-SHA256 checksum and network version byte (`0x00`, `0x05`, `0x6F`, `0xC4`).

### 8. How does the Security Layer feed into the Cyber-Risk Score?
**Answer:** `security.adversarial_score(graph, findings)` computes a normalized $0..1$ score (`LOOKALIKE` $= +0.40$, `DUSTING` $= +0.30$, `DECOY` $= +0.30$) that feeds directly into P2's `scoring.py` formula ($10\%$ weight), and `security.risk_score_breakdown()` provides a **5-component cybersecurity breakdown**:
- `address_poisoning_risk`
- `dusting_attack_risk`
- `decoy_evasion_risk`
- `peel_and_obfuscation_risk`
- `api_integrity_risk`

### 9. Is this tool legal and ethical?
**Answer:** Yes—100% of our data comes from public Bitcoin blockchain records and public sanctions/label lists. Our output is explainable, probabilistic risk intelligence for compliance analysts and law enforcement, never an automated accusation.

### 10. Why is the `/audit/tamper` endpoint in the backend?
**Answer:** `/audit/tamper` is strictly a **demo-only** endpoint built for the live stage presentation so judges can watch `/audit/verify` and `/audit/certificate` turn from green (`"Chain intact"`) to red (`"Tampered at entry 4"`) in real time when a single byte in memory is modified.

---

## 30-Second Spoken Script for the Live Stage Demo (P3)

> *"Standard block explorers trust raw data blindly—criminals know this and plant traps to break forensic tools.
> On the left, our **Adversarial Security Layer** automatically neutralized three active traps in this laundering trail:
> First, a **546-satoshi dusting attack** across 15 wallets specifically targeting hop `P2` to poison common-input clustering.
> Second, a **look-alike address poisoning attack**, where our chronological analyzer proved `E1X` was generated later to spoof the first and last 4 characters of the real `ExchangeX` deposit address.
> Third, a **600-satoshi decoy edge** representing just `0.0002%` of peak flow, which we flagged and pruned from ranking.
> Finally, on the right is our **SHA-256 Hash-Chained Audit Log** and **Chain-of-Custody Certificate**. Right now, **Verify** is green (`Chain intact`). Watch what happens if an insider alters a single record in memory—I click **Tamper**, then **Verify**: it immediately turns red and pinpoints `Tampered at entry 4`. One click on **Reset**, and we're ready for the next investigation."*
