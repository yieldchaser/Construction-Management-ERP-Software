"""R2-726 — Enterprise Rollup net balance must not invert asset/liability terms.

Gate: GET /finance/enterprise-rollup computed
    advance_paid + advance_received - to_pay - to_receive
which adds a liability (advance_received) and subtracts an asset
(advance_paid). Selling 100000 and purchasing 30000 returned -130000 instead
of +70000. After the fix all three balance sites share _net_balance, so the
rollup figure matches the party-level figure exactly.
"""
import datetime
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def test_rollup_net_balance_positive_when_receivables_exceed_payables(
    client, db, make_tenant, auth_headers
):
    comp, user, _ = make_tenant(
        company_name=f"R726-{_SUFFIX}",
        user_name=f"U726-{_SUFFIX}",
        mobile=f"+919177{_SUFFIX[:6]}",
        email=f"r726-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)

    lp = models.LibraryParty(id=uuid.uuid4(), company_id=comp.id, name="Party R726")
    db.add(lp)
    db.flush()
    team = models.CompanyTeam(
        id=uuid.uuid4(), company_id=comp.id, user_id=None,
        library_party_id=lp.id, priority_type="vendor",
    )
    db.add(team)
    db.flush()

    base = dict(company_id=comp.id, project_id=uuid.uuid4(),
                party_company_user_id=team.id,
                invoice_date=datetime.datetime(2026, 1, 1))
    db.add_all([
        # Sold 100000, nothing collected: receivable asset.
        models.Bill(id=uuid.uuid4(), invoice_number=f"SALE-726-{_SUFFIX}",
                    invoice_type="sale", subtotal=100000.0, total_payable=100000.0,
                    paid_amount=0.0, **base),
        # Purchased 30000, nothing paid: payable liability.
        models.Bill(id=uuid.uuid4(), invoice_number=f"PUR-726-{_SUFFIX}",
                    invoice_type="purchase", subtotal=30000.0, total_payable=30000.0,
                    paid_amount=0.0, **base),
    ])
    db.commit()

    r = client.get(f"/apis/v3/finance/parties/{comp.id}", headers=hdr)
    assert r.status_code == 200, r.text
    party_balance = next(
        p["balance"] for p in r.json() if p["id"] == str(lp.id)
    )
    assert party_balance == 70000.0, party_balance

    r = client.get(f"/apis/v3/finance/enterprise-rollup/{comp.id}", headers=hdr)
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["companies"]) == 1, body
    company_row = body["companies"][0]
    # Net owed TO us: positive, never the inverted -130000.
    assert company_row["balance"] == 70000.0, body
    assert body["total_balance"] == 70000.0, body
    # Rollup must agree with the party-level computation (no drift).
    assert company_row["balance"] == party_balance, body
