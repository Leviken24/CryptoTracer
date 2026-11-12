"""
CryptoTrace - Sample Scenario Loader (P1)
Loads realistic synthetic multi-hop forensic scenarios for Bitcoin and Ethereum.
Allows the application to run 100% offline with zero external API dependencies.
"""

import json
import os
from typing import Any, Dict, List


def generate_bitcoin_sample_scenario() -> Dict[str, Any]:
    """
    Constructs the synthetic Bitcoin sample scenario described in Section 8 of PROJECT_CONTEXT.md.
    Features:
    - 5-hop peel chain
    - Mixer pattern & 8-output fan-out
    - 6-input fan-in
    - Dusting attack (15 outputs of 546 sats)
    - Look-alike address poisoning (E1 vs E1X)
    - Micro-value decoy edge
    - Sanctioned destination
    - Exchange deposit address as top end-receiver (E1)
    """
    alphabet = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"

    def addr(prefix4: str, mid_char: str, suffix4: str) -> str:
        return "bc1q" + prefix4[:4] + (mid_char * 30) + suffix4[:4]

    S = addr("srcq", "q", "endq")
    M = [addr(f"mx{alphabet[i]}p", "p", f"m{alphabet[i]}xp") for i in range(1, 9)]
    C1 = addr("cnsz", "z", "endz")
    P = [addr(f"pl{alphabet[i]}r", "r", f"p{alphabet[i]}lr") for i in range(1, 6)]
    W = [addr(f"wl{alphabet[i]}y", "y", f"w{alphabet[i]}ly") for i in range(1, 6)]
    L1 = addr("lf9q", "9", "l9fq")
    SANC1 = addr("sncx", "x", "scnx")
    DS = addr("dst8", "8", "ds8t")
    DUST_RECV = [P[1]] + [addr(f"d{alphabet[i]}gf", "g", f"g{alphabet[i]}df") for i in range(1, 15)]
    U1 = addr("unrf", "f", "urnf")

    # E1 and look-alike E1X
    E1 = addr("exch", "2", "dpst")
    E1X = addr("exch", "t", "dpst")

    aliases = {
        "S": S,
        "M1": M[0], "M2": M[1], "M3": M[2], "M4": M[3],
        "M5": M[4], "M6": M[5], "M7": M[6], "M8": M[7],
        "C1": C1,
        "P1": P[0], "P2": P[1], "P3": P[2], "P4": P[3], "P5": P[4],
        "W1": W[0], "W2": W[1], "W3": W[2], "W4": W[3], "W5": W[4],
        "E1": E1,
        "E1X": E1X,
        "L1": L1,
        "SANC1": SANC1,
        "DS": DS,
        "U1": U1,
    }

    txs = [
        # 1. Source S -> M1..M8 (0.5 BTC each)
        {
            "txid": "11" * 32,
            "ts": 1700000000,
            "inputs": [{"address": S, "value": 4.05}],
            "outputs": [{"address": m, "value": 0.5} for m in M],
            "fee": 0.0001,
            "blockchain": "bitcoin",
        },
        # 2. M1..M6 -> C1 (2.9999 BTC)
        {
            "txid": "22" * 32,
            "ts": 1700000600,
            "inputs": [{"address": m, "value": 0.5} for m in M[:6]],
            "outputs": [{"address": C1, "value": 2.9999}],
            "fee": 0.0001,
            "blockchain": "bitcoin",
        },
        # 3. 5-hop peel chain
        {
            "txid": "31" * 32,
            "ts": 1700001200,
            "inputs": [{"address": C1, "value": 2.9999}],
            "outputs": [{"address": P[0], "value": 2.75}, {"address": W[0], "value": 0.2498}],
            "fee": 0.0001,
            "blockchain": "bitcoin",
        },
        {
            "txid": "32" * 32,
            "ts": 1700001800,
            "inputs": [{"address": P[0], "value": 2.75}],
            "outputs": [{"address": P[1], "value": 2.53}, {"address": W[1], "value": 0.2199}],
            "fee": 0.0001,
            "blockchain": "bitcoin",
        },
        {
            "txid": "33" * 32,
            "ts": 1700002400,
            "inputs": [{"address": P[1], "value": 2.53}],
            "outputs": [{"address": P[2], "value": 2.33}, {"address": W[2], "value": 0.1999}],
            "fee": 0.0001,
            "blockchain": "bitcoin",
        },
        # Hop 4 includes decoy to U1
        {
            "txid": "34" * 32,
            "ts": 1700003000,
            "inputs": [{"address": P[2], "value": 2.33}],
            "outputs": [
                {"address": P[3], "value": 2.14},
                {"address": W[3], "value": 0.1899},
                {"address": U1, "value": 0.00000600},
            ],
            "fee": 0.000094,
            "blockchain": "bitcoin",
        },
        {
            "txid": "35" * 32,
            "ts": 1700003600,
            "inputs": [{"address": P[3], "value": 2.14}],
            "outputs": [{"address": P[4], "value": 1.9801}, {"address": W[4], "value": 0.1598}],
            "fee": 0.0001,
            "blockchain": "bitcoin",
        },
        # 4. P5 -> E1 (1.9 BTC) + L1 (0.08 BTC)
        {
            "txid": "44" * 32,
            "ts": 1700004200,
            "inputs": [{"address": P[4], "value": 1.9801}],
            "outputs": [{"address": E1, "value": 1.9}, {"address": L1, "value": 0.08}],
            "fee": 0.0001,
            "blockchain": "bitcoin",
        },
        # 5. W3 -> SANC1
        {
            "txid": "55" * 32,
            "ts": 1700004800,
            "inputs": [{"address": W[2], "value": 0.1999}],
            "outputs": [{"address": SANC1, "value": 0.1998}],
            "fee": 0.0001,
            "blockchain": "bitcoin",
        },
        # 6. Dusting: DS -> 15 addresses (0.00000546 BTC each)
        {
            "txid": "66" * 32,
            "ts": 1700005400,
            "inputs": [{"address": DS, "value": 0.001}],
            "outputs": [{"address": d_addr, "value": 0.00000546} for d_addr in DUST_RECV],
            "fee": 0.0009181,
            "blockchain": "bitcoin",
        },
        # 7. Look-alike: W5 -> E1X
        {
            "txid": "77" * 32,
            "ts": 1700006000,
            "inputs": [{"address": W[4], "value": 0.1598}],
            "outputs": [{"address": E1X, "value": 0.05}],
            "fee": 0.0001,
            "blockchain": "bitcoin",
        },
    ]

    return {
        "blockchain": "bitcoin",
        "source": S,
        "aliases": aliases,
        "txs": txs,
    }


