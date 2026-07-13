"""Regression tests for the get_company_membership(db, current_user, <company_id>) IDOR
guards added across the write endpoints of ~24 routers (billing, procurement, crm,
planning, hr, library, projects, ...). A user who only belongs to company A must be
rejected with 403 when attempting to write against company B's data, whether the
target company is supplied directly in the request body or resolved indirectly via
an entity (project/PO/material) that's already seeded under company B.

This suite is a representative sample (1-2 endpoints per router / guard pattern),
not exhaustive coverage of every guarded endpoint -- see test_finance_tenant_isolation.py
for the finance.py-specific set."""
import datetime
import uuid

from app import models


# ─── billing.py ────────────────────────────────────────────────────────────

def test_create_bill_rejects_cross_tenant_company_id(client, db, make_tenant, auth_headers):
    comp_a, user_a, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888800001", email="ua-bill1@test.com")
    comp_b, user_b, team_b = make_tenant(company_name="B", user_name="UB", mobile="+919888800002", email="ub-bill1@test.com")
    hdr_a = auth_headers(user_a, comp_a)

    project_b = models.Project(id=uuid.uuid4(), company_id=comp_b.id, name="Project B", code="PB-BILL", status="Ongoing")
    db.add(project_b)
    db.commit()

    r = client.post(
        "/apis/v3/billing/bills",
        json={
            "company_id": str(comp_b.id),
            "project_id": str(project_b.id),
            "party_company_user_id": str(team_b.id),
            "invoice_number": "INV-X1",
            "invoice_date": "2026-01-01T00:00:00",
            "invoice_type": "purchase",
            "subtotal": 100.0,
        },
        headers=hdr_a,
    )
    assert r.status_code == 403


# ─── procurement.py ────────────────────────────────────────────────────────

def test_create_indent_rejects_cross_tenant_company_id(client, db, make_tenant, auth_headers):
    comp_a, user_a, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888800003", email="ua-proc1@test.com")
    comp_b, user_b, _ = make_tenant(company_name="B", user_name="UB", mobile="+919888800004", email="ub-proc1@test.com")
    hdr_a = auth_headers(user_a, comp_a)

    project_b = models.Project(id=uuid.uuid4(), company_id=comp_b.id, name="Project B", code="PB-IND", status="Ongoing")
    db.add(project_b)
    db.commit()

    r = client.post(
        "/apis/v3/procurement/indents",
        json={
            "company_id": str(comp_b.id),
            "project_id": str(project_b.id),
            "indent_number": "IND-X1",
            "items": [{"material_name": "Cement", "quantity": 10, "unit": "bags"}],
        },
        headers=hdr_a,
    )
    assert r.status_code == 403


def test_approve_po_rejects_cross_tenant_po(client, db, make_tenant, auth_headers):
    comp_a, user_a, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888800005", email="ua-proc2@test.com")
    comp_b, user_b, _ = make_tenant(company_name="B", user_name="UB", mobile="+919888800006", email="ub-proc2@test.com")
    hdr_a = auth_headers(user_a, comp_a)

    project_b = models.Project(id=uuid.uuid4(), company_id=comp_b.id, name="Project B", code="PB-PO", status="Ongoing")
    db.add(project_b)
    db.flush()
    po = models.PurchaseOrder(
        id=uuid.uuid4(),
        company_id=comp_b.id,
        project_id=project_b.id,
        po_number="PO-X1",
        po_date=datetime.datetime(2026, 1, 1),
        status="draft",
        approval_flag="pending",
    )
    db.add(po)
    db.commit()

    r = client.post(f"/apis/v3/procurement/pos/{po.id}/approve", headers=hdr_a)
    assert r.status_code == 403
    db.refresh(po)
    assert po.approval_flag != "approved"


# ─── crm.py ─────────────────────────────────────────────────────────────────

def test_create_lead_rejects_cross_tenant_company_id(client, db, make_tenant, auth_headers):
    comp_a, user_a, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888800007", email="ua-crm1@test.com")
    comp_b, user_b, _ = make_tenant(company_name="B", user_name="UB", mobile="+919888800008", email="ub-crm1@test.com")
    hdr_a = auth_headers(user_a, comp_a)

    r = client.post(
        "/apis/v3/crm/leads",
        json={
            "company_id": str(comp_b.id),
            "lead_type": "residential",
            "contact_name": "Cross Tenant Lead",
            "phone_no": "9999999999",
        },
        headers=hdr_a,
    )
    assert r.status_code == 403


# ─── planning.py ────────────────────────────────────────────────────────────

