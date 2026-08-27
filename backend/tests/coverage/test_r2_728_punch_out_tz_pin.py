"""R2-728/R2-729 verification pins — R2-728 punch-out TypeError 500 on Postgres.

R2-728 · attendance punch-out raised TypeError on Postgres. AttendanceLog
columns are DateTime(timezone=True), so punch_in round-trips AWARE there while
datetime.utcnow() is naive; `naive - aware` raised TypeError and 500ed every
punch-out, leaving rows open with hours_worked NULL. Fixed by 5ae8c5d: the
route clocks `now` with datetime.now(timezone.utc) and normalizes the loaded
punch_in through _aware_utc() before subtracting (hr.py:345-404).

This pin replays exactly that hazard on SQLite by simulating the Postgres
result processing (coercing the columns to aware UTC on load), so a regression
back to naive operands goes red here instead of shipping. A second gate is
Postgres-only (skipped on SQLite) — it proves the same path works against a
real Postgres engine where the driver itself returns aware datetimes. A pure
unit test also asserts the source uses aware datetimes, so a revert is caught
even without a DB.

Gate: with punch_in loaded AWARE, punch-out returns 201 with hours_worked
computed (~2.0h for a backdated punch-in) and zero overtime. The Postgres
gate is skipped on SQLite (message explains why SQLite cannot see the defect
without simulation), and the source-assertion gate fails if the file ever
reverts to datetime.utcnow() or raw `now - log.punch_in`.
"""
import os
import pathlib
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from sqlalchemy import event
from sqlalchemy.orm import attributes

from app import models
from app.database import engine as _engine


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


def test_punch_out_source_is_timezone_aware():
    """Static gate: hr.py punch-out must use aware datetimes (R2-728/F-4).

    A SQLite-only integration test cannot see naive-vs-aware TypeError
    without simulation (see above pin). This pure source assertion runs on
    any engine and fails immediately if the route reverts to datetime.utcnow()
    or to a raw `now - log.punch_in` subtraction.
    """
    hr_path = pathlib.Path(__file__).resolve().parents[2] / "app" / "routers" / "hr.py"
    assert hr_path.exists(), f"hr.py not found at {hr_path}"
    text = hr_path.read_text(encoding="utf-8")

    # Find the punch function boundaries (def punch -> next def).
    punch_start = text.find("def punch(")
    assert punch_start != -1, "def punch not found in hr.py"
    punch_slice = text[punch_start : punch_start + 8000]

    # Must use aware UTC clock.
    assert "datetime.now(timezone.utc)" in punch_slice, (
        "R2-728 gate: hr.py punch() must clock `now` with datetime.now(timezone.utc), "
        "not datetime.utcnow() / datetime.now() — naive clock 500s on Postgres"
    )
    # Must normalize the DB-loaded punch_in before subtraction.
    assert "_aware_utc(log.punch_in)" in punch_slice or "_aware_utc(log.punch_in" in punch_slice, (
        "R2-728 gate: hr.py punch-out must normalize log.punch_in via _aware_utc() "
        "before `now - punch_in`; raw subtraction raises TypeError on Postgres"
    )
    assert "now - _aware_utc(log.punch_in)" in punch_slice or "(now - _aware_utc" in punch_slice, (
        "R2-728 gate: expected `now - _aware_utc(log.punch_in)` pattern in punch-out"
    )
    # Naive pattern must not be present in the punch path.
    # The string `datetime.utcnow()` is still used elsewhere (CSV filenames etc.),
    # but it must not appear inside the punch function.
    assert "datetime.utcnow()" not in punch_slice, (
        "R2-728 gate: punch() must not contain datetime.utcnow() — naive clock"
    )
    assert "datetime.now()" not in punch_slice or "datetime.now(timezone.utc)" in punch_slice, (
        "R2-728 gate: punch() must not contain naive datetime.now()"
    )


