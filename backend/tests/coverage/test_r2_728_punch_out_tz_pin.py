"""R2-729/R2-728 verification pins.

R2-728 · attendance punch-out raised TypeError on Postgres. AttendanceLog
columns are DateTime(timezone=True), so punch_in round-trips AWARE there while
datetime.utcnow() is naive; `naive - aware` raised TypeError and 500ed every
punch-out, leaving rows open with hours_worked NULL. Fixed by 5ae8c5d: the
route clocks `now` with datetime.now(timezone.utc) and normalizes the loaded
punch_in through _aware_utc() before subtracting (hr.py).

This pin replays exactly that hazard on SQLite by simulating the Postgres
result processing (coercing the columns to aware UTC on load), so a regression
back to naive operands goes red here instead of shipping.

Gate: with punch_in loaded AWARE, punch-out returns 201 with hours_worked
computed (~2.0h for a backdated punch-in) and zero overtime.
"""
import uuid
from datetime import timedelta, timezone
from decimal import Decimal

from sqlalchemy import event
from sqlalchemy.orm import attributes

from app import models


def _aware_load(model, *columns):
    """Simulate Postgres result processing: coerce columns to aware UTC on load.

    Same pattern as tests/coverage/test_r2_210_220_222_262_hr_tz.py, copied so
    this pin stays self-contained.
    """

    def _coerce(target, context):
        for col in columns:
            val = getattr(target, col, None)
            if val is not None and val.tzinfo is None:
                attributes.set_committed_value(
                    target, col, val.replace(tzinfo=timezone.utc)
                )

    class _Ctx:
        def __enter__(self):
            event.listen(model, "load", _coerce)
            return self

        def __exit__(self, *exc):
            event.remove(model, "load", _coerce)
            return False

    return _Ctx()


def test_punch_out_computes_hours_when_punch_in_round_trips_aware(
    client, db, make_tenant, auth_headers
):
    sfx = uuid.uuid4().hex[:8]
    comp, user, _team = make_tenant(
        company_name=f"R2728{sfx}", user_name=f"U{sfx}",
        mobile=f"+9199{sfx}", email=f"r2728-{sfx}@test.com",
    )
    hdr = auth_headers(user, comp)

    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id,
        name=f"P-{sfx}", code=f"PRJ-{sfx}", status="Ongoing",
    )
    employee = models.StaffEmployee(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        name=f"W-{sfx}", basic_salary=Decimal("18000"),
    )
    db.add_all([project, employee])
    db.commit()

    payload = {
        "employee_id": str(employee.id), "project_id": str(project.id),
        "lat": 12.9716, "lng": 77.5946,
    }

    with _aware_load(models.AttendanceLog, "attendance_date", "punch_in", "punch_out"):
        r_in = client.post("/apis/v3/hr/attendance/punch",
                           headers=hdr, json={**payload, "punch_type": "in"})
        assert r_in.status_code == 201, r_in.text

        # Backdate the open punch-in by 2h for a deterministic delta.
        row = db.query(models.AttendanceLog).filter(
            models.AttendanceLog.employee_id == employee.id
        ).first()
        # Vacuity guard: prove the Postgres simulation is engaged, i.e. the
        # operand the route loads really is AWARE — the exact flavor mixing
        # with naive utcnow() that used to raise TypeError here.
        assert row.punch_in.tzinfo is not None, (
            "simulation inactive: punch_in loaded naive, pin cannot see the defect"
        )
        row.punch_in = row.punch_in - timedelta(hours=2)
        db.commit()

        r_out = client.post("/apis/v3/hr/attendance/punch",
                            headers=hdr, json={**payload, "punch_type": "out"})
        assert r_out.status_code == 201, r_out.text
        body = r_out.json()
        assert body["hours_worked"] is not None, r_out.text
        assert abs(body["hours_worked"] - 2.0) < 0.02, r_out.text
        assert body["overtime_hours"] == 0.0, r_out.text
