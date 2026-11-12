"""
CryptoTrace - Tamper-Evident Audit Log (P3)
Implements Section 9 of PROJECT_CONTEXT.md & Phase 3 specifications:
- Entry hash = SHA256("idx|ts|action|payload_hash|prev_hash")
- Genesis prev_hash = 64 zeros
- payload_hash = SHA256 of json.dumps(payload, sort_keys=True)
- Includes standard forensic fields: event_id, investigation_id, event_type, timestamp, event_details, previous_entry_hash, current_entry_hash
- Re-running the same input in sample mode produces identical payload hashes
  (fixed timestamp 1700000000 ensures reproducible entry hashes too).
- verify() walks the chain and returns the first broken index.
- tamper(idx) is DEMO ONLY: it edits one entry in memory so verify() detects tampering.
"""

import hashlib
import json
from typing import Any, Dict, List, Optional


class AuditLog:
    """
    Tamper-evident hash-chained audit log using Python hashlib.
    Each entry format contains canonical forensic fields and SHA-256 hashes.
    """

    GENESIS_PREV_HASH = "0" * 64
    FIXED_TS = 1700000000

    def __init__(self) -> None:
        self._entries: List[Dict[str, Any]] = []

    @staticmethod
    def _hash_payload(payload) -> str:
        """
        Deterministically hash a payload using json.dumps(sort_keys=True).
        """
        payload_json = json.dumps(payload, sort_keys=True, default=str)
        return hashlib.sha256(payload_json.encode("utf-8")).hexdigest()

    @staticmethod
    def _compute_entry_hash(
        idx: int, ts: int, action: str, payload_hash: str, prev_hash: str
    ) -> str:
        """
        Compute SHA256("idx|ts|action|payload_hash|prev_hash").
        """
        joined = f"{idx}|{ts}|{action}|{payload_hash}|{prev_hash}"
        return hashlib.sha256(joined.encode("utf-8")).hexdigest()

    def append(self, action: str, payload: Any, investigation_id: str = "CT-CASE-GLOBAL") -> Dict[str, Any]:
        """
        Append a step to the audit chain and return the created entry dict.
        Contains event_id, investigation_id, event_type, timestamp, event_details,
        previous_entry_hash, current_entry_hash, plus frozen contract fields.
        """
        idx = len(self._entries)
        ts = self.FIXED_TS
        prev_hash = (
            self._entries[-1]["hash"] if self._entries else self.GENESIS_PREV_HASH
        )
        payload_hash = self._hash_payload(payload)
        entry_hash = self._compute_entry_hash(
            idx, ts, action, payload_hash, prev_hash
        )

        entry = {
            "idx": idx,
            "event_id": f"EVT-{idx:04d}",
            "investigation_id": investigation_id,
            "event_type": action,
            "ts": ts,
            "timestamp": ts,
            "action": action,
            "event_details": payload,
            "payload_hash": payload_hash,
            "prev_hash": prev_hash,
            "previous_entry_hash": prev_hash,
            "hash": entry_hash,
            "current_entry_hash": entry_hash,
        }
        self._entries.append(entry)
        return entry

    def verify(self) -> Dict[str, Any]:
        """
        Walk the entire audit chain and check both prev_hash links and entry hashes.
        Returns:
        - {"valid": True, "broken_at": None, "message": "Chain intact"}
        - {"valid": False, "broken_at": idx, "message": "Tampered at entry <idx>"}
        """
        for i, entry in enumerate(self._entries):
            expected_prev = (
                self._entries[i - 1]["hash"] if i > 0 else self.GENESIS_PREV_HASH
            )
            if entry.get("idx") != i or entry.get("prev_hash") != expected_prev:
                return {
                    "valid": False,
                    "broken_at": i,
                    "message": f"Tampered at entry {i}",
                }

            expected_hash = self._compute_entry_hash(
                entry["idx"],
                entry["ts"],
                entry["action"],
                entry["payload_hash"],
                entry["prev_hash"],
            )
            if entry.get("hash") != expected_hash:
                return {
                    "valid": False,
                    "broken_at": i,
                    "message": f"Tampered at entry {i}",
                }

        return {"valid": True, "broken_at": None, "message": "Chain intact"}

    def tamper(self, idx: int = 0) -> None:
        """
        DEMO ONLY: Modify one entry in memory so verify() detects the broken hash chain.
        If idx is out of range (or negative) when entries exist, tampers the middle/first entry.
        """
        if not self._entries:
            return
        if idx < 0 or idx >= len(self._entries):
            idx = 0
        original = self._entries[idx]["payload_hash"]
        tampered_hash = ("f" * 64) if original != ("f" * 64) else ("e" * 64)
        self._entries[idx]["payload_hash"] = tampered_hash

    def reset(self) -> None:
        """
        Clear all entries in the audit log (used between demo runs).
        """
        self._entries.clear()

    def get_all(self) -> List[Dict[str, Any]]:
        """
        Return a list of all audit entries in order.
        """
        return [dict(e) for e in self._entries]


# Shared global instance that audit_routes.py and main.py can use
audit = AuditLog()
