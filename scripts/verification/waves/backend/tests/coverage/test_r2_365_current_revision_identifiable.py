"""R2-365: a drawing must always identify its current revision.

Before the fix, approving V1 and then V2 left two approved revisions with no
field, flag or ordering to tell them apart, and the list endpoint returned
revisions in undefined physical row order. Now:

  * approving a revision stamps superseded_at on every other approved
    revision of the same drawing in the same transaction, so exactly one
    approved revision (the most recently approved) has superseded_at NULL,
  * re-approving an older revision makes it current again and supersedes the
    newer one, while the append-only decision ledger still records both,
  * the list endpoint returns revisions ordered created_at DESC regardless of
    physical insertion order, pins ordered created_at ASC, and exposes
    superseded_at so consumers can tell current from superseded.
"""
import uuid
from datetime import datetime, timedelta

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _mob(tag: int) -> str:
    return f"+9188{_SUFFIX}{tag:02d}"


def _mail(tag: int) -> str:
    return f"r2-365-{tag}-{_SUFFIX}@test.com"


def _mk_project(db, comp):
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="Proj", code="PRJ-365", status="Ongoing"
    )
    db.add(project)
    db.commit()
    return project


def test_approval_supersedes_siblings_and_list_orders(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R365", user_name="UR365", mobile=_mob(1), email=_mail(1))
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    drawing = models.Drawing(id=uuid.uuid4(), project_id=project.id, name="GA Plan", category="2D Layout")
    db.add(drawing)
    db.commit()

    base = datetime(2026, 1, 1, 9, 0, 0)
    # Insert newest first so physical row order disagrees with created_at order.
    v3 = models.DrawingRevision(
        id=uuid.uuid4(), drawing_id=drawing.id, version_code="V3",
        file_url="/plans/ga_v3.pdf", approval_status="pending",
        created_at=base + timedelta(days=20),
    )
    db.add(v3)
    db.commit()
    v1 = models.DrawingRevision(
        id=uuid.uuid4(), drawing_id=drawing.id, version_code="V1",
        file_url="/plans/ga_v1.pdf", approval_status="pending",
        created_at=base,
    )
    v2 = models.DrawingRevision(
        id=uuid.uuid4(), drawing_id=drawing.id, version_code="V2",
        file_url="/plans/ga_v2.pdf", approval_status="pending",
        created_at=base + timedelta(days=10),
    )
    db.add(v1)
    db.add(v2)
    db.commit()
    db.expire_all()

    # Approve V1, then V2: the drawing now has one current sheet.
    r = client.post(
        f"/apis/v3/drawings/revisions/{v1.id}/approve",
        json={"approval_status": "approved"},
        headers=hdr,
    )
    assert r.status_code == 200, r.text
    assert r.json()["superseded_at"] is None
    r = client.post(
        f"/apis/v3/drawings/revisions/{v2.id}/approve",
        json={"approval_status": "approved"},
        headers=hdr,
    )
    assert r.status_code == 200, r.text
    assert r.json()["superseded_at"] is None

    db.expire_all()
    rows = {
        x.version_code: x
        for x in db.query(models.DrawingRevision).filter(models.DrawingRevision.drawing_id == drawing.id).all()
    }
    # Approval stays terminal: V1 is not un-approved, it is superseded.
    assert rows["V1"].approval_status == "approved"
    assert rows["V1"].superseded_at is not None
    current = (
        db.query(models.DrawingRevision)
        .filter(
            models.DrawingRevision.drawing_id == drawing.id,
            models.DrawingRevision.approval_status == "approved",
            models.DrawingRevision.superseded_at.is_(None),
        )
        .all()
    )
    assert [c.version_code for c in current] == ["V2"]
    assert rows["V3"].superseded_at is None  # never approved: not current, not superseded

    # List endpoint: defined newest-first order despite physical insert order,
    # and superseded_at exposed per revision.
    lst = client.get(f"/apis/v3/drawings?project_id={project.id}", headers=hdr)
    assert lst.status_code == 200, lst.text
    payload = next(x for x in lst.json() if x["id"] == str(drawing.id))
    assert [rv["version_code"] for rv in payload["revisions"]] == ["V3", "V2", "V1"]
    sup = {rv["version_code"]: rv["superseded_at"] for rv in payload["revisions"]}
    assert sup["V1"] is not None
    assert sup["V2"] is None
    assert sup["V3"] is None

    # Re-affirming V1 makes it current again; that decision supersedes V2.
    r = client.post(
        f"/apis/v3/drawings/revisions/{v1.id}/approve",
        json={"approval_status": "approved"},
        headers=hdr,
    )
    assert r.status_code == 200, r.text
    db.expire_all()
    rows = {
        x.version_code: x
        for x in db.query(models.DrawingRevision).filter(models.DrawingRevision.drawing_id == drawing.id).all()
    }
    assert rows["V1"].superseded_at is None
    assert rows["V2"].superseded_at is not None
    trail = (
        db.query(models.DrawingRevisionApproval)
        .filter(models.DrawingRevisionApproval.revision_id == v1.id)
        .order_by(models.DrawingRevisionApproval.created_at)
        .all()
    )
    assert len(trail) == 2 and all(t.decided_by == team.id for t in trail)


def test_pending_revision_supersedes_nothing_and_pins_order(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R365b", user_name="UR365b", mobile=_mob(2), email=_mail(2))
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    drawing = models.Drawing(id=uuid.uuid4(), project_id=project.id, name="Sections", category="2D Layout")
    db.add(drawing)
    db.commit()
    rev = models.DrawingRevision(
        id=uuid.uuid4(), drawing_id=drawing.id, version_code="V1",
        file_url="/plans/sec_v1.pdf", approval_status="pending",
    )
    db.add(rev)
    db.commit()

    # Approving the only revision leaves nothing stamped.
    r = client.post(
        f"/apis/v3/drawings/revisions/{rev.id}/approve",
        json={"approval_status": "approved"},
        headers=hdr,
    )
    assert r.status_code == 200, r.text

    # Uploading V2 stays pending: an unapproved upload must not dethrone V1.
    r = client.post(
        f"/apis/v3/drawings/{drawing.id}/revisions",
        json={"version_code": "V2", "file_url": "/plans/sec_v2.pdf", "comments": "rfi fixes"},
        headers=hdr,
    )
    assert r.status_code == 200, r.text
    db.expire_all()
    rows = {
        x.version_code: x
        for x in db.query(models.DrawingRevision).filter(models.DrawingRevision.drawing_id == drawing.id).all()
    }
    assert rows["V1"].superseded_at is None
    assert rows["V2"].approval_status == "pending"

    # Pins come back oldest-first so pin numbering reads chronologically.
    for i in range(3):
        p = models.DrawingPin(
            id=uuid.uuid4(), revision_id=rev.id, x_coordinate=i, y_coordinate=i,
            comment=f"pin {i}", created_by=team.id,
        )
        db.add(p)
    db.commit()
    lst = client.get(f"/apis/v3/drawings?project_id={project.id}", headers=hdr)
    assert lst.status_code == 200, lst.text
    payload = next(x for x in lst.json() if x["id"] == str(drawing.id))
    v1_payload = next(rv for rv in payload["revisions"] if rv["version_code"] == "V1")
    comments = [p["comment"] for p in v1_payload["pins"]]
    assert comments == sorted(comments), comments
