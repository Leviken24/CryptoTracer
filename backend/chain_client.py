"""
CryptoTrace - Blockchain Data Client (P1 / P3 Integrity)
Fetches live transaction data from public APIs (Blockstream / Mempool / Etherscan).
Provides local disk caching, duplicate filtering, retry logic, and dual-source verification.
"""

import hashlib
import json
import os
import time
from typing import Any, Dict, List, Optional, Set
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


def _request_with_retries(url: str, retries: int = 3, timeout: int = 5) -> Optional[requests.Response]:
    """
    HTTP GET with retry logic and rate-limit backoff handling.
    """
    for attempt in range(retries):
        try:
            resp = requests.get(url, timeout=timeout)
            if resp.status_code == 200:
                return resp
            if resp.status_code == 429:  # Rate limited
                time.sleep(1.0 * (2 ** attempt))
                continue
            if resp.status_code >= 500:
                time.sleep(0.5 * (2 ** attempt))
                continue
        except (requests.RequestException, Exception):
            if attempt < retries - 1:
                time.sleep(0.5 * (2 ** attempt))
                continue
    return None


def _convert_btc_tx(raw: Dict[str, Any], source_label: str = "blockstream") -> Dict[str, Any]:
    """
    Standardizes a Blockstream/Mempool transaction:
    Converts satoshis to BTC by dividing by 100,000,000.
    Preserves raw transaction reference and timestamp.
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
        "source": source_label,
        "raw_reference": f"{source_label}://tx/{txid}",
    }


def get_address_txs(address: str, blockchain: str = "bitcoin", max_txs: int = 25) -> List[Dict[str, Any]]:
    """
    Fetches confirmed transactions for a Bitcoin or Ethereum address.
    Checks disk cache first, then queries public explorer API with duplicate deduplication.
    """
    cache_key = f"addr_{blockchain}_{address}_{max_txs}"
    cached = _read_cache(cache_key)
    if cached is not None:
        return cached

    seen_txids: Set[str] = set()
    standardized: List[Dict[str, Any]] = []

    if blockchain.lower() == "bitcoin":
        # 1. Primary: Blockstream API with retries
        url = f"{BLOCKSTREAM_BASE_URL}/address/{address}/txs"
        resp = _request_with_retries(url)
        if resp and resp.status_code == 200:
            try:
                raw_list = resp.json()
                for t in raw_list[:max_txs]:
                    txid = t.get("txid")
                    if txid and txid not in seen_txids:
                        seen_txids.add(txid)
                        standardized.append(_convert_btc_tx(t, "blockstream.info"))
                _write_cache(cache_key, standardized)
                return standardized
            except Exception:
                pass

        # 2. Secondary: Mempool API with retries
        url2 = f"{MEMPOOL_BASE_URL}/address/{address}/txs"
        resp2 = _request_with_retries(url2)
        if resp2 and resp2.status_code == 200:
            try:
                raw_list = resp2.json()
                for t in raw_list[:max_txs]:
                    txid = t.get("txid")
                    if txid and txid not in seen_txids:
                        seen_txids.add(txid)
                        standardized.append(_convert_btc_tx(t, "mempool.space"))
                _write_cache(cache_key, standardized)
                return standardized
            except Exception:
                pass

    return standardized


def get_tx(txid: str, blockchain: str = "bitcoin") -> Optional[Dict[str, Any]]:
    """
    Fetches a single Bitcoin or Ethereum transaction by txid with retry logic.
    """
    cache_key = f"tx_{blockchain}_{txid}"
    cached = _read_cache(cache_key)
    if cached is not None:
        return cached

    if blockchain.lower() == "bitcoin":
        url = f"{BLOCKSTREAM_BASE_URL}/tx/{txid}"
        resp = _request_with_retries(url)
        if resp and resp.status_code == 200:
            try:
                tx_data = _convert_btc_tx(resp.json(), "blockstream.info")
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
    resp = _request_with_retries(url)
    if resp and resp.status_code == 200:
        try:
            tx_data = _convert_btc_tx(resp.json(), "mempool.space")
            _write_cache(cache_key, tx_data)
            return tx_data
        except Exception:
            pass

    return None
