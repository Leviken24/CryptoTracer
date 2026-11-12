"""
Phase 2 & Phase 3 Forensic Intelligence, Decision Support & Integrity Verification Tests
"""

import os
import sys
import json
import networkx as nx

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.ai_summary import generate_investigation_summary
from backend.timeline import generate_forensic_timeline
from backend.pdf_report import generate_forensic_pdf
from backend import heuristics, taint, scoring
from backend.graph_builder import build_graph
from backend.sample_loader import load_sample


def test_ai_investigation_summary_7_questions():
    """
    Verifies that the AI summary engine answers all 7 core investigative questions
    with empirical blockchain citations.
    """
    sample = load_sample("bitcoin")
    target = sample["source"]
    txs = sample["txs"]

    # Build graph using standard builder
    g = build_graph(txs, target, hops=4)

    labels_path = os.path.join(os.path.dirname(__file__), "..", "data", "labels.json")
    labels = {}
    if os.path.exists(labels_path):
        with open(labels_path, "r", encoding="utf-8") as f:
            labels = json.load(f)

    g, findings = heuristics.run(g, labels)
    ranked = taint.rank_end_receivers(g, target, top_n=5)
    scored = scoring.score(g, ranked, findings)

    graph_nodes = [{"id": n} for n in g.nodes()]
    graph_edges = [
        {"from": u, "to": v, "value": data.get("value", 0.0), "txid": data.get("txid", "")}
        for u, v, data in g.edges(data=True)
    ]
    graph_data = {"nodes": graph_nodes, "edges": graph_edges}

    summary = generate_investigation_summary(
        target=target,
        blockchain="bitcoin",
        graph_data=graph_data,
        findings=findings,
        ranked=scored,
        txs=txs,
    )

    # Question 1: What was investigated?
    assert "investigated_target" in summary
    assert target in summary["investigated_target"]

    # Question 2: What happened to funds?
    assert "fund_disposition" in summary
    assert len(summary["fund_disposition"]) > 20

    # Question 3: Which patterns detected?
    assert "suspicious_patterns" in summary
    assert len(summary["suspicious_patterns"]) >= 1

    # Question 4: Which destinations deserve attention?
    assert "priority_destinations" in summary
    assert len(summary["priority_destinations"]) > 0
    top_dest = summary["priority_destinations"][0]
    assert "address" in top_dest
    assert "action" in top_dest

    # Question 5: Supporting evidence?
    assert "supporting_evidence" in summary
    assert "supporting_txids" in summary
    assert len(summary["supporting_txids"]) > 0

    # Question 6: What remains uncertain?
    assert "investigative_uncertainties" in summary
    assert len(summary["investigative_uncertainties"]) >= 2
    assert any("identity" in u.lower() for u in summary["investigative_uncertainties"])

    # Question 7: Next steps?
    assert "recommended_next_actions" in summary
    assert len(summary["recommended_next_actions"]) >= 2


def test_forensic_timeline_generation():
    """
    Verifies that the timeline engine creates a chronological log of on-chain events
    and detector triggers.
    """
    sample = load_sample("bitcoin")
    txs = sample["txs"]
    target = sample["source"]

    g = build_graph(txs, target, hops=4)
    _, findings = heuristics.run(g, {})
    timeline = generate_forensic_timeline(txs, findings)

    assert len(timeline) >= len(txs)
    for evt in timeline:
        assert "timestamp" in evt
        assert "formatted_time" in evt
        assert "event_type" in evt
        assert "title" in evt
        assert "severity" in evt
        assert "description" in evt

    root_events = [e for e in timeline if e["event_type"] == "INITIAL_TRANSACTION"]
    assert len(root_events) >= 1


def test_pdf_report_generation():
    """
    Verifies that the PDF report builds a valid binary stream incorporating
    all 7-point summary and audit trail data.
    """
    sample = load_sample("bitcoin")
    target = sample["source"]
    txs = sample["txs"]

    g = build_graph(txs, target, hops=4)
    labels_path = os.path.join(os.path.dirname(__file__), "..", "data", "labels.json")
    labels = {}
    if os.path.exists(labels_path):
        with open(labels_path, "r", encoding="utf-8") as f:
            labels = json.load(f)

    g, findings = heuristics.run(g, labels)
    ranked = taint.rank_end_receivers(g, target, top_n=5)
    scored = scoring.score(g, ranked, findings)

    graph_nodes = [{"id": n} for n in g.nodes()]
    graph_edges = [
        {"from": u, "to": v, "value": data.get("value", 0.0), "txid": data.get("txid", "")}
        for u, v, data in g.edges(data=True)
    ]
    summary = generate_investigation_summary(target, "bitcoin", {"nodes": graph_nodes, "edges": graph_edges}, findings, scored, txs)
    timeline = generate_forensic_timeline(txs, findings)

    case_payload = {
        "case_id": "CT-CASE-TEST-001",
        "title": "Operation Silk Trail Test",
        "target": target,
        "blockchain": "bitcoin",
        "risk_score": 85,
        "hops": 4,
        "created_at": 1700000000,
        "results": {
            "ai_summary": summary,
            "timeline": timeline,
            "ranked": scored,
            "findings": findings,
            "audit_head": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        },
    }

    pdf_bytes = generate_forensic_pdf(case_payload)
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 2000
    assert pdf_bytes.startswith(b"%PDF")
