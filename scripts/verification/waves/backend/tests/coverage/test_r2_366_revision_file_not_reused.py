"""R2-366: a new revision cannot reuse a file_url already stored on the drawing.

R2-466 landed the scheme/host allowlist for file_url; the residual R2-366 defect
is the copy across revisions - nothing compared a new revision's file against
the drawing's other revisions, so "V2" could point at V1's file and claim a
change that does not exist. The endpoint now rejects that with a 400 naming the
revision that already owns the file, while genuinely new files still pass.
"""
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _mob(tag: int) -> str:
    return f"+9188{_SUFFIX}{tag:02d}"


def _mail(tag: int) -> str:
    return f"r2-366-{tag}-{_SUFFIX}@test.com"


def _mk_project(db, comp):
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="Proj", code="PRJ-366", status="Ongoing"
    )
    db.add(project)
    db.commit()
    return project


def test_revision_cannot_reuse_another_revisions_file(client, db, make_tenant, auth_headers):
    comp, user, _team = make_tenant(company_name="R366", user_name="UR366", mobile=_mob(1), email=_mail(1))
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    r = client.post(
        "/apis/v3/drawings",
        json={
            "project_id": str(project.id),
            "name": "Ground Floor Plan",
            "category": "2D Layout",
            "file_url": "/images/drawings/gf_v1.pdf",
        },
        headers=hdr,
    )
    assert r.status_code == 200, r.text
    drawing_id = r.json()["id"]

    # V2 re-pointing at V1's sheet is refused, naming the owning revision.
    r = client.post(
        f"/apis/v3/drawings/{drawing_id}/revisions",
        json={"version_code": "V2", "file_url": "/images/drawings/gf_v1.pdf"},
        headers=hdr,
    )
    assert r.status_code == 400, r.text
    assert "already points at revision 'V1' of this drawing" in r.json()["detail"]
    assert not any(
        rev["version_code"] == "V2"
        for rev in client.get(f"/apis/v3/drawings?project_id={project.id}", headers=hdr).json()[0]["revisions"]
    )

    # A revision with its own file is still accepted.
    r = client.post(
        f"/apis/v3/drawings/{drawing_id}/revisions",
        json={"version_code": "V2", "file_url": "/images/drawings/gf_v2.pdf"},
        headers=hdr,
    )
    assert r.status_code == 200, r.text
    assert r.json()["file_url"] == "/images/drawings/gf_v2.pdf"

    # The same file cannot be claimed twice within the new generation either.
    r = client.post(
        f"/apis/v3/drawings/{drawing_id}/revisions",
        json={"version_code": "V3", "file_url": "/images/drawings/gf_v2.pdf"},
        headers=hdr,
    )
    assert r.status_code == 400, r.text
