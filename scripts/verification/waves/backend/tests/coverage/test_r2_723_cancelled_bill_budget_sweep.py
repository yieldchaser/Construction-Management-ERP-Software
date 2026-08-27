"""R2-723 — cancelled bills must not count toward Budget-vs-Actual.

Gate: GET /budget/committed/{project_id} and its /towers breakdown summed
total_payable over every expense bill regardless of status, so a purchase bill
cancelled after approval kept inflating material_actual forever. After the fix
only active bills count: the cancelled bill drops out while the live one still
does.
"""
import datetime
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _mob(t):
    return f"+9190{_SUFFIX}{t:02d}"


def _mail(t):
    return f"r723-{t}-{_SUFFIX}@test.com"


def _mk_bill(db, comp, project, team, amount, tag, cancelled):
    b = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, invoice_number=f"INV-R723-{tag}-{_SUFFIX}",
        invoice_date=datetime.datetime(2026, 1, 1),
        invoice_type="purchase", subtotal=amount, total_payable=amount,
        approval_flag="approved",
        status="Cancelled" if cancelled else "Unpaid",
    )
    db.add(b)
    db.commit()
    return b


def test_cancelled_purchase_bill_excluded_from_budget_actuals(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name="R723", user_name="U723", mobile=_mob(1), email=_mail(1)
    )
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P723", code=f"PRJ-{_SUFFIX}-1", status="Ongoing"
    )
    db.add(project)
    db.commit()

    _mk_bill(db, comp, project, team, 100.0, "live", cancelled=False)
    _mk_bill(db, comp, project, team, 200.0, "cxled", cancelled=True)

    r = client.get(f"/apis/v3/budget/committed/{project.id}", headers=hdr)
    assert r.status_code == 200, r.text
    body = r.json()
    # The live bill counts; the cancelled bill does not.
    assert body["material_actual"] == 100.0, body
    assert body["total_actual"] == 100.0, body

    r = client.get(f"/apis/v3/budget/committed/{project.id}/towers", headers=hdr)
    assert r.status_code == 200, r.text
    rows = r.json()
    assert len(rows) == 1, rows
    # Tower breakdown (no-tower branch) uses the same active-bill scope.
    assert rows[0]["actual"] == 100.0, rows
