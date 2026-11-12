# CryptoTrace - PROJECT CONTEXT (AI agent: read this first, every time)

## 1. What we are building
CryptoTrace is a blockchain forensics tool for a 6-hour hackathon (CodeSpark 2026, Blockchain + Cybersecurity).
The user pastes a Bitcoin wallet address or transaction id. We fetch transactions, build a multi-hop graph, apply
forensic heuristics (clustering, peel chains, mixer patterns), rank the most probable END RECEIVERS with a confidence
score and a cyber-risk score, detect adversarial tricks (dusting, look-alike addresses, decoy transactions), and
record every step in a tamper-evident hash-chained audit log. Public blockchain data only.

## 2. Rules for the AI agent
- The human is a complete beginner. Explain in simple English. Explain any jargon in one line.
- Do the work yourself: create files, run commands, fix errors. Do not just hand over a list of commands.
- Edit ONLY the files owned by the person you are helping (section 3). If another file needs a change, write a short
  message the human can send to that owner.
- NEVER rename or remove fields in the contract (section 5). Optional new fields only if the team agrees.
- Free tools only. No API keys. Never hardcode secrets.
- Stack: Python 3.10+, FastAPI, NetworkX (backend). React (Vite) + vis-network (frontend).
- Keep code simple, commented, runnable. Everything must work OFFLINE in sample mode.
- After each task end with: What I did / How to check it works / What to do next.
- Never use git force push. Commit small and often.

## 3. Folder structure and owners
```
cryptotrace/
  PROJECT_CONTEXT.md
  README.md                         (P1)
  run.sh  run.bat                   (P1)
  backend/
    main.py                         (P1)  FastAPI app, /health, /trace
    chain_client.py                 (P1)  Blockstream API + cache + second source
    sample_loader.py                (P1)
    graph_builder.py                (P1)
    heuristics.py                   (P2)
    taint.py                        (P2)
    scoring.py                      (P2)
    security.py                     (P3)
    audit_log.py                    (P3)
    audit_routes.py                 (P3)
    data/
      sample_scenario.json          (P1)
      example_response.json         (P1)
      labels.json                   (P2)
      cache/                        (auto-created, git-ignored)
    tests/
      test_heuristics.py            (P2)
      test_security.py              (P3)
      test_audit.py                 (P3)
  frontend/                         (P4)  React + Vite + vis-network
  METHODOLOGY.md  QA_FORENSICS.md   (P2)
  SECURITY_QA.md                    (P3)
  SLIDES.md  slides.html  DEMO_SCRIPT.md   (P4)
```
Pipeline inside POST /trace (P1 wires it, AI agents fill one box each):
1. security.validate_input  (P3)  ->  2. fetch: sample loader or chain_client (P1)  ->  3. security.validate_response (P3)
-> 4. graph_builder.build_graph (P1)  ->  5. security.run_detectors (P3)  ->  6. heuristics.run (P2)
-> 7. taint.rank_end_receivers + scoring.score (P2)  ->  8. audit.append after EVERY step (P3)

## 4. Data formats
Transaction (values are BTC as decimal numbers; chain_client converts satoshis by dividing by 100,000,000):
```json
{"txid": "<64 hex chars>", "ts": 1700000000,
 "inputs":  [{"address": "bc1q...", "value": 1.5}],
 "outputs": [{"address": "bc1q...", "value": 1.4999}]}
```
Sample file: `{"aliases": {"S": "<address>", "E1": "<address>"}, "source": "<address>", "txs": [ ...transactions... ]}`

Graph: `networkx.MultiDiGraph`.
- Node attributes: type ("address"), label (str or ""), cluster (str like "c3"), tags (list of str), risk (0-100), taint (0..1).
- Edge attributes: txid, value (BTC), ts, tags (list of str). For each tx, for each distinct input address i and each
  output o: add edge i -> o.address with value = o.value * (i.value / total_input_value).
- graph.graph["txs"] = list of transactions, graph.graph["source"] = source address, graph.graph["truncated"] = bool.

## 5. API contract (FROZEN)
Endpoints: `POST /trace`, `GET /health`, `GET /audit`, `GET /audit/verify`, `POST /audit/tamper`, `POST /audit/reset`.

`POST /trace` body: `{"input": "<btc address or txid>", "hops": 4, "mode": "sample" | "live"}`

