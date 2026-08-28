"""R2-531 - equipment availability followed a maintenance record's status and ignored its date.

POST /equipment/{id}/maintenance set Equipment.status straight from the last
row written: booking a December service in July took the excavator off the
road for five months, and completing any one job marked it available while
other due work was still open.

Gate: a future-dated booking leaves the fleet status untouched; a booking due
today (or overdue) flags "maintenance"; completing a job only clears the flag
when no other open schedule is due (the completed record closes its own
service_type + day bookings); completed_date is timezone-aware.
"""
import uuid
from datetime import datetime, timezone

from app import models


def _mk_equipment(db, comp, name, code):
    eq = models.Equipment(
        id=uuid.uuid4(), company_id=comp.id, name=name, code=code,
        category="Excavator", ownership_type="Owned", status="available",
        hourly_rate=1200.0,
    )
    db.add(eq)
    db.commit()
    return eq


def _fleet_status(client, hdr, comp, eq_id):
    r = client.get(f"/apis/v3/equipment/{comp.id}", headers=hdr)
    assert r.status_code == 200, r.text
    return [e for e in r.json() if e["id"] == str(eq_id)][0]["status"]


def _post_maintenance(client, hdr, eq_id, service, when, status):
    return client.post(
        f"/apis/v3/equipment/{eq_id}/maintenance",
        headers=hdr,
        json={
            "service_type": service,
            "scheduled_date": when,
            "cost": 100.0,
            "status": status,
            "remarks": f"R2-531 {service}",
        },
    )


def test_r2_531_future_booking_does_not_take_machine_off_the_road(client, db, make_tenant, auth_headers):
    comp, user, _team = make_tenant(
        company_name="R2531a", user_name="U531a",
        mobile="+9192531001", email="r531a@test.com",
    )
    hdr = auth_headers(user, comp)
    eq = _mk_equipment(db, comp, "ZZ 531 Future", "EQ-531-A")

    # Booking a service months out must not flip the fleet status today.
    r = _post_maintenance(client, hdr, eq.id, "Oil change", "2099-12-25T09:00:00Z", "scheduled")
    assert r.status_code == 201, r.text
    assert _fleet_status(client, hdr, comp, eq.id) == "available"


def test_r2_531_due_work_flags_maintenance_and_completion_respects_open_work(client, db, make_tenant, auth_headers):
    comp, user, _team = make_tenant(
        company_name="R2531b", user_name="U531b",
        mobile="+9192531002", email="r531b@test.com",
    )
    hdr = auth_headers(user, comp)
    eq = _mk_equipment(db, comp, "ZZ 531 Due", "EQ-531-B")

    # A booking due now (overdue by an hour) flags the machine immediately.
    r = _post_maintenance(client, hdr, eq.id, "Statutory inspection", "2026-08-22T07:00:00Z", "scheduled")
    assert r.status_code == 201, r.text
    assert _fleet_status(client, hdr, comp, eq.id) == "maintenance"

    # A second overdue statutory job stays open...
    r = _post_maintenance(client, hdr, eq.id, "Brake overhaul", "2026-08-21T07:00:00Z", "overdue")
    assert r.status_code == 201, r.text

    # ...so ticking off an unrelated service must NOT mark the machine available.
    r = _post_maintenance(client, hdr, eq.id, "Hydraulic check", "2026-08-22T09:00:00Z", "completed")
    assert r.status_code == 201, r.text
    # completed_date is stamped server-side from an aware clock (UTC today),
    # never left null and never taken from the payload.
    assert r.json()["completed_date"][:10] == datetime.now(timezone.utc).date().isoformat(), r.text
    assert _fleet_status(client, hdr, comp, eq.id) == "maintenance"


def test_r2_531_completing_the_due_job_returns_machine_to_available(client, db, make_tenant, auth_headers):
    comp, user, _team = make_tenant(
        company_name="R2531c", user_name="U531c",
        mobile="+9192531003", email="r531c@test.com",
    )
    hdr = auth_headers(user, comp)
    eq = _mk_equipment(db, comp, "ZZ 531 Clean", "EQ-531-C")

    r = _post_maintenance(client, hdr, eq.id, "Greasing", "2026-08-22T06:00:00Z", "scheduled")
    assert r.status_code == 201, r.text
    assert _fleet_status(client, hdr, comp, eq.id) == "maintenance"

    # The completed record for the same service on the same day closes it out.
    r = _post_maintenance(client, hdr, eq.id, "Greasing", "2026-08-22T10:00:00Z", "completed")
    assert r.status_code == 201, r.text
    assert _fleet_status(client, hdr, comp, eq.id) == "available"
