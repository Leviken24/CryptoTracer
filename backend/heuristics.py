"""
Forensics Heuristics Engine (P2)

Implements core blockchain forensics heuristics:
1. Common-input ownership clustering (Union-Find)
2. Label matching (EXCHANGE, MIXER, SANCTIONED, RANSOMWARE)
3. Peel chain detection (consecutive 1-in-2-out asymmetric splits >= 3 hops)
4. Fan-out and fan-in detection (FAN_OUT, FAN_IN)
5. Equal-value mixer pattern detection (MIXER_PATTERN)
6. Structuring detection (STRUCTURING)
7. Threat Profile synthesis (THREAT_PROFILE)
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

    for tx in txs:
        inputs = tx.get("inputs", [])
        in_addrs = [inp["address"] for inp in inputs if "address" in inp]
        for i in range(1, len(in_addrs)):
            uf.union(in_addrs[0], in_addrs[i])

    for node in graph.nodes:
        uf.find(node)

    clusters: Dict[str, List[str]] = {}
    for node in sorted(graph.nodes):
        root = uf.find(node)
        clusters.setdefault(root, []).append(node)

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
    - One large output (>= 80% of input value)
    The large output is subsequently spent in the same pattern.
    Requires chain length >= 3 consecutive hops.

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

    tx_by_single_input: Dict[str, List[Dict[str, Any]]] = {}
    for tx in txs:
        inps = tx.get("inputs", [])
        if len(inps) == 1 and "address" in inps[0]:
            tx_by_single_input.setdefault(inps[0]["address"], []).append(tx)

    visited_txids: Set[str] = set()

    def is_peel_tx(tx: Dict[str, Any]) -> Tuple[bool, str | None, str | None]:
        inps = tx.get("inputs", [])
        outs = tx.get("outputs", [])
        if len(inps) != 1 or len(outs) != 2:
            return False, None, None

        total_in = sum(inp.get("value", 0.0) for inp in inps)
        if total_in <= 0:
            return False, None, None

        out1, out2 = outs[0], outs[1]
        v1, v2 = out1.get("value", 0.0), out2.get("value", 0.0)

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

        if len(chain_txs) >= 3:
            for ctx in chain_txs:
                visited_txids.add(ctx["txid"])

            chain_nodes: Set[str] = set()

            for idx, ctx in enumerate(chain_txs):
                ctx_id = ctx["txid"]
                p_addr = chain_peel_addrs[idx]
                c_addr = chain_cont_addrs[idx]
                in_addr = ctx["inputs"][0]["address"]

                chain_nodes.add(in_addr)
                if c_addr:
                    chain_nodes.add(c_addr)

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


def detect_fan_patterns(graph: nx.MultiDiGraph) -> List[Dict[str, Any]]:
    """
    Detects fan-out and fan-in patterns:
    - Fan-out: 1 input to 8 or more outputs
    - Fan-in: 6 or more inputs to 1 output
    Tags nodes and edges with FAN_OUT / FAN_IN.
    """
    findings: List[Dict[str, Any]] = []
    txs = graph.graph.get("txs", [])

    for tx in txs:
        txid = tx.get("txid")
        inputs = tx.get("inputs", [])
        outputs = tx.get("outputs", [])

        # Fan-out: 1 input -> >= 8 outputs
        if len(inputs) == 1 and len(outputs) >= 8:
            src_addr = inputs[0].get("address")
            out_addrs = [out.get("address") for out in outputs if "address" in out]
            participating = [src_addr] + out_addrs

            for addr in participating:
                if addr and addr in graph:
                    if "FAN_OUT" not in graph.nodes[addr].setdefault("tags", []):
                        graph.nodes[addr]["tags"].append("FAN_OUT")

            for u, v, k, data in graph.edges(keys=True, data=True):
                if data.get("txid") == txid:
                    if "FAN_OUT" not in data.setdefault("tags", []):
                        data["tags"].append("FAN_OUT")

            findings.append({
                "type": "FAN_OUT",
                "severity": "medium",
                "text": f"Fan-out pattern: single input split into {len(outputs)} outputs",
                "nodes": [addr for addr in participating if addr],
            })

        # Fan-in: >= 6 inputs -> 1 output
        if len(inputs) >= 6 and len(outputs) == 1:
            dest_addr = outputs[0].get("address")
            in_addrs = [inp.get("address") for inp in inputs if "address" in inp]
            participating = in_addrs + [dest_addr]

            for addr in participating:
                if addr and addr in graph:
                    if "FAN_IN" not in graph.nodes[addr].setdefault("tags", []):
                        graph.nodes[addr]["tags"].append("FAN_IN")

            for u, v, k, data in graph.edges(keys=True, data=True):
                if data.get("txid") == txid:
                    if "FAN_IN" not in data.setdefault("tags", []):
                        data["tags"].append("FAN_IN")

            findings.append({
                "type": "FAN_IN",
                "severity": "medium",
                "text": f"Fan-in pattern: {len(inputs)} inputs consolidated into 1 output",
                "nodes": [addr for addr in participating if addr],
            })

    return findings


def detect_mixer_patterns(graph: nx.MultiDiGraph) -> List[Dict[str, Any]]:
    """
    Detects equal-value mixer-like distributions:
    5 or more outputs in a single transaction within 1% of the same value.
    Tags nodes and edges with MIXER_PATTERN.
    """
    findings: List[Dict[str, Any]] = []
    txs = graph.graph.get("txs", [])

    for tx in txs:
        txid = tx.get("txid")
        outputs = tx.get("outputs", [])
        if len(outputs) < 5:
            continue

        values = [out.get("value", 0.0) for out in outputs if out.get("value", 0.0) > 0]
        if len(values) < 5:
            continue

        values_sorted = sorted(values)
        matched_indices: Set[int] = set()

        for i in range(len(values_sorted) - 4):
            window = values_sorted[i : i + 5]
            avg = sum(window) / len(window)
            if avg > 0 and (max(window) - min(window)) / avg <= 0.01:
                matched_indices.update(range(i, i + 5))

        if len(matched_indices) >= 5:
            matched_nodes: List[str] = []
            for idx, out in enumerate(outputs):
                addr = out.get("address")
                if addr and addr in graph:
                    matched_nodes.append(addr)
                    if "MIXER_PATTERN" not in graph.nodes[addr].setdefault("tags", []):
                        graph.nodes[addr]["tags"].append("MIXER_PATTERN")

            for u, v, k, data in graph.edges(keys=True, data=True):
                if data.get("txid") == txid:
                    if "MIXER_PATTERN" not in data.setdefault("tags", []):
                        data["tags"].append("MIXER_PATTERN")

            findings.append({
                "type": "MIXER_PATTERN",
                "severity": "high",
                "text": f"Mixer pattern: {len(matched_indices)} outputs with near-equal values (~{values_sorted[0]:.4f} BTC)",
                "nodes": matched_nodes,
            })

    return findings


def detect_structuring(graph: nx.MultiDiGraph) -> List[Dict[str, Any]]:
    """
    Detects structuring:
    Many similar outputs kept just under round value thresholds (e.g. 0.1, 0.5, 1.0, 5.0 BTC).
    Tags nodes with STRUCTURING.
    """
    findings: List[Dict[str, Any]] = []
    round_thresholds = [0.1, 0.5, 1.0, 2.0, 5.0, 10.0]
    structured_nodes: Set[str] = set()

    for u, v, data in graph.edges(data=True):
        val = data.get("value", 0.0)
        for thresh in round_thresholds:
            if 0.95 * thresh <= val < thresh:
                structured_nodes.add(v)
                if "STRUCTURING" not in graph.nodes[v].setdefault("tags", []):
                    graph.nodes[v]["tags"].append("STRUCTURING")
                break

    if len(structured_nodes) >= 3:
        findings.append({
            "type": "STRUCTURING",
            "severity": "medium",
            "text": f"Structuring pattern: {len(structured_nodes)} outputs positioned just under round thresholds",
            "nodes": sorted(list(structured_nodes)),
        })

    return findings


def synthesize_threat_profile(graph: nx.MultiDiGraph, findings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Synthesizes executive threat intelligence by correlating multiple laundering techniques.
    Produces an actionable THREAT_PROFILE finding for investigators.
    """
    extra_findings: List[Dict[str, Any]] = []
    finding_types = {f.get("type") for f in findings}

    has_peel = "PEEL_CHAIN" in finding_types
    has_mixer = bool({"MIXER_PATTERN", "FAN_OUT", "FAN_IN"} & finding_types)
    source = graph.graph.get("source", "")
    source_label = graph.nodes.get(source, {}).get("label", "")
    is_ransomware = "ransom" in source_label.lower()

    if has_peel and has_mixer:
        mo_desc = "Multi-stage layering detected: High-entropy mixer consolidation followed by an active peel chain designed to evade exchange deposit heuristics."
        if is_ransomware:
            mo_desc = "Ransomware extortion cash-out: Extorted funds routed through mixer obfuscation and a peel chain before final exchange liquidation."

        extra_findings.append({
            "type": "THREAT_PROFILE",
            "severity": "high",
            "text": mo_desc,
            "nodes": [source] if source else [],
        })

    return extra_findings


def run(graph: nx.MultiDiGraph, labels: Dict[str, Any]) -> Tuple[nx.MultiDiGraph, List[Dict[str, Any]]]:
    """
    Main heuristics pipeline:
    1. Initialize node and edge default attributes
    2. Common-input ownership clustering
    3. Known label lookup
    4. Peel chain detection
    5. Fan-out / Fan-in detection
    6. Mixer-like pattern detection
    7. Structuring detection
    8. Threat Profile synthesis
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
    findings.extend(detect_peel_chains(graph, labels))

    # 5. Fan-out and fan-in detection
    findings.extend(detect_fan_patterns(graph))

    # 6. Mixer pattern detection
    findings.extend(detect_mixer_patterns(graph))

    # 7. Structuring detection
    findings.extend(detect_structuring(graph))

    # 8. Threat profile synthesis
    findings.extend(synthesize_threat_profile(graph, findings))

    return graph, findings
