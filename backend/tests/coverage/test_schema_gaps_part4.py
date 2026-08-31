import uuid
import datetime
import pytest
from app import models


def test_schema_gaps_all_five_fields(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="Schema Gaps Co", user_name="Schema User")
    hdr = auth_headers(user, comp)

    proj = models.Project(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="Schema Gaps Project",
        code=f"PRJ-{uuid.uuid4().hex[:4].upper()}",
        status="active",
    )
    db.add(proj)
    db.commit()

    team_member = db.query(models.CompanyTeam).filter_by(company_id=comp.id, user_id=user.id).first()

    # 1. requested_by on IndentCreateRequest
    indent_res = client.post(
        "/apis/v3/procurement/indents",
        json={
            "company_id": str(comp.id),
            "project_id": str(proj.id),
            "indent_number": f"IND-{uuid.uuid4().hex[:4].upper()}",
            "requested_by": str(team_member.id),
            "items": [{"material_name": "Cement OPC", "quantity": 50.0, "unit": "bags"}],
        },
        headers=hdr,
    )
    assert indent_res.status_code == 201, indent_res.text
    indent_data = indent_res.json()
    assert indent_data["requested_by"] == str(team_member.id)

    # 2. received_by on GRNCreateRequest
    # Create PO first to receive against
    po_res = client.post(
        "/apis/v3/procurement/pos",
        json={
            "company_id": str(comp.id),
            "project_id": str(proj.id),
            "po_number": f"PO-{uuid.uuid4().hex[:4].upper()}",
            "po_date": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "items": [{"material_name": "Cement OPC", "quantity": 50.0, "unit": "bags", "rate": 350.0}],
        },
        headers=hdr,
    )
    assert po_res.status_code == 201, po_res.text
    po_data = po_res.json()
    po_item_id = po_data["items"][0]["id"]

    po_db = db.query(models.PurchaseOrder).filter_by(id=uuid.UUID(po_data["id"])).first()
    po_db.approval_flag = "approved"
    po_db.status = "approved"
    db.commit()

    grn_res = client.post(
        "/apis/v3/procurement/grns",
        json={
            "company_id": str(comp.id),
            "project_id": str(proj.id),
            "po_id": po_data["id"],
            "grn_number": f"GRN-{uuid.uuid4().hex[:4].upper()}",
            "received_date": datetime.datetime.now(datetime.timezone.utc).date().isoformat(),
            "received_by": str(team_member.id),
            "items": [{"po_item_id": po_item_id, "received_qty": 50.0}],
        },
        headers=hdr,
    )
    assert grn_res.status_code == 201, grn_res.text
    grn_data = grn_res.json()
    assert grn_data["received_by"] == str(team_member.id)

    # 3. inspection_id on NCRCreate
    # Create checklist and inspection first
    cl = models.QualityChecklist(
        id=uuid.uuid4(),
        company_id=comp.id,
        title="Concrete Pour Inspection",
        category="Civil",
        is_code_reference="IS 456",
    )
    db.add(cl)
    db.commit()

    insp = models.SiteInspection(
        id=uuid.uuid4(),
        project_id=proj.id,
        checklist_id=cl.id,
        zone="Block A 2nd Floor",
        status="fail",
        pass_count=2,
        fail_count=1,
        na_count=0,
        inspection_date=datetime.datetime.now(datetime.timezone.utc),
        overall_remarks="Cover block missing on west beam",
        inspected_by=user.id,
    )
    db.add(insp)
    db.commit()

    ncr_res = client.post(
        "/apis/v3/quality/ncr",
        json={
            "project_id": str(proj.id),
            "inspection_id": str(insp.id),
            "ncr_number": f"NCR-{uuid.uuid4().hex[:4].upper()}",
            "title": "Missing cover block",
            "description": "West beam cover block missing prior to pour",
            "severity": "Major",
            "due_date": (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=2)).isoformat(),
        },
        headers=hdr,
    )
    assert ncr_res.status_code == 201, ncr_res.text
    ncr_data = ncr_res.json()
    assert ncr_data["ncr_number"].startswith("NCR-")

    # 4. hours_used on DeploymentCreate
    eq = models.Equipment(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="JCB Excavator 3DX",
        code="JCB-001",
        category="Excavator",
        ownership_type="Owned",
        hourly_rate=1200.0,
        status="available",
    )
    db.add(eq)
    db.commit()

    dep_res = client.post(
        f"/apis/v3/equipment/{eq.id}/deploy",
        json={
            "project_id": str(proj.id),
            "start_date": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "hours_used": 14.5,
            "remarks": "Foundation excavation shift 1",
        },
        headers=hdr,
    )
    assert dep_res.status_code == 201, dep_res.text
    dep_data = dep_res.json()
    assert dep_data["hours_used"] == 14.5

    # 5. tagged_user_id on PinCreateRequest
    draw = models.Drawing(
        id=uuid.uuid4(),
        project_id=proj.id,
        name="Structural Ground Floor Plan",
        category="2D Layout",
        created_by=team_member.id,
    )
    db.add(draw)
    db.commit()

    rev = models.DrawingRevision(
        id=uuid.uuid4(),
        drawing_id=draw.id,
        version_code="V1",
        file_url="/images/drawings/sample_plan.pdf",
        approval_status="approved",
        approved_by=team_member.id,
    )
    db.add(rev)
    db.commit()

    pin_res = client.post(
        f"/apis/v3/drawings/revisions/{rev.id}/pins",
        json={
            "x_coordinate": 25.5,
            "y_coordinate": 40.2,
            "comment": "Verify column C4 reinforcement details",
            "tagged_user_id": str(team_member.id),
        },
        headers=hdr,
    )
    assert pin_res.status_code == 200, pin_res.text
    pin_data = pin_res.json()
    assert pin_data["tagged_user_id"] == str(team_member.id)
    assert pin_data["comment"] == "Verify column C4 reinforcement details"
