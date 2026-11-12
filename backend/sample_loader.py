"""
CryptoTrace - Offline Sample Scenario Loader (P1)
Loads backend/data/sample_scenario.json and resolves aliases (like "S", "E1").
"""

import json
import os
from typing import Any, Dict

_SAMPLE_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "data", "sample_scenario.json"
)


def load_sample() -> Dict[str, Any]:
    """
    Load the offline synthetic sample scenario from backend/data/sample_scenario.json.
    Returns:
        {"aliases": {...}, "source": "<address>", "txs": [...]}
    """
    with open(_SAMPLE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def resolve_sample_input(user_input: str, sample_data: Dict[str, Any] | None = None) -> str:
    """
    Resolve an alias (e.g. 'S', 'E1') or txid to the starting address in sample mode.
    Defaults to sample_data['source'] if user_input is an unknown sample address so
    demo runs never fail on stage.
    """
    data = sample_data if sample_data is not None else load_sample()
    aliases = data.get("aliases", {})
    cleaned = (user_input or "").strip()

    if cleaned in aliases:
        return aliases[cleaned]

    # Check if user pasted a txid from the sample
    for tx in data.get("txs", []):
        if tx.get("txid") == cleaned:
            inps = tx.get("inputs", [])
            if inps and inps[0].get("address"):
                return inps[0]["address"]

    # Check if cleaned address exists in sample transactions
    sample_addrs = set()
    for tx in data.get("txs", []):
        for inp in tx.get("inputs", []):
            if inp.get("address"):
                sample_addrs.add(inp["address"])
        for out in tx.get("outputs", []):
            if out.get("address"):
                sample_addrs.add(out["address"])

    if cleaned in sample_addrs:
        return cleaned

    return data.get("source", cleaned)
