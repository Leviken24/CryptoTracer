"""
CryptoTrace - Security Layer (P3)
Implements all P3 functions specified in PROJECT_CONTEXT.md (Sections 6, 7, 8):
- validate_input(text: str) -> tuple[bool, str | None, str]
- validate_response(txs: list[dict], second_source: list[dict] | None = None) -> tuple[bool, list[str]]
- run_detectors(graph) -> list[dict]  (DUSTING, LOOKALIKE, DECOY)
- adversarial_score(graph, findings: list[dict]) -> float  (0..1)
"""

import re
import base58

# 64 hexadecimal characters = Bitcoin transaction ID (txid)
_TXID_RE = re.compile(r"^[0-9a-fA-F]{64}$")

# Bech32 / Bech32m address regex (mainnet bc1 or testnet tb1)
# Bech32 data-part alphabet: qpzry9x8gf2tvdw0s3jn54khce6mua7l (no 1, b, i, o)
_BECH32_RE = re.compile(
    r"^(?:bc1|tb1)[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{25,87}$",
    re.IGNORECASE,
)

# Legacy Base58 address prefixes (1, 3 for mainnet; m, n, 2 for testnet)
_BASE58_CHARS_RE = re.compile(r"^[123mn][1-9A-HJ-NP-Za-km-z]{24,34}$")

# Threshold constants from Section 7 of PROJECT_CONTEXT.md
DUST_MAX_BTC = 0.00001  # 1,000 satoshis
DUST_MIN_OUTPUTS = 10   # 10 or more addresses
DECOY_RATIO = 0.001     # 0.1% of largest edge value
FLOAT_EPS = 1e-9


def validate_input(text: str) -> tuple[bool, str | None, str]:
    """
    Validate user input (Bitcoin address or transaction ID).
    Returns: (ok, "address" | "txid" | None, message)
    """
    if not isinstance(text, str):
        return (False, None, "Input must be a text string.")

    cleaned = text.strip()
    if not cleaned:
        return (False, None, "Input cannot be empty. Please paste a Bitcoin address or txid.")

    if len(cleaned) > 100:
        return (False, None, "Input is too long to be a valid Bitcoin address or transaction ID.")

    # 1. Check 64-character hex txid
    if _TXID_RE.match(cleaned):
        return (True, "txid", "Valid Bitcoin transaction ID (txid).")

    # 2. Check Bech32 address (bc1... or tb1...)
    if cleaned.lower().startswith(("bc1", "tb1")):
        if cleaned != cleaned.lower() and cleaned != cleaned.upper():
            return (False, None, "Invalid Bech32 address: cannot mix uppercase and lowercase.")
        if _BECH32_RE.match(cleaned):
            return (True, "address", "Valid Bech32 Bitcoin address.")
        return (False, None, "Invalid Bech32 Bitcoin address format.")

    # 3. Check Legacy Base58Check address (starts with 1, 3, m, n, or 2)
    if _BASE58_CHARS_RE.match(cleaned):
        try:
            decoded = base58.b58decode_check(cleaned)
            if len(decoded) == 21:
                return (True, "address", "Valid Base58 Bitcoin address.")
            return (False, None, "Invalid Base58 address payload length.")
        except Exception:
            return (False, None, "Invalid Bitcoin address: Base58 checksum verification failed.")

    return (
        False,
        None,
        "Invalid input. Expected a 64-character hex txid or a valid Bitcoin address.",
    )


