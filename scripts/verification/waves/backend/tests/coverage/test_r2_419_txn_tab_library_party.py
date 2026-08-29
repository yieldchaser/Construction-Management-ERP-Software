"""R2-419 - the Transaction tab names LibraryParty counterparties.

The audit observed a subcontractor bill rendering "Unknown Party" on the
Transaction tab while the Party tab named the same party: the transaction row
resolved its counterparty through CompanyTeam -> User only, which cannot see a
LibraryParty with no platform login. The prescribed resolution chain
(CompanyTeam -> User -> CompanyTeam.library_party_id -> LibraryParty) landed
with R2-174 in commit 4d06017; this file pins that the exact evidenced
scenario - an external subcontractor team (user_id NULL) linked to a library
party, holding the company's largest bill - resolves to the party's business
name on GET /finance/transactions/{company_id}. Report-only: no production
delta was needed in this wave.
"""
import datetime
import uuid

from app import models


def _mk_project(db, comp, tag):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=f"P{tag}",
        code=f"PRJ-{uuid.uuid4().hex[:8]}-{tag}", status="Ongoing",
    )
    db.add(p)
    db.commit()
    return p


def test_subcon_bill_names_library_party_not_unknown(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R2419A", user_name="U419")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, "419")

    party = models.LibraryParty(
        id=uuid.uuid4(), company_id=comp.id, name="ZZ QA Subcon Co",
        party_type="Subcontractor",
    )
    db.add(party)
    db.flush()
    # External subcontractor: a CompanyTeam with no login, linked to the
    # vendor master via library_party_id (billing.create_subcontractor shape).
    team = models.CompanyTeam(
        id=uuid.uuid4(), company_id=comp.id, user_id=None,
        priority_type="subcontractor", library_party_id=party.id,
    )
    db.add(team)
    db.flush()
    db.add(models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, invoice_number="SUBCON-419",
        invoice_date=datetime.datetime(2026, 8, 1), invoice_type="subcon",
        subtotal=590000.0, gst_amount=0, total_payable=590000.0, paid_amount=0,
    ))
    db.commit()

    r = client.get(f"/apis/v3/finance/transactions/{comp.id}", headers=hdr)
    assert r.status_code == 200, r.text
    rows = [t for t in r.json()["transactions"] if t["ref"] == "SUBCON-419"]
    assert len(rows) == 1, r.text
    assert rows[0]["party"] == "ZZ QA Subcon Co", r.text
    assert rows[0]["party"] != "Unknown Party", r.text


def test_platform_user_bills_still_resolve_through_the_team(client, db, make_tenant, auth_headers):
    """The User half of the resolution chain is untouched."""
    comp, user, team = make_tenant(company_name="R2419B", user_name="U419 Partner")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, "419b")

    db.add(models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, invoice_number="SALE-419",
        invoice_date=datetime.datetime(2026, 8, 2), invoice_type="sale",
        subtotal=1000.0, gst_amount=0, total_payable=1000.0, paid_amount=0,
    ))
    db.commit()

    r = client.get(f"/apis/v3/finance/transactions/{comp.id}", headers=hdr)
    assert r.status_code == 200, r.text
    rows = [t for t in r.json()["transactions"] if t["ref"] == "SALE-419"]
    assert len(rows) == 1, r.text
    assert rows[0]["party"] == "U419 Partner", r.text
