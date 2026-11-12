"""
CryptoTrace - Audit FastAPI Routes (P3)
Endpoints required by the frozen API contract (Section 5 of PROJECT_CONTEXT.md):
- GET /audit
- GET /audit/verify
- POST /audit/tamper
- POST /audit/reset
"""

from typing import Optional
from fastapi import APIRouter, Body
from pydantic import BaseModel

from backend.audit_log import audit

router = APIRouter()


class TamperRequest(BaseModel):
    idx: int = 0


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
    Accepts either query parameter ?idx=0, JSON body {"idx": 0}, or no body (defaults to 0).
    """
    target_idx = idx if idx is not None else (body.idx if body is not None else 0)
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