def validate_response(
    txs: list[dict], second_source: list[dict] | None = None
) -> tuple[bool, list[str]]:
    """
    Validate API transaction responses and optional second-source cross-check.
    Checks:
    1. txs is a list of dicts, each with required fields: txid, ts, inputs, outputs.
    2. Each input/output has a valid non-empty 'address' and non-negative numeric 'value'.
    3. Value conservation: total outputs never exceed total inputs (sum(outputs) <= sum(inputs)).
    4. Dual-source check: if second_source is provided, output values per txid must match.
    Returns: (ok, issues)
    """
    issues: list[str] = []

    if not isinstance(txs, list):
        return (False, ["Transactions payload must be a list."])

    required_tx_fields = ("txid", "ts", "inputs", "outputs")

    for idx, tx in enumerate(txs):
        if not isinstance(tx, dict):
            issues.append(f"Transaction at index {idx} is not a dict.")
            continue

        tx_label = tx.get("txid", f"index_{idx}")

        # Required top-level fields
        missing = [f for f in required_tx_fields if f not in tx]
        if missing:
            issues.append(f"Tx {tx_label}: missing required fields {missing}.")
            continue

        inputs = tx.get("inputs")
        outputs = tx.get("outputs")
        if not isinstance(inputs, list) or not isinstance(outputs, list):
            issues.append(f"Tx {tx_label}: 'inputs' and 'outputs' must be lists.")
            continue

        if len(inputs) == 0 or len(outputs) == 0:
            issues.append(f"Tx {tx_label}: must have at least one input and one output.")
            continue

        total_in = 0.0
        total_out = 0.0
        io_valid = True

        for i_idx, inp in enumerate(inputs):
            if not isinstance(inp, dict) or "address" not in inp or "value" not in inp:
                issues.append(f"Tx {tx_label}: input {i_idx} missing 'address' or 'value'.")
                io_valid = False
                continue
            val = inp["value"]
            if not isinstance(val, (int, float)) or isinstance(val, bool) or val < 0:
                issues.append(f"Tx {tx_label}: input {i_idx} has negative or invalid value ({val}).")
                io_valid = False
                continue
            total_in += float(val)

        for o_idx, out in enumerate(outputs):
            if not isinstance(out, dict) or "address" not in out or "value" not in out:
                issues.append(f"Tx {tx_label}: output {o_idx} missing 'address' or 'value'.")
                io_valid = False
                continue
            val = out["value"]
            if not isinstance(val, (int, float)) or isinstance(val, bool) or val < 0:
                issues.append(f"Tx {tx_label}: output {o_idx} has negative or invalid value ({val}).")
                io_valid = False
                continue
            total_out += float(val)

        # Value conservation check: outputs cannot exceed inputs
        if io_valid and (total_out > total_in + FLOAT_EPS):
            issues.append(
                f"Tx {tx_label}: total output value ({total_out:.8f} BTC) exceeds total input value ({total_in:.8f} BTC)."
            )

    # Dual-source comparison against second_source if provided
    if second_source is not None:
        if not isinstance(second_source, list):
            issues.append("Second source payload must be a list.")
        else:
            sec_by_txid = {
                t.get("txid"): t
                for t in second_source
                if isinstance(t, dict) and "txid" in t
            }
            for tx in txs:
                if not isinstance(tx, dict) or "txid" not in tx:
                    continue
                txid = tx["txid"]
                if txid not in sec_by_txid:
                    issues.append(f"Tx {txid}: missing from second source provider.")
                    continue
                sec_tx = sec_by_txid[txid]
                prim_outputs = tx.get("outputs", [])
                sec_outputs = sec_tx.get("outputs", [])
                if not isinstance(prim_outputs, list) or not isinstance(sec_outputs, list):
                    issues.append(f"Tx {txid}: invalid outputs list in dual-source comparison.")
                    continue
                if len(prim_outputs) != len(sec_outputs):
                    issues.append(
                        f"Tx {txid}: output count mismatch between sources ({len(prim_outputs)} vs {len(sec_outputs)})."
                    )
                    continue
                # Compare output (address, value) pairs in sorted order
                prim_pairs = sorted(
                    (str(o.get("address", "")), round(float(o.get("value", 0.0)), 8))
                    for o in prim_outputs
                    if isinstance(o, dict)
                )
                sec_pairs = sorted(
                    (str(o.get("address", "")), round(float(o.get("value", 0.0)), 8))
                    for o in sec_outputs
                    if isinstance(o, dict)
                )
                if prim_pairs != sec_pairs:
                    issues.append(f"Tx {txid}: output values mismatch between primary and second source.")

    return (len(issues) == 0, issues)


