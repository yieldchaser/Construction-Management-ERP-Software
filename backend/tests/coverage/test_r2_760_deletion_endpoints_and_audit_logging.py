"""Finding R2-760: Operational record deletion/void endpoints routed through delete_logs.log_deletion(..., deleted_by=...).

Clauses:
1. Operational routers (dpr, quality, safety, wastage, equipment, assets, custom_fields, subcon, rfq, three_way, labour, production) provide DELETE endpoints.
2. All deletions record an audit log in delete_logs with deleted_by set to authenticated user.
3. Inventory reversal and cascade relationships are handled properly on deletion.
4. Guards (active deployment on equipment, missing records 404) are respected.
"""
import uuid
from datetime import datetime, timezone
import pytest

from app import models
from app.models import DeleteLog


def _tenant(make_tenant, auth_headers):
    sfx = uuid.uuid4().hex[:8]
    comp, user, team = make_tenant(
        company_name=f"DelLog-{sfx}", user_name=f"UDelLog-{sfx}",
        mobile=f"+9194{sfx}", email=f"dellog-{sfx}@test.com",
    )
    return comp, user, team, auth_headers(user, comp)


def test_r2_760_dpr_delete_with_audit_log(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)

    proj = models.Project(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="DPR Proj",
        status="in_progress",
    )
    db.add(proj)
    db.flush()

    dpr = models.DailyProgressReport(
        id=uuid.uuid4(),
        project_id=proj.id,
        reported_by=user.name,
        dpr_date=datetime.now(timezone.utc),
        weather="Sunny",
        executed_qty=10.0,
        status="submitted",
    )
    db.add(dpr)
    db.commit()

    res = client.delete(f"/apis/v3/dpr/{dpr.id}", headers=hdr)
    assert res.status_code == 204, f"Expected 204, got {res.status_code}: {res.text}"

    # Verify deleted
    assert db.query(models.DailyProgressReport).filter_by(id=dpr.id).first() is None

    # Verify audit log created with deleted_by
    log = db.query(DeleteLog).filter_by(entity_type="dpr", entity_id=str(dpr.id)).first()
    assert log is not None, "Expected DeleteLog entry for DPR"
    assert log.deleted_by == user.name
    assert log.company_id == comp.id


def test_r2_760_quality_ncr_and_inspection_delete(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)

    proj = models.Project(id=uuid.uuid4(), company_id=comp.id, name="Quality Proj", status="in_progress")
    db.add(proj)
    db.flush()

    # 1. NCR Delete
    ncr = models.NCR(
        id=uuid.uuid4(),
        project_id=proj.id,
        ncr_number="NCR-001",
        title="Rebar Defect",
        description="Rebar defect",
        severity="Major",
        status="open",
    )
    db.add(ncr)
    db.commit()

    res = client.delete(f"/apis/v3/quality/ncr/{ncr.id}", headers=hdr)
    assert res.status_code == 204, f"Expected 204, got {res.status_code}: {res.text}"
    assert db.query(models.NCR).filter_by(id=ncr.id).first() is None
    log_ncr = db.query(DeleteLog).filter_by(entity_type="ncr", entity_id=str(ncr.id)).first()
    assert log_ncr is not None
    assert log_ncr.deleted_by == user.name

    # 2. Site Inspection Delete
    cl = models.QualityChecklist(
        id=uuid.uuid4(),
        company_id=comp.id,
        title="Checklist 1",
    )
    db.add(cl)
    db.flush()

    insp = models.SiteInspection(
        id=uuid.uuid4(),
        project_id=proj.id,
        checklist_id=cl.id,
        inspection_date=datetime.now(timezone.utc),
        status="in_progress",
        zone="Grid A-3",
    )
    db.add(insp)
    db.commit()

    res = client.delete(f"/apis/v3/quality/inspections/{insp.id}", headers=hdr)
    assert res.status_code == 204, f"Expected 204, got {res.status_code}: {res.text}"
    assert db.query(models.SiteInspection).filter_by(id=insp.id).first() is None
    log_insp = db.query(DeleteLog).filter_by(entity_type="site_inspection", entity_id=str(insp.id)).first()
    assert log_insp is not None
    assert log_insp.deleted_by == user.name