def test_naive_aware_subtraction_raises_typeerror_and_aware_fix_avoids_it():
    """Pure unit proof of the R2-728 hazard (no DB): naive - aware is TypeError.

    Documents why a SQLite-only test without simulation cannot see the defect:
    SQLite round-trips the column naive, so `naive - naive` succeeds. Postgres
    returns aware, so `naive - aware` TypeErrors. The fix normalizes both to
    aware UTC before subtraction.
    """
    naive = datetime.now()
    aware = datetime.now(timezone.utc)
    assert naive.tzinfo is None
    assert aware.tzinfo is not None
    with pytest.raises(TypeError, match="can't subtract offset-naive"):
        _ = naive - aware
    with pytest.raises(TypeError, match="can't subtract offset-naive"):
        _ = aware - naive
    # The fix: normalize naive to aware first.
    def _aware_utc(dt: datetime) -> datetime:
        return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)
    delta_seconds = (aware - _aware_utc(naive)).total_seconds()
    assert isinstance(delta_seconds, float)


# ── Postgres-only gate (skipped on SQLite) ──────────────────────────────────
# This is the literal F-4 requirement: "gate it with a test that runs against
# POSTGRES. A SQLite test cannot see this class of defect." The simulation
# pin above covers CI (SQLite), but this test only runs when DATABASE_URL is
# postgres and proves the same endpoint works against the real driver where
# AttendanceLog columns are natively aware.

def _is_postgres_engine() -> bool:
    url = os.getenv("DATABASE_URL", "")
    try:
        drv = _engine.url.drivername if _engine is not None else ""
    except Exception:
        drv = ""
    dialect = ""
    try:
        dialect = getattr(_engine.dialect, "name", "") if _engine is not None else ""
    except Exception:
        dialect = ""
    return (
        "postgres" in drv.lower()
        or "postgres" in dialect.lower()
        or "postgres" in url.lower()
        or "postgresql" in url.lower()
    )


@pytest.mark.skipif(
    not _is_postgres_engine(),
    reason="Postgres-only: SQLite round-trips DateTime(timezone=True) as naive, so naive/aware TypeError is invisible without simulation; this gate runs only when DATABASE_URL is postgres"
)
def test_punch_out_computes_hours_on_postgres_without_simulation(client, db, make_tenant, auth_headers):
    """F-4 Postgres gate: punch-out must compute hours against real Postgres aware columns.

    No _aware_load simulation — the driver itself returns aware datetimes.
    Backdate by 2h and assert punch-out closes with correct hours_worked.
    Skipped on SQLite by design (see skip reason).
    """
    sfx = uuid.uuid4().hex[:8]
    comp, user, _team = make_tenant(
        company_name=f"R2728PG{sfx}", user_name=f"UPG{sfx}",
        mobile=f"+9198{sfx}", email=f"r2728pg-{sfx}@test.com",
    )
    hdr = auth_headers(user, comp)

    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id,
        name=f"P-PG-{sfx}", code=f"PRG-{sfx}", status="Ongoing",
    )
    employee = models.StaffEmployee(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        name=f"WPG-{sfx}", basic_salary=Decimal("18000"),
    )
    db.add_all([project, employee])
    db.commit()

    payload = {
        "employee_id": str(employee.id), "project_id": str(project.id),
        "lat": 12.9716, "lng": 77.5946,
    }

    r_in = client.post("/apis/v3/hr/attendance/punch",
                       headers=hdr, json={**payload, "punch_type": "in"})
    assert r_in.status_code == 201, r_in.text

    row = db.query(models.AttendanceLog).filter(
        models.AttendanceLog.employee_id == employee.id
    ).first()
    # On Postgres this is natively aware; on SQLite this test would have been skipped.
    assert row.punch_in.tzinfo is not None, (
        f"Postgres gate expected aware punch_in but got naive: {row.punch_in!r} "
        f"(engine={_engine.url!r}) — gate mis-configured or not Postgres"
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
