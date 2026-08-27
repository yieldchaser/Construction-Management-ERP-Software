"""R2-232 — cancelled bills are not excluded from finance aggregations.

Gate: a sale bill marked Cancelled must not inflate billed revenue in
/finance/transactions. The old code sums every bill regardless of status, so a
cancelled 1000 invoice still shows in total_invoice. After the fix it is excluded.
"""
import datetime
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _mob(t):
    return f"+9190{_SUFFIX}{t:02d}"


def _mail(t):
    return f"r232-{t}-{_SUFFIX}@test.com"


def _mk_project(db, comp, tag):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=f"P{tag}", code=f"PRJ-{_SUFFIX}-{tag}", status="Ongoing"
    )
    db.add(p)
    db.commit()
    return p


def test_cancelled_bill_excluded_from_summary(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name="R232", user_name="U232", mobile=_mob(1), email=_mail(1)
    )
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, 1)

    b = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, invoice_number="INV-CXL", invoice_date=datetime.datetime(2026, 1, 1),
        invoice_type="sale", subtotal=1000.0, total_payable=1000.0, status="Cancelled",
    )
    db.add(b)
    db.commit()

    r = client.get(f"/apis/v3/finance/transactions/{comp.id}", headers=hdr)
    assert r.status_code == 200, r.text
    body = r.json()
    # Cancelled invoices must not inflate billed revenue.
    assert body["total_invoice"] == 0.0, body
