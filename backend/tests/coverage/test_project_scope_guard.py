"""Regression tests for the project-scope IDOR guard (verify_project_in_company).

Prompt 6: a member of Company A passes the company-membership check (their own
valid company_id=A) but passes a project_id that belongs to Company B. The write
must be rejected with 403 ("Project does not belong to this company") before any
DB mutation. Covers the 5 endpoints called out as the minimum required set:
create_bill, create_payment_request, create_po, create_leave_request, create_todo.

Each negative test is paired with a positive control using the caller's OWN project
(company A) to prove the guard does not over-block legitimate same-company writes.
"""
import uuid

from app import models


# ─── billing.py: POST /billing/bills ─────────────────────────────────────────

def test_create_bill_rejects_cross_company_project_id(client, db, make_tenant, auth_headers):
    comp_a, user_a, team_a = make_tenant(company_name="A", user_name="UA", mobile="+919888800051", email="ua-pscope-bill@test.com")
    comp_b, _, _ = make_tenant(company_name="B", user_name="UB", mobile="+919888800052", email="ub-pscope-bill@test.com")
    hdr_a = auth_headers(user_a, comp_a)

    project_b = models.Project(id=uuid.uuid4(), company_id=comp_b.id, name="Project B", code="PB-BILL-PS", status="Ongoing")
    db.add(project_b)
    db.commit()

    r = client.post(
        "/apis/v3/billing/bills",
        json={
            "company_id": str(comp_a.id),
            "project_id": str(project_b.id),
            "party_company_user_id": str(team_a.id),
            "invoice_number": "INV-PS1",
            "invoice_date": "2026-01-01T00:00:00",
            "invoice_type": "purchase",
            "subtotal": 100.0,
        },
        headers=hdr_a,
    )
    assert r.status_code == 403
    assert "does not belong to this company" in r.json().get("detail", "")


def test_create_bill_allows_own_project(client, db, make_tenant, auth_headers):
    comp_a, user_a, team_a = make_tenant(company_name="A", user_name="UA", mobile="+919888800053", email="ua-pscope-bill-ok@test.com")
    hdr_a = auth_headers(user_a, comp_a)

    project_a = models.Project(id=uuid.uuid4(), company_id=comp_a.id, name="Project A", code="PA-BILL-PS", status="Ongoing")
    db.add(project_a)
    db.commit()

    r = client.post(
        "/apis/v3/billing/bills",
        json={
            "company_id": str(comp_a.id),
            "project_id": str(project_a.id),
            "party_company_user_id": str(team_a.id),
            "invoice_number": "INV-PS2",
            "invoice_date": "2026-01-01T00:00:00",
            "invoice_type": "purchase",
            "subtotal": 100.0,
        },
        headers=hdr_a,
    )
    assert r.status_code != 403


# ─── finance.py: POST /finance/payment-requests/{company_id} ─────────────────

def test_create_payment_request_rejects_cross_company_project_id(client, db, make_tenant, auth_headers):
    comp_a, user_a, team_a = make_tenant(company_name="A", user_name="UA", mobile="+919888800054", email="ua-pscope-pr@test.com")
    comp_b, _, _ = make_tenant(company_name="B", user_name="UB", mobile="+919888800055", email="ub-pscope-pr@test.com")
    hdr_a = auth_headers(user_a, comp_a)

    project_b = models.Project(id=uuid.uuid4(), company_id=comp_b.id, name="Project B", code="PB-PR-PS", status="Ongoing")
    db.add(project_b)
    db.commit()

    r = client.post(
        f"/apis/v3/finance/payment-requests/{comp_a.id}",
        json={
            "project_id": str(project_b.id),
            "party_company_user_id": str(team_a.id),
            "amount": 500.0,
            "details": "Cross-company project scope attempt",
        },
        headers=hdr_a,
    )
    assert r.status_code == 403
    assert "does not belong to this company" in r.json().get("detail", "")


def test_create_payment_request_allows_own_project(client, db, make_tenant, auth_headers):
    comp_a, user_a, team_a = make_tenant(company_name="A", user_name="UA", mobile="+919888800056", email="ua-pscope-pr-ok@test.com")
    hdr_a = auth_headers(user_a, comp_a)

    project_a = models.Project(id=uuid.uuid4(), company_id=comp_a.id, name="Project A", code="PA-PR-PS", status="Ongoing")
    db.add(project_a)
    db.commit()

    r = client.post(
        f"/apis/v3/finance/payment-requests/{comp_a.id}",
        json={
            "project_id": str(project_a.id),
            "party_company_user_id": str(team_a.id),
            "amount": 500.0,
            "details": "Own project scope",
        },
        headers=hdr_a,
    )
    assert r.status_code != 403


# ─── procurement.py: POST /procurement/pos ───────────────────────────────────

