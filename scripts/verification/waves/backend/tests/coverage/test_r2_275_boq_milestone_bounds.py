"""R2-275 — milestone_done can never exceed milestone_total on a BOQ.

Gate: POST /budgeting/boq-documents accepted {"milestone_done": 99,
"milestone_total": 5} and the pair flowed straight into the client-facing
BOQ PDF as "Milestones: 99 / 5". After the fix the create and patch
endpoints reject done > total with 400, and the PDF render clamps as
defence in depth for legacy rows.
"""
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _make_project(db, comp):
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=f"P275-{_SUFFIX}",
        code=f"PRJ-{_SUFFIX}", status="Ongoing",
    )
    db.add(project)
    db.commit()
    return project


def test_create_rejects_done_exceeding_total(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(
        company_name=f"R275a-{_SUFFIX}", user_name="U275",
        mobile=f"+9190{_SUFFIX}01", email=f"r275a-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    project = _make_project(db, comp)

    r = client.post(
        "/apis/v3/budgeting/boq-documents",
        json={"project_id": str(project.id), "title": "ZZ R5 BOQ",
              "milestone_done": 99, "milestone_total": 5},
        headers=hdr,
    )
    assert r.status_code == 400, r.text


def test_create_accepts_valid_pair(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(
        company_name=f"R275b-{_SUFFIX}", user_name="U275b",
        mobile=f"+9190{_SUFFIX}02", email=f"r275b-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    project = _make_project(db, comp)

    r = client.post(
        "/apis/v3/budgeting/boq-documents",
        json={"project_id": str(project.id), "title": "OK BOQ",
              "milestone_done": 3, "milestone_total": 5},
        headers=hdr,
    )
    assert r.status_code == 201, r.text
    assert r.json()["milestone_done"] == 3
    assert r.json()["milestone_total"] == 5


def test_patch_cannot_push_done_past_total(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(
        company_name=f"R275c-{_SUFFIX}", user_name="U275c",
        mobile=f"+9190{_SUFFIX}03", email=f"r275c-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    project = _make_project(db, comp)
    doc = models.BOQDocument(
        id=uuid.uuid4(), project_id=project.id, title="Patch BOQ",
        milestone_done=1, milestone_total=5,
    )
    db.add(doc)
    db.commit()

    r = client.patch(
        f"/apis/v3/budgeting/boq-documents/{doc.id}",
        json={"milestone_done": 6},
        headers=hdr,
    )
    assert r.status_code == 400, r.text

    r2 = client.patch(
        f"/apis/v3/budgeting/boq-documents/{doc.id}",
        json={"title": "Renamed"},
        headers=hdr,
    )
    assert r2.status_code == 200, r2.text
    assert r2.json()["title"] == "Renamed"


def test_pdf_clamps_legacy_pair_on_render(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(
        company_name=f"R275d-{_SUFFIX}", user_name="U275d",
        mobile=f"+9190{_SUFFIX}04", email=f"r275d-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    project = _make_project(db, comp)
    doc = models.BOQDocument(
        id=uuid.uuid4(), project_id=project.id, title="Legacy BOQ",
        milestone_done=99, milestone_total=5,
    )
    db.add(doc)
    db.commit()

    r = client.get(f"/apis/v3/budgeting/boq-documents/{doc.id}/pdf", headers=hdr)
    assert r.status_code == 200, r.text
    assert b"Milestones: 99 / 5" not in r.content
    assert b"Milestones: 5 / 5" in r.content
