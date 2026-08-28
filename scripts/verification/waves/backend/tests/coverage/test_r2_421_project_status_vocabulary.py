"""R2-421 - every Project.status write path must emit the canonical vocabulary.

The company dashboard tiles bucket only Not Started / Ongoing / On Hold /
Completed (Planning counts as Not Started, Cancelled has its own counter since
R2-084). R2-580 constrained PUT /projects/{id}, but PATCH
/planning/projects/{id} still accepted free text, so a status like "In
Progress" minted a project no tile counts - the exact census loss reported.

Gate: the planning v3 PATCH refuses an off-vocabulary status with 422 while
each canonical value is accepted and persisted; the projects.py PUT path stays
constrained to the same shared pattern.
"""
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]

OFF_VOCAB = "In Progress"
CANONICAL = ("Not Started", "Planning", "Ongoing", "On Hold", "Onhold", "Completed", "Cancelled")


def _mk_project(db, comp, name):
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=name,
        code=f"PRJ-{name}-{_SUFFIX}", status="Ongoing",
    )
    db.add(project)
    db.commit()
    return project


def test_planning_patch_rejects_off_vocab_status(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name=f"R421-{_SUFFIX}", user_name="UR421")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, "P421")

    r = client.patch(f"/apis/v3/planning/projects/{project.id}", json={"status": OFF_VOCAB}, headers=hdr)
    assert r.status_code == 422, r.text

    db.refresh(project)
    assert project.status == "Ongoing", "rejected write must not mutate the row"


def test_planning_patch_accepts_each_canonical_status(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name=f"R421C-{_SUFFIX}", user_name="UR421C")
    hdr = auth_headers(user, comp)

    for i, value in enumerate(CANONICAL):
        project = _mk_project(db, comp, f"P421C{i}")
        r = client.patch(
            f"/apis/v3/planning/projects/{project.id}", json={"status": value}, headers=hdr
        )
        assert r.status_code == 200, r.text
        assert r.json()["status"] == value
        db.refresh(project)
        assert project.status == value


def test_projects_put_still_enforces_shared_pattern(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name=f"R421P-{_SUFFIX}", user_name="UR421P")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, "P421P")

    r_bad = client.put(f"/apis/v3/projects/{project.id}", json={"status": OFF_VOCAB}, headers=hdr)
    assert r_bad.status_code == 422, r_bad.text

    r_ok = client.put(f"/apis/v3/projects/{project.id}", json={"status": "On Hold"}, headers=hdr)
    assert r_ok.status_code == 200, r_ok.text
    assert r_ok.json()["status"] == "On Hold"

    from app.constants import PROJECT_STATUS_PATTERN
    from app.routers.projects import ProjectUpdate
    from app.routers.planning import ProjectUpdateSchema

    assert ProjectUpdate.model_fields["status"].metadata[0].pattern == PROJECT_STATUS_PATTERN
    assert ProjectUpdateSchema.model_fields["status"].metadata[0].pattern == PROJECT_STATUS_PATTERN, (
        "both write paths must share the canonical vocabulary - drift here recreates the finding"
    )
