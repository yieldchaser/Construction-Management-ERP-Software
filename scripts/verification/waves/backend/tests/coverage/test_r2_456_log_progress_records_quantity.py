"""R2-456 — Log Progress must record progress, not just post a chat line.

The drawer's "Log Progress" button posts a task comment carrying
progress_qty_added. The server used to do exactly one thing with the
quantity: flip a not_started task to in_progress/ongoing. Task.progress was
never touched, so 40 cum of booked concrete moved no schedule, no baseline
and no WORK DONE VALUE anywhere in the product.

Fix: when a quantity is booked, the task's cumulative measured quantity is
divided by its linked BOQ item's contracted quantity to produce an honest
measurement-book percentage on Task.progress (capped at 100, completing the
task at full quantity). Without a linked BOQ quantity there is no
denominator, so progress is left to the explicit PATCH path and only the
existing not_started -> ongoing flip remains.
"""
import datetime
import uuid

from app import models


def _mk_project(db, comp):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P", code=f"PRJ-{uuid.uuid4().hex[:8]}", status="Ongoing"
    )
    db.add(p)
    db.commit()
    return p


def _mk_task(db, project, **kw):
    now = datetime.datetime.now(datetime.timezone.utc)
    defaults = dict(
        id=uuid.uuid4(), project_id=project.id, name=f"T-{uuid.uuid4().hex[:6]}",
        duration_days=5, start_date=now - datetime.timedelta(days=1),
        end_date=now + datetime.timedelta(days=4), status="not_started",
        priority="medium", progress=0.0,
    )
    defaults.update(kw)
    t = models.Task(**defaults)
    db.add(t)
    db.commit()
    return t


def test_booked_quantity_reaches_task_progress_and_completes(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R456A", user_name="U456A")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    boq_item = models.BOQItem(
        id=uuid.uuid4(), project_id=project.id, item_name="Concrete M25", unit="cum", quantity=100
    )
    db.add(boq_item)
    db.commit()

    task = _mk_task(db, project, boq_item_id=boq_item.id)

    r = client.post(f"/apis/v3/planning/tasks/{task.id}/comments", headers=hdr, json={
        "message_text": "Logged progress takeoff: 40",
        "progress_qty_added": 40,
    })
    assert r.status_code == 201, r.text

    tasks = client.get("/apis/v3/planning/tasks", params={"project_id": str(project.id)}, headers=hdr).json()
    row = next(t for t in tasks if t["id"] == str(task.id))
    assert row["progress"] == 40.0, row
    # booking work moves a not_started task into execution
    assert row["status"] == "ongoing", row

    # cumulative bookkeeping: 40 + 70 = 110 of a 100 cum item caps at 100%
    r2 = client.post(f"/apis/v3/planning/tasks/{task.id}/comments", headers=hdr, json={
        "message_text": "Logged progress takeoff: 70",
        "progress_qty_added": 70,
    })
    assert r2.status_code == 201, r2.text

    tasks = client.get("/apis/v3/planning/tasks", params={"project_id": str(project.id)}, headers=hdr).json()
    row = next(t for t in tasks if t["id"] == str(task.id))
    assert row["progress"] == 100.0, row
    assert row["status"] == "completed", row


def test_quantity_without_boq_denominator_leaves_progress_to_explicit_patch(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R456B", user_name="U456B")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    task = _mk_task(db, project)

    r = client.post(f"/apis/v3/planning/tasks/{task.id}/comments", headers=hdr, json={
        "message_text": "Logged progress takeoff: 50",
        "progress_qty_added": 50,
    })
    assert r.status_code == 201, r.text

    tasks = client.get("/apis/v3/planning/tasks", params={"project_id": str(project.id)}, headers=hdr).json()
    row = next(t for t in tasks if t["id"] == str(task.id))
    # no BOQ denominator: qty cannot honestly become a percentage...
    assert row["progress"] == 0.0, row
    # ...but starting work still shows
    assert row["status"] == "ongoing", row