def test_create_po_rejects_cross_company_project_id(client, db, make_tenant, auth_headers):
    comp_a, user_a, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888800057", email="ua-pscope-po@test.com")
    comp_b, _, _ = make_tenant(company_name="B", user_name="UB", mobile="+919888800058", email="ub-pscope-po@test.com")
    hdr_a = auth_headers(user_a, comp_a)

    project_b = models.Project(id=uuid.uuid4(), company_id=comp_b.id, name="Project B", code="PB-PO-PS", status="Ongoing")
    db.add(project_b)
    db.commit()

    r = client.post(
        "/apis/v3/procurement/pos",
        json={
            "company_id": str(comp_a.id),
            "project_id": str(project_b.id),
            "po_number": "PO-PS1",
            "po_date": "2026-01-01T00:00:00",
            "items": [{"material_name": "Cement", "quantity": 10, "unit": "bags", "rate": 100, "tax_pct": 18}],
        },
        headers=hdr_a,
    )
    assert r.status_code == 403
    assert "does not belong to this company" in r.json().get("detail", "")


def test_create_po_allows_own_project(client, db, make_tenant, auth_headers):
    comp_a, user_a, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888800059", email="ua-pscope-po-ok@test.com")
    hdr_a = auth_headers(user_a, comp_a)

    project_a = models.Project(id=uuid.uuid4(), company_id=comp_a.id, name="Project A", code="PA-PO-PS", status="Ongoing")
    db.add(project_a)
    db.commit()

    r = client.post(
        "/apis/v3/procurement/pos",
        json={
            "company_id": str(comp_a.id),
            "project_id": str(project_a.id),
            "po_number": "PO-PS2",
            "po_date": "2026-01-01T00:00:00",
            "items": [{"material_name": "Cement", "quantity": 10, "unit": "bags", "rate": 100, "tax_pct": 18}],
        },
        headers=hdr_a,
    )
    assert r.status_code != 403


# ─── hr.py: POST /hr/leaves/{company_id} ─────────────────────────────────────

def test_create_leave_request_rejects_cross_company_project_id(client, db, make_tenant, auth_headers):
    comp_a, user_a, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888800060", email="ua-pscope-lv@test.com")
    comp_b, _, _ = make_tenant(company_name="B", user_name="UB", mobile="+919888800061", email="ub-pscope-lv@test.com")
    hdr_a = auth_headers(user_a, comp_a)

    project_b = models.Project(id=uuid.uuid4(), company_id=comp_b.id, name="Project B", code="PB-LV-PS", status="Ongoing")
    db.add(project_b)
    db.commit()

    r = client.post(
        f"/apis/v3/hr/leaves/{comp_a.id}",
        json={
            "project_id": str(project_b.id),
            "employee_id": str(uuid.uuid4()),
            "employee_name": "Cross Tenant",
            "leave_type": "Casual",
            "start_date": "2026-02-01T00:00:00",
            "end_date": "2026-02-02T00:00:00",
            "days_count": 2,
        },
        headers=hdr_a,
    )
    assert r.status_code == 403
    assert "does not belong to this company" in r.json().get("detail", "")


def test_create_leave_request_allows_own_project(client, db, make_tenant, auth_headers):
    comp_a, user_a, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888800062", email="ua-pscope-lv-ok@test.com")
    hdr_a = auth_headers(user_a, comp_a)

    project_a = models.Project(id=uuid.uuid4(), company_id=comp_a.id, name="Project A", code="PA-LV-PS", status="Ongoing")
    db.add(project_a)
    db.commit()

    r = client.post(
        f"/apis/v3/hr/leaves/{comp_a.id}",
        json={
            "project_id": str(project_a.id),
            "employee_id": str(uuid.uuid4()),
            "employee_name": "Own Tenant",
            "leave_type": "Casual",
            "start_date": "2026-02-01T00:00:00",
            "end_date": "2026-02-02T00:00:00",
            "days_count": 2,
        },
        headers=hdr_a,
    )
    assert r.status_code != 403


# ─── todos.py: POST /todos/ ──────────────────────────────────────────────────

def test_create_todo_rejects_cross_company_project_id(client, db, make_tenant, auth_headers):
    comp_a, user_a, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888800063", email="ua-pscope-td@test.com")
    comp_b, _, _ = make_tenant(company_name="B", user_name="UB", mobile="+919888800064", email="ub-pscope-td@test.com")
    hdr_a = auth_headers(user_a, comp_a)

    project_b = models.Project(id=uuid.uuid4(), company_id=comp_b.id, name="Project B", code="PB-TD-PS", status="Ongoing")
    db.add(project_b)
    db.commit()

    r = client.post(
        "/apis/v3/todos/",
        json={
            "company_id": str(comp_a.id),
            "project_id": str(project_b.id),
            "title": "Cross-company project scope attempt",
        },
        headers=hdr_a,
    )
    assert r.status_code == 403
    assert "does not belong to this company" in r.json().get("detail", "")


def test_create_todo_allows_own_project(client, db, make_tenant, auth_headers):
    comp_a, user_a, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888800065", email="ua-pscope-td-ok@test.com")
    hdr_a = auth_headers(user_a, comp_a)

    project_a = models.Project(id=uuid.uuid4(), company_id=comp_a.id, name="Project A", code="PA-TD-PS", status="Ongoing")
    db.add(project_a)
    db.commit()

    r = client.post(
        "/apis/v3/todos/",
        json={
            "company_id": str(comp_a.id),
            "project_id": str(project_a.id),
            "title": "Own project scope",
        },
        headers=hdr_a,
    )
    assert r.status_code != 403
