"""Regression tests for the finance.py IDOR fix: create_payment, approve_transaction
and record_payment_request now call get_company_membership(db, current_user, <company_id>)
before touching another tenant's data. Without those guards a user from company A could
create payments under company B's company_id, or approve/settle company B's bills and
payment requests just by guessing/submitting their ids."""
import datetime
import uuid

from app import models


def test_create_payment_rejects_cross_tenant_company_id(client, db, make_tenant, auth_headers):
    comp_a, user_a, _ = make_tenant(company_name="A", user_name="UA", mobile="+919999999997", email="ua-fin1@test.com")
    comp_b, user_b, _ = make_tenant(company_name="B", user_name="UB", mobile="+919999999998", email="ub-fin1@test.com")
    hdr_a = auth_headers(user_a, comp_a)

    # User A is not a member of company B; posting a payment under company B's id must be rejected.
    r = client.post(
        "/apis/v3/finance/payments",
        json={
            "company_id": str(comp_b.id),
            "payment_type": "out",
            "amount": 100.0,
            "payment_method": "Cash",
            "payment_date": "2026-01-01T00:00:00",
        },
        headers=hdr_a,
    )
    assert r.status_code == 403

    # Positive control: user A posting under their own company A succeeds.
    r2 = client.post(
        "/apis/v3/finance/payments",
        json={
            "company_id": str(comp_a.id),
            "payment_type": "out",
            "amount": 100.0,
            "payment_method": "Cash",
            "payment_date": "2026-01-01T00:00:00",
        },
        headers=hdr_a,
    )
    assert r2.status_code != 403


def test_approve_transaction_rejects_cross_tenant_bill(client, db, make_tenant, auth_headers):
    comp_a, user_a, _ = make_tenant(company_name="A", user_name="UA", mobile="+919999999901", email="ua-fin2@test.com")
    comp_b, user_b, team_b = make_tenant(company_name="B", user_name="UB", mobile="+919999999902", email="ub-fin2@test.com")
    hdr_a = auth_headers(user_a, comp_a)

    project_b = models.Project(id=uuid.uuid4(), company_id=comp_b.id, name="Project B", code="PB-1", status="Ongoing")
    db.add(project_b)
    db.flush()
    bill = models.Bill(
        id=uuid.uuid4(),
        company_id=comp_b.id,
        project_id=project_b.id,
        party_company_user_id=team_b.id,
        invoice_number="INV-1",
        invoice_date=datetime.datetime(2026, 1, 1),
        invoice_type="purchase",
        subtotal=100.0,
        total_payable=100.0,
    )
    db.add(bill)
    db.commit()

    r = client.patch(f"/apis/v3/finance/approve/{bill.id}", headers=hdr_a)
    assert r.status_code == 403
    db.refresh(bill)
    assert bill.approval_flag != "approved"


def test_record_payment_request_rejects_cross_tenant_request(client, db, make_tenant, auth_headers):
    comp_a, user_a, _ = make_tenant(company_name="A", user_name="UA", mobile="+919999999903", email="ua-fin3@test.com")
    comp_b, user_b, _ = make_tenant(company_name="B", user_name="UB", mobile="+919999999904", email="ub-fin3@test.com")
    hdr_a = auth_headers(user_a, comp_a)

    req = models.PaymentRequest(
        id=uuid.uuid4(),
        company_id=comp_b.id,
        party_company_user_id=user_b.id,
        party_name="UB",
        amount=500.0,
    )
    db.add(req)
    db.commit()

    r = client.post(
        f"/apis/v3/finance/payment-requests/pay/{req.id}",
        json={
            "payment_date": "2026-01-01T00:00:00",
            "payment_mode": "Cash",
            "paid_amount": 500.0,
            "deduction": 0.0,
            "tds": 0.0,
        },
        headers=hdr_a,
    )
    assert r.status_code == 403
    db.refresh(req)
    assert req.status != "Paid"