def generate_ethereum_sample_scenario() -> Dict[str, Any]:
    """
    Constructs an Ethereum / EVM DeFi exploit multi-hop forensic scenario.
    Source exploit wallet -> Tornado Cash Privacy Pool -> Intermediary Mule -> Uniswap Liquidity Router -> Binance Deposit.
    """
    src = "0x71C8fb9697d744876ae1529d7694901f40d226a4"
    mixer = "0x083E8224c62257e0f5572e7A01229b294025E743"
    peel1 = "0x43849F41E8a36Ac6B1b6fC3A7dF7B916A4Ec469b"
    dex = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
    cex = "0x28C6c06298d514Db089934071355E5743bf21d60"  # Binance 14
    sanctioned = "0x8576aCC5C05D6Ce88f4e49bf65BdF0C62F91353C"  # Lazarus linked

    txs = [
        {
            "txid": "0x" + "a1" * 32,
            "ts": 1705000000,
            "inputs": [{"address": src, "value": 25.0}],
            "outputs": [
                {"address": mixer, "value": 10.0},
                {"address": peel1, "value": 14.98},
            ],
            "fee": 0.02,
            "blockchain": "ethereum",
            "token": "ETH",
        },
        {
            "txid": "0x" + "b2" * 32,
            "ts": 1705000600,
            "inputs": [{"address": peel1, "value": 14.98}],
            "outputs": [
                {"address": dex, "value": 12.0},
                {"address": sanctioned, "value": 2.97},
            ],
            "fee": 0.01,
            "blockchain": "ethereum",
            "token": "ETH",
        },
        {
            "txid": "0x" + "c3" * 32,
            "ts": 1705001200,
            "inputs": [{"address": dex, "value": 12.0}],
            "outputs": [
                {"address": cex, "value": 11.98},
            ],
            "fee": 0.02,
            "blockchain": "ethereum",
            "token": "ETH",
        },
    ]

    return {
        "blockchain": "ethereum",
        "source": src,
        "aliases": {
            "ExploitSource": src,
            "TornadoPool": mixer,
            "PeelMule": peel1,
            "UniswapRouter": dex,
            "BinanceHotWallet": cex,
            "LazarusAffiliate": sanctioned,
        },
        "txs": txs,
    }


def load_sample(blockchain: str = "bitcoin") -> Dict[str, Any]:
    """
    Returns the sample scenario for the requested blockchain.
    """
    if blockchain.lower() == "ethereum":
        return generate_ethereum_sample_scenario()
    return generate_bitcoin_sample_scenario()


def get_default_sample_source(blockchain: str = "bitcoin") -> str:
    """Return the default starting address for sample demo runs."""
    if blockchain.lower() == "ethereum":
        return "0x71C8fb9697d744876ae1529d7694901f40d226a4"
    scenario = generate_bitcoin_sample_scenario()
    return scenario["source"]
