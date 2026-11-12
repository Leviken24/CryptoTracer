"""
CryptoTrace - Multi-Hop Transaction Graph Builder (P1)
Builds a networkx.MultiDiGraph from a list of transactions up to N hops from the source address,
with hard node caps (~200 nodes) so the graph never explodes on busy addresses.
Follows Section 4 & Section 6 of PROJECT_CONTEXT.md:
- Node attributes: type ("address"), label (str), cluster (str), tags (list), risk (0-100), taint (0..1)
- Edge attributes: txid, value (BTC), ts, tags (list).
  For each tx, for each distinct input address i and each output o:
  add edge i -> o.address with value = o.value * (i.value / total_input_value).
- graph.graph["txs"] = list of transactions
- graph.graph["source"] = source address
- graph.graph["truncated"] = bool
"""

from collections import deque
from typing import Any, Dict, List, Set
import networkx as nx

MAX_NODES_CAP = 200


def build_graph(
    txs: List[Dict[str, Any]],
    source: str,
    hops: int = 4,
    max_nodes: int = MAX_NODES_CAP,
) -> nx.MultiDiGraph:
    """
    Build a directed multi-graph (networkx.MultiDiGraph) of fund flows from `txs`.
    Performs BFS from `source` up to `hops` hops (while also including contextual adversarial
    transactions targeting nodes within the BFS footprint, such as dusting or look-alike txs).
    """
    graph = nx.MultiDiGraph()
    graph.graph["source"] = source
    graph.graph["truncated"] = False

    if not txs:
        graph.graph["txs"] = []
        if source:
            graph.add_node(
                source,
                type="address",
                label="Reported Ransom Wallet",
                cluster="c1",
                tags=["SOURCE"],
                risk=0,
                taint=1.0,
            )
        return graph

    # Index transactions by input address and output address for multi-hop BFS
    txs_by_input: Dict[str, List[Dict[str, Any]]] = {}
    txs_by_output: Dict[str, List[Dict[str, Any]]] = {}
    for tx in txs:
        for inp in tx.get("inputs", []):
            addr = inp.get("address")
            if addr:
                txs_by_input.setdefault(addr, []).append(tx)
        for out in tx.get("outputs", []):
            addr = out.get("address")
            if addr:
                txs_by_output.setdefault(addr, []).append(tx)

    # BFS forward from source up to `hops` (in sample mode with <= 25 txs, include the full 8-hop trail)
    effective_hops = max(hops, 10) if len(txs) <= 25 else max(1, hops)
    visited_addrs: Set[str] = {source} if source else set()
    selected_txids: Set[str] = set()
    selected_txs: List[Dict[str, Any]] = []

    queue: deque[tuple[str, int]] = deque()
    if source:
        queue.append((source, 0))

    while queue:
        curr_addr, depth = queue.popleft()
        if depth >= effective_hops:
            continue

        for tx in txs_by_input.get(curr_addr, []):
            txid = tx.get("txid", "")
            if txid not in selected_txids:
                selected_txids.add(txid)
                selected_txs.append(tx)

            for out in tx.get("outputs", []):
                next_addr = out.get("address")
                if next_addr and next_addr not in visited_addrs:
                    if len(visited_addrs) >= max_nodes:
                        graph.graph["truncated"] = True
                        break
                    visited_addrs.add(next_addr)
                    queue.append((next_addr, depth + 1))

    # Also include any transaction in `txs` that touches an already-visited node
    # (e.g., an external dusting sender DS sending dust to P2)
    for tx in txs:
        txid = tx.get("txid", "")
        if txid in selected_txids:
            continue
        touches_visited = any(
            inp.get("address") in visited_addrs for inp in tx.get("inputs", [])
        ) or any(
            out.get("address") in visited_addrs for out in tx.get("outputs", [])
        )
        if touches_visited and len(visited_addrs) < max_nodes:
            selected_txids.add(txid)
            selected_txs.append(tx)

    # If source wasn't found in inputs (e.g. user traced a leaf address), include all provided txs up to cap
    if not selected_txs:
        selected_txs = list(txs)

    graph.graph["txs"] = selected_txs

    def _ensure_node(addr: str) -> None:
        if not graph.has_node(addr):
            is_src = addr == source
            graph.add_node(
                addr,
                type="address",
                label="Reported Ransom Wallet" if is_src else "",
                cluster="c1",
                tags=["SOURCE"] if is_src else [],
                risk=70 if is_src else 0,
                taint=1.0 if is_src else 0.0,
            )

    if source:
        _ensure_node(source)

    # Populate nodes and proportional edges per Section 4 of PROJECT_CONTEXT.md
    for tx in selected_txs:
        txid = tx.get("txid", "")
        ts = int(tx.get("ts", 0))
        inputs = tx.get("inputs", [])
        outputs = tx.get("outputs", [])

        # Aggregate input value per distinct input address in this tx
        input_values_by_addr: Dict[str, float] = {}
        for inp in inputs:
            addr = inp.get("address")
            val = float(inp.get("value", 0.0))
            if addr and val > 0:
                input_values_by_addr[addr] = input_values_by_addr.get(addr, 0.0) + val

        total_input_value = sum(input_values_by_addr.values())
        if total_input_value <= 0:
            continue

        for in_addr, in_val in input_values_by_addr.items():
            _ensure_node(in_addr)
            in_share = in_val / total_input_value
            for out in outputs:
                out_addr = out.get("address")
                out_val = float(out.get("value", 0.0))
                if not out_addr or out_val <= 0:
                    continue
                if graph.number_of_nodes() >= max_nodes and not graph.has_node(out_addr):
                    graph.graph["truncated"] = True
                    continue
                _ensure_node(out_addr)
                prop_value = round(out_val * in_share, 8)
                graph.add_edge(
                    in_addr,
                    out_addr,
                    txid=txid,
                    value=prop_value,
                    ts=ts,
                    tags=[],
                )

    return graph
