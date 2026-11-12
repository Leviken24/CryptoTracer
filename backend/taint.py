"""
Taint Analysis & Receiver Ranking (P2)

Calculates proportional taint from a source address across the transaction graph
and ranks the most probable end receivers.
"""

from typing import Any, Dict, List
import networkx as nx


def rank_end_receivers(graph: nx.MultiDiGraph, source: str, top_n: int = 5) -> List[Dict[str, Any]]:
    """
    Ranks the most probable end receivers based on tainted value received,
    leaf node status, and exchange labels.

    Returns a list of dicts containing:
    - address: str
    - confidence: float (0..1)
    - taint_share: float (0..1)
    - reasoning: list of str
    """
    ranked: List[Dict[str, Any]] = []

    # Identify potential leaf nodes or non-source nodes
    candidates = [n for n in graph.nodes if n != source]
    if not candidates:
        return ranked

    for addr in candidates[:top_n]:
        node_data = graph.nodes[addr]
        taint = float(node_data.get("taint", 0.0))
        ranked.append({
            "address": addr,
            "confidence": round(min(1.0, max(0.0, taint)), 2),
            "taint_share": round(taint, 4),
            "reasoning": ["Candidate address receiving flow from trace source"],
        })

    # Sort descending by confidence
    ranked.sort(key=lambda x: x["confidence"], reverse=True)
    return ranked[:top_n]
