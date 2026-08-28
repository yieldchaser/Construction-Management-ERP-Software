"""R2-556 - a reference to a row that does not exist must be resolved by the application.

The application performed no existence check on client-supplied references,
so the database's foreign-key constraint was the only validator and callers
got a server fault (or a misleading error) instead of a 404 naming the
missing entity. The equipment router already resolved equipment/project
references this way; the one gap was POST /equipment's company_id, which
surfaced an unknown company as "User is not a member of the requested
company" 403 - unactionable, and indistinguishable from a tenancy bug.

Gate: every write-path reference on the equipment router resolves before use
and 404s with the entity's name.
"""
import uuid


def test_r2_556_equipment_refs_resolve_with_named_404s(client, db, make_tenant, auth_headers):
    comp, user, _team = make_tenant(
        company_name="R2556", user_name="U556",
        mobile="+9192556001", email="r556@test.com",
    )
    hdr = auth_headers(user, comp)
    ghost = uuid.UUID("00000000-0000-0000-0000-0000000000ff")

    # Unknown company on the fleet-creation path: named 404, not a membership 403.
    r = client.post(
        "/apis/v3/equipment",
        headers=hdr,
        json={
            "company_id": str(ghost),
            "name": "Ghost Co Excavator",
            "code": "EQ-556-GHOST",
            "category": "Excavator",
            "ownership_type": "Owned",
            "hourly_rate": 100.0,
        },
    )
    assert r.status_code == 404, r.text
    assert r.json()["detail"] == "Company not found", r.text

    # Real company, then the remaining write paths keep naming their entities.
    r = client.post(
        "/apis/v3/equipment",
        headers=hdr,
        json={
            "company_id": str(comp.id),
            "name": "R2-556 Crane",
            "code": "EQ-556-CRN",
            "category": "Crane",
            "ownership_type": "Owned",
            "hourly_rate": 500.0,
        },
    )
    assert r.status_code == 201, r.text
    eq_id = r.json()["id"]

    r = client.post(
        f"/apis/v3/equipment/{eq_id}/deploy",
        headers=hdr,
        json={"project_id": str(ghost), "start_date": "2026-08-20T08:00:00Z"},
    )
    assert r.status_code == 404, r.text
    assert r.json()["detail"] == "Project not found", r.text

    r = client.post(
        f"/apis/v3/equipment/{eq_id}/fuel",
        headers=hdr,
        json={
            "project_id": str(ghost),
            "logged_date": "2026-08-22T10:00:00Z",
            "liters": 10.0,
            "cost_per_liter": 90.0,
        },
    )
    assert r.status_code == 404, r.text
    assert r.json()["detail"] == "Project not found", r.text

    r = client.post(
        f"/apis/v3/equipment/{ghost}/maintenance",
        headers=hdr,
        json={"service_type": "Oil change", "scheduled_date": "2026-08-22T10:00:00Z"},
    )
    assert r.status_code == 404, r.text
    assert r.json()["detail"] == "Equipment not found", r.text

    # Nothing was written behind any of the refused references.
    from app import models
    assert db.query(models.EquipmentDeployment).filter(models.EquipmentDeployment.project_id == ghost).count() == 0
    assert db.query(models.FuelLog).filter(models.FuelLog.project_id == ghost).count() == 0
    assert db.query(models.MaintenanceSchedule).filter(models.MaintenanceSchedule.equipment_id == ghost).count() == 0
