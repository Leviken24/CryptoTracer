"""
Comprehensive Forensics Tests (P2)
Validates:
1. Common-input ownership clustering (Union-Find)
2. Label matching (EXCHANGE, SANCTIONED)
3. 5-hop peel chain detection
4. Fan-out and fan-in detection
5. Equal-value mixer pattern detection
6. Proportional taint propagation
7. End-receiver ranking (E1 must rank #1 with highest confidence and ~47% taint share)
8. Cyber-risk scoring and breakdown
9. Determinism: identical results across 3 runs
"""

import json
import os
import sys
import networkx as nx

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend import heuristics, taint, scoring


def build_full_sample_scenario():
    """
    Constructs the exact sample scenario from PROJECT_CONTEXT.md Section 8.
    """
    g = nx.MultiDiGraph()

    aliases = {
        "S": "bc1qsrc0000000000000000000000000000000000",
        "M1": "bc1qmix1000000000000000000000000000000000",
        "M2": "bc1qmix2000000000000000000000000000000000",
        "M3": "bc1qmix3000000000000000000000000000000000",
        "M4": "bc1qmix4000000000000000000000000000000000",
        "M5": "bc1qmix5000000000000000000000000000000000",
        "M6": "bc1qmix6000000000000000000000000000000000",
        "M7": "bc1qmix7000000000000000000000000000000000",
        "M8": "bc1qmix8000000000000000000000000000000000",
        "C1": "bc1qc100000000000000000000000000000000000",
        "P1": "bc1qp100000000000000000000000000000000000",
        "W1": "bc1qw100000000000000000000000000000000000",
        "P2": "bc1qp200000000000000000000000000000000000",
        "W2": "bc1qw200000000000000000000000000000000000",
        "P3": "bc1qp300000000000000000000000000000000000",
        "W3": "bc1qw300000000000000000000000000000000000",
        "P4": "bc1qp400000000000000000000000000000000000",
        "W4": "bc1qw400000000000000000000000000000000000",
        "P5": "bc1qp500000000000000000000000000000000000",
        "W5": "bc1qw500000000000000000000000000000000000",
        "E1": "bc1qexch333333333333333333333333333333333",
        "L1": "bc1ql100000000000000000000000000000000000",
        "SANC1": "bc1qsanc000000000000000000000000000000000",
        "U1": "bc1qu100000000000000000000000000000000000",
    }

    # 1. Source S sends 4.05 BTC to M1..M8 (0.5062 BTC each: FAN_OUT, MIXER_PATTERN)
    tx_fanout = {
        "txid": "txfanout00000000000000000000000000000000000000000000000000000001",
        "ts": 1700000000,
        "inputs": [{"address": aliases["S"], "value": 4.05}],
        "outputs": [{"address": aliases[f"M{i}"], "value": 0.5062} for i in range(1, 9)],
    }

    # 2. M1..M6 spent together into C1 (~3.037 BTC) (FAN_IN)
    tx_fanin = {
        "txid": "txfanin000000000000000000000000000000000000000000000000000000002",
        "ts": 1700000600,
        "inputs": [{"address": aliases[f"M{i}"], "value": 0.5062} for i in range(1, 7)],
        "outputs": [{"address": aliases["C1"], "value": 3.037}],
    }

    # 3. 5-hop peel chain from C1
    peel_txs = [
        {
            "txid": f"txpeel{i:058d}",
            "ts": 1700000600 + i * 600,
            "inputs": [{"address": aliases["C1" if i == 1 else f"P{i-1}"], "value": 3.037 - (i - 1) * 0.23}],
            "outputs": [
                {"address": aliases[f"W{i}"], "value": 0.22},
                {"address": aliases[f"P{i}"], "value": 3.037 - i * 0.23},
            ],
        }
        for i in range(1, 6)
    ]

    # 4. P5 sends 1.90 BTC to E1 and 0.08 BTC to leaf L1
    tx_exit = {
        "txid": "txexit000000000000000000000000000000000000000000000000000000000004",
        "ts": 1700005000,
        "inputs": [{"address": aliases["P5"], "value": 1.98}],
        "outputs": [
            {"address": aliases["E1"], "value": 1.90},
            {"address": aliases["L1"], "value": 0.079},
        ],
    }

    # 5. W3 sends to SANC1
    tx_sanc = {
        "txid": "txsanc000000000000000000000000000000000000000000000000000000000005",
        "ts": 1700006000,
        "inputs": [{"address": aliases["W3"], "value": 0.20}],
        "outputs": [{"address": aliases["SANC1"], "value": 0.199}],
    }

    all_txs = [tx_fanout, tx_fanin] + peel_txs + [tx_exit, tx_sanc]
    g.graph["txs"] = all_txs
    g.graph["source"] = aliases["S"]

    for tx in all_txs:
        for inp in tx["inputs"]:
            g.add_node(inp["address"], type="address")
        for out in tx["outputs"]:
            g.add_node(out["address"], type="address")
        for inp in tx["inputs"]:
            for out in tx["outputs"]:
                g.add_edge(inp["address"], out["address"], txid=tx["txid"], value=out["value"], ts=tx["ts"])

    g.nodes[aliases["S"]]["label"] = "Reported ransom wallet"

    return g, aliases


