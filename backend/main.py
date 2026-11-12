"""
CryptoTrace - Main FastAPI Application (P1 + P2 + P3 + P4 Integration)
Wires the full 8-step forensics & security pipeline inside POST /trace:
1. security.validate_input        (P3)
2. sample_loader / chain_client   (P1)
3. security.validate_response     (P3)
4. graph_builder.build_graph      (P1)
5. security.run_detectors         (P3)
6. heuristics.run                 (P2)
7. taint.rank_end_receivers + scoring.score (P2)
8. audit.append after EVERY step  (P3)

Also exposes:
- GET /health
- GET /audit, GET /audit/verify, POST /audit/tamper, POST /audit/reset, GET /audit/certificate (via audit_routes)
"""

from collections import deque
import json
import os
from typing import Any, Dict, List, Literal
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend import (
    chain_client,
    graph_builder,
    heuristics,
    sample_loader,
    scoring,
    security,
    taint,
)
from backend.audit_log import audit
from backend.audit_routes import router as audit_router

app = FastAPI(
    title="CryptoTrace Forensics & Security Engine",
    description="Blockchain forensics engine to trace illicit crypto to its end receivers with adversarial detection and a tamper-evident hash-chained audit log.",
    version="1.0.0",
)

# Enable CORS so React/Vite frontend (http://localhost:5173) can call http://localhost:8000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register P3 audit routes (/audit, /audit/verify, /audit/tamper, /audit/reset, /audit/certificate)
app.include_router(audit_router)

_LABELS_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "data", "labels.json"
)


