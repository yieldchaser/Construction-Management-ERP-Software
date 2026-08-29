"""R2-152 — GET /budget/committed/{project_id} must not write to the database.

Gate: the GET handler used to construct, add and commit a ProjectBudget row
when none existed, making a read endpoint non-idempotent and letting anyone
with project view access create budget rows without budgeting:edit. After the
fix a missing row is reported as zeros in memory and nothing is persisted.
"""
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def test_budget_committed_get_does_not_persist_missing_budget_row(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(
        company_name=f"R152-{_SUFFIX}", user_name="U152",
        mobile=f"+9190{_SUFFIX}01", email=f"r152-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=f"P152-{_SUFFIX}",
        code=f"PRJ-{_SUFFIX}", status="Ongoing",
    )
    db.add(project)
    db.commit()

    r = client.get(f"/apis/v3/budget/committed/{project.id}", headers=hdr)
    assert r.status_code == 200, r.text
    body = r.json()

    # Missing budgets are reported as zeros, not materialised.
    assert body["material_budget"] == 0.0, body
    assert body["labour_budget"] == 0.0, body
    assert body["subcon_budget"] == 0.0, body
    assert body["equipment_budget"] == 0.0, body
    assert body["total_budget"] == 0.0, body

    # The read left no ProjectBudget row behind and stays repeatable.
    assert db.query(models.ProjectBudget).filter(
        models.ProjectBudget.project_id == project.id
    ).first() is None
    r2 = client.get(f"/apis/v3/budget/committed/{project.id}", headers=hdr)
    assert r2.status_code == 200, r2.text
