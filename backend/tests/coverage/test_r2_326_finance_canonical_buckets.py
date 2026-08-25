"""R2-326 - the Finance tab and the enterprise rollup must classify bills
through the canonical invoice-type buckets, not a literal "sale" check.

`if b.invoice_type == "sale": ... else: expense` pushed material_sale (real
revenue), settlement vouchers (payment_in etc.) and internal movements into
the expense head, so money the company received was displayed as money it
owed and a material sale was subtracted from profit.

Gate: revenue = REVENUE_INVOICE_TYPES (sale + material_sale); expense =
EXPENSE_INVOICE_TYPES only; settlement/movement types land in neither head -
on /finance/transactions, /finance/parties and /finance/enterprise-rollup.
"""
import uuid
from datetime import datetime, timezone

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _bill(db, comp, project, team, number, inv_type, payable):
    db.add(models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, invoice_number=number,
        invoice_date=datetime.now(timezone.utc), invoice_type=inv_type,
        subtotal=payable, gst_amount=0, total_payable=payable, paid_amount=0,
    ))
    db.commit()


def test_r2_326_transactions_classify_canonical_buckets(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"R2326-{_SUFFIX}", user_name="U326",
        mobile=f"+9192{_SUFFIX}", email=f"r2326-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P326",
        code=f"PRJ-326-{_SUFFIX}", status="Ongoing",
    )
    db.add(project)
    db.commit()

    _bill(db, comp, project, team, f"326-S-{_SUFFIX}", "sale", 1000)
    _bill(db, comp, project, team, f"326-MS-{_SUFFIX}", "material_sale", 500)
    _bill(db, comp, project, team, f"326-P-{_SUFFIX}", "purchase", 2000)
    _bill(db, comp, project, team, f"326-SC-{_SUFFIX}", "subcon", 300)
    _bill(db, comp, project, team, f"326-EQ-{_SUFFIX}", "equipment", 400)
    # settlement + movement documents belong in neither money head
    _bill(db, comp, project, team, f"326-PI-{_SUFFIX}", "payment_in", 590)
    _bill(db, comp, project, team, f"326-MT-{_SUFFIX}", "material_transfer", 100)

    r = client.get(f"/apis/v3/finance/transactions/{comp.id}", headers=hdr)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total_invoice"] == 1500.0, body["total_invoice"]      # sale + material_sale
    assert body["unpaid_invoice"] == 1500.0, body["unpaid_invoice"]
    assert body["total_expense"] == 2700.0, body["total_expense"]      # purchase+subcon+equipment
    assert body["unpaid_expense"] == 2700.0, body["unpaid_expense"]
    # every bill is still listed as a transaction row
    assert len(body["transactions"]) == 7, len(body["transactions"])


def test_r2_326_enterprise_rollup_counts_material_sale_as_receivable(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"R2326B-{_SUFFIX}", user_name="U326B",
        mobile=f"+9193{_SUFFIX}", email=f"r2326b-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P326B",
        code=f"PRJ-326B-{_SUFFIX}", status="Ongoing",
    )
    party = models.LibraryParty(id=uuid.uuid4(), company_id=comp.id, name=f"Party326B-{_SUFFIX}")
    db.add_all([project, party])
    db.flush()
    team.library_party_id = party.id
    db.commit()

    _bill(db, comp, project, team, f"326B-MS-{_SUFFIX}", "material_sale", 5000)

    r = client.get(f"/apis/v3/finance/enterprise-rollup/{comp.id}", headers=hdr)
    assert r.status_code == 200, r.text
    co = r.json()["companies"][0]
    assert co["to_receive"] == 5000.0, co
    assert co["to_pay"] == 0.0, co


def test_r2_326_company_parties_do_not_book_payment_in_as_debt(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"R2326C-{_SUFFIX}", user_name="U326C",
        mobile=f"+9194{_SUFFIX}", email=f"r2326c-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P326C",
        code=f"PRJ-326C-{_SUFFIX}", status="Ongoing",
    )
    party = models.LibraryParty(id=uuid.uuid4(), company_id=comp.id, name=f"Party326C-{_SUFFIX}")
    db.add_all([project, party])
    db.flush()
    team.library_party_id = party.id
    db.commit()

    _bill(db, comp, project, team, f"326C-PI-{_SUFFIX}", "payment_in", 590)

    r = client.get(f"/apis/v3/finance/parties/{comp.id}", headers=hdr)
    assert r.status_code == 200, r.text
    rows = r.json()
    assert len(rows) == 1, rows
    assert rows[0]["to_pay"] == 0.0, rows[0]
