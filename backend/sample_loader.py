"""
CryptoTrace - Offline Sample Scenario Loader (P1)
Loads backend/data/sample_scenario.json (containing 75 forensic datasets),
resolves aliases (like "S", "E1", "SCENARIO_02", "CASE_15"), and returns the matching
scenario's transactions and metadata.
"""

import json
import os
from typing import Any, Dict, List

_SAMPLE_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "data", "sample_scenario.json"
)


def load_sample() -> Dict[str, Any]:
    """
    Load the offline synthetic sample scenarios from backend/data/sample_scenario.json.
    Returns:
        {"aliases": {...}, "source": "<address>", "txs": [...], "scenarios": [...]}
    """
    with open(_SAMPLE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def list_scenarios() -> List[Dict[str, Any]]:
    """
    Return metadata list of all 75 available sample scenarios for the UI dropdown.
    """
    data = load_sample()
    scenarios = data.get("scenarios", [])
    out: List[Dict[str, Any]] = []
    for idx, sc in enumerate(scenarios, start=1):
        out.append(
            {
                "id": sc.get("id", f"SCENARIO_{idx:02d}"),
                "name": sc.get("name", f"Case #{idx:02d}"),
                "category": sc.get("category", "RANSOMWARE"),
                "description": sc.get("description", ""),
                "source": sc.get("source", ""),
                "tx_count": len(sc.get("txs", [])),
            }
        )
    return out


def select_scenario_for_input(
    user_input: str, sample_data: Dict[str, Any] | None = None
) -> Dict[str, Any]:
    """
    Find which of the 75 sample scenarios matches `user_input` (by scenario ID, alias,
    source address, participant address, or txid).
    Returns a dict with {"source": ..., "txs": ..., "aliases": ..., "name": ..., "id": ...}.
    Defaults to Scenario #01 if not found.
    """
    data = sample_data if sample_data is not None else load_sample()
    scenarios = data.get("scenarios", [])
    all_aliases = data.get("aliases", {})
    cleaned = (user_input or "").strip()

    # 1. Check direct scenario ID match (e.g., "SCENARIO_12" or "CASE_12")
    upper_in = cleaned.upper()
    for sc in scenarios:
        if sc.get("id", "").upper() == upper_in:
            return sc

    # 2. Resolve alias if user entered an alias (e.g., "S", "S5", "SCENARIO_05")
    resolved_addr = all_aliases.get(cleaned) or all_aliases.get(upper_in) or cleaned

    # 3. Search scenarios for matching source address, any address in txs, or txid
    for sc in scenarios:
        if sc.get("source") == resolved_addr:
            return sc
        sc_aliases = sc.get("aliases", {})
        if cleaned in sc_aliases or resolved_addr in sc_aliases.values():
            return sc
        for tx in sc.get("txs", []):
            if tx.get("txid") == resolved_addr:
                return sc
            for inp in tx.get("inputs", []):
                if inp.get("address") == resolved_addr:
                    return sc
            for out in tx.get("outputs", []):
                if out.get("address") == resolved_addr:
                    return sc

    # Fallback to Scenario #1
    if scenarios:
        return scenarios[0]
    return {
        "id": "SCENARIO_01",
        "name": "Case #01: Ransomware Mixer + 5-Hop Peel Chain",
        "source": data.get("source", ""),
        "aliases": all_aliases,
        "txs": data.get("txs", []),
    }


def resolve_sample_input(user_input: str, sample_data: Dict[str, Any] | None = None) -> str:
    """
    Resolve an alias (e.g. 'S', 'E1', 'SCENARIO_05') or txid to a valid address in sample mode.
    """
    sc = select_scenario_for_input(user_input, sample_data)
    return sc.get("source", user_input)
