"""
Cyber-Risk Scoring Engine (P2) - Enterprise Intelligence Grade

Calculates composite cyber-risk scores (0-100), detailed component breakdowns,
compliance tier ratings, and automated regulatory action recommendations.

Formula:
Risk = 100 * (0.30*mixer + 0.30*sanction + 0.20*ransomware + 0.10*peel_depth + 0.10*adversarial)
Each sub-component is normalized between 0.0 and 1.0.
"""

from typing import Any, Dict, List
import networkx as nx


def compute_adversarial_term(graph: nx.MultiDiGraph, findings: List[Dict[str, Any]]) -> float:
    """
    Retrieves the adversarial score (0..1) from P3's security module.
    Falls back gracefully if security module is not yet present.
    """
    try:
        from backend.security import adversarial_score  # type: ignore
        return float(adversarial_score(graph, findings))
    except (ImportError, Exception):
        adv_findings = [f for f in findings if f.get("type") in ["DUSTING", "LOOKALIKE", "DECOY"]]
        return min(1.0, len(adv_findings) * 0.3) if adv_findings else 0.0


def determine_compliance_tier(risk_score: int) -> Tuple[str, str]:
    """
    Maps 0-100 cyber risk to regulatory compliance tiers and actionable mandates.
    """
    if risk_score >= 80:
        return "CRITICAL_RISK", "IMMEDIATE_ASSET_FREEZE_AND_SAR_FILING"
    elif risk_score >= 60:
        return "HIGH_RISK", "BLOCK_TRANSACTION_AND_ENHANCED_DUE_DILIGENCE"
    elif risk_score >= 40:
        return "ELEVATED_RISK", "FLAG_FOR_MANUAL_COMPLIANCE_REVIEW"
    elif risk_score >= 20:
        return "LOW_MODERATE_RISK", "ROUTINE_MONITORING"
    else:
        return "MINIMAL_RISK", "CLEAN_PASS"


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
    has_mixer = any(f.get("type") in ["MIXER_PATTERN", "FAN_OUT", "FAN_IN"] for f in findings)
    peel_hops = 0
    for f in findings:
        if f.get("type") == "PEEL_CHAIN":
            text = f.get("text", "")
            for word in text.split():
                if word.isdigit():
                    peel_hops = max(peel_hops, int(word))
            if peel_hops == 0:
                peel_hops = 5

    peel_depth_score = min(1.0, peel_hops / 5.0) if peel_hops > 0 else 0.0
    adv_score = compute_adversarial_term(graph, findings)

    source_addr = graph.graph.get("source", "")
    source_label = graph.nodes.get(source_addr, {}).get("label", "").lower()
    is_ransomware_source = "ransom" in source_label or any("RANSOMWARE" in graph.nodes.get(n, {}).get("tags", []) for n in graph.nodes)
    ransomware_score = 0.6 if is_ransomware_source else 0.0

    for item in ranked:
        addr = item.get("address", "")
        node_data = graph.nodes.get(addr, {})
        tags = node_data.get("tags", [])

        is_sanctioned = "SANCTIONED" in tags or any(f.get("type") == "SANCTIONED" and addr in f.get("nodes", []) for f in findings)
        sanction_score = 1.0 if is_sanctioned else 0.0
        mixer_score = 0.8 if has_mixer else 0.0

        raw_risk = 100 * (
            0.30 * mixer_score +
            0.30 * sanction_score +
            0.20 * ransomware_score +
            0.10 * peel_depth_score +
            0.10 * adv_score
        )
        final_risk = int(round(min(100.0, max(0.0, raw_risk))))

        tier, mandate = determine_compliance_tier(final_risk)

        item["risk"] = final_risk
        item["risk_breakdown"] = {
            "mixer": round(mixer_score, 2),
            "sanction": round(sanction_score, 2),
            "ransomware": round(ransomware_score, 2),
            "peel_depth": round(peel_depth_score, 2),
            "adversarial": round(adv_score, 2),
        }
        item["compliance"] = {
            "tier": tier,
            "action_mandate": mandate,
        }

        if addr in graph:
            graph.nodes[addr]["risk"] = final_risk

    for node, data in graph.nodes(data=True):
        if "risk" not in data or data["risk"] == 0:
            node_tags = data.get("tags", [])
            node_sanction = 1.0 if "SANCTIONED" in node_tags else 0.0
            node_mixer = 0.8 if any(t in node_tags for t in ["MIXER_PATTERN", "FAN_OUT", "FAN_IN"]) else 0.0
            node_peel = 0.5 if "PEEL_CHAIN" in node_tags else 0.0
            data["risk"] = int(round(100 * (
                0.30 * node_mixer +
                0.30 * node_sanction +
                0.20 * ransomware_score +
                0.10 * node_peel +
                0.10 * adv_score
            )))

    return ranked
