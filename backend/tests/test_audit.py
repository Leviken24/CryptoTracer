"""
Comprehensive pytest tests for backend/audit_log.py and backend/audit_routes.py (P3 Steps 2, 5, & 6)
"""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.audit_log import AuditLog, audit
from backend.audit_routes import router


def test_audit_log_hash_chain_format():
    log = AuditLog()
    e0 = log.append("validate_input", {"input": "bc1qsrc0000000000000000000000000000000000"})
    e1 = log.append("fetch_txs", {"count": 8, "mode": "sample"})
    e2 = log.append("run_detectors", {"findings": 3})

    assert e0["idx"] == 0
    assert e0["prev_hash"] == "0" * 64
    assert len(e0["payload_hash"]) == 64
    assert len(e0["hash"]) == 64

    assert e1["idx"] == 1
    assert e1["prev_hash"] == e0["hash"]

    assert e2["idx"] == 2
    assert e2["prev_hash"] == e1["hash"]

    entries = log.get_all()
    assert len(entries) == 3


def test_audit_log_reproducible_payload_hashes():
    log1 = AuditLog()
    log2 = AuditLog()

    e1 = log1.append("params", {"b": 2, "a": 1})
    e2 = log2.append("params", {"a": 1, "b": 2})
    assert e1["payload_hash"] == e2["payload_hash"]
    assert e1["hash"] == e2["hash"]


def test_audit_log_verify_and_tamper_at_specific_index():
    log = AuditLog()
    for step in ["validate_input", "fetch", "validate_response", "build_graph", "detectors"]:
        log.append(step, {"step": step})

    # Valid chain verifies
    res = log.verify()
    assert res == {"valid": True, "broken_at": None, "message": "Chain intact"}

    # Tamper at entry 4
    log.tamper(4)
    res_tampered = log.verify()
    assert res_tampered["valid"] is False
    assert res_tampered["broken_at"] == 4
    assert res_tampered["message"] == "Tampered at entry 4"


def test_audit_routes_three_consecutive_demo_runs():
    """
    Step 6 Polish: Test the full flow 3 times in a row without restarting the server:
    run a trace (append steps) -> verify (valid) -> tamper -> verify (broken) -> reset.
    """
    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    client.post("/audit/reset")

    for run_num in range(3):
        # Simulate trace pipeline logging 5 steps
        for step_idx, action in enumerate(
            ["validate_input", "fetch_txs", "validate_response", "build_graph", "final_ranking"]
        ):
            audit.append(action, {"run": run_num, "step": step_idx})

        # 1. Check GET /audit has 5 entries
        entries = client.get("/audit").json()
        assert len(entries) == 5

        # 2. Check GET /audit/verify is valid
        v_ok = client.get("/audit/verify").json()
        assert v_ok == {"valid": True, "broken_at": None, "message": "Chain intact"}

        # 3. Call POST /audit/tamper on entry 4
        r_tamper = client.post("/audit/tamper", json={"idx": 4})
        assert r_tamper.status_code == 200

        # 4. Check GET /audit/verify is broken at entry 4
        v_broken = client.get("/audit/verify").json()
        assert v_broken == {
            "valid": False,
            "broken_at": 4,
            "message": "Tampered at entry 4",
        }

        # 5. Call POST /audit/reset for the next demo run
        r_reset = client.post("/audit/reset")
        assert r_reset.status_code == 200
        assert client.get("/audit").json() == []
