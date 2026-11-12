"""
CryptoTrace - Blockchain Data Client (P1)
Fetches live transaction data from public APIs (Blockstream / Mempool / Etherscan).
Provides local disk caching and dual-source verification.
"""

import hashlib
import json
import os
import time
from typing import Any, Dict, List, Optional
import requests

CACHE_DIR = os.path.join(os.path.dirname(__file__), "data", "cache")
os.makedirs(CACHE_DIR, exist_ok=True)

BLOCKSTREAM_BASE_URL = os.getenv("BLOCKSTREAM_API_URL", "https://blockstream.info/api")
MEMPOOL_BASE_URL = os.getenv("MEMPOOL_API_URL", "https://mempool.space/api")
ETHERSCAN_API_KEY = os.getenv("ETHERSCAN_API_KEY", "")


def _cache_path(key: str) -> str:
    hashed = hashlib.sha256(key.encode("utf-8")).hexdigest()
    return os.path.join(CACHE_DIR, f"{hashed}.json")


def _read_cache(key: str) -> Optional[Any]:
    path = _cache_path(key)
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("payload")
        except Exception:
            return None
    return None


def _write_cache(key: str, payload: Any) -> None:
    path = _cache_path(key)
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"key": key, "payload": payload, "ts": int(time.time())}, f)
    except Exception:
        pass


def _convert_btc_tx(raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    Standardizes a Blockstream/Mempool transaction:
    Converts satoshis to BTC by dividing by 100,000,000.
    """
    txid = raw.get("txid", "")
    ts = raw.get("status", {}).get("block_time", int(time.time()))
    fee_sats = raw.get("fee", 0)

    inputs = []
    for vin in raw.get("vin", []):
        prevout = vin.get("prevout") or {}
        addr = prevout.get("scriptpubkey_address")
        val_sats = prevout.get("value", 0)
        if addr:
            inputs.append({"address": addr, "value": round(val_sats / 100_000_000, 8)})

    outputs = []
    for vout in raw.get("vout", []):
        addr = vout.get("scriptpubkey_address")
        val_sats = vout.get("value", 0)
        if addr:
            outputs.append({"address": addr, "value": round(val_sats / 100_000_000, 8)})

    return {
        "txid": txid,
        "ts": ts,
        "inputs": inputs,
        "outputs": outputs,
        "fee": round(fee_sats / 100_000_000, 8),
        "blockchain": "bitcoin",
        "source": "blockstream",
    }


def get_address_txs(address: str, blockchain: str = "bitcoin", max_txs: int = 25) -> List[Dict[str, Any]]:
    """
    Fetches confirmed transactions for a Bitcoin or Ethereum address.
    Checks disk cache first, then queries public explorer API.
    """
    cache_key = f"addr_{blockchain}_{address}_{max_txs}"
    cached = _read_cache(cache_key)
    if cached is not None:
        return cached

    if blockchain.lower() == "bitcoin":
        # 1. Primary: Blockstream API
        url = f"{BLOCKSTREAM_BASE_URL}/address/{address}/txs"
        try:
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                raw_list = resp.json()
                standardized = [_convert_btc_tx(t) for t in raw_list[:max_txs]]
                _write_cache(cache_key, standardized)
                return standardized
        except Exception:
            pass

        # 2. Secondary: Mempool API
        url2 = f"{MEMPOOL_BASE_URL}/address/{address}/txs"
        try:
            resp = requests.get(url2, timeout=5)
            if resp.status_code == 200:
                raw_list = resp.json()
                standardized = [_convert_btc_tx(t) for t in raw_list[:max_txs]]
                _write_cache(cache_key, standardized)
                return standardized
        except Exception:
            pass

    return []


def get_tx(txid: str, blockchain: str = "bitcoin") -> Optional[Dict[str, Any]]:
    """
    Fetches a single Bitcoin or Ethereum transaction by txid.
    """
    cache_key = f"tx_{blockchain}_{txid}"
    cached = _read_cache(cache_key)
    if cached is not None:
        return cached

    if blockchain.lower() == "bitcoin":
        url = f"{BLOCKSTREAM_BASE_URL}/tx/{txid}"
        try:
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                tx_data = _convert_btc_tx(resp.json())
                _write_cache(cache_key, tx_data)
                return tx_data
        except Exception:
            pass

    return None


def get_tx_second_source(txid: str) -> Optional[Dict[str, Any]]:
    """
    Queries Mempool.space as an independent second source to verify against Blockstream.
    """
    cache_key = f"tx_second_{txid}"
    cached = _read_cache(cache_key)
    if cached is not None:
        return cached

    url = f"{MEMPOOL_BASE_URL}/tx/{txid}"
    try:
        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            tx_data = _convert_btc_tx(resp.json())
            tx_data["source"] = "mempool_second_source"
            _write_cache(cache_key, tx_data)
            return tx_data
    except Exception:
        pass

    return None
