"""R2-330 - recording material wastage must actually move stock.

create_wastage used to write the MaterialWastage row alone: WarehouseInventory
was never decremented, no MaterialTransaction reached the stock ledger, and a
project holding 10 bags could report 10,000 bags wasted because wasted-vs-
available was never compared. Wastage now gates on available stock (so a
material the project never received cannot be wasted either), decrements the
warehouse row, and logs a type="used" transaction referencing the wastage
record, exactly like production batches do.
"""
import uuid
from decimal import Decimal

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _mob(tag: int) -> str:
    return f"+9199{_SUFFIX}{tag:03d}"


def _mail(tag: int) -> str:
    return f"r330-{tag}-{_SUFFIX}@test.com"


def _mk_project(db, comp):
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="Proj", code="PRJ-R330", status="Ongoing"
    )
    db.add(project)
    db.commit()
    return project


def _wastage_payload(comp, project, qty, material="Cement"):
    return {
        "company_id": str(comp.id), "project_id": str(project.id),
        "material_name": material, "wastage_type": "damaged",
        "quantity": qty, "unit": "bags",
    }


def test_wastage_decrements_stock_writes_ledger_and_rejects_overdraw(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name=f"R330-{_SUFFIX}", user_name="UR330", mobile=_mob(1), email=_mail(1))
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    db.add(models.WarehouseInventory(
        id=uuid.uuid4(), project_id=project.id, material_name="Cement",
        on_hand_qty=Decimal("10"), reserved_qty=Decimal("0"), unit="bags"))
    db.commit()

    r = client.post("/apis/v3/wastage", json=_wastage_payload(comp, project, 4), headers=hdr)
    assert r.status_code == 201, r.text

    inv = db.query(models.WarehouseInventory).filter(
        models.WarehouseInventory.project_id == project.id,
        models.WarehouseInventory.material_name == "Cement",
    ).first()
    assert float(inv.on_hand_qty) == 6.0

    txn = db.query(models.MaterialTransaction).filter(
        models.MaterialTransaction.source_ref_id == uuid.UUID(r.json()["id"]),
    ).one()
    assert txn.type == "used"
    assert float(txn.qty) == 4.0
    assert txn.material_name == "Cement"
    assert str(txn.project_id) == r.json()["project_id"]

    over = client.post("/apis/v3/wastage", json=_wastage_payload(comp, project, 100), headers=hdr)
    assert over.status_code == 400, over.text
    assert "insufficient stock" in over.json()["detail"]

    ghost = client.post(
        "/apis/v3/wastage",
        json=_wastage_payload(comp, project, 1, material="NeverReceived"),
        headers=hdr,
    )
    assert ghost.status_code == 400, ghost.text