def test_create_task_rejects_cross_tenant_project(client, db, make_tenant, auth_headers):
    comp_a, user_a, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888800009", email="ua-plan1@test.com")
    comp_b, user_b, _ = make_tenant(company_name="B", user_name="UB", mobile="+919888800010", email="ub-plan1@test.com")
    hdr_a = auth_headers(user_a, comp_a)

    project_b = models.Project(id=uuid.uuid4(), company_id=comp_b.id, name="Project B", code="PB-TASK", status="Ongoing")
    db.add(project_b)
    db.commit()

    r = client.post(
        "/apis/v3/planning/tasks",
        json={
            "project_id": str(project_b.id),
            "name": "Cross Tenant Task",
            "duration_days": 5,
            "start_date": "2026-01-01T00:00:00",
        },
        headers=hdr_a,
    )
    assert r.status_code == 403


def test_create_project_v3_rejects_cross_tenant_company_id(client, db, make_tenant, auth_headers):
    comp_a, user_a, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888800011", email="ua-plan2@test.com")
    comp_b, user_b, _ = make_tenant(company_name="B", user_name="UB", mobile="+919888800012", email="ub-plan2@test.com")
    hdr_a = auth_headers(user_a, comp_a)

    r = client.post(
        "/apis/v3/planning/projects",
        json={
            "company_id": str(comp_b.id),
            "name": "Cross Tenant Project",
        },
        headers=hdr_a,
    )
    assert r.status_code == 403


# ─── hr.py ──────────────────────────────────────────────────────────────────

def test_run_payroll_rejects_cross_tenant_company_id(client, db, make_tenant, auth_headers):
    comp_a, user_a, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888800013", email="ua-hr1@test.com")
    comp_b, user_b, _ = make_tenant(company_name="B", user_name="UB", mobile="+919888800014", email="ub-hr1@test.com")
    hdr_a = auth_headers(user_a, comp_a)

    r = client.post(
        "/apis/v3/hr/payroll/run",
        json={
            "company_id": str(comp_b.id),
            "payroll_month": "2026-01",
        },
        headers=hdr_a,
    )
    assert r.status_code == 403


# ─── library.py ─────────────────────────────────────────────────────────────

def test_create_library_material_rejects_cross_tenant_company_id(client, db, make_tenant, auth_headers):
    comp_a, user_a, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888800015", email="ua-lib1@test.com")
    comp_b, user_b, _ = make_tenant(company_name="B", user_name="UB", mobile="+919888800016", email="ub-lib1@test.com")
    hdr_a = auth_headers(user_a, comp_a)

    r = client.post(
        "/apis/v3/library/materials",
        json={
            "company_id": str(comp_b.id),
            "name": "Cross Tenant Material",
            "unit": "bags",
        },
        headers=hdr_a,
    )
    assert r.status_code == 403


def test_delete_library_material_rejects_cross_tenant_item(client, db, make_tenant, auth_headers):
    comp_a, user_a, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888800017", email="ua-lib2@test.com")
    comp_b, user_b, _ = make_tenant(company_name="B", user_name="UB", mobile="+919888800018", email="ub-lib2@test.com")
    hdr_a = auth_headers(user_a, comp_a)

    item = models.LibraryMaterial(id=uuid.uuid4(), company_id=comp_b.id, name="Material B", unit="bags")
    db.add(item)
    db.commit()

    r = client.delete(f"/apis/v3/library/materials/{item.id}", headers=hdr_a)
    assert r.status_code == 403
    db.refresh(item)  # still present -- delete must not have gone through


# ─── projects.py ────────────────────────────────────────────────────────────

def test_create_project_rejects_cross_tenant_company_id(client, db, make_tenant, auth_headers):
    comp_a, user_a, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888800019", email="ua-projects1@test.com")
    comp_b, user_b, _ = make_tenant(company_name="B", user_name="UB", mobile="+919888800020", email="ub-projects1@test.com")
    hdr_a = auth_headers(user_a, comp_a)

    r = client.post(
        "/apis/v3/projects/",
        json={
            "company_id": str(comp_b.id),
            "name": "Cross Tenant Project",
        },
        headers=hdr_a,
    )
    assert r.status_code == 403


# ─── Positive control ───────────────────────────────────────────────────────

def test_create_lead_allows_own_company(client, db, make_tenant, auth_headers):
    """The guards must not over-block: user A writing to their own company A succeeds."""
    comp_a, user_a, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888800021", email="ua-crm2@test.com")
    hdr_a = auth_headers(user_a, comp_a)

    r = client.post(
        "/apis/v3/crm/leads",
        json={
            "company_id": str(comp_a.id),
            "lead_type": "residential",
            "contact_name": "Own Tenant Lead",
            "phone_no": "8888888888",
        },
        headers=hdr_a,
    )
    assert r.status_code != 403