def test_r2_760_safety_incident_delete(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)

    proj = models.Project(id=uuid.uuid4(), company_id=comp.id, name="Safety Proj", status="in_progress")
    db.add(proj)
    db.flush()

    inc = models.SafetyIncident(
        id=uuid.uuid4(),
        project_id=proj.id,
        incident_type="Near Miss",
        severity="Low",
        description="Trip hazard identified and cleared",
        reported_by=user.name,
        reported_at=datetime.now(timezone.utc),
    )
    db.add(inc)
    db.commit()

    res = client.delete(f"/apis/v3/safety/incidents/{inc.id}", headers=hdr)
    assert res.status_code == 204, f"Expected 204, got {res.status_code}: {res.text}"
    assert db.query(models.SafetyIncident).filter_by(id=inc.id).first() is None
    log = db.query(DeleteLog).filter_by(entity_type="safety_incident", entity_id=str(inc.id)).first()
    assert log is not None
    assert log.deleted_by == user.name


def test_r2_760_wastage_delete(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)

    proj = models.Project(id=uuid.uuid4(), company_id=comp.id, name="Wastage Proj", status="in_progress")
    db.add(proj)
    db.flush()

    w = models.MaterialWastage(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=proj.id,
        material_name="Cement",
        wastage_type="damage",
        quantity=5.0,
        unit="Bags",
        estimated_value=1750.0,
        status="pending",
    )
    db.add(w)
    db.commit()

    res = client.delete(f"/apis/v3/wastage/{w.id}", headers=hdr)
    assert res.status_code == 204, f"Expected 204, got {res.status_code}: {res.text}"
    assert db.query(models.MaterialWastage).filter_by(id=w.id).first() is None
    log = db.query(DeleteLog).filter_by(entity_type="material_wastage", entity_id=str(w.id)).first()
    assert log is not None
    assert log.deleted_by == user.name


def test_r2_760_equipment_delete_with_guard(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)

    proj = models.Project(id=uuid.uuid4(), company_id=comp.id, name="Eq Proj", status="in_progress")
    db.add(proj)
    db.flush()

    eq = models.Equipment(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="Excavator 300",
        code=f"EX-{uuid.uuid4().hex[:4]}",
        category="Heavy",
        ownership_type="Owned",
        status="available",
        hourly_rate=1500.0,
    )
    db.add(eq)
    db.commit()

    # Active deployment blocks delete
    dep = models.EquipmentDeployment(
        id=uuid.uuid4(),
        equipment_id=eq.id,
        project_id=proj.id,
        start_date=datetime.now(timezone.utc),
        end_date=None,
    )
    db.add(dep)
    db.commit()

    res = client.delete(f"/apis/v3/equipment/{eq.id}", headers=hdr)
    assert res.status_code == 409, f"Expected 409 conflict, got {res.status_code}"

    # Delete deployment first
    res_dep = client.delete(f"/apis/v3/equipment/deployments/{dep.id}", headers=hdr)
    assert res_dep.status_code == 204
    log_dep = db.query(DeleteLog).filter_by(entity_type="equipment_deployment", entity_id=str(dep.id)).first()
    assert log_dep is not None
    assert log_dep.deleted_by == user.name

    # Now equipment delete succeeds
    res_eq = client.delete(f"/apis/v3/equipment/{eq.id}", headers=hdr)
    assert res_eq.status_code == 204
    log_eq = db.query(DeleteLog).filter_by(entity_type="equipment", entity_id=str(eq.id)).first()
    assert log_eq is not None
    assert log_eq.deleted_by == user.name


def test_r2_760_custom_field_delete(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)

    cf = models.CustomField(
        id=uuid.uuid4(),
        company_id=comp.id,
        entity_type="project",
        field_name="site_safety_rating",
        field_label="Safety Rating",
        field_type="text",
        is_required=False,
    )
    db.add(cf)
    db.commit()

    res = client.delete(f"/apis/v3/custom-fields/{cf.id}", headers=hdr)
    assert res.status_code == 204, f"Expected 204, got {res.status_code}: {res.text}"
    assert db.query(models.CustomField).filter_by(id=cf.id).first() is None
    log = db.query(DeleteLog).filter_by(entity_type="custom_field", entity_id=str(cf.id)).first()
    assert log is not None
    assert log.deleted_by == user.name
