"""R2-434 — the inspection register shows the real inspector, never an invented one.

The d/quality and p/[project_id]/quality pages map `inspected_by` into the
INSPECTED BY column and derive the inspector filter from it, but the backend
response model omitted the field, so FastAPI stripped it and every row fell
back to the em-dash placeholder with an empty filter. The API must carry the
server-owned actor id (set from the authenticated principal at creation, not
from the request body) so both screens attribute inspections truthfully.
"""
import uuid

from app import models


def _mk_project(db, comp, tag):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=f"P{tag}", code=f"PRJ-{uuid.uuid4().hex[:8]}-{tag}", status="Ongoing"
    )
    db.add(p)
    db.commit()
    return p


def test_inspection_endpoints_expose_inspected_by(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R434A", user_name="U434A")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, 1)

    rcl = client.post(
        "/apis/v3/quality/checklists",
        json={"company_id": str(comp.id), "title": f"R434 checklist {uuid.uuid4().hex[:6]}", "category": "Concrete"},
        headers=hdr,
    )
    assert rcl.status_code == 201
    cl_id = rcl.json()["id"]

    r = client.post(
        "/apis/v3/quality/inspections",
        json={
            "project_id": str(project.id),
            "checklist_id": cl_id,
            "zone": "Tower A",
            "inspection_date": "2026-08-25T09:00:00Z",
        },
        headers=hdr,
    )
    assert r.status_code == 201
    created = r.json()
    assert created["inspected_by"] == str(user.id)

    lst = client.get(f"/apis/v3/quality/inspections/{project.id}", headers=hdr)
    assert lst.status_code == 200
    rows = [x for x in lst.json() if x["id"] == created["id"]]
    assert len(rows) == 1
    assert rows[0]["inspected_by"] == str(user.id)


def test_inspector_attribution_is_server_owned(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R434B", user_name="U434B")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, 2)

    rcl = client.post(
        "/apis/v3/quality/checklists",
        json={"company_id": str(comp.id), "title": f"R434B checklist {uuid.uuid4().hex[:6]}", "category": "Steel"},
        headers=hdr,
    )
    cl_id = rcl.json()["id"]

    other_member_id = str(uuid.uuid4())
    r = client.post(
        "/apis/v3/quality/inspections",
        json={
            "project_id": str(project.id),
            "checklist_id": cl_id,
            "inspection_date": "2026-08-25T09:00:00Z",
            "inspected_by": other_member_id,
        },
        headers=hdr,
    )
    assert r.status_code in (201, 422)
    if r.status_code == 201:
        assert r.json()["inspected_by"] == str(user.id)
