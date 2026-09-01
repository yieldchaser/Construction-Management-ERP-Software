"""
Unit tests for sequential document numbering helpers.

Verifies _generate_ncr_number and _generate_wo_number count sequentially
and bump past collisions on concurrent creates.
"""

import uuid
from datetime import datetime, timezone
import pytest

from app import models
from app.routers.quality import _generate_ncr_number
from app.routers.billing import _generate_wo_number


def _project(db, comp):
    p = models.Project(
        id=uuid.uuid4(),
        company_id=comp.id,
        name=f"HelperTest-{uuid.uuid4().hex[:6]}",
        code=f"HT-{uuid.uuid4().hex[:6]}",
        status="Ongoing",
        state="Karnataka",
    )
    db.add(p)
    db.commit()
    return p


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