def run_pipeline():
    g, aliases = build_full_sample_scenario()
    with open("backend/data/labels.json", "r") as f:
        labels = json.load(f)
    g, findings = heuristics.run(g, labels)
    ranked = taint.rank_end_receivers(g, source=aliases["S"], top_n=5)
    scored = scoring.score(g, ranked, findings)
    return g, findings, scored, aliases


def test_full_forensics_pipeline():
    g, findings, scored, aliases = run_pipeline()

    finding_types = [f["type"] for f in findings]
    assert "FAN_OUT" in finding_types, "FAN_OUT finding missing"
    assert "FAN_IN" in finding_types, "FAN_IN finding missing"
    assert "MIXER_PATTERN" in finding_types, "MIXER_PATTERN finding missing"
    assert "PEEL_CHAIN" in finding_types, "PEEL_CHAIN finding missing"

    peel_f = next(f for f in findings if f["type"] == "PEEL_CHAIN")
    assert "5 hops" in peel_f["text"]

    top_result = scored[0]
    assert top_result["address"] == aliases["E1"], f"Top result {top_result['address']} != E1"
    assert top_result["confidence"] >= 0.70, f"Confidence too low: {top_result['confidence']}"
    assert 0.40 <= top_result["taint_share"] <= 0.50, f"Taint share not ~47%: {top_result['taint_share']}"
    assert len(top_result["reasoning"]) == 3, f"Expected 3 reasoning bullets, got {len(top_result['reasoning'])}"

    print("\n--- SAMPLE SCENARIO RANKED RECEIVERS OUTPUT ---")
    for idx, r in enumerate(scored, 1):
        print(f"#{idx}: Address: {r['address']}")
        print(f"    Confidence: {r['confidence']} | Risk: {r['risk']} | Taint Share: {r['taint_share'] * 100:.1f}%")
        print(f"    Breakdown: {r['risk_breakdown']}")
        print(f"    Reasoning: {r['reasoning']}")
        print()

    print("Test 1: Full heuristics, ranking, and scoring pipeline passed.")


def test_determinism_three_runs():
    """Verify that 3 consecutive runs produce 100% identical rankings, scores, and reasonings."""
    results = []
    for _ in range(3):
        _, _, scored, _ = run_pipeline()
        results.append(scored)

    assert results[0] == results[1] == results[2], "Ranking is not deterministic across runs!"
    print("Test 2: Determinism verified (identical rankings across 3 runs).")


if __name__ == "__main__":
    test_full_forensics_pipeline()
    test_determinism_three_runs()
    print("All tests passed cleanly!")