def _load_labels() -> Dict[str, Any]:
    if os.path.exists(_LABELS_PATH):
        try:
            with open(_LABELS_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


class TraceRequest(BaseModel):
    input: str = Field(
        default="bc1qsrc0000000000000000000000000000000000",
        description="Bitcoin wallet address, alias (in sample mode), or 64-hex transaction ID",
    )
    hops: int = Field(default=4, ge=1, le=10)
    mode: Literal["sample", "live"] = Field(default="sample")


def _fetch_live_bfs(
    start_input: str, input_kind: str, hops: int = 4
) -> tuple[str, List[Dict[str, Any]], List[Dict[str, Any]] | None]:
    """
    Fetch multi-hop transactions in live mode using chain_client (with disk cache).
    Also fetches the starting tx from the second source (mempool.space) for dual-source validation.
    """
    txs_by_id: Dict[str, Dict[str, Any]] = {}
    second_source_txs: List[Dict[str, Any]] = []

    if input_kind == "txid":
        first_tx = chain_client.get_tx(start_input)
        txs_by_id[first_tx["txid"]] = first_tx
        try:
            sec_tx = chain_client.get_tx_second_source(start_input)
            second_source_txs.append(sec_tx)
        except Exception:
            second_source_txs = []
        inps = first_tx.get("inputs", [])
        source_addr = inps[0]["address"] if inps else start_input
    else:
        source_addr = start_input

    visited_addrs = {source_addr}
    queue: deque[tuple[str, int]] = deque([(source_addr, 0)])
    max_live_addrs = 15

    while queue and len(visited_addrs) <= max_live_addrs:
        addr, depth = queue.popleft()
        if depth >= min(hops, 3):
            continue
        try:
            addr_txs = chain_client.get_address_txs(addr, max_txs=10)
        except Exception as exc:
            if depth == 0 and not txs_by_id:
                raise HTTPException(
                    status_code=502,
                    detail=f"Live blockchain API error for {addr}: {exc}",
                ) from exc
            continue

        for tx in addr_txs:
            txid = tx.get("txid")
            if txid and txid not in txs_by_id:
                txs_by_id[txid] = tx
            for out in tx.get("outputs", []):
                next_addr = out.get("address")
                if (
                    next_addr
                    and next_addr not in visited_addrs
                    and len(visited_addrs) < max_live_addrs
                ):
                    visited_addrs.add(next_addr)
                    queue.append((next_addr, depth + 1))

    return (
        source_addr,
        list(txs_by_id.values()),
        second_source_txs if second_source_txs else None,
    )


@app.get("/health")
def health_check() -> Dict[str, Any]:
    """Health check endpoint required by PROJECT_CONTEXT.md Section 5."""
    return {"status": "ok", "service": "CryptoTrace", "mode_support": ["sample", "live"]}


@app.post("/trace")
def trace_funds(req: TraceRequest) -> Dict[str, Any]:
    """
    Main forensic pipeline endpoint (POST /trace).
    Follows the exact frozen contract in PROJECT_CONTEXT.md Section 5 and aligns
    100% with the React frontend (App.jsx, GraphView.jsx, RankedTable.jsx,
    AddressDossier.jsx, FindingsPanel.jsx, AuditPanel.jsx, ReportView.jsx).
    """
    raw_input = (req.input or "").strip()

    # In sample mode, resolve shorthand aliases like "S" or "E1" before validation
    sample_data = sample_loader.load_sample() if req.mode == "sample" else None
    effective_input = (
        sample_loader.resolve_sample_input(raw_input, sample_data)
        if req.mode == "sample" and sample_data
        else raw_input
    )

    # Reset audit log at the start of a new trace so the 5-step Chain Integrity UI
    # in AuditPanel.jsx shows the clean 5-link sequence for this trace run
    audit.reset()

    # 1. security.validate_input (P3)
    ok, input_kind, msg = security.validate_input(effective_input)
    audit.append(
        "validate_input",
        {
            "input": effective_input,
            "hops": req.hops,
            "mode": req.mode,
            "valid": ok,
            "kind": input_kind,
        },
    )
    if not ok:
        raise HTTPException(status_code=400, detail=msg)

    # 2. Fetch transactions: sample_loader or chain_client (P1)
    second_source: List[Dict[str, Any]] | None = None
    if req.mode == "sample":
        assert sample_data is not None
        txs = sample_data.get("txs", [])
        source_addr = sample_data.get("source", effective_input)
        aliases = sample_data.get("aliases", {})
    else:
        source_addr, txs, second_source = _fetch_live_bfs(
            effective_input, input_kind or "address", req.hops
        )
        aliases = {}

    audit.append(
        "fetch_transactions",
        {
            "mode": req.mode,
            "source": source_addr,
            "tx_count": len(txs),
            "txids": sorted(tx.get("txid", "") for tx in txs),
        },
    )

    # 3. security.validate_response (P3)
    resp_ok, issues = security.validate_response(txs, second_source=second_source)
    audit.append(
        "validate_response",
        {"valid": resp_ok, "issues": issues},
    )
    if not resp_ok and req.mode == "live":
        raise HTTPException(
            status_code=502,
            detail=f"Blockchain API response validation failed: {'; '.join(issues)}",
        )

    # 4. graph_builder.build_graph (P1)
    graph = graph_builder.build_graph(txs, source=source_addr, hops=req.hops)

    # 5. security.run_detectors (P3) + 6. heuristics.run (P2)
    labels = _load_labels()
    sec_findings = security.run_detectors(graph)
    graph, heur_findings = heuristics.run(graph, labels)

    # Combine findings (heuristic findings + adversarial security findings)
    findings = heur_findings + sec_findings
    audit.append(
        "run_detectors",
        {
            "finding_count": len(findings),
            "types": [f.get("type") for f in findings],
        },
    )

    # 7. taint.rank_end_receivers + scoring.score (P2)
    ranked = taint.rank_end_receivers(graph, source=source_addr, top_n=5)
    ranked = scoring.score(graph, ranked, findings)

    # Ensure every ranked item has `critical_path` (expected by frontend App.jsx,
    # RankedTable.jsx, and AddressDossier.jsx) alongside P2's `path`
    for item in ranked:
        if "critical_path" not in item:
            item["critical_path"] = item.get("path", [source_addr, item["address"]])

    last_audit_entry = audit.append(
        "rank_and_score",
        {
            "ranked_addresses": [r.get("address") for r in ranked],
            "top_receiver": ranked[0]["address"] if ranked else None,
            "top_confidence": ranked[0]["confidence"] if ranked else 0.0,
            "top_risk": ranked[0]["risk"] if ranked else 0,
        },
    )

    # Apply human-friendly labels for sample scenario nodes if not already labeled in labels.json
    reverse_aliases = {v: k for k, v in aliases.items()}
    friendly_alias_labels = {
        "S": "Reported Ransom Wallet",
        "C1": "Consolidation Hub C1",
        "P1": "Peel Node P1",
        "P2": "Peel Node P2",
        "P3": "Peel Node P3",
        "P4": "Peel Node P4",
        "P5": "Peel Node P5",
        "W1": "Peel Change W1",
        "W2": "Peel Change W2",
        "W3": "Peel Change W3",
        "W4": "Peel Change W4",
        "W5": "Peel Change W5",
        "M1": "Mixer Pool M1",
        "M2": "Mixer Pool M2",
        "M3": "Mixer Pool M3",
        "M4": "Mixer Pool M4",
        "M5": "Mixer Pool M5",
        "M6": "Mixer Pool M6",
        "M7": "Mixer Leaf M7",
        "M8": "Mixer Leaf M8",
        "L1": "Unspent Leaf L1",
        "DS": "Dust Attack Distributor DS",
        "E1X": "Look-Alike Poison Wallet E1X",
        "U1": "Decoy Leaf Wallet U1",
    }

    # Format nodes and edges strictly according to Section 5 of PROJECT_CONTEXT.md
    nodes_out: List[Dict[str, Any]] = []
    for node_id, data in graph.nodes(data=True):
        node_tags = list(data.get("tags", []))
        if node_id == source_addr and "SOURCE" not in node_tags:
            node_tags.insert(0, "SOURCE")

        alias_key = reverse_aliases.get(node_id)
        if alias_key == "DS" and "DUSTING" not in node_tags:
            node_tags.append("DUSTING")
        elif alias_key == "E1X" and "LOOKALIKE" not in node_tags:
            node_tags.append("LOOKALIKE")

        label_str = data.get("label", "")
        if not label_str and alias_key in friendly_alias_labels:
            label_str = friendly_alias_labels[alias_key]

        nodes_out.append(
            {
                "id": str(node_id),
                "type": str(data.get("type", "address")),
                "label": str(label_str),
                "cluster": str(data.get("cluster", "c1")),
                "tags": node_tags,
                "risk": int(data.get("risk", 0)),
                "taint": round(float(data.get("taint", 0.0)), 4),
            }
        )

    edges_out: List[Dict[str, Any]] = []
    for u, v, data in graph.edges(data=True):
        edges_out.append(
            {
                "from": str(u),
                "to": str(v),
                "txid": str(data.get("txid", "")),
                "value": round(float(data.get("value", 0.0)), 8),
                "ts": int(data.get("ts", 0)),
                "tags": list(data.get("tags", [])),
            }
        )

    return {
        "graph": {
            "nodes": nodes_out,
            "edges": edges_out,
        },
        "findings": findings,
        "ranked": ranked,
        "audit_head": last_audit_entry["hash"],
    }
