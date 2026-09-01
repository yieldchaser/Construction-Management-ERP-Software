"""
Tests for sequential document numbering (Group A Parts 1-3).

Before the fix:
  - NCR: ncr_number was generated inline as NCR-2026-{random 100-999}.
    With only 800 values, the birthday bound guarantees a collision after ~30
    creates per project.  The collision assertion in
    test_thirty_consecutive_ncrs_do_not_collide fails with:
      AssertionError: Collision on create N: 'NCR-2026-XYZ' already used
  - WO: wo_number was Date.now().toString().slice(-6).  The last 6 digits of an
    epoch millisecond wrap every 1,000,000 ms (~16 minutes).  Any two work
    orders created the same millisecond share a number; in a test loop they
    collide immediately.

After the fix, _generate_ncr_number and _generate_wo_number produce
NCR-0001, NCR-0002 ... and WO-0001, WO-0002 ... which never collide.
"""

import uuid
import datetime
import pytest

from app import models
from app.routers.quality import _generate_ncr_number
from app.routers.billing import _generate_wo_number


def _project(db, comp):
    p = models.Project(
        id=uuid.uuid4(),
        company_id=comp.id,
        name=f"NumTest-{uuid.uuid4().hex[:6]}",
        code=f"NT-{uuid.uuid4().hex[:6]}",
        status="Ongoing",
        state="Karnataka",
    )
    db.add(p)
    db.flush()
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
                wo_date=datetime.datetime.utcnow(),
                status="active",
                estimated_work_amount=0.0,
            )
            db.add(wo)
            db.flush()
