"""
Endpoint-level regression tests for sequential document numbering (NCR and Work Orders).

Verifies POST /quality/ncr and POST /billing/work-orders auto-assign sequential numbers
when omitted, honour explicit numbers, reject duplicates, and scope NCRs per project.
"""

import uuid
from datetime import datetime, timezone
import pytest

from app import models


def _project(db, comp, name_suffix=""):
    sfx = name_suffix or uuid.uuid4().hex[:6]
    p = models.Project(
        id=uuid.uuid4(),
        company_id=comp.id,
        name=f"NumTest-{sfx}",
        code=f"NT-{sfx}",
        status="Ongoing",
        state="Karnataka",
    )
    db.add(p)
    db.commit()
    return p


class TestNcrEndpointNumbering:
    def test_endpoint_thirty_consecutive_ncrs_auto_numbered(self, client, db, make_tenant, auth_headers):
        comp, user, _ = make_tenant(
            company_name=f"NcrEpCo-{uuid.uuid4().hex[:6]}",
            user_name="ncrepuser",
            mobile=f"+9195{uuid.uuid4().hex[:8]}",
        )
        project = _project(db, comp)
        hdr = auth_headers(user, comp)

        numbers = []
        for i in range(30):
            payload = {
                "project_id": str(project.id),
                "title": f"Auto NCR {i + 1}",
                "severity": "Minor",
            }
            res = client.post("/apis/v3/quality/ncr", json=payload, headers=hdr)
            assert res.status_code == 201, (
                f"Failed on create {i + 1}: expected 201, got {res.status_code} ({res.text})"
            )
            num = res.json()["ncr_number"]
            expected = f"NCR-{i + 1:04d}"
            assert num == expected, f"Expected {expected}, got {num}"
            numbers.append(num)

        assert len(set(numbers)) == 30

    def test_endpoint_explicit_ncr_number_honoured(self, client, db, make_tenant, auth_headers):
        comp, user, _ = make_tenant(
            company_name=f"NcrExpCo-{uuid.uuid4().hex[:6]}",
            user_name="ncrexpuser",
            mobile=f"+9196{uuid.uuid4().hex[:8]}",
        )
        project = _project(db, comp)
        hdr = auth_headers(user, comp)

        payload = {
            "project_id": str(project.id),
            "ncr_number": "CUSTOM-NCR-099",
            "title": "Custom Explicit NCR",
            "severity": "Critical",
        }
        res = client.post("/apis/v3/quality/ncr", json=payload, headers=hdr)
        assert res.status_code == 201
        assert res.json()["ncr_number"] == "CUSTOM-NCR-099"

    def test_endpoint_duplicate_ncr_number_rejected_409(self, client, db, make_tenant, auth_headers):
        comp, user, _ = make_tenant(
            company_name=f"NcrDupCo-{uuid.uuid4().hex[:6]}",
            user_name="ncrdupuser",
            mobile=f"+9197{uuid.uuid4().hex[:8]}",
        )
        project = _project(db, comp)
        hdr = auth_headers(user, comp)

        payload = {
            "project_id": str(project.id),
            "ncr_number": "NCR-DUP-01",
            "title": "First Instance",
            "severity": "Major",
        }
        res1 = client.post("/apis/v3/quality/ncr", json=payload, headers=hdr)
        assert res1.status_code == 201

        # Second create with identical number must fail with 409
        res2 = client.post("/apis/v3/quality/ncr", json=payload, headers=hdr)
        assert res2.status_code == 409
        assert "already exists" in res2.json()["detail"].lower()

    def test_endpoint_ncr_numbering_scoped_per_project(self, client, db, make_tenant, auth_headers):
        comp, user, _ = make_tenant(
            company_name=f"NcrScopeCo-{uuid.uuid4().hex[:6]}",
            user_name="ncrscopeuser",
            mobile=f"+9198{uuid.uuid4().hex[:8]}",
        )
        proj_a = _project(db, comp, "PA")
        proj_b = _project(db, comp, "PB")
        hdr = auth_headers(user, comp)

        res_a = client.post("/apis/v3/quality/ncr", json={"project_id": str(proj_a.id), "title": "Proj A NCR", "severity": "Minor"}, headers=hdr)
        assert res_a.status_code == 201
        assert res_a.json()["ncr_number"] == "NCR-0001"

        res_b = client.post("/apis/v3/quality/ncr", json={"project_id": str(proj_b.id), "title": "Proj B NCR", "severity": "Minor"}, headers=hdr)
        assert res_b.status_code == 201
        assert res_b.json()["ncr_number"] == "NCR-0001"


class TestWoEndpointNumbering:
    def test_endpoint_thirty_consecutive_wos_auto_numbered(self, client, db, make_tenant, auth_headers):
        comp, user, team = make_tenant(
            company_name=f"WoEpCo-{uuid.uuid4().hex[:6]}",
            user_name="woepuser",
            mobile=f"+9180{uuid.uuid4().hex[:8]}",
        )
        project = _project(db, comp)
        hdr = auth_headers(user, comp)

        numbers = []
        for i in range(30):
            payload = {
                "company_id": str(comp.id),
                "project_id": str(project.id),
                "subcontractor_id": str(team.id),
                "wo_date": datetime.now(timezone.utc).isoformat(),
                "items": [],
            }
            res = client.post("/apis/v3/billing/work-orders", json=payload, headers=hdr)
            assert res.status_code == 201, (
                f"Failed on create {i + 1}: expected 201, got {res.status_code} ({res.text})"
            )
            num = res.json()["wo_number"]
            expected = f"WO-{i + 1:04d}"
            assert num == expected, f"Expected {expected}, got {num}"
            numbers.append(num)

        assert len(set(numbers)) == 30

    def test_endpoint_explicit_wo_number_honoured(self, client, db, make_tenant, auth_headers):
        comp, user, team = make_tenant(
            company_name=f"WoExpCo-{uuid.uuid4().hex[:6]}",
            user_name="woexpuser",
            mobile=f"+9181{uuid.uuid4().hex[:8]}",
        )
        project = _project(db, comp)
        hdr = auth_headers(user, comp)

        payload = {
            "company_id": str(comp.id),
            "project_id": str(project.id),
            "subcontractor_id": str(team.id),
            "wo_number": "CUSTOM-WO-777",
            "wo_date": datetime.now(timezone.utc).isoformat(),
            "items": [],
        }
        res = client.post("/apis/v3/billing/work-orders", json=payload, headers=hdr)
        assert res.status_code == 201
        assert res.json()["wo_number"] == "CUSTOM-WO-777"

    def test_endpoint_duplicate_wo_number_rejected(self, client, db, make_tenant, auth_headers):
        comp, user, team = make_tenant(
            company_name=f"WoDupCo-{uuid.uuid4().hex[:6]}",
            user_name="wodupuser",
            mobile=f"+9182{uuid.uuid4().hex[:8]}",
        )
        project = _project(db, comp)
        hdr = auth_headers(user, comp)

        payload = {
            "company_id": str(comp.id),
            "project_id": str(project.id),
            "subcontractor_id": str(team.id),
            "wo_number": "WO-DUP-01",
            "wo_date": datetime.now(timezone.utc).isoformat(),
            "items": [],
        }
        res1 = client.post("/apis/v3/billing/work-orders", json=payload, headers=hdr)
        assert res1.status_code == 201

        # Second create with identical number must fail with 400
        res2 = client.post("/apis/v3/billing/work-orders", json=payload, headers=hdr)
        assert res2.status_code == 400
        assert "already exists" in res2.json()["detail"].lower()
