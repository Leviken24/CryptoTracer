"""
Comprehensive pytest tests for backend/security.py (P3 Steps 4 & 5)
Tests:
- validate_input (valid txid, bech32, legacy base58, empty, too long, symbols, bad checksum, mixed case)
- validate_response (valid txs, missing fields, negative values, outputs > inputs, dual-source match & mismatch)
- run_detectors on the full Section 8 sample scenario (must produce exactly 1 DUSTING, 1 LOOKALIKE, 1 DECOY)
- adversarial_score (0..1 range across findings combinations)
"""

import base58
import networkx as nx

from backend.security import (
    adversarial_score,
    run_detectors,
    validate_input,
    validate_response,
)


def _make_sample_scenario_graph() -> nx.MultiDiGraph:
    """
    Build the exact synthetic sample scenario described in Section 8 of PROJECT_CONTEXT.md:
    - Bech32 addresses: 'bc1q' + 38 chars from qpzry9x8gf2tvdw0s3jn54khce6mua7l
    - 1. Source S holds 4.05 BTC -> 8 near-equal outputs M1..M8 of 0.5 BTC each
    - 2. M1..M6 spent into C1 of 2.9999 BTC
    - 3. C1 starts a 5-hop peel chain: C1 -> P1+W1, P1 -> P2+W2, P2 -> P3+W3, P3 -> P4+W4, P4 -> P5+W5
    - 4. P5 -> E1 (1.9 BTC) + L1 (0.08 BTC)
    - 5. W3 -> SANC1
    - 6. Dusting: DS sends 0.00000546 BTC to 15 addresses, including P2
    - 7. Look-alike: E1X copies the first 4 and last 4 body chars of E1 (different middle), receives tx from W5
    - 8. Decoy: P3 sends 0.00000600 BTC in a two-output tx to an unrelated wallet U1
    """

    alphabet = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"

    def addr(prefix4: str, mid_char: str, suffix4: str) -> str:
        # Build a valid 42-char bech32 address: "bc1q" + 4-char prefix + 30-char middle + 4-char suffix
        return "bc1q" + prefix4[:4] + (mid_char * 30) + suffix4[:4]

    S = addr("srcq", "q", "endq")
    M = [addr(f"mx{alphabet[i]}p", "p", f"m{alphabet[i]}xp") for i in range(1, 9)]
    C1 = addr("cnsz", "z", "endz")
    P = [addr(f"pl{alphabet[i]}r", "r", f"p{alphabet[i]}lr") for i in range(1, 6)]
    W = [addr(f"wl{alphabet[i]}y", "y", f"w{alphabet[i]}ly") for i in range(1, 6)]
    L1 = addr("lf9q", "9", "l9fq")
    SANC1 = addr("sncx", "x", "scnx")
    DS = addr("dst8", "8", "ds8t")
    DUST_RECV = [P[1]] + [
        addr(f"d{alphabet[i]}gf", "g", f"g{alphabet[i]}df") for i in range(1, 15)
    ]  # 15 recipients including P2
    U1 = addr("unrf", "f", "urnf")

    # E1 and look-alike E1X: share first 4 ("exch") and last 4 ("dpst") of 38-char body, different middle
    E1 = addr("exch", "2", "dpst")
    E1X = addr("exch", "t", "dpst")

    txs = [
        # 1. Source S -> M1..M8 (0.5 BTC each)
        {
            "txid": "11" * 32,
            "ts": 1700000000,
            "inputs": [{"address": S, "value": 4.05}],
            "outputs": [{"address": m, "value": 0.5} for m in M],
        },
        # 2. M1..M6 -> C1 (2.9999 BTC)
        {
            "txid": "22" * 32,
            "ts": 1700000600,
            "inputs": [{"address": m, "value": 0.5} for m in M[:6]],
            "outputs": [{"address": C1, "value": 2.9999}],
        },
        # 3. 5-hop peel chain
        {
            "txid": "31" * 32,
            "ts": 1700001200,
            "inputs": [{"address": C1, "value": 2.9999}],
            "outputs": [{"address": P[0], "value": 2.75}, {"address": W[0], "value": 0.2498}],
        },
        {
            "txid": "32" * 32,
            "ts": 1700001800,
            "inputs": [{"address": P[0], "value": 2.75}],
            "outputs": [{"address": P[1], "value": 2.53}, {"address": W[1], "value": 0.2199}],
        },
        {
            "txid": "33" * 32,
            "ts": 1700002400,
            "inputs": [{"address": P[1], "value": 2.53}],
            "outputs": [{"address": P[2], "value": 2.33}, {"address": W[2], "value": 0.1999}],
        },
        # Hop 4 includes the decoy output from P3 (P[2]) to U1 of 0.00000600 BTC
        {
            "txid": "34" * 32,
            "ts": 1700003000,
            "inputs": [{"address": P[2], "value": 2.33}],
            "outputs": [
                {"address": P[3], "value": 2.14},
                {"address": W[3], "value": 0.1899},
                {"address": U1, "value": 0.00000600},
            ],
        },
        {
            "txid": "35" * 32,
            "ts": 1700003600,
            "inputs": [{"address": P[3], "value": 2.14}],
            "outputs": [{"address": P[4], "value": 1.9801}, {"address": W[4], "value": 0.1598}],
        },
        # 4. P5 -> E1 (1.9 BTC) + L1 (0.08 BTC)
        {
            "txid": "44" * 32,
            "ts": 1700004200,
            "inputs": [{"address": P[4], "value": 1.9801}],
            "outputs": [{"address": E1, "value": 1.9}, {"address": L1, "value": 0.08}],
        },
        # 5. W3 -> SANC1
        {
            "txid": "55" * 32,
            "ts": 1700004800,
            "inputs": [{"address": W[2], "value": 0.1999}],
            "outputs": [{"address": SANC1, "value": 0.1998}],
        },
        # 6. Dusting: DS -> 15 addresses (0.00000546 BTC each)
        {
            "txid": "66" * 32,
            "ts": 1700005400,
            "inputs": [{"address": DS, "value": 0.001}],
            "outputs": [{"address": d_addr, "value": 0.00000546} for d_addr in DUST_RECV],
        },
        # 7. Look-alike: W5 -> E1X
        {
            "txid": "77" * 32,
            "ts": 1700006000,
            "inputs": [{"address": W[4], "value": 0.1598}],
            "outputs": [{"address": E1X, "value": 0.05}],
        },
    ]

    g = nx.MultiDiGraph()
    g.graph["txs"] = txs
    g.graph["source"] = S
    g.graph["truncated"] = False

    for tx in txs:
        total_in = sum(i["value"] for i in tx["inputs"])
        for inp in tx["inputs"]:
            u = inp["address"]
            if not g.has_node(u):
                g.add_node(u, type="address", label="", cluster="", tags=[], risk=0, taint=0.0)
            for out in tx["outputs"]:
                v = out["address"]
                if not g.has_node(v):
                    g.add_node(v, type="address", label="", cluster="", tags=[], risk=0, taint=0.0)
                edge_val = out["value"] * (inp["value"] / total_in)
                g.add_edge(u, v, txid=tx["txid"], value=edge_val, ts=tx["ts"], tags=[])

    return g


