"""R2-408 - the DPR author of record is derived server-side.

DailyProgressReport.reported_by stored whatever free text the caller sent, so
the export printed a raw UUID on console rows and an arbitrary unvalidated
string otherwise; neither could establish who reported what. The create path
now derives the author from the authenticated user (same house pattern as
R2-206's wastage reported_by), and the CSV export keeps resolving any legacy
UUID rows to the user's name.
"""
import datetime
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


def _mk_dpr(client, project, hdr, spoofed_author):
    return client.post(
        "/apis/v3/dpr",
        json={
            "project_id": str(project.id),
            "reported_by": spoofed_author,
            "dpr_date": datetime.datetime.now().isoformat(),
            "executed_qty": 1.0,
            "workers_deployed": 3,
            "materials_consumed": [],
        },
        headers=hdr,
    )


def test_dpr_author_ignores_client_free_text(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R2408A", user_name="R2-408 Real Author")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, "408")

    r = _mk_dpr(client, project, hdr, "ZZ Spoofed Site Engineer")
    assert r.status_code == 201, r.text
    assert r.json()["reported_by"] == "R2-408 Real Author", r.text

    db.expire_all()
    row = db.query(models.DailyProgressReport).filter_by(project_id=project.id).first()
    assert row.reported_by == "R2-408 Real Author"


def test_dpr_export_prints_resolved_author_never_spoofed_text(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R2408B", user_name="R2-408 Export Author")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, "408b")

    r = _mk_dpr(client, project, hdr, "ZZ Another Spoof")
    assert r.status_code == 201, r.text

    e = client.get(f"/apis/v3/dpr/export?project_id={project.id}", headers=hdr)
    assert e.status_code == 200, e.text
    csv_text = e.text
    assert "R2-408 Export Author" in csv_text, csv_text
    assert "ZZ Another Spoof" not in csv_text, csv_text


def test_dpr_export_still_resolves_legacy_uuid_authors(client, db, make_tenant, auth_headers):
    """Legacy rows created before the fix carry a User UUID in reported_by."""
    comp, user, _ = make_tenant(company_name="R2408C", user_name="R2-408 Legacy Author")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, "408c")

    db.add(models.DailyProgressReport(
        id=uuid.uuid4(), project_id=project.id, reported_by=str(user.id),
        dpr_date=datetime.datetime(2026, 8, 1), weather="Clear",
        executed_qty=2.0, workers_deployed=1, materials_consumed=[],
        status="submitted",
    ))
    db.commit()

    e = client.get(f"/apis/v3/dpr/export?project_id={project.id}", headers=hdr)
    assert e.status_code == 200, e.text
    assert "R2-408 Legacy Author" in e.text, e.text
