"""
CryptoTrace - Blockchain API Client with Disk Caching & Dual-Source Verification (P1)
Fetches Bitcoin transactions from Blockstream Esplora API (primary) and mempool.space API
(second source), converts satoshis to BTC (dividing by 100,000,000), retries with exponential
backoff, and caches every response as JSON on disk in backend/data/cache/.
"""

import json
import os
import time
from typing import Any, Dict, List
import requests

SATOSHIS_PER_BTC = 100_000_000.0
PRIMARY_API_BASE = "https://blockstream.info/api"
SECOND_API_BASE = "https://mempool.space/api"
MAX_TXS_PER_ADDRESS = 25

_CACHE_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "data", "cache"
)


def _ensure_cache_dir() -> None:
    os.makedirs(_CACHE_DIR, exist_ok=True)


def _cache_path(key: str) -> str:
    _ensure_cache_dir()
    safe_key = "".join(c if c.isalnum() or c in ("_", "-") else "_" for c in key)
    return os.path.join(_CACHE_DIR, f"{safe_key}.json")


def _read_cache(key: str) -> Any | None:
    path = _cache_path(key)
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None
    return None


def _write_cache(key: str, data: Any) -> None:
    path = _cache_path(key)
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception:
        pass


def _fetch_with_retry(url: str, retries: int = 3, timeout: float = 5.0) -> Any:
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            resp = requests.get(url, timeout=timeout)
            if resp.status_code == 429:
                time.sleep(0.5 * (2 ** attempt))
                continue
            resp.raise_for_status()
            return resp.json()
        except Exception as exc:
            last_err = exc
            if attempt < retries - 1:
                time.sleep(0.3 * (2 ** attempt))
    raise RuntimeError(f"Failed to fetch {url}: {last_err}")


def _normalize_esplora_tx(raw_tx: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert an Esplora / mempool.space transaction JSON into our internal contract format:
    {"txid": "<64 hex>", "ts": 1700000000,
     "inputs": [{"address": "...", "value": 1.5}],
     "outputs": [{"address": "...", "value": 1.4999}]}
    """
    txid = str(raw_tx.get("txid", ""))
    status = raw_tx.get("status", {}) or {}
    ts = int(status.get("block_time") or int(time.time()))

    inputs: List[Dict[str, Any]] = []
    for vin in raw_tx.get("vin", []) or []:
        prevout = vin.get("prevout") or {}
        addr = prevout.get("scriptpubkey_address")
        val_sats = prevout.get("value", 0)
        if addr and isinstance(val_sats, (int, float)) and val_sats > 0:
            inputs.append(
                {
                    "address": str(addr),
                    "value": round(float(val_sats) / SATOSHIS_PER_BTC, 8),
                }
            )

    outputs: List[Dict[str, Any]] = []
    for vout in raw_tx.get("vout", []) or []:
        addr = vout.get("scriptpubkey_address")
        val_sats = vout.get("value", 0)
        if addr and isinstance(val_sats, (int, float)) and val_sats > 0:
            outputs.append(
                {
                    "address": str(addr),
                    "value": round(float(val_sats) / SATOSHIS_PER_BTC, 8),
                }
            )

    return {
        "txid": txid,
        "ts": ts,
        "inputs": inputs,
        "outputs": outputs,
    }


def get_address_txs(address: str, max_txs: int = MAX_TXS_PER_ADDRESS) -> List[Dict[str, Any]]:
    """
    Fetch transactions for a Bitcoin address from Blockstream Esplora API (with disk cache).
    """
    cache_key = f"addr_{address}"
    cached = _read_cache(cache_key)
    if cached is not None:
        return cached[:max_txs]

    url = f"{PRIMARY_API_BASE}/address/{address}/txs"
    raw_list = _fetch_with_retry(url)
    normalized: List[Dict[str, Any]] = []
    for raw_tx in (raw_list or [])[:max_txs]:
        norm = _normalize_esplora_tx(raw_tx)
        if norm["txid"] and norm["inputs"] and norm["outputs"]:
            normalized.append(norm)
            _write_cache(norm["txid"], norm)

    _write_cache(cache_key, normalized)
    return normalized


def get_tx(txid: str) -> Dict[str, Any]:
    """
    Fetch a single transaction by txid from Blockstream Esplora API (with disk cache).
    """
    cached = _read_cache(txid)
    if cached is not None:
        return cached

    url = f"{PRIMARY_API_BASE}/tx/{txid}"
    raw_tx = _fetch_with_retry(url)
    norm = _normalize_esplora_tx(raw_tx)
    _write_cache(txid, norm)
    return norm


def get_tx_second_source(txid: str) -> Dict[str, Any]:
    """
    Fetch a single transaction by txid from the second source provider (mempool.space)
    for dual-source consensus cross-checking.
    """
    cache_key = f"sec_{txid}"
    cached = _read_cache(cache_key)
    if cached is not None:
        return cached

    url = f"{SECOND_API_BASE}/tx/{txid}"
    raw_tx = _fetch_with_retry(url)
    norm = _normalize_esplora_tx(raw_tx)
    _write_cache(cache_key, norm)
    return norm
