"""R2-357 - plant cost was billed at 24 hours a day of wall-clock time.

GET /finance/pl priced every deployment as (end - start) in calendar hours, so
6.8 days parked on site were charged as 163 engine-hours (3x overstatement at
an 8 h shift), while the real usage figure sat unread and
EquipmentDeployment had no hours_used column to hold it.

Gate: a deployment carrying hours_used is billed by those recorded hours
(rounded to the rupee like every other head); a legacy row without one still
bills wall-clock; POST /equipment/{id}/deploy accepts and returns hours_used.
"""
import uuid
from datetime import datetime, timezone

from app import models

_RATE = 1200.0


def _utc(y, m, d, hh=0):
    return datetime(y, m, d, hh, tzinfo=timezone.utc)


def _mk_equipment(db, comp, name, code):
    eq = models.Equipment(
        id=uuid.uuid4(), company_id=comp.id, name=name, code=code,
        category="Excavator", ownership_type="Owned", status="deployed",
        hourly_rate=_RATE,
    )
    db.add(eq)
    db.flush()
    return eq


def test_r2_357_pl_bills_recorded_hours_not_wall_clock(client, db, make_tenant, auth_headers):
    comp, user, _team = make_tenant(
        company_name="R2357", user_name="U2357",
        mobile="+9192357001", email="r2357@test.com",
    )
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P2357",
        code="PRJ-2357", status="Ongoing",
    )
    db.add(project)
    db.flush()

    # Deployment A: 10 calendar days open on site, but only 8 shift hours worked.
    eq_a = _mk_equipment(db, comp, "Exc A", "EQ-2357-A")
    db.add(models.EquipmentDeployment(
        id=uuid.uuid4(), equipment_id=eq_a.id, project_id=project.id,
        start_date=_utc(2026, 8, 1), end_date=None,
        hours_used=8.0,
    ))

    # Deployment B: legacy row with no recorded hours on a closed window -
    # fixed instants so the wall-clock fallback is exactly 24 h.
    eq_b = _mk_equipment(db, comp, "Exc B", "EQ-2357-B")
    db.add(models.EquipmentDeployment(
        id=uuid.uuid4(), equipment_id=eq_b.id, project_id=project.id,
        start_date=_utc(2026, 8, 10), end_date=_utc(2026, 8, 11),
        hours_used=None,
    ))
    db.commit()

    r = client.get(f"/apis/v3/finance/pl?project_id={project.id}", headers=hdr)
    assert r.status_code == 200, r.text
    pl = {row["head"]: row for row in r.json()}
    # 8 h x 1200 = 9600 recorded-hours + 24 h x 1200 = 28800 wall-clock fallback,
    # not 34 days x 24 h x 1200; and rounded clean like every other head.
    assert pl["Plant & Machinery"]["actual"] == 38400.0, pl["Plant & Machinery"]


def test_r2_357_deploy_accepts_and_returns_hours_used(client, db, make_tenant, auth_headers):
    comp, user, _team = make_tenant(
        company_name="R2357b", user_name="U2357b",
        mobile="+9192357002", email="r2357b@test.com",
    )
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P2357b",
        code="PRJ-2357B", status="Ongoing",
    )
    db.add(project)
    eq = _mk_equipment(db, comp, "Exc C", "EQ-2357-C")
    db.commit()

    r = client.post(
        f"/apis/v3/equipment/{eq.id}/deploy",
        headers=hdr,
        json={
            "project_id": str(project.id),
            "start_date": "2026-08-20T08:00:00Z",
            "hours_used": 5.5,
            "remarks": "shift meter reading",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["hours_used"] == 5.5, body

    db.expire_all()
    dep = db.query(models.EquipmentDeployment).filter(
        models.EquipmentDeployment.equipment_id == eq.id
    ).first()
    assert float(dep.hours_used) == 5.5
