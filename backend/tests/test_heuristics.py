"""
Tests for Forensics Brain (P2)
Validates heuristics.run, taint.rank_end_receivers, and scoring.score.
"""

import sys
import os
import networkx as nx

# Add project root to sys.path so backend imports work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend import heuristics, taint, scoring


def test_stubs_end_to_end():
    # 1. Build a simple test graph
    g = nx.MultiDiGraph()
    source = "bc1qsource0000000000000000000000000000000"
    mid = "bc1qmid11111111111111111111111111111111111"
    dest = "bc1qexch333333333333333333333333333333333"

    g.add_node(source, type="address", taint=1.0)
    g.add_node(mid, type="address", taint=0.5)
    g.add_node(dest, type="address", taint=0.45)

    g.add_edge(source, mid, txid="tx1", value=1.0, ts=1700000000)
    g.add_edge(mid, dest, txid="tx2", value=0.9, ts=1700000100)

    labels = {
        dest: {"label": "ExchangeX Deposit", "type": "EXCHANGE"}
    }

    # 2. Test heuristics.run
    g, findings = heuristics.run(g, labels)
    assert isinstance(findings, list)
    assert g.nodes[dest]["label"] == "ExchangeX Deposit"
    assert "EXCHANGE" in g.nodes[dest]["tags"]
    assert "cluster" in g.nodes[dest]

    # 3. Test taint.rank_end_receivers
    ranked = taint.rank_end_receivers(g, source=source, top_n=5)
    assert isinstance(ranked, list)
    assert len(ranked) > 0
    assert "address" in ranked[0]
    assert "confidence" in ranked[0]
    assert "taint_share" in ranked[0]
    assert "reasoning" in ranked[0]

    # 4. Test scoring.score
    scored = scoring.score(g, ranked, findings)
    assert isinstance(scored, list)
    assert len(scored) > 0
    assert "risk" in scored[0]
    assert "risk_breakdown" in scored[0]
    breakdown = scored[0]["risk_breakdown"]
    assert "mixer" in breakdown
    assert "sanction" in breakdown
    assert "ransomware" in breakdown
    assert "peel_depth" in breakdown
    assert "adversarial" in breakdown
    assert g.nodes[scored[0]["address"]]["risk"] == scored[0]["risk"]
    print("All P2 stubs passed successfully!")


if __name__ == "__main__":
    test_stubs_end_to_end()
