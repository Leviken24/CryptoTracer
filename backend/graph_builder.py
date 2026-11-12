"""
CryptoTrace - Transaction Graph Builder (P1)
Builds a NetworkX MultiDiGraph from raw transaction records adhering to Section 4 & 6 of PROJECT_CONTEXT.md.
"""

from typing import Any, Dict, List
import networkx as nx


def build_graph(txs: List[Dict[str, Any]], source: str, hops: int = 4) -> nx.MultiDiGraph:
    """
    Constructs a directed transaction multi-graph.
    - Nodes: Bitcoin / Ethereum addresses with type, label, cluster, tags, risk, taint.
    - Edges: Directed transactions between sender and receiver with txid, value, ts, tags.
    """
    graph = nx.MultiDiGraph()
    graph.graph["txs"] = txs
    graph.graph["source"] = source
    graph.graph["truncated"] = False
    graph.graph["requested_hops"] = hops

    if not txs:
        # If no transactions exist, ensure source node is present
        if source:
            graph.add_node(
                source,
                type="address",
                label="Source Wallet",
                cluster="c1",
                tags=["SOURCE"],
                risk=50,
                taint=1.0,
            )
        return graph

    for tx in txs:
        inputs = tx.get("inputs", [])
        outputs = tx.get("outputs", [])
        txid = tx.get("txid", "")
        ts = tx.get("ts", 0)
        blockchain = tx.get("blockchain", "bitcoin")

        total_input_val = sum(inp.get("value", 0.0) for inp in inputs)
        if total_input_val <= 0:
            total_input_val = sum(out.get("value", 0.0) for out in outputs)
        if total_input_val <= 0:
            total_input_val = 1.0

        # Register input nodes
        for inp in inputs:
            u = inp.get("address")
            if not u:
                continue
            if not graph.has_node(u):
                tags = ["SOURCE"] if u == source else []
                graph.add_node(
                    u,
                    type="address",
                    label="",
                    cluster="",
                    tags=tags,
                    risk=0,
                    taint=1.0 if u == source else 0.0,
                    blockchain=blockchain,
                )

        # Register output nodes and directed edges
        for inp in inputs:
            u = inp.get("address")
            if not u:
                continue
            inp_val = inp.get("value", 0.0)
            weight_ratio = inp_val / total_input_val if total_input_val > 0 else (1.0 / len(inputs))

            for out in outputs:
                v = out.get("address")
                if not v:
                    continue
                out_val = out.get("value", 0.0)
                edge_val = out_val * weight_ratio

                if not graph.has_node(v):
                    tags = ["SOURCE"] if v == source else []
                    graph.add_node(
                        v,
                        type="address",
                        label="",
                        cluster="",
                        tags=tags,
                        risk=0,
                        taint=0.0,
                        blockchain=blockchain,
                    )

                graph.add_edge(
                    u,
                    v,
                    txid=txid,
                    value=round(edge_val, 8),
                    ts=ts,
                    tags=[],
                    blockchain=blockchain,
                )

    # Ensure source node is always in graph and tagged
    if source and graph.has_node(source):
        src_tags = graph.nodes[source].setdefault("tags", [])
        if "SOURCE" not in src_tags:
            src_tags.append("SOURCE")
        graph.nodes[source]["taint"] = 1.0

    return graph


def graph_to_dict(graph: nx.MultiDiGraph) -> Dict[str, Any]:
    """
    Serializes a NetworkX MultiDiGraph to the JSON contract format:
    {"nodes": [...], "edges": [...]}
    """
    nodes = []
    for node_id, data in graph.nodes(data=True):
        nodes.append({
            "id": node_id,
            "type": data.get("type", "address"),
            "label": data.get("label", ""),
            "cluster": data.get("cluster", "c1"),
            "tags": list(data.get("tags", [])),
            "risk": int(data.get("risk", 0)),
            "taint": float(data.get("taint", 0.0)),
            "blockchain": data.get("blockchain", "bitcoin"),
        })

    edges = []
    for u, v, data in graph.edges(data=True):
        edges.append({
            "from": u,
            "to": v,
            "txid": data.get("txid", ""),
            "value": float(data.get("value", 0.0)),
            "ts": int(data.get("ts", 0)),
            "tags": list(data.get("tags", [])),
            "blockchain": data.get("blockchain", "bitcoin"),
        })

    return {"nodes": nodes, "edges": edges}
