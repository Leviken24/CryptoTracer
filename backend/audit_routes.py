"""
CryptoTrace - Audit FastAPI Routes (P3) — Hackathon-Winning Edition
Endpoints required by the frozen API contract (Section 5 of PROJECT_CONTEXT.md):
- GET /audit
- GET /audit/verify
- POST /audit/tamper
- POST /audit/reset
Plus bonus forensic chain-of-custody report endpoint:
- GET /audit/certificate
"""

from typing import Optional
from fastapi import APIRouter, Body
from pydantic import BaseModel

from backend.audit_log import audit

router = APIRouter()


class TamperRequest(BaseModel):
    idx: Optional[int] = None


@router.get("/audit")
def get_audit_entries() -> list[dict]:
    """Return all entries in the hash-chained audit log."""
    return audit.get_all()


@router.get("/audit/verify")
def verify_audit_chain() -> dict:
    """
    Verify the audit chain integrity.
    Returns {"valid": true, "broken_at": null, "message": "Chain intact"}
    or {"valid": false, "broken_at": 4, "message": "Tampered at entry 4"}.
    """
    return audit.verify()


@router.post("/audit/tamper")
def tamper_audit_chain(
    idx: Optional[int] = None,
    body: Optional[TamperRequest] = Body(default=None),
) -> dict:
    """
    DEMO ONLY: Tamper with an entry in memory so that /audit/verify turns red.
    Accepts query parameter ?idx=4, JSON body {"idx": 4}, or no arguments
    (if no idx is passed and the log has >=5 entries, tampers entry 4 to match the contract example
    'Tampered at entry 4', otherwise entry 0).
    """
    entries = audit.get_all()
    if idx is not None:
        target_idx = idx
    elif body is not None and body.idx is not None:
        target_idx = body.idx
    else:
        target_idx = 4 if len(entries) > 4 else 0

    if entries and (target_idx < 0 or target_idx >= len(entries)):
        target_idx = 4 if len(entries) > 4 else 0

    audit.tamper(target_idx)
    return {
        "status": "tampered",
        "tampered_at": target_idx,
        "message": f"Tampered at entry {target_idx}",
    }


@router.post("/audit/reset")
def reset_audit_chain() -> dict:
    """Reset the audit chain between demo runs."""
    audit.reset()
    return {"status": "reset", "message": "Audit log cleared"}


@router.get("/audit/certificate")
def get_chain_of_custody_certificate() -> dict:
    """
    Return a court-ready cryptographic Chain-of-Custody Certificate showing
    every step's recorded vs. recomputed SHA-256 hash and verification status.
    """
    return audit.certificate()
