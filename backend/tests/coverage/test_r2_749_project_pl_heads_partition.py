"""Finding R2-749: Project P&L cost heads partitioning.

Clauses:
1. Material Cost sums purchase bills only (plus wastage), excluding equipment, expense, subcon.
2. Plant & Machinery includes equipment bills in addition to deployments and fuel.
3. Overhead includes expense bills instead of hardcoding 0.0.
4. Partition: sum of cost heads matches total expense bills + wastage + deployment + fuel + labour.
"""
import uuid
import datetime
import pytest

from app import models


def _tenant(make_tenant, auth_headers):
    sfx = uuid.uuid4().hex[:8]
    comp, user, team = make_tenant(
        company_name=f"PL-{sfx}", user_name=f"UPL-{sfx}",
        mobile=f"+9198{sfx}", email=f"pl-{sfx}@test.com",
    )
    return comp, user, team, auth_headers(user, comp)


def _project(db, comp):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="PL-Proj",
        code=f"PRJ-PL-{uuid.uuid4().hex[:6]}", status="Ongoing", state="Karnataka",
    )
    db.add(p)
    db.commit()
    return p


def _post_bill(client, hdr, comp, project, team, inv_type, amount):
    r = client.post("/apis/v3/billing/bills", headers=hdr, json={
        "company_id": str(comp.id),
        "project_id": str(project.id),
        "party_company_user_id": str(team.id),
        "invoice_number": f"INV-{inv_type.upper()}-{uuid.uuid4().hex[:6]}",
        "invoice_date": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "invoice_type": inv_type,
        "subtotal": amount,
        "gst_pct": 0,
        "deductions": [],
    })
    assert r.status_code == 201, r.text
    return r.json()


def test_r2_749_project_pl_partitions_cost_heads(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)
    project = _project(db, comp)

    # 1. Purchase bill: 50,000 -> Material Cost
    _post_bill(client, hdr, comp, project, team, "purchase", 50000.0)

    # 2. Subcon bill: 30,000 -> Subcontractor Cost
    _post_bill(client, hdr, comp, project, team, "subcon", 30000.0)

    # 3. Equipment bill: 20,000 -> Plant & Machinery
    _post_bill(client, hdr, comp, project, team, "equipment", 20000.0)

    # 4. Expense bill: 10,000 -> Overhead
    _post_bill(client, hdr, comp, project, team, "expense", 10000.0)

    res = client.get(f"/apis/v3/finance/pl?project_id={project.id}", headers=hdr)
    assert res.status_code == 200, res.text
    items = {it["head"]: it for it in res.json()}

    # Clause 1: Material Cost = 50000 (purchase only, not 50000+20000+10000=80000)
    assert items["Material Cost"]["actual"] == pytest.approx(50000.0), f"Material Cost misallocated: {items['Material Cost']}"

    # Clause 2: Subcontractor Cost = 30000
    assert items["Subcontractor Cost"]["actual"] == pytest.approx(30000.0), f"Subcontractor Cost misallocated: {items['Subcontractor Cost']}"

    # Clause 3: Plant & Machinery = 20000 (equipment bills)
    assert items["Plant & Machinery"]["actual"] == pytest.approx(20000.0), f"Plant & Machinery misallocated: {items['Plant & Machinery']}"

    # Clause 4: Overhead = 10000 (expense bills)
    assert items["Overhead"]["actual"] == pytest.approx(10000.0), f"Overhead misallocated: {items['Overhead']}"
    assert items["Overhead"]["variance"] == pytest.approx(-10000.0), f"Overhead variance wrong: {items['Overhead']}"