def _address_body(addr: str) -> str:
    """
    Extract the address body per Section 7 of PROJECT_CONTEXT.md:
    - Without the 'bc1q' / 'tb1q' prefix (or 'bc1'/'tb1' if not 'q') for Bech32
    - Without the first character for legacy addresses
    """
    lower = addr.lower()
    if lower.startswith(("bc1q", "tb1q")):
        return lower[4:]
    if lower.startswith(("bc1", "tb1")):
        return lower[3:]
    return addr[1:] if len(addr) > 1 else addr


def run_detectors(graph) -> list[dict]:
    """
    Run P3 adversarial detectors on the transaction graph (networkx.MultiDiGraph or DiGraph):
    1. DUSTING: One tx sends 0.00001 BTC (1000 sats) or less to 10 or more addresses.
    2. LOOKALIKE: Two different addresses whose body shares the same first 4 and last 4 characters.
    3. DECOY: Edge value under 0.1% of the largest edge value, not part of a dusting finding.
              Also tags the decoy edge with "DECOY".

    Returns a list of finding dicts matching the contract:
    {"type": str, "severity": "low"|"medium"|"high", "text": str, "nodes": list[str]}
    """
    findings: list[dict] = []
    if graph is None:
        return findings

    dusting_txids: set[str] = set()
    dusting_nodes: set[str] = set()

    # --- 1. DUSTING DETECTOR ---
    # Check graph.graph["txs"] first (canonical transaction list per Section 4 of PROJECT_CONTEXT.md)
    txs = graph.graph.get("txs", []) if hasattr(graph, "graph") and isinstance(graph.graph, dict) else []

    if txs:
        for tx in txs:
            if not isinstance(tx, dict):
                continue
            txid = tx.get("txid", "")
            outputs = tx.get("outputs", [])
            if not isinstance(outputs, list):
                continue
            dust_outs = [
                o
                for o in outputs
                if isinstance(o, dict)
                and isinstance(o.get("value"), (int, float))
                and 0 < float(o["value"]) <= DUST_MAX_BTC + FLOAT_EPS
            ]
            dust_addrs = {o.get("address") for o in dust_outs if o.get("address")}
            if len(dust_addrs) >= DUST_MIN_OUTPUTS:
                dusting_txids.add(txid)
                in_addrs = [
                    inp.get("address")
                    for inp in tx.get("inputs", [])
                    if isinstance(inp, dict) and inp.get("address")
                ]
                affected_nodes = sorted(
                    n for n in (set(in_addrs) | dust_addrs) if graph.has_node(n)
                )
                if not affected_nodes:
                    affected_nodes = sorted(set(in_addrs) | dust_addrs)
                dusting_nodes.update(affected_nodes)
                sats = round(float(dust_outs[0]["value"]) * 100_000_000)
                findings.append(
                    {
                        "type": "DUSTING",
                        "severity": "medium",
                        "text": f"{len(dust_outs)} outputs of {sats} sats",
                        "nodes": affected_nodes,
                    }
                )
                # Tag dusting edges on the graph if present
                for u, v, data in graph.edges(data=True):
                    if data.get("txid") == txid and float(data.get("value", 0.0)) <= DUST_MAX_BTC + FLOAT_EPS:
                        tags = data.setdefault("tags", [])
                        if "DUSTING" not in tags:
                            tags.append("DUSTING")
    else:
        # Fallback if graph.graph["txs"] was not populated: group graph edges by txid
        edges_by_txid: dict[str, list[tuple[str, str, dict]]] = {}
        for u, v, data in graph.edges(data=True):
            txid = data.get("txid", f"{u}->{v}")
            edges_by_txid.setdefault(txid, []).append((u, v, data))

        for txid, edge_list in edges_by_txid.items():
            dust_edges = [
                (u, v, d)
                for u, v, d in edge_list
                if isinstance(d.get("value"), (int, float))
                and 0 < float(d["value"]) <= DUST_MAX_BTC + FLOAT_EPS
            ]
            dust_targets = {v for _, v, _ in dust_edges}
            if len(dust_targets) >= DUST_MIN_OUTPUTS:
                dusting_txids.add(txid)
                senders = {u for u, _, _ in dust_edges}
                affected_nodes = sorted(senders | dust_targets)
                dusting_nodes.update(affected_nodes)
                sats = round(float(dust_edges[0][2]["value"]) * 100_000_000)
                findings.append(
                    {
                        "type": "DUSTING",
                        "severity": "medium",
                        "text": f"{len(dust_targets)} outputs of {sats} sats",
                        "nodes": affected_nodes,
                    }
                )
                for _, _, d in dust_edges:
                    tags = d.setdefault("tags", [])
                    if "DUSTING" not in tags:
                        tags.append("DUSTING")

    # --- 2. LOOKALIKE (ADDRESS POISONING) DETECTOR ---
    # Two different addresses in the graph whose body shares the same first 4 and last 4 characters.
    sig_map: dict[tuple[str, str], list[str]] = {}
    for node in sorted(str(n) for n in graph.nodes()):
        body = _address_body(node)
        if len(body) >= 8:
            sig = (body[:4], body[-4:])
            sig_map.setdefault(sig, []).append(node)

    for (first4, last4), matching_addrs in sorted(sig_map.items()):
        unique_addrs = sorted(set(matching_addrs))
        if len(unique_addrs) >= 2:
            findings.append(
                {
                    "type": "LOOKALIKE",
                    "severity": "high",
                    "text": (
                        f"Address poisoning look-alike detected: {unique_addrs[0]} and {unique_addrs[1]} "
                        f"share body prefix '{first4}' and suffix '{last4}'"
                    ),
                    "nodes": unique_addrs,
                }
            )
            for addr in unique_addrs:
                if graph.has_node(addr):
                    node_tags = graph.nodes[addr].setdefault("tags", [])
                    if "LOOKALIKE" not in node_tags:
                        node_tags.append("LOOKALIKE")

    # --- 3. DECOY EDGE DETECTOR ---
    # Edge value under 0.1% of the largest edge value, not part of a dusting finding.
    all_edge_values = [
        float(data["value"])
        for _, _, data in graph.edges(data=True)
        if isinstance(data.get("value"), (int, float)) and float(data["value"]) > 0
    ]
    if all_edge_values:
        max_edge_value = max(all_edge_values)
        decoy_threshold = max_edge_value * DECOY_RATIO

        for u, v, data in graph.edges(data=True):
            val = data.get("value")
            if not isinstance(val, (int, float)):
                continue
            val_f = float(val)
            txid = data.get("txid", "")

            # Skip if this edge belongs to a dusting transaction
            if txid in dusting_txids:
                continue

            if 0 < val_f < decoy_threshold:
                tags = data.setdefault("tags", [])
                if "DECOY" not in tags:
                    tags.append("DECOY")
                for addr in (u, v):
                    if graph.has_node(addr):
                        ntags = graph.nodes[addr].setdefault("tags", [])
                        if "DECOY" not in ntags:
                            ntags.append("DECOY")
                sats = round(val_f * 100_000_000)
                findings.append(
                    {
                        "type": "DECOY",
                        "severity": "low",
                        "text": f"Decoy low-value edge of {sats} sats ({val_f:.8f} BTC) from {u} to {v}",
                        "nodes": [u, v],
                    }
                )

    return findings


def adversarial_score(graph, findings: list[dict]) -> float:
    """
    Calculate the adversarial risk component in the range 0.0..1.0.
    Used by P2 in scoring.py as the `adversarial` term in:
    risk = 100 * (0.30*mixer + 0.30*sanction + 0.20*ransomware + 0.10*peel_depth + 0.10*adversarial)

    Weights per adversarial finding type present:
    - LOOKALIKE: +0.40
    - DUSTING:   +0.30
    - DECOY:     +0.30
    (All 3 present -> 1.0; clamped to 0.0..1.0).
    """
    if not findings or not isinstance(findings, list):
        return 0.0

    weights = {
        "LOOKALIKE": 0.40,
        "DUSTING": 0.30,
        "DECOY": 0.30,
    }

    present_types = {
        str(f.get("type", "")).upper()
        for f in findings
        if isinstance(f, dict)
    }

    total = sum(w for ftype, w in weights.items() if ftype in present_types)
    return round(min(1.0, max(0.0, total)), 2)
