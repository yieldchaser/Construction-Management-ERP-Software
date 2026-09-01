"""
Regression tests for sequential document numbering (NCR and Work Orders).

What this module verifies:
  1. Unit tests for _generate_ncr_number and _generate_wo_number:
     - Generates sequential zero-padded identifiers (NCR-0001, WO-0001).
     - Automatically bumps past collisions if an identifier is already occupied.
  2. Endpoint-level regression tests (POST /quality/ncr and POST /billing/work-orders):
     - Omitted document numbers trigger automatic sequential generation without collisions.
       (On the tree prior to the fix, ncr_number and wo_number were required in the
       Pydantic create schemas, so omitting them returned HTTP 422 Unprocessable Entity.)
     - Explicit user-provided document numbers are honoured as optional overrides.
     - Duplicate document numbers are rejected with conflict errors.
     - NCR numbering is strictly scoped per project (two projects in the same company
       each independently receive NCR-0001 for their first NCR).
"""

import uuid
from datetime import datetime, timezone
import pytest

from app import models
from app.routers.quality import _generate_ncr_number
from app.routers.billing import _generate_wo_number


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


# ── Unit tests for generator helpers ──────────────────────────────────────────

class TestGenerateNcrNumber:
    def test_first_ncr_is_0001(self, db, make_tenant):
        comp, _, _ = make_tenant(
            company_name=f"NcrCo-{uuid.uuid4().hex[:6]}",
            user_name="ncruser",
            mobile=f"+9190{uuid.uuid4().hex[:8]}",
        )
        project = _project(db, comp)
        number = _generate_ncr_number(db, project.id)
        assert number == "NCR-0001"

    def test_thirty_consecutive_ncrs_do_not_collide(self, db, make_tenant):
        comp, _, _ = make_tenant(
            company_name=f"NcrCo30-{uuid.uuid4().hex[:6]}",
            user_name="ncruser30",
            mobile=f"+9191{uuid.uuid4().hex[:8]}",
        )
        project = _project(db, comp)
        seen = set()
        for i in range(30):
            number = _generate_ncr_number(db, project.id)
            assert number not in seen, (
                f"Collision on create {i + 1}: {number!r} already used"
            )
            seen.add(number)
            ncr = models.NCR(
                id=uuid.uuid4(),
                project_id=project.id,
                ncr_number=number,
                title=f"NCR {i}",
                severity="Minor",
                status="open",
            )
            db.add(ncr)
            db.flush()

    def test_collision_bump_skips_occupied_slot(self, db, make_tenant):
        comp, _, _ = make_tenant(
            company_name=f"NcrBump-{uuid.uuid4().hex[:6]}",
            user_name="ncrbump",
            mobile=f"+9192{uuid.uuid4().hex[:8]}",
        )
        project = _project(db, comp)
        # plant a manual NCR at NCR-0001
        ncr = models.NCR(
            id=uuid.uuid4(),
            project_id=project.id,
            ncr_number="NCR-0001",
            title="Manual",
            severity="Major",
            status="open",
        )
        db.add(ncr)
        db.flush()
        number = _generate_ncr_number(db, project.id)
        assert number != "NCR-0001"
        assert number == "NCR-0002"


class TestGenerateWoNumber:
    def test_first_wo_is_0001(self, db, make_tenant):
        comp, _, team = make_tenant(
            company_name=f"WoCo-{uuid.uuid4().hex[:6]}",
            user_name="wouser",
            mobile=f"+9193{uuid.uuid4().hex[:8]}",
        )
        number = _generate_wo_number(db, comp.id)
        assert number == "WO-0001"

    def test_thirty_consecutive_wos_do_not_collide(self, db, make_tenant):
        comp, _, team = make_tenant(
            company_name=f"WoCo30-{uuid.uuid4().hex[:6]}",
            user_name="wouser30",
            mobile=f"+9194{uuid.uuid4().hex[:8]}",
        )
        project = _project(db, comp)
        seen = set()
        for i in range(30):
            number = _generate_wo_number(db, comp.id)
            assert number not in seen, (
                f"Collision on create {i + 1}: {number!r} already used"
            )
            seen.add(number)
            wo = models.WorkOrder(
                id=uuid.uuid4(),
                company_id=comp.id,
                project_id=project.id,
                subcontractor_id=team.id,
                wo_number=number,
                wo_date=datetime.now(timezone.utc),
                status="active",
                estimated_work_amount=0.0,
            )
            db.add(wo)
            db.flush()


# ── Endpoint-level regression tests ───────────────────────────────────────────

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