def test_sample_scenario_produces_exact_three_findings():
    g = _make_sample_scenario_graph()
    findings = run_detectors(g)

    assert len(findings) == 3
    types = [f["type"] for f in findings]
    assert types.count("DUSTING") == 1
    assert types.count("LOOKALIKE") == 1
    assert types.count("DECOY") == 1

    for f in findings:
        assert set(f.keys()) == {"type", "severity", "text", "nodes"}
        assert f["severity"] in ("low", "medium", "high")
        assert isinstance(f["text"], str) and len(f["text"]) > 0
        assert isinstance(f["nodes"], list) and len(f["nodes"]) > 0

    # Adversarial score with all 3 findings should be 1.0
    assert adversarial_score(g, findings) == 1.0


def test_validate_input_comprehensive():
    # Valid 64-hex txid
    ok, kind, _ = validate_input("a" * 64)
    assert (ok, kind) == (True, "txid")

    # Valid Bech32 address
    ok, kind, _ = validate_input("bc1q" + "q" * 38)
    assert (ok, kind) == (True, "address")

    # Valid Legacy Base58 address
    valid_b58 = base58.b58encode_check(b"\x00" + b"\x22" * 20).decode("ascii")
    ok, kind, _ = validate_input(valid_b58)
    assert (ok, kind) == (True, "address")

    # Bad inputs: empty, whitespace, too long, symbols, bad checksum, mixed case bech32
    for bad in [
        "",
        "   ",
        None,
        "bc1q" + "q" * 200,
        "DROP TABLE users; --!@#$%^&*()",
        "bc1q" + "Q" * 19 + "q" * 19,  # mixed case Bech32
        valid_b58[:-1] + ("1" if valid_b58[-1] != "1" else "2"),  # wrong Base58 checksum
        "12345abcde",  # short hex
    ]:
        ok, kind, msg = validate_input(bad)  # type: ignore[arg-type]
        assert ok is False
        assert kind is None
        assert isinstance(msg, str) and len(msg) > 0