Example response (also saved as backend/data/example_response.json by P1):
```json
{
  "graph": {
    "nodes": [
      {"id": "bc1qsrc0000000000000000000000000000000000", "type": "address", "label": "Reported ransom wallet",
       "cluster": "c1", "tags": [], "risk": 70, "taint": 1.0},
      {"id": "bc1qmix1111111111111111111111111111111111", "type": "address", "label": "",
       "cluster": "c2", "tags": ["FAN_OUT"], "risk": 60, "taint": 0.12},
      {"id": "bc1qpeel222222222222222222222222222222222", "type": "address", "label": "",
       "cluster": "c3", "tags": ["PEEL_CHAIN"], "risk": 66, "taint": 0.45},
      {"id": "bc1qexch333333333333333333333333333333333", "type": "address", "label": "ExchangeX Deposit",
       "cluster": "c4", "tags": ["EXCHANGE"], "risk": 88, "taint": 0.47}
    ],
    "edges": [
      {"from": "bc1qsrc0000000000000000000000000000000000", "to": "bc1qmix1111111111111111111111111111111111",
       "txid": "aa11aa11aa11aa11aa11aa11aa11aa11aa11aa11aa11aa11aa11aa11aa11aa11", "value": 0.5, "ts": 1700000000, "tags": ["FAN_OUT"]},
      {"from": "bc1qmix1111111111111111111111111111111111", "to": "bc1qpeel222222222222222222222222222222222",
       "txid": "bb22bb22bb22bb22bb22bb22bb22bb22bb22bb22bb22bb22bb22bb22bb22bb22", "value": 0.45, "ts": 1700000600, "tags": ["PEEL_CONTINUATION"]},
      {"from": "bc1qpeel222222222222222222222222222222222", "to": "bc1qexch333333333333333333333333333333333",
       "txid": "cc33cc33cc33cc33cc33cc33cc33cc33cc33cc33cc33cc33cc33cc33cc33cc33", "value": 0.4, "ts": 1700001200, "tags": ["PEEL_CONTINUATION"]}
    ]
  },
  "findings": [
    {"type": "PEEL_CHAIN", "severity": "high", "text": "Peel chain of 5 hops detected", "nodes": ["bc1qpeel222222222222222222222222222222222"]},
    {"type": "DUSTING", "severity": "medium", "text": "15 outputs of 546 sats", "nodes": []}
  ],
  "ranked": [
    {"address": "bc1qexch333333333333333333333333333333333", "confidence": 0.87, "risk": 91,
     "reasoning": ["Receives 47% of the tainted value", "Labeled as an exchange deposit address", "End of a 5-hop peel chain"],
     "risk_breakdown": {"mixer": 0.8, "sanction": 0.0, "ransomware": 0.6, "peel_depth": 1.0, "adversarial": 0.3}}
  ],
  "audit_head": "9f3c1d0e5a7b2c4d6e8f0a1b3c5d7e9f1a2b4c6d8e0f1a3b5c7d9e1f2a4b6c8d"
}
```
Finding fields: type, severity ("low" | "medium" | "high"), text, nodes (list of addresses).
Audit entry: `{"idx": 0, "ts": 1700000000, "action": "validate_input", "payload_hash": "...", "prev_hash": "...", "hash": "..."}`
`GET /audit` returns a list of entries. `GET /audit/verify` returns `{"valid": true, "broken_at": null, "message": "Chain intact"}`
or `{"valid": false, "broken_at": 4, "message": "Tampered at entry 4"}`.

## 6. Function signatures (all teammates code to these)
```python
# security.py (P3)
validate_input(text: str) -> tuple[bool, str | None, str]      # (ok, "address" | "txid" | None, message)
validate_response(txs: list[dict], second_source: list[dict] | None = None) -> tuple[bool, list[str]]  # (ok, issues)
run_detectors(graph) -> list[dict]                              # findings: DUSTING, LOOKALIKE, DECOY
adversarial_score(graph, findings: list[dict]) -> float         # 0..1
# audit_log.py (P3)
class AuditLog: append(action: str, payload) -> dict; verify() -> dict; tamper(idx: int) -> None; reset() -> None; get_all() -> list[dict]
# heuristics.py (P2)
run(graph, labels: dict) -> tuple[graph, list[dict]]            # adds cluster/label/tags to nodes and edges; returns (graph, findings)
# taint.py (P2)
rank_end_receivers(graph, source: str, top_n: int = 5) -> list[dict]   # address, confidence, taint_share, reasoning
# scoring.py (P2)
score(graph, ranked: list[dict], findings: list[dict]) -> list[dict]   # adds risk + risk_breakdown; also sets node risk
# graph_builder.py (P1)
build_graph(txs: list[dict], source: str, hops: int = 4) -> graph
# chain_client.py / sample_loader.py (P1)
get_address_txs(address) -> list[dict]; get_tx(txid) -> dict; get_tx_second_source(txid) -> dict; load_sample() -> dict
```

