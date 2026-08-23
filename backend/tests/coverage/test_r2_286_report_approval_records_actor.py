"""R2-286 part (b) - client-report approval records nothing.

PATCH /reports/{id}/approve used to flip is_approved with no check that the
approver differs from the generator and no record of who approved or when.
Now the creator is refused (403), a distinct authorized approver succeeds,
and generated_by / approved_by / approved_at are stamped and surfaced in the
API responses.
"""
import uuid

from app import models


def _mk_project(db, comp, tag):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=f"P{tag}",
        code=f"PRJ-{uuid.uuid4().hex[:8]}-{tag}", status="Ongoing",
    )
    db.add(p)
    db.commit()
    return p


def _mk_approver(db, comp, auth_headers, name="Approver", email=None):
    """A second company member holding reports:approve."""
    user = models.User(id=uuid.uuid4(), name=name, email=email)
    db.add(user)
    db.flush()
    role = models.CompanyRole(
        company_id=comp.id,
        role_name=f"ReportApprover-{uuid.uuid4().hex[:6]}",
        permissions={"reports:approve": True},
    )
    db.add(role)
    db.flush()
    team = models.CompanyTeam(
        id=uuid.uuid4(), company_id=comp.id, user_id=user.id,
        priority_type="employee", role_id=role.id,
    )
    db.add(team)
    db.commit()
    return user, auth_headers(user, comp)


def _generate(client, hdr, project_id):
    return client.post(
        f"/apis/v3/reports/generate/{project_id}",
        json={"report_name": "Progress Report", "summary_markdown": "On track."},
        headers=hdr,
    )


def _approve(client, hdr, report_id):
    return client.patch(f"/apis/v3/reports/{report_id}/approve", headers=hdr)


def _row(client, hdr, project_id, report_id):
    r = client.get(f"/apis/v3/reports/{project_id}", headers=hdr)
    assert r.status_code == 200
    for row in r.json():
        if row["id"] == str(report_id):
            return row
    return None


def test_generated_by_stamped_at_generate_time(client, db, make_tenant, auth_headers):
    comp, creator, _ = make_tenant(company_name="R286A", user_name="CreatorA")
    hdr_creator = auth_headers(creator, comp)
    project = _mk_project(db, comp, 1)

    r = _generate(client, hdr_creator, project.id)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["generated_by"] == str(creator.id)

    db.expire_all()
    report = db.query(models.ClientReport).filter_by(id=body["id"]).first()
    assert report.generated_by == creator.id
    assert report.is_approved is False
    assert report.approved_by is None
    assert report.approved_at is None


def test_creator_cannot_approve_own_report(client, db, make_tenant, auth_headers):
    comp, creator, _ = make_tenant(company_name="R286B", user_name="CreatorB")
    hdr_creator = auth_headers(creator, comp)
    project = _mk_project(db, comp, 2)

    r = _generate(client, hdr_creator, project.id)
    assert r.status_code == 201
    report_id = r.json()["id"]

    denied = _approve(client, hdr_creator, report_id)
    assert denied.status_code == 403

    # Nothing changed: still unapproved, no approver identity stamped.
    db.expire_all()
    report = db.query(models.ClientReport).filter_by(id=report_id).first()
    assert report.is_approved is False
    assert report.approved_by is None
    assert report.approved_at is None

    row = _row(client, hdr_creator, project.id, report_id)
    assert row is not None
    assert row["is_approved"] is False
    assert row["approved_by"] is None
    assert row["approved_at"] is None


def test_distinct_approver_stamps_identity_and_timestamp(client, db, make_tenant, auth_headers):
    comp, creator, _ = make_tenant(company_name="R286C", user_name="CreatorC")
    hdr_creator = auth_headers(creator, comp)
    approver, hdr_approver = _mk_approver(
        db, comp, auth_headers, name="ApproverC", email="appr-r286c@test.com"
    )
    project = _mk_project(db, comp, 3)

    r = _generate(client, hdr_creator, project.id)
    assert r.status_code == 201
    report_id = r.json()["id"]

    ok = _approve(client, hdr_approver, report_id)
    assert ok.status_code == 200, ok.text
    body = ok.json()
    assert body["is_approved"] is True
    assert body["approved_by"] == str(approver.id)
    assert body["approved_at"] is not None

    # The approval identity survives a plain list fetch by the creator.
    row = _row(client, hdr_creator, project.id, report_id)
    assert row is not None
    assert row["is_approved"] is True
    assert row["approved_by"] == str(approver.id)
    assert row["approved_at"] is not None

    db.expire_all()
    report = db.query(models.ClientReport).filter_by(id=report_id).first()
    assert report.approved_by == approver.id
    assert report.approved_at is not None
