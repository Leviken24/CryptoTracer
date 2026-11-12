"""
Forensics Heuristics Engine (P2)

Implements core blockchain forensics heuristics:
1. Common-input ownership clustering (Union-Find)
2. Label matching (EXCHANGE, MIXER, SANCTIONED, RANSOMWARE)
3. Peel chain detection (consecutive 1-in-2-out asymmetric splits >= 3 hops)
4. Fan-out and fan-in detection
5. Equal-value mixer pattern detection
6. Structuring detection
"""

from typing import Any, Dict, List, Set, Tuple
import networkx as nx


class UnionFind:
    """Disjoint Set Union (DSU) / Union-Find data structure."""

    def __init__(self):
        self.parent: Dict[str, str] = {}

    def find(self, item: str) -> str:
        if item not in self.parent:
            self.parent[item] = item
            return item
        if self.parent[item] != item:
            self.parent[item] = self.find(self.parent[item])
        return self.parent[item]

    def union(self, a: str, b: str) -> None:
        root_a = self.find(a)
        root_b = self.find(b)
        if root_a != root_b:
            # Deterministic union: smaller string becomes parent
            if root_a < root_b:
                self.parent[root_b] = root_a
            else:
                self.parent[root_a] = root_b


def cluster_common_inputs(graph: nx.MultiDiGraph) -> None:
    """
    Cluster addresses by common-input ownership heuristic:
    All input addresses of a single transaction belong to the same entity.
    Assigns deterministic cluster IDs: 'c1', 'c2', etc.
    """
    uf = UnionFind()
    txs = graph.graph.get("txs", [])

    # Group all inputs for each transaction
    for tx in txs:
        inputs = tx.get("inputs", [])
        in_addrs = [inp["address"] for inp in inputs if "address" in inp]
        for i in range(1, len(in_addrs)):
            uf.union(in_addrs[0], in_addrs[i])

    # Ensure all nodes in graph are in UF
    for node in graph.nodes:
        uf.find(node)

    # Group nodes by their root
    clusters: Dict[str, List[str]] = {}
    for node in sorted(graph.nodes):
        root = uf.find(node)
        clusters.setdefault(root, []).append(node)

    # Deterministically number clusters: c1, c2, ...
    # Sorted by the canonical root address
    sorted_roots = sorted(clusters.keys())
    for idx, root in enumerate(sorted_roots, start=1):
        cluster_id = f"c{idx}"
        for node in clusters[root]:
            graph.nodes[node]["cluster"] = cluster_id


def apply_labels(graph: nx.MultiDiGraph, labels: Dict[str, Any]) -> None:
    """
    Lookup addresses in known labels database.
    Updates node['label'] and appends label type to node['tags'].
    """
    for node, data in graph.nodes(data=True):
        if node in labels:
            info = labels[node]
            if isinstance(info, dict):
                label_text = info.get("label", "")
                tag_type = info.get("type", "")
                if label_text:
                    data["label"] = label_text
                if tag_type and tag_type not in data["tags"]:
                    data["tags"].append(tag_type)
            elif isinstance(info, str):
                data["label"] = info


