"""R2-259: a drawing revision's approval is append-only and terminal.

Before the fix the approve endpoint let anyone flip approved -> rejected ->
pending indefinitely, and each flip erased `approved_by` (set back to null), so
there was no record that the sheet was ever approved or by whom. Now:

  * an already-approved revision refuses any change with 409 (superseding
    requires uploading a new revision, which is what version codes are for),
  * every decision writes an immutable drawing_revision_approvals ledger row
    stamped with the authenticated caller (membership.id) and a timestamp.
"""
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _mob(tag: int) -> str:
    return f"+9188{_SUFFIX}{tag:02d}"


def _mail(tag: int) -> str:
    return f"r2-259-{tag}-{_SUFFIX}@test.com"


def _mk_project(db, comp):
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="Proj", code="PRJ-259", status="Ongoing"
    )
    db.add(project)
    db.commit()
    return project


def test_approved_revision_is_terminal_and_decisions_are_ledgered(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R259", user_name="UR259", mobile=_mob(1), email=_mail(1))
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    drawing = models.Drawing(id=uuid.uuid4(), project_id=project.id, name="GA Plan", category="2D Layout")
    db.add(drawing)
    db.commit()
    revision = models.DrawingRevision(
        id=uuid.uuid4(), drawing_id=drawing.id, version_code="V1",
        file_url="/plans/ga_v1.pdf", approval_status="pending",
    )
    db.add(revision)
    db.commit()

    # First decision approves; the actor is derived from the authenticated caller.
    r = client.post(
        f"/apis/v3/drawings/revisions/{revision.id}/approve",
        json={"approval_status": "approved"},
        headers=hdr,
    )
    assert r.status_code == 200, r.text
    assert r.json()["approval_status"] == "approved"
    assert r.json()["approved_by"] == str(team.id)

    rows = (
        db.query(models.DrawingRevisionApproval)
        .filter(models.DrawingRevisionApproval.revision_id == revision.id)
        .all()
    )
    assert len(rows) == 1, rows
    assert rows[0].decision == "approved"
    assert rows[0].decided_by == team.id
    assert rows[0].created_at is not None

    # The flip that used to erase the approval is now refused in both directions.
    for flip in ("rejected", "pending"):
        r = client.post(
            f"/apis/v3/drawings/revisions/{revision.id}/approve",
            json={"approval_status": flip},
            headers=hdr,
        )
        assert r.status_code == 409, (flip, r.status_code, r.text)

    # Nothing was mutated and no extra ledger rows were written by the flips.
    db.expire_all()
    still = db.query(models.DrawingRevision).filter(models.DrawingRevision.id == revision.id).first()
    assert still.approval_status == "approved"
    assert still.approved_by == team.id
    assert (
        db.query(models.DrawingRevisionApproval)
        .filter(models.DrawingRevisionApproval.revision_id == revision.id)
        .count()
        == 1
    )

    # Pre-approval decisions stay correctable: pending -> rejected -> pending all ledger.
    revision2 = models.DrawingRevision(
        id=uuid.uuid4(), drawing_id=drawing.id, version_code="V2",
        file_url="/plans/ga_v2.pdf", approval_status="pending",
    )
    db.add(revision2)
    db.commit()
    for decision in ("rejected", "pending"):
        r = client.post(
            f"/apis/v3/drawings/revisions/{revision2.id}/approve",
            json={"approval_status": decision},
            headers=hdr,
        )
        assert r.status_code == 200, (decision, r.text)
    trail = (
        db.query(models.DrawingRevisionApproval)
        .filter(models.DrawingRevisionApproval.revision_id == revision2.id)
        .order_by(models.DrawingRevisionApproval.created_at)
        .all()
    )
    assert [t.decision for t in trail] == ["rejected", "pending"]
    assert all(t.decided_by == team.id for t in trail)
