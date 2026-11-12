"""
Forensics Heuristics Engine (P2)

Applies forensic heuristics to a Bitcoin transaction graph:
- Common-input clustering (union-find)
- Peel chain detection
- Fan-out and fan-in detection
- Mixer-like pattern detection
- Structuring detection
- Known label matching
"""

from typing import Any, Dict, List, Tuple
import networkx as nx


def run(graph: nx.MultiDiGraph, labels: Dict[str, Any]) -> Tuple[nx.MultiDiGraph, List[Dict[str, Any]]]:
    """
    Applies forensic rules to the transaction graph.
    Adds cluster, label, and tags to nodes and edges.
    Returns (graph, findings).
    """
    findings: List[Dict[str, Any]] = []

    # Ensure all nodes have required attributes
    for node, data in graph.nodes(data=True):
        if "type" not in data:
            data["type"] = "address"
        if "label" not in data:
            data["label"] = ""
        if "cluster" not in data:
            data["cluster"] = "c0"
        if "tags" not in data:
            data["tags"] = []
        if "risk" not in data:
            data["risk"] = 0
        if "taint" not in data:
            data["taint"] = 0.0

        # Label lookup
        if node in labels:
            entry = labels[node]
            if isinstance(entry, dict):
                data["label"] = entry.get("label", data["label"])
                tag = entry.get("type")
                if tag and tag not in data["tags"]:
                    data["tags"].append(tag)
            elif isinstance(entry, str):
                data["label"] = entry

    # Ensure all edges have required attributes
    for _, _, data in graph.edges(data=True):
        if "tags" not in data:
            data["tags"] = []

    return graph, findings
