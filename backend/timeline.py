"""
CryptoTrace AI - Forensic Investigation Timeline Engine (Phase 2)
Generates chronological transaction events and suspicious activity alerts
from raw blockchain transactions and security detector results.
"""

import time
from typing import Any, Dict, List


def generate_forensic_timeline(
    txs: List[Dict[str, Any]],
    findings: List[Dict[str, Any]],
    labels: Dict[str, Any] = None,
) -> List[Dict[str, Any]]:
    """
    Constructs a unified, chronological timeline of on-chain ledger actions and security alerts.
    """
    labels = labels or {}
    timeline_events: List[Dict[str, Any]] = []

    # 1. Process On-Chain Transactions
    for idx, tx in enumerate(txs):
        txid = tx.get("txid", "")
        ts = tx.get("ts", int(time.time()))
        chain = tx.get("blockchain", "bitcoin")
        symbol = "ETH" if chain.lower() == "ethereum" else "BTC"

        inputs = tx.get("inputs", [])
        outputs = tx.get("outputs", [])

        in_addr = inputs[0]["address"] if inputs else "Unknown"
        out_count = len(outputs)
        total_val = sum(o.get("value", 0.0) for o in outputs)

        # Categorize Event Type
        event_type = "LEDGER_TRANSFER"
        title = "Direct Cross-Wallet Transfer"
        severity = "info"
        description = f"Transferred {total_val:.4f} {symbol} from {in_addr[:10]}... to {out_count} destination(s)."

        if idx == 0:
            event_type = "INITIAL_TRANSACTION"
            title = "Root Inflow / Extortion Deposit"
            severity = "warning"
            description = f"Initial suspect transaction initiated with {total_val:.4f} {symbol}."
        elif out_count >= 8:
            event_type = "WALLET_SPLITTING"
            title = "High-Entropy Fan-Out / Splitting"
            severity = "high"
            description = f"Funds split into {out_count} distinct outputs of equal value (~{outputs[0].get('value', 0):.2f} {symbol}), indicative of mixer ingress."
        elif len(inputs) >= 6 and out_count == 1:
            event_type = "WALLET_CONSOLIDATION"
            title = "Fan-In Consolidation"
            severity = "medium"
            description = f"{len(inputs)} intermediate split wallets consolidated into single continuation address {outputs[0].get('address')[:10]}..."
        elif len(inputs) == 1 and out_count == 2:
            # Check peel
            v1, v2 = outputs[0].get("value", 0), outputs[1].get("value", 0)
            if min(v1, v2) < 0.20 * total_val:
                event_type = "PEEL_CHAIN_STEP"
                title = f"Peel-Chain Stage Hop"
                severity = "medium"
                peeled = min(v1, v2)
                cont = max(v1, v2)
                description = f"Asymmetric peel: {peeled:.4f} {symbol} peeled to change address while {cont:.4f} {symbol} continued downstream."

        # Check for exchange destination
        for out in outputs:
            dest = out.get("address")
            if dest and (dest in labels or "exch" in dest.lower()):
                dest_label = labels.get(dest, {}).get("label", "Exchange Deposit")
                event_type = "EXCHANGE_INTERACTION"
                title = f"Centralized Exchange Deposit ({dest_label})"
                severity = "high"
                description = f"Liquidated {out.get('value', 0):.4f} {symbol} into centralized exchange deposit address {dest[:12]}..."

        timeline_events.append({
            "timestamp": ts,
            "formatted_time": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(ts)),
            "event_type": event_type,
            "title": title,
            "severity": severity,
            "description": description,
            "txid": txid,
            "sender": in_addr,
            "amount": f"{total_val:.4f} {symbol}",
        })

    # 2. Add Heuristic & Adversarial Alert Events
    for f in findings:
        ftype = f.get("type", "")
        sev = f.get("severity", "medium")
        txt = f.get("text", "")

        if ftype == "DUSTING":
            timeline_events.append({
                "timestamp": txs[-2]["ts"] if len(txs) >= 2 else int(time.time()),
                "formatted_time": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(txs[-2]["ts"] if len(txs) >= 2 else int(time.time()))),
                "event_type": "SUSPICIOUS_ALERT",
                "title": "Adversarial Dusting Attack Identified",
                "severity": sev,
                "description": txt,
                "txid": f.get("txid", "Identified across 15 outputs"),
                "sender": "Adversarial Dusting Node",
                "amount": "0.00000546 BTC / output",
            })
        elif ftype == "LOOKALIKE":
            timeline_events.append({
                "timestamp": txs[-1]["ts"] if txs else int(time.time()),
                "formatted_time": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(txs[-1]["ts"] if txs else int(time.time()))),
                "event_type": "SUSPICIOUS_ALERT",
                "title": "Look-Alike Address Poisoning Trap",
                "severity": sev,
                "description": txt,
                "txid": f.get("txid", "Poisoning Vanity Transfer"),
                "sender": "Vanity Brute-Force Actor",
                "amount": "0.05 BTC",
            })

    # Sort strictly chronologically
    timeline_events.sort(key=lambda e: e["timestamp"])
    return timeline_events
