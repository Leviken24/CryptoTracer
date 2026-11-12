# CryptoTrace — Security & Chain-of-Custody Q&A (P3)

## 10 Likely Judge Questions & Short Answers

### 1. What if the blockchain API lies or gets compromised?
**Answer:** We treat external APIs as untrusted. `security.validate_response()` checks the schema, verifies non-negative amounts, enforces value conservation ($\sum \text{outputs} \le \sum \text{inputs}$), and cross-checks output values against a second independent provider (`mempool.space` vs `blockstream.info`).

### 2. How does your hash-chained audit log work?
**Answer:** Every pipeline step creates an entry whose SHA-256 hash covers `idx | ts | action | payload_hash | prev_hash`, starting from a 64-zero genesis `prev_hash`. Because each entry embeds the previous entry's hash, altering even one character in any past step changes its hash and breaks the chain at that exact index.

### 3. How is the audit log reproducible across runs?
**Answer:** Payloads are canonicalized with `json.dumps(payload, sort_keys=True)` before SHA-256 hashing. Running the same sample scenario twice produces the exact same `payload_hash` and `hash` sequence every time.

### 4. What is a dusting attack, and how do you detect it?
**Answer:** Attackers send tiny amounts of Bitcoin ("dust", $\le 1,000$ satoshis / $0.00001$ BTC) to many wallets ($\ge 10$ outputs in one transaction) hoping victims accidentally spend the dust together with their real funds, linking their addresses via common-input clustering. Our `DUSTING` detector flags any transaction with $\ge 10$ outputs of $\le 0.00001$ BTC so investigators do not falsely cluster those wallets.

### 5. What is address poisoning (look-alike address attack), and how do you detect it?
**Answer:** Attackers generate a vanity address matching the first 4 and last 4 characters of a victim's real counterparty (ignoring the `bc1q` prefix) and send a tiny transaction so the victim copies the wrong address from their history. Our `LOOKALIKE` detector strips the protocol prefix (`bc1q` or legacy version char) and flags any two distinct addresses in the graph sharing the same first 4 and last 4 body characters.

### 6. What is a decoy edge, and why do you prune it from ranking?
**Answer:** Criminals send tiny micro-transfers ($< 0.1\%$ of the main trace value) to random unrelated wallets to pollute the transaction graph and waste investigators' time. Our `DECOY` detector flags edges under $0.1\%$ of the largest edge value (excluding already-flagged dusting transactions) so the UI still displays the edge transparently while `taint.py` penalizes decoy-adjacent paths.

### 7. Is this tool legal and ethical?
**Answer:** Yes—100% of our data comes from public Bitcoin blockchain records and public label lists. Our output is probabilistic risk intelligence with human-readable reasoning for investigators, never an automated legal accusation.

### 8. How does the adversarial layer affect the final Risk and Confidence scores?
**Answer:** `security.adversarial_score(graph, findings)` computes a $0..1$ score from `LOOKALIKE` ($+0.4$), `DUSTING` ($+0.3$), and `DECOY` ($+0.3$) findings, which contributes $10\%$ to the overall $0..100$ cyber-risk score, while decoy adjacency reduces end-receiver confidence by $0.20$.

### 9. How do you validate user inputs before touching the network or graph?
**Answer:** `security.validate_input()` strictly validates inputs before any API call: 64 hexadecimal characters are accepted as a `txid`, Bech32 addresses (`bc1...`/`tb1...`) are checked against the Bech32 character set and case rules, and legacy addresses (`1...`, `3...`) are verified using full Base58Check cryptographic checksum decoding.

### 10. Why is the `/audit/tamper` endpoint in the app?
**Answer:** `/audit/tamper` is strictly a **demo-only** endpoint built for the live stage presentation so judges can watch `/audit/verify` turn from green (`"Chain intact"`) to red (`"Tampered at entry 4"`) in real time when a single byte in memory is modified.

---

## 30-Second Spoken Script for the Live Tamper Demo (P3 on Stage)

> *"Criminal investigators need more than a graph—they need **chain of custody** that holds up in court, and defense against **adversarial tricks**.
> On the left, our security layer automatically caught three traps planted by the launderer: a **546-satoshi dusting attack** across 15 wallets, a **look-alike address poisoning** attempt copying the first and last 4 characters of the exchange deposit address, and a **600-satoshi decoy edge** meant to throw off taint tracking.
> On the right is our **SHA-256 hash-chained audit log**, recording every step from input validation to final ranking. Right now, when I click **Verify**, the chain is green and intact.
> Watch what happens if an insider tries to alter a single record in memory—I click **Tamper**, then **Verify** again: it immediately turns red and pinpoints the exact broken link (`Tampered at entry 4`). And with one click on **Reset**, we are clean for the next trace."*

---

## 3-Sentence Memory Summary of the Hash Chain

1. Every step of our investigation—from input validation to final ranking—is hashed with `SHA-256` over its index, timestamp, action name, canonical JSON payload hash, and the previous step's hash.
2. Because each entry locks in the fingerprint of the entry before it starting from 64 zeros, nobody can edit, delete, or reorder a past step without changing every hash that follows.
3. Calling `verify()` recomputes every link from Genesis in milliseconds and immediately flags the exact entry index where any tampering occurred.
