"""R2-245 - wastage value must reach the financial reports.

The stock and ledger halves of this finding were closed by R2-330/R2-206
(gated, decremented, server-derived). The remaining half: a recorded
MaterialWastage row carried an estimated_value that no financial consumer
read - GET /budget/committed/{project_id} kept material_actual at bill-only
spend and GET /finance/pl kept Material Cost at bill-only spend.

Gate: one wastage record with estimated_value 25000 (no bills at all) ->
Budget material_actual == 25000 and total_actual == 25000, P&L
"Material Cost" actual == 25000. A project with zero wastage is unchanged.
"""
import uuid
from decimal import Decimal

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _mob(tag: int) -> str:
    return f"+9199{_SUFFIX}{tag:03d}"


def _mail(tag: int) -> str:
    return f"r245-{tag}-{_SUFFIX}@test.com"


def _mk_project(db, comp, name):
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=name, code=f"PRJ-{name}-{_SUFFIX}", status="Ongoing"
    )
    db.add(project)
    db.commit()
    return project


def _seed_inventory(db, project, material, qty):
    db.add(models.WarehouseInventory(
        id=uuid.uuid4(), project_id=project.id, material_name=material,
        on_hand_qty=Decimal(str(qty)), reserved_qty=Decimal("0"), unit="bags"))
    db.commit()


def _wastage_payload(comp, project, qty, value):
    return {
        "company_id": str(comp.id), "project_id": str(project.id),
        "material_name": "Cement", "wastage_type": "damaged",
        "quantity": qty, "unit": "bags",
        "estimated_value": value, "estimated_value_override": True,
    }


def test_wastage_value_reaches_budget_and_pl(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name=f"R245-{_SUFFIX}", user_name="UR245", mobile=_mob(1), email=_mail(1))
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, "P245")
    _seed_inventory(db, project, "Cement", 10)

    r = client.post("/apis/v3/wastage", json=_wastage_payload(comp, project, 4, 25000), headers=hdr)
    assert r.status_code == 201, r.text
    assert r.json()["estimated_value"] == 25000.0

    rb = client.get(f"/apis/v3/budget/committed/{project.id}", headers=hdr)
    assert rb.status_code == 200, rb.text
    assert rb.json()["material_actual"] == 25000.0, rb.text
    assert rb.json()["total_actual"] == 25000.0, rb.text

    rp = client.get(f"/apis/v3/finance/pl?project_id={project.id}", headers=hdr)
    assert rp.status_code == 200, rp.text
    pl = {row["head"]: row for row in rp.json()}
    assert pl["Material Cost"]["actual"] == 25000.0, pl


def test_zero_wastage_budget_and_pl_unchanged(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name=f"R245Z-{_SUFFIX}", user_name="UR245Z", mobile=_mob(2), email=_mail(2))
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, "P245Z")

    rb = client.get(f"/apis/v3/budget/committed/{project.id}", headers=hdr)
    assert rb.status_code == 200, rb.text
    assert rb.json()["material_actual"] == 0.0, rb.text

    rp = client.get(f"/apis/v3/finance/pl?project_id={project.id}", headers=hdr)
    assert rp.status_code == 200, rp.text
    pl = {row["head"]: row for row in rp.json()}
    assert pl["Material Cost"]["actual"] == 0.0, pl
