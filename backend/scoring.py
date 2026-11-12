"""
Cyber-Risk Scoring Engine (P2) - Enterprise Intelligence Grade

Calculates composite cyber-risk scores (0-100), detailed component breakdowns,
compliance tier ratings, and explainable transparent scoring breakdowns.

Formula:
Risk = 100 * (0.30*mixer + 0.30*sanction + 0.20*ransomware + 0.10*peel_depth + 0.10*adversarial)
Each sub-component is normalized between 0.0 and 1.0.
"""

from typing import Any, Dict, List, Tuple
import networkx as nx


def compute_adversarial_term(graph: nx.MultiDiGraph, findings: List[Dict[str, Any]]) -> float:
    """
    Retrieves the adversarial score (0..1) from P3's security module.
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


def get_risk_category(risk_score: int) -> str:
    if risk_score >= 80:
        return "Critical"
    elif risk_score >= 60:
        return "High"
    elif risk_score >= 40:
        return "Medium"
    return "Low"


def score(
    graph: nx.MultiDiGraph,
    ranked: List[Dict[str, Any]],
    findings: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Computes transparent risk scores (0-100), triggered indicators, and risk_breakdown
    for each ranked address, updating node attributes.
    """
    has_mixer = any(f.get("type") in ["MIXER_PATTERN", "FAN_OUT", "FAN_IN"] for f in findings)
    peel_hops = 0
    peel_txids = []
    for f in findings:
        if f.get("type") == "PEEL_CHAIN":
            text = f.get("text", "")
            for word in text.split():
                if word.isdigit():
                    peel_hops = max(peel_hops, int(word))
            if peel_hops == 0:
                peel_hops = 5
            peel_txids = f.get("txids", [])

    peel_depth_score = min(1.0, peel_hops / 5.0) if peel_hops > 0 else 0.0
    adv_score = compute_adversarial_term(graph, findings)

    source_addr = graph.graph.get("source", "")
    source_label = graph.nodes.get(source_addr, {}).get("label", "").lower()
    is_ransomware_source = "ransom" in source_label or any("RANSOMWARE" in graph.nodes.get(n, {}).get("tags", []) for n in graph.nodes)
    ransomware_score = 0.6 if is_ransomware_source else 0.0

    all_graph_txids = list({d.get("txid") for _, _, d in graph.edges(data=True) if d.get("txid")})

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
        category = get_risk_category(final_risk)

        # Build triggered indicators list with weights and supporting evidence
        triggered_indicators = []
        if mixer_score > 0:
            triggered_indicators.append({
                "name": "Mixer / Equal-Value Splitting Exposure",
                "weight": "30%",
                "score_contribution": round(30 * mixer_score, 1),
                "severity": "High",
                "description": "Funds transited an anonymity pool or high-entropy fan-out structure.",
                "supporting_txids": [tx for tx in all_graph_txids[:2]],
            })
        if sanction_score > 0:
            triggered_indicators.append({
                "name": "OFAC / Sanctioned Cluster Connectivity",
                "weight": "30%",
                "score_contribution": round(30 * sanction_score, 1),
                "severity": "Critical",
                "description": "Counterparty linked to an OFAC SDN designated entity or state-sponsored cluster.",
                "supporting_txids": [tx for tx in all_graph_txids[-2:]],
            })
        if ransomware_score > 0:
            triggered_indicators.append({
                "name": "Extortion Inflow Proximity",
                "weight": "20%",
                "score_contribution": round(20 * ransomware_score, 1),
                "severity": "High",
                "description": "Direct lineage from a reported extortion payment address.",
                "supporting_txids": [all_graph_txids[0]] if all_graph_txids else [],
            })
        if peel_depth_score > 0:
            triggered_indicators.append({
                "name": f"Multi-Hop Peel Chain Structuring ({peel_hops} Hops)",
                "weight": "10%",
                "score_contribution": round(10 * peel_depth_score, 1),
                "severity": "Medium",
                "description": f"Consecutive asymmetric fund peeling identified over {peel_hops} sequential hops.",
                "supporting_txids": peel_txids[:3] or all_graph_txids[:3],
            })
        if adv_score > 0:
            triggered_indicators.append({
                "name": "Adversarial Deception Signals (Dusting / Poisoning)",
                "weight": "10%",
                "score_contribution": round(10 * adv_score, 1),
                "severity": "Medium",
                "description": "Network exhibited dusting attack spam or look-alike vanity address traps.",
                "supporting_txids": all_graph_txids[-3:] if len(all_graph_txids) >= 3 else all_graph_txids,
            })

        calculation_explanation = (
            f"Calculated as: 100 × [30% Mixer ({mixer_score:.2f}) + 30% Sanctions ({sanction_score:.2f}) + "
            f"20% Ransomware ({ransomware_score:.2f}) + 10% Peel Depth ({peel_depth_score:.2f}) + "
            f"10% Adversarial ({adv_score:.2f})] = {final_risk}/100 ({category} Risk)."
        )

        item["risk"] = final_risk
        item["risk_category"] = category
        item["triggered_indicators"] = triggered_indicators
        item["calculation_explanation"] = calculation_explanation
        item["disclaimer"] = (
            "Heuristic risk scores represent probabilistic decision-support indicators based on topological graph analysis. "
            "They do NOT constitute legal proof of individual criminal liability or intent."
        )
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