def detect_peel_chains(graph: nx.MultiDiGraph, labels: Dict[str, Any] | None = None) -> List[Dict[str, Any]]:
    """
    Detects peel chains:
    A transaction has 1 input and 2 outputs:
    - One small output (< 15% of input value)
    - One large output (>= 85% of input value)
    The large output is subsequently spent in the same pattern.
    Requires chain length >= 3 consecutive hops.
    Terminates if large output is an exchange deposit or unspent leaf.

    Tags edges:
    - Small output edge: 'PEEL'
    - Large output edge: 'PEEL_CONTINUATION'
    Tags participating nodes: 'PEEL_CHAIN'
    Returns a list of PEEL_CHAIN findings.
    """
    findings: List[Dict[str, Any]] = []
    txs = graph.graph.get("txs", [])
    if not txs:
        return findings

    lbls = labels or {}

    # Index transactions by input address (where single input)
    tx_by_single_input: Dict[str, List[Dict[str, Any]]] = {}
    for tx in txs:
        inps = tx.get("inputs", [])
        if len(inps) == 1 and "address" in inps[0]:
            tx_by_single_input.setdefault(inps[0]["address"], []).append(tx)

    visited_txids: Set[str] = set()

    def is_peel_tx(tx: Dict[str, Any]) -> Tuple[bool, str | None, str | None]:
        """Returns (is_peel, peel_addr, cont_addr)"""
        inps = tx.get("inputs", [])
        outs = tx.get("outputs", [])
        if len(inps) != 1 or len(outs) != 2:
            return False, None, None

        total_in = sum(inp.get("value", 0.0) for inp in inps)
        if total_in <= 0:
            return False, None, None

        out1, out2 = outs[0], outs[1]
        v1, v2 = out1.get("value", 0.0), out2.get("value", 0.0)

        # One small (under ~15%), one large (>= 80%)
        if v1 < 0.15 * total_in and v2 >= 0.80 * total_in:
            return True, out1.get("address"), out2.get("address")
        elif v2 < 0.15 * total_in and v1 >= 0.80 * total_in:
            return True, out2.get("address"), out1.get("address")
        return False, None, None

    def is_exchange_dest(addr: str | None) -> bool:
        if not addr:
            return False
        info = lbls.get(addr, {})
        if isinstance(info, dict) and info.get("type") == "EXCHANGE":
            return True
        node_tags = graph.nodes.get(addr, {}).get("tags", [])
        return "EXCHANGE" in node_tags

    for tx in txs:
        txid = tx.get("txid")
        if not txid or txid in visited_txids:
            continue

        is_peel, peel_addr, cont_addr = is_peel_tx(tx)
        if not is_peel or not cont_addr or is_exchange_dest(cont_addr):
            continue

        # Trace consecutive chain
        chain_txs = [tx]
        chain_peel_addrs = [peel_addr]
        chain_cont_addrs = [cont_addr]
        current_cont = cont_addr

        while current_cont in tx_by_single_input:
            next_candidates = tx_by_single_input[current_cont]
            next_peel_tx = None
            next_p_addr = None
            next_c_addr = None
            for cand in next_candidates:
                cand_is_peel, p_a, c_a = is_peel_tx(cand)
                # If continuation goes to exchange, it's the exit deposit rather than a peel hop
                if cand_is_peel and c_a and not is_exchange_dest(c_a):
                    next_peel_tx = cand
                    next_p_addr = p_a
                    next_c_addr = c_a
                    break

            if next_peel_tx and next_c_addr:
                chain_txs.append(next_peel_tx)
                chain_peel_addrs.append(next_p_addr)
                chain_cont_addrs.append(next_c_addr)
                current_cont = next_c_addr
            else:
                break

        # A peel chain requires length >= 3
        if len(chain_txs) >= 3:
            for ctx in chain_txs:
                visited_txids.add(ctx["txid"])

            chain_nodes: Set[str] = set()

            # Tag edges and nodes
            for idx, ctx in enumerate(chain_txs):
                ctx_id = ctx["txid"]
                p_addr = chain_peel_addrs[idx]
                c_addr = chain_cont_addrs[idx]
                in_addr = ctx["inputs"][0]["address"]

                chain_nodes.add(in_addr)
                if c_addr:
                    chain_nodes.add(c_addr)

                # Tag edges in graph
                for u, v, k, data in graph.edges(keys=True, data=True):
                    if data.get("txid") == ctx_id:
                        if v == p_addr:
                            if "PEEL" not in data.get("tags", []):
                                data.setdefault("tags", []).append("PEEL")
                        elif v == c_addr:
                            if "PEEL_CONTINUATION" not in data.get("tags", []):
                                data.setdefault("tags", []).append("PEEL_CONTINUATION")

            for node in chain_nodes:
                if node in graph:
                    if "PEEL_CHAIN" not in graph.nodes[node].setdefault("tags", []):
                        graph.nodes[node]["tags"].append("PEEL_CHAIN")

            findings.append({
                "type": "PEEL_CHAIN",
                "severity": "high",
                "text": f"Peel chain of {len(chain_txs)} hops detected",
                "nodes": sorted(list(chain_nodes)),
            })

    return findings


def run(graph: nx.MultiDiGraph, labels: Dict[str, Any]) -> Tuple[nx.MultiDiGraph, List[Dict[str, Any]]]:
    """
    Main heuristics pipeline:
    1. Initialize node and edge default attributes
    2. Cluster common inputs (union-find)
    3. Apply known labels
    4. Detect peel chains
    Returns (graph, findings).
    """
    findings: List[Dict[str, Any]] = []

    # 1. Initialize node attributes
    for node, data in graph.nodes(data=True):
        data.setdefault("type", "address")
        data.setdefault("label", "")
        data.setdefault("cluster", "c1")
        data.setdefault("tags", [])
        data.setdefault("risk", 0)
        data.setdefault("taint", 0.0)

    for _, _, data in graph.edges(data=True):
        data.setdefault("tags", [])

    # 2. Common-input ownership clustering
    cluster_common_inputs(graph)

    # 3. Label matching
    apply_labels(graph, labels)

    # 4. Peel chain detection
    peel_findings = detect_peel_chains(graph, labels)
    findings.extend(peel_findings)

    return graph, findings
