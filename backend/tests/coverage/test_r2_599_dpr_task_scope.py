"""R2-599 - creating a DPR must not advance a task from another project.

create_dpr resolved the task with `Task.id == task_uuid` and nothing else,
then advanced it from not_started to in_progress. The permission check above
authorises the caller against the project named in the payload, not against
the task, so any task whose id the caller knew was writable through this
endpoint. Cross-project was proved live and the identical code path is
cross-tenant.

The task is now resolved inside the project, so a foreign task id cannot
select a row at all.
"""
import uuid
from datetime import datetime, timezone

from app import models

DPR = "/apis/v3/dpr"


def _project(db, company_id, name):
    p = models.Project(id=uuid.uuid4(), company_id=company_id, name=name, status="Ongoing")
    db.add(p)
    # Committed, not just flushed: the endpoint reads through its own session.
    db.commit()
    return p


def _task(db, project_id, name):
    t = models.Task(
        id=uuid.uuid4(),
        project_id=project_id,
        name=name,
        duration_days=5,
        start_date=datetime(2026, 8, 1, tzinfo=timezone.utc),
        end_date=datetime(2026, 8, 10, tzinfo=timezone.utc),
        status="not_started",
    )
    db.add(t)
    db.commit()
    return t


def _dpr_payload(project_id, task_id):
    return {
        "project_id": str(project_id),
        "task_id": str(task_id),
        "dpr_date": "2026-08-20T00:00:00Z",
        "executed_qty": 1.0,
        "workers_deployed": 2,
    }


def test_foreign_project_task_is_not_mutated(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R599A", user_name="U599A")
    hdr = auth_headers(user, comp)

    own_project = _project(db, comp.id, "R599 Own")
    other_project = _project(db, comp.id, "R599 Other")
    foreign_task = _task(db, other_project.id, "R599 Foreign Task")

    r = client.post(DPR, json=_dpr_payload(own_project.id, foreign_task.id), headers=hdr)
    assert r.status_code == 400, r.text

    db.refresh(foreign_task)
    assert foreign_task.status == "not_started", "a task in another project was advanced"

    # And no DPR was written against the caller's project either.
    assert db.query(models.DailyProgressReport).filter(
        models.DailyProgressReport.project_id == own_project.id
    ).count() == 0


def test_foreign_company_task_is_not_mutated(client, db, make_tenant, auth_headers):
    comp_a, user_a, _ = make_tenant(company_name="R599B", user_name="U599B")
    comp_b, _user_b, _ = make_tenant(company_name="R599C", user_name="U599C")
    hdr_a = auth_headers(user_a, comp_a)

    own_project = _project(db, comp_a.id, "R599B Own")
    foreign_project = _project(db, comp_b.id, "R599C Project")
    foreign_task = _task(db, foreign_project.id, "R599C Task")

    r = client.post(DPR, json=_dpr_payload(own_project.id, foreign_task.id), headers=hdr_a)
    assert r.status_code == 400, r.text

    db.refresh(foreign_task)
    assert foreign_task.status == "not_started", "a task in another company was advanced"


def test_own_project_task_is_still_advanced(client, db, make_tenant, auth_headers):
    """The documented side effect must survive for a task that does belong."""
    comp, user, _ = make_tenant(company_name="R599D", user_name="U599D")
    hdr = auth_headers(user, comp)

    project = _project(db, comp.id, "R599D Project")
    task = _task(db, project.id, "R599D Task")

    r = client.post(DPR, json=_dpr_payload(project.id, task.id), headers=hdr)
    assert r.status_code == 201, r.text

    db.refresh(task)
    assert task.status == "in_progress"


def test_dpr_without_task_is_unaffected(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R599E", user_name="U599E")
    hdr = auth_headers(user, comp)
    project = _project(db, comp.id, "R599E Project")

    r = client.post(
        DPR,
        json={
            "project_id": str(project.id),
            "dpr_date": "2026-08-20T00:00:00Z",
            "executed_qty": 1.0,
            "workers_deployed": 2,
        },
        headers=hdr,
    )
    assert r.status_code == 201, r.text