def test_validate_response_checks():
    valid_txs = [
        {
            "txid": "aa" * 32,
            "ts": 1700000000,
            "inputs": [{"address": "bc1q" + "q" * 38, "value": 1.5}],
            "outputs": [{"address": "bc1q" + "p" * 38, "value": 1.4999}],
        }
    ]
    ok, issues = validate_response(valid_txs)
    assert ok is True
    assert issues == []

    # Dual-source match
    ok2, issues2 = validate_response(valid_txs, second_source=valid_txs)
    assert ok2 is True
    assert issues2 == []

    # Dual-source mismatch
    tampered_second = [
        {
            "txid": "aa" * 32,
            "ts": 1700000000,
            "inputs": [{"address": "bc1q" + "q" * 38, "value": 1.5}],
            "outputs": [{"address": "bc1q" + "p" * 38, "value": 0.5}],
        }
    ]
    ok_mismatch, issues_mismatch = validate_response(valid_txs, second_source=tampered_second)
    assert ok_mismatch is False
    assert any("mismatch" in i.lower() for i in issues_mismatch)

    # Negative value
    neg_txs = [
        {
            "txid": "bb" * 32,
            "ts": 1700000000,
            "inputs": [{"address": "bc1q" + "q" * 38, "value": -1.0}],
            "outputs": [{"address": "bc1q" + "p" * 38, "value": 0.5}],
        }
    ]
    ok_neg, issues_neg = validate_response(neg_txs)
    assert ok_neg is False
    assert any("negative" in i.lower() for i in issues_neg)

    # Outputs exceed inputs
    exceed_txs = [
        {
            "txid": "cc" * 32,
            "ts": 1700000000,
            "inputs": [{"address": "bc1q" + "q" * 38, "value": 1.0}],
            "outputs": [{"address": "bc1q" + "p" * 38, "value": 2.0}],
        }
    ]
    ok_ex, issues_ex = validate_response(exceed_txs)
    assert ok_ex is False
    assert any("exceeds" in i.lower() for i in issues_ex)

    # Missing required fields
    missing_txs = [{"txid": "dd" * 32}]
    ok_m, issues_m = validate_response(missing_txs)
    assert ok_m is False
    assert len(issues_m) > 0


def test_adversarial_score_partial_and_empty():
    g = nx.MultiDiGraph()
    assert adversarial_score(g, []) == 0.0
    assert adversarial_score(g, [{"type": "DUSTING"}]) == 0.3
    assert adversarial_score(g, [{"type": "LOOKALIKE"}]) == 0.4
    assert adversarial_score(g, [{"type": "DUSTING"}, {"type": "DECOY"}]) == 0.6
    assert (
        adversarial_score(
            g, [{"type": "DUSTING"}, {"type": "LOOKALIKE"}, {"type": "DECOY"}]
        )
        == 1.0
    )