## 7. Heuristic rules and formulas (starting thresholds; tune on the sample scenario)
| Name | Rule | Tag |
|---|---|---|
| Common-input ownership | All input addresses of one tx belong to one entity (union-find cluster) | CLUSTER |
| Peel chain | tx has 1 input and 2 outputs: one small (under about 15% of input), one large. The large output is spent next in the same pattern. Chain length 3 or more. Tag the small edge PEEL and the large edge PEEL_CONTINUATION | PEEL_CHAIN |
| Fan-out / fan-in | 1 input to 8 or more outputs, or 8 or more inputs to 1 output (use 6 or more for the fan-in in the sample) | FAN_OUT / FAN_IN |
| Mixer-like | 5 or more outputs within 1% of the same value | MIXER_PATTERN |
| Structuring | Many similar outputs kept just under a round threshold | STRUCTURING |
| Label match | Address found in labels.json (EXCHANGE, MIXER, SANCTIONED, RANSOMWARE) | LABEL |
| Dusting | One tx sends 0.00001 BTC or less to 10 or more addresses | DUSTING |
| Address poisoning | Two different addresses whose body (address without the "bc1q" prefix, or without the first character for legacy) shares the same first 4 and last 4 characters | LOOKALIKE |
| Decoy edge | Edge value under 0.1% of the largest edge value, not part of a dusting finding. Pruned from ranking, still shown and flagged | DECOY |

Taint (proportional method): the source holds taint 1.0. For each tx: ratio = tainted input value / total input value; each output
receives (output value x ratio) of tainted value. End receivers = addresses holding tainted value that have not spent it (leaf nodes),
or carrying an exchange label. Sort by tainted value. taint_share = tainted value / total value leaving the source.

Confidence (clamp 0..1): 0.50*taint_share + 0.20*(leaf or exchange) + 0.15*peel_main_branch + 0.15*label_bonus, minus 0.20 if adjacent to a decoy.
Risk 0-100: 100 * (0.30*mixer + 0.30*sanction + 0.20*ransomware + 0.10*peel_depth + 0.10*adversarial), each term 0..1.
(P2 owns scoring.py and four of the terms; P3 supplies the adversarial term through security.adversarial_score.)
Say honestly on stage: scores are heuristic probabilities, not proof.

## 8. Sample scenario (P1 builds it in backend/data/sample_scenario.json; fully synthetic)
Addresses: make them synthetic bech32-looking strings: "bc1q" + 38 characters from the bech32 alphabet qpzry9x8gf2tvdw0s3jn54khce6mua7l
(no 1, b, i or o). Use fake 64-hex txids. Timestamps increase hop by hop. Each tx has a small fee (about 0.0001 BTC). Add an "aliases" map.
1. Source S holds 4.05 BTC and sends it in one tx to 8 near-equal outputs M1..M8 of 0.5 BTC each (FAN_OUT, MIXER_PATTERN).
2. M1..M6 are spent together in one tx into a single output C1 of about 3.0 BTC (FAN_IN). M7 and M8 stay unspent (leaf wallets).
3. C1 starts a 5-hop peel chain: C1 -> P1 + W1, P1 -> P2 + W2, ... P4 -> P5 + W5. Each hop peels about 8% to W1..W5 and passes the rest on.
4. P5 sends about 1.9 BTC to E1 (labeled "ExchangeX Deposit", type EXCHANGE) and 0.08 BTC to a leaf wallet L1. Expected top end receiver: E1 (about 47% of the tainted value).
5. Sanctioned: W3 later sends a small amount to SANC1 (labeled SANCTIONED in labels.json).
6. Dusting: a different wallet DS sends 0.00000546 BTC to 15 addresses, including P2.
7. Look-alike: address E1X copies the first 4 and last 4 body characters of E1 (different middle) and receives a small transaction from W5.
8. Decoy: P3 sends 0.00000600 BTC in a two-output tx to an unrelated wallet U1.
Expected findings: PEEL_CHAIN (length 5), FAN_OUT, FAN_IN, MIXER_PATTERN, DUSTING (1), LOOKALIKE (1), DECOY (1).

## 9. Audit log specification
Entry hash = SHA256("idx|ts|action|payload_hash|prev_hash"). Genesis prev_hash = 64 zeros. payload_hash = SHA256 of
json.dumps(payload, sort_keys=True). Log: input, parameters, hash of each API response, each detector result, final ranking.
In sample mode, re-running the same input must produce identical payload hashes (use a fixed timestamp or exclude ts from payload hashes).
verify() walks the chain and returns the first broken index. tamper(idx) is DEMO ONLY: it edits one entry in memory.

## 10. Demo flow (4 minutes)
0:00 Hook (P4) -> 0:20 Paste source, Trace, graph builds (P4) -> 0:50 Findings: peel chain, mixer (P2) -> 1:20 Ranked end receivers, click to highlight path (P2)
-> 1:50 Adversarial flags: dust, look-alike, decoy (P3) -> 2:30 Audit: Tamper then Verify turns red (P3) -> 3:10 Optional live mode (P1) -> 3:40 Close and roadmap (P4)
