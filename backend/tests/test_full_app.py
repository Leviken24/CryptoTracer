"""
Full End-to-End Test Suite for CryptoTrace AI Backend
Validates:
1. Health and metadata endpoints
2. Frozen contract POST /trace
3. Investigation CRUD (Create, List, Read, Update, Delete)
4. PDF Forensic Dossier generation and binary streaming
5. Analytics statistics aggregation
6. Cryptographic audit chain tamper detection & verification
"""

import json
import pytest
from fastapi.testclient import TestClient
from backend.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_health_check(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "CryptoTrace AI" in data["service"]


def test_trace_frozen_contract_bitcoin(client):
    payload = {
        "input": "bc1qsrc0000000000000000000000000000000000",
        "hops": 4,
        "mode": "sample",
    }
    res = client.post("/trace", json=payload)
    assert res.status_code == 200
    data = res.json()

    # Adheres to Section 5 frozen contract fields
    assert "graph" in data
    assert "nodes" in data["graph"]
    assert "edges" in data["graph"]
    assert len(data["graph"]["nodes"]) >= 20
    assert len(data["graph"]["edges"]) >= 20

    assert "findings" in data
    assert len(data["findings"]) >= 3
    finding_types = [f["type"] for f in data["findings"]]
    assert "PEEL_CHAIN" in finding_types
    assert "MIXER_PATTERN" in finding_types

    assert "ranked" in data
    assert len(data["ranked"]) >= 1
    top = data["ranked"][0]
    assert "address" in top
    assert "confidence" in top
    assert "risk" in top
    assert "reasoning" in top

    assert "audit_head" in data
    assert len(data["audit_head"]) == 64


def test_investigation_lifecycle(client):
    # 1. Create a new case
    create_payload = {
        "title": "Operation Dark Ledger Test Case",
        "blockchain": "bitcoin",
        "input_type": "address",
        "target": "bc1qsrc0000000000000000000000000000000000",
        "hops": 4,
        "mode": "sample",
        "notes": "Initial forensic test remarks.",
    }
    res_create = client.post("/api/investigations", json=create_payload)
    assert res_create.status_code == 200
    created = res_create.json()
    inv_id = created["id"]
    assert inv_id > 0
    assert created["title"] == "Operation Dark Ledger Test Case"
    assert created["risk_score"] > 0
    assert "results" in created
    assert "graph" in created["results"]

    # 2. Get details
    res_get = client.get(f"/api/investigations/{inv_id}")
    assert res_get.status_code == 200
    fetched = res_get.json()
    assert fetched["id"] == inv_id
    assert fetched["case_id"] == created["case_id"]

    # 3. Update notes
    res_patch = client.patch(
        f"/api/investigations/{inv_id}",
        json={"notes": "Updated warrant reference #W-2026-909"},
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["notes"] == "Updated warrant reference #W-2026-909"

    # 4. Generate and download PDF report
    res_pdf = client.get(f"/api/investigations/{inv_id}/pdf")
    assert res_pdf.status_code == 200
    assert res_pdf.headers["content-type"] == "application/pdf"
    assert len(res_pdf.content) > 1000
    assert res_pdf.content.startswith(b"%PDF")

    # 5. Delete investigation
    res_del = client.delete(f"/api/investigations/{inv_id}")
    assert res_del.status_code == 200
    assert res_del.json()["status"] == "deleted"

    # 6. Verify deleted
    res_verify_del = client.get(f"/api/investigations/{inv_id}")
    assert res_verify_del.status_code == 404


def test_dashboard_statistics(client):
    res = client.get("/api/stats")
    assert res.status_code == 200
    stats = res.json()
    assert "total_investigations" in stats
    assert "active_investigations" in stats
    assert "wallets_analyzed" in stats
    assert "suspicious_wallets" in stats
    assert "high_risk_destinations" in stats
    assert "activity_timeline" in stats
    assert len(stats["activity_timeline"]) == 7


def test_audit_integrity_flow(client):
    # Reset
    client.post("/audit/reset")

    # Run trace to populate audit entries
    client.post("/trace", json={"input": "bc1qsrc0000000000000000000000000000000000"})

    # Verify intact
    verify1 = client.get("/audit/verify").json()
    assert verify1["valid"] is True
    assert verify1["broken_at"] is None

    # Tamper
    client.post("/audit/tamper", json={"idx": 0})

    # Verify tampered
    verify2 = client.get("/audit/verify").json()
    assert verify2["valid"] is False
    assert verify2["broken_at"] == 0

    # Reset
    client.post("/audit/reset")
    verify3 = client.get("/audit/verify").json()
    assert verify3["valid"] is True
