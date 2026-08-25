"""R2-458 — the 14-Day Lookahead surfaces overdue open work.

Gate: with the flag-off default, a task that has slipped past its planned end
date while still not completed must appear in GET /planning/tasks/lookahead —
that is the one class of work a forward lookahead exists to surface. A
completed overdue task stays out, and in-window work is unchanged.
"""
import datetime
import uuid

from app import models


def _project(db, comp):
    proj = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="LookaheadProj", code="LA", status="Ongoing"
    )
    db.add(proj)
    db.commit()
    return proj


def _task(db, proj, name, *, days_ago_start, duration_days=5, status="ongoing", progress=0.0):
    start = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days_ago_start)
    end = start + datetime.timedelta(days=duration_days - 1)
    t = models.Task(
        project_id=proj.id,
        name=name,
        duration_days=duration_days,
        start_date=start,
        end_date=end,
        status=status,
        progress=progress,
    )
    db.add(t)
    db.commit()
    return t


def test_overdue_open_task_appears_in_lookahead(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R458A", user_name="U458A")
    hdr = auth_headers(user, comp)
    proj = _project(db, comp)
    # The audit's repro: 23 days late, 75% done, on the critical path.
    _task(db, proj, "Overdue Open", days_ago_start=27, status="ongoing", progress=75.0)

    r = client.get(
        "/apis/v3/planning/tasks/lookahead", params={"project_id": str(proj.id)}, headers=hdr
    )
    assert r.status_code == 200
    names = [t["name"] for t in r.json()]
    assert "Overdue Open" in names


def test_overdue_completed_task_stays_out(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R458B", user_name="U458B")
    hdr = auth_headers(user, comp)
    proj = _project(db, comp)
    _task(db, proj, "Done Long Ago", days_ago_start=27, status="completed", progress=100.0)

    r = client.get(
        "/apis/v3/planning/tasks/lookahead", params={"project_id": str(proj.id)}, headers=hdr
    )
    assert r.status_code == 200
    assert [t["name"] for t in r.json()] == []


def test_upcoming_and_overdue_mixed_census(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R458C", user_name="U458C")
    hdr = auth_headers(user, comp)
    proj = _project(db, comp)
    _task(db, proj, "Slipped Critical", days_ago_start=23, status="ongoing", progress=75.0)
    _task(db, proj, "Finished Late", days_ago_start=23, status="completed", progress=100.0)
    _task(db, proj, "Next Week", days_ago_start=-5, status="not_started")

    r = client.get(
        "/apis/v3/planning/tasks/lookahead", params={"project_id": str(proj.id)}, headers=hdr
    )
    assert r.status_code == 200
    names = {t["name"] for t in r.json()}
    assert names == {"Slipped Critical", "Next Week"}
    slipped = next(t for t in r.json() if t["name"] == "Slipped Critical")
    assert slipped["progress"] == 75.0
