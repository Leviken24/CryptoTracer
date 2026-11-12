"""
Tests for Forensics Engine (P2)
Verifies:
1. Union-find clustering by common-input ownership
2. Known label lookup (EXCHANGE, SANCTIONED)
3. 5-hop peel chain detection and edge tagging
4. End-to-end heuristics pipeline
"""

import os
import sys
import json
import networkx as nx

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend import heuristics, taint, scoring


def build_sample_peel_graph():
    """
    Constructs a synthetic graph matching the sample scenario from PROJECT_CONTEXT.md:
    C1 starts a 5-hop peel chain:
    C1 -> P1 + W1
    P1 -> P2 + W2
    P2 -> P3 + W3
    P3 -> P4 + W4
    P4 -> P5 + W5
    Each hop peels ~8% to W and sends rest to P.
    Finally P5 sends to E1 (ExchangeX) and L1.
    """
    g = nx.MultiDiGraph()

    aliases = {
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
        "M1": "bc1qm100000000000000000000000000000000000",
        "M2": "bc1qm200000000000000000000000000000000000",
    }

    # Common-input merge tx: M1 + M2 -> C1 (shows common input clustering)
    tx_merge = {
        "txid": "merge000000000000000000000000000000000000000000000000000000000001",
        "ts": 1700000000,
        "inputs": [
            {"address": aliases["M1"], "value": 1.5},
            {"address": aliases["M2"], "value": 1.5},
        ],
        "outputs": [
            {"address": aliases["C1"], "value": 2.9999},
        ],
    }

    # 5-hop peel chain transactions
    # C1 (2.9999) -> P1 (2.75) + W1 (0.24)
    # P1 (2.75)   -> P2 (2.50) + W2 (0.24)
    # P2 (2.50)   -> P3 (2.28) + W3 (0.21)
    # P3 (2.28)   -> P4 (2.08) + W4 (0.19)
    # P4 (2.08)   -> P5 (1.90) + W5 (0.17)
    peel_txs = [
        {
            "txid": f"peeltx{i:058d}",
            "ts": 1700000000 + i * 600,
            "inputs": [{"address": aliases[f"C1" if i == 1 else f"P{i-1}"], "value": 3.0 - (i - 1) * 0.25}],
            "outputs": [
                {"address": aliases[f"W{i}"], "value": 0.22},
                {"address": aliases[f"P{i}"], "value": 3.0 - i * 0.25},
            ],
        }
        for i in range(1, 6)
    ]

    # Final hop from P5 to E1 and L1
    tx_final = {
        "txid": "final000000000000000000000000000000000000000000000000000000000001",
        "ts": 1700005000,
        "inputs": [{"address": aliases["P5"], "value": 1.75}],
        "outputs": [
            {"address": aliases["E1"], "value": 1.67},
            {"address": aliases["L1"], "value": 0.07},
        ],
    }

    all_txs = [tx_merge] + peel_txs + [tx_final]
    g.graph["txs"] = all_txs
    g.graph["source"] = aliases["C1"]

    # Populate graph nodes and edges according to Section 4
    for tx in all_txs:
        for inp in tx["inputs"]:
            g.add_node(inp["address"], type="address")
        for out in tx["outputs"]:
            g.add_node(out["address"], type="address")
        for inp in tx["inputs"]:
            for out in tx["outputs"]:
                g.add_edge(inp["address"], out["address"], txid=tx["txid"], value=out["value"], ts=tx["ts"])

    return g, aliases


def test_union_find_clustering():
    g, aliases = build_sample_peel_graph()
    labels = {}
    g, findings = heuristics.run(g, labels)

    # M1 and M2 were both inputs to tx_merge, so they must have the same cluster!
    assert g.nodes[aliases["M1"]]["cluster"] == g.nodes[aliases["M2"]]["cluster"]
    assert g.nodes[aliases["M1"]]["cluster"].startswith("c")
    print("Test 1: Union-find clustering passed.")


def test_label_lookup():
    g, aliases = build_sample_peel_graph()
    with open("backend/data/labels.json", "r") as f:
        labels = json.load(f)

    g, findings = heuristics.run(g, labels)

    e1_node = g.nodes[aliases["E1"]]
    assert e1_node["label"] == "ExchangeX Deposit"
    assert "EXCHANGE" in e1_node["tags"]
    print("Test 2: Label lookup passed (E1 has ExchangeX Deposit and EXCHANGE tag).")


def test_peel_chain_detection():
    g, aliases = build_sample_peel_graph()
    with open("backend/data/labels.json", "r") as f:
        labels = json.load(f)
    g, findings = heuristics.run(g, labels)

    peel_findings = [f for f in findings if f["type"] == "PEEL_CHAIN"]
    assert len(peel_findings) == 1, f"Expected 1 peel chain finding, got {len(peel_findings)}"
    assert "Peel chain of 5 hops detected" in peel_findings[0]["text"]
    assert peel_findings[0]["severity"] == "high"

    # Verify edge tags
    peel_edges = [d for u, v, d in g.edges(data=True) if "PEEL" in d.get("tags", [])]
    cont_edges = [d for u, v, d in g.edges(data=True) if "PEEL_CONTINUATION" in d.get("tags", [])]
    assert len(peel_edges) == 5, f"Expected 5 PEEL edges, got {len(peel_edges)}"
    assert len(cont_edges) == 5, f"Expected 5 PEEL_CONTINUATION edges, got {len(cont_edges)}"

    # Verify node tags
    for i in range(1, 6):
        assert "PEEL_CHAIN" in g.nodes[aliases[f"P{i}"]]["tags"]

    print("Test 3: Peel chain detector passed (detected 5-hop chain with correct tags).")


if __name__ == "__main__":
    test_union_find_clustering()
    test_label_lookup()
    test_peel_chain_detection()
    print("All Step 2 tests passed successfully!")
