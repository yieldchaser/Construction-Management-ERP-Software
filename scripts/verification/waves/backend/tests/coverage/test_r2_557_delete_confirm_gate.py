"""R2-557 - DELETE /projects/{id} is a counted, explicitly confirmed operation.

One call used to cascade to 51 child tables (bills, payments, attendance,
drawings, BOQ, inspections, chat groups and more) with no impact count, no
server-side confirmation - the typed-name gate lived only in the browser -
and an audit line that named neither scope nor actor.

Pinned contract on this lineage:

- a project with dependents answers 400 naming the per-table inventory when
  the request carries no confirm token, and nothing is destroyed;
- a wrong token is refused the same way;
- the exact project name as token deletes the project, its children go with
  it, and the delete log row names the actor;
- financial records still hard-refuse with 409 even with a correct token
  (R2-300 outranks confirmation);
- a truly empty project still deletes without a token (R2-300 compatibility).
"""
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _mk_project(db, comp, name):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=name,
        code=f"PRJ-{name}-{_SUFFIX}", status="Ongoing",
    )
    db.add(p)
    db.commit()
    return p


def _mk_task(db, comp, p):
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    task = models.Task(
        id=uuid.uuid4(), project_id=p.id,
        name=f"Task-{_SUFFIX}", duration_days=1,
        start_date=now, end_date=now,
    )
    db.add(task)
    db.commit()
    return task


def _mk_todo(db, comp, p):
    todo = models.Todo(
        id=uuid.uuid4(), company_id=comp.id, project_id=p.id,
        title=f"Todo-{_SUFFIX}",
    )
    db.add(todo)
    db.commit()
    return todo


def test_dependents_without_token_refused_with_inventory(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name=f"R2557-{_SUFFIX}", user_name="U557A")
    hdr = auth_headers(user, comp)
    p = _mk_project(db, comp, f"R2-557 Site {_SUFFIX}")
    _mk_task(db, comp, p)
    _mk_todo(db, comp, p)

    r = client.delete(f"/apis/v3/projects/{p.id}", headers=hdr)
    assert r.status_code == 400, r.text
    detail = r.json()["detail"]
    assert "tasks: 1" in detail and "todos: 1" in detail, detail
    assert str(p.name) in detail or p.name in detail

    # Nothing was destroyed.
    assert db.query(models.Project).filter(models.Project.id == p.id).first() is not None
    assert db.query(models.Task).filter(models.Task.project_id == p.id).count() == 1
    assert db.query(models.Todo).filter(models.Todo.project_id == p.id).count() == 1


def test_wrong_token_refused(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name=f"R2557B-{_SUFFIX}", user_name="U557B")
    hdr = auth_headers(user, comp)
    p = _mk_project(db, comp, f"R2-557 Wrong Token {_SUFFIX}")
    _mk_todo(db, comp, p)

    r = client.delete(f"/apis/v3/projects/{p.id}", params={"confirm": f"Not The Name {_SUFFIX}"}, headers=hdr)
    assert r.status_code == 400, r.text
    assert db.query(models.Project).filter(models.Project.id == p.id).first() is not None


def test_exact_name_token_destroys_cascade_and_logs_actor(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name=f"R2557C-{_SUFFIX}", user_name="U557C")
    hdr = auth_headers(user, comp)
    p = _mk_project(db, comp, f"R2-557 Confirmed {_SUFFIX}")
    pname = p.name
    pid = p.id
    _mk_task(db, comp, p)
    _mk_todo(db, comp, p)

    r = client.delete(f"/apis/v3/projects/{pid}", params={"confirm": pname}, headers=hdr)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["success"] is True
    # The preflight counted exactly what the 51 ondelete="CASCADE" rules will
    # destroy engine-side (Postgres enforces the cascades; the SQLite test
    # harness does not emulate them, so child rows are asserted via the count).
    assert body["deleted_dependents"] == 2

    assert db.query(models.Project).filter(models.Project.id == pid).first() is None

    # The audit line names what and by whom (deleted_by), same transaction.
    log = db.query(models.DeleteLog).filter(
        models.DeleteLog.entity_type == "project",
        models.DeleteLog.entity_id == str(pid),
    ).one()
    assert log.deleted_by == user.name
    assert pname in (log.entity_summary or "")


def test_financial_guard_outranks_confirmation(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name=f"R2557D-{_SUFFIX}", user_name="U557D")
    hdr = auth_headers(user, comp)
    p = _mk_project(db, comp, f"R2-557 Books {_SUFFIX}")
    from datetime import datetime, timezone
    db.add(models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=p.id,
        party_company_user_id=team.id, invoice_number=f"ZZ557-{_SUFFIX}",
        invoice_date=datetime.now(timezone.utc), invoice_type="purchase",
        subtotal=1000, gst_amount=0, total_payable=1000,
    ))
    db.commit()

    r = client.delete(f"/apis/v3/projects/{p.id}", params={"confirm": p.name}, headers=hdr)
    assert r.status_code == 409, r.text
    assert "bills: 1" in r.json()["detail"], r.text
    assert db.query(models.Bill).filter(models.Bill.project_id == p.id).count() == 1


def test_empty_project_still_deletes_without_token(client, db, make_tenant, auth_headers):
    """R2-300 compatibility: nothing at stake, no ceremony required."""
    comp, user, team = make_tenant(company_name=f"R2557E-{_SUFFIX}", user_name="U557E")
    hdr = auth_headers(user, comp)
    p = _mk_project(db, comp, f"R2-557 Empty {_SUFFIX}")

    r = client.delete(f"/apis/v3/projects/{p.id}", headers=hdr)
    assert r.status_code == 200, r.text
    assert db.query(models.Project).filter(models.Project.id == p.id).first() is None
