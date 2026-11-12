"""
Cyber-Risk Scoring Engine (P2)

Calculates composite cyber-risk scores (0-100) and detailed risk breakdowns
for ranked end-receiver addresses and graph nodes based on forensic heuristics
and adversarial detectors.
"""

from typing import Any, Dict, List
import networkx as nx


def score(
    graph: nx.MultiDiGraph,
    ranked: List[Dict[str, Any]],
    findings: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Computes risk score (0-100) and risk_breakdown for each ranked address,
    and updates node risk attributes on the graph.
    Formula: 100 * (0.30*mixer + 0.30*sanction + 0.20*ransomware + 0.10*peel_depth + 0.10*adversarial)
    """
    # Check if security module is available for adversarial score
    adv_score = 0.0
    try:
        from backend.security import adversarial_score  # type: ignore
        adv_score = float(adversarial_score(graph, findings))
    except (ImportError, Exception):
        adv_score = 0.0

    for item in ranked:
        addr = item.get("address")
        node_data = graph.nodes[addr] if addr in graph else {}
        tags = node_data.get("tags", [])

        mixer_val = 0.8 if any(t in tags for t in ["MIXER_PATTERN", "FAN_OUT", "FAN_IN"]) else 0.0
        sanction_val = 1.0 if "SANCTIONED" in tags else 0.0
        ransomware_val = 0.6 if "RANSOMWARE" in tags else 0.0
        peel_depth_val = 0.5 if "PEEL_CHAIN" in tags else 0.0

        risk_val = round(100 * (
            0.30 * mixer_val +
            0.30 * sanction_val +
            0.20 * ransomware_val +
            0.10 * peel_depth_val +
            0.10 * adv_score
        ))
        risk_val = min(100, max(0, risk_val))

        item["risk"] = risk_val
        item["risk_breakdown"] = {
            "mixer": round(mixer_val, 2),
            "sanction": round(sanction_val, 2),
            "ransomware": round(ransomware_val, 2),
            "peel_depth": round(peel_depth_val, 2),
            "adversarial": round(adv_score, 2),
        }

        # Also set risk on the node
        if addr in graph:
            graph.nodes[addr]["risk"] = risk_val

    return ranked
