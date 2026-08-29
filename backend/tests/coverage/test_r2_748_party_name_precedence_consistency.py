"""Finding R2-748: Party name resolver precedence is consistent across shared resolver and invoice PDF.

Clauses:
1. When a CompanyTeam member has BOTH library_party_id (vendor/business master) and user_id (individual login),
   resolve_party_name returns the LibraryParty business name first.
2. The bill PDF generator uses resolve_party_name rather than an inverted hand-rolled lookup.
3. If library_party_id is not set, resolve_party_name falls back to the linked User.name.
4. If neither is set, fallback sentinel is returned.
"""
import uuid
import datetime
import pytest

from app import models
from app.party_names import resolve_party_name


def _tenant(make_tenant, auth_headers):
    sfx = uuid.uuid4().hex[:8]
    comp, user, team = make_tenant(
        company_name=f"PartyNamePrec-{sfx}", user_name=f"UPartyName-{sfx}",
        mobile=f"+9192{sfx}", email=f"partyname-{sfx}@test.com",
    )
    return comp, user, team, auth_headers(user, comp)


def test_r2_748_party_name_precedence_library_party_first(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)

    # 1. Create an individual login user
    individual_user = models.User(
        id=uuid.uuid4(),
        name="Ramesh Individual",
        email=f"ramesh-{uuid.uuid4().hex[:6]}@vendor.com",
        mobile=f"+9198{uuid.uuid4().hex[:8]}",
        password_hash="test",
    )
    db.add(individual_user)
    db.commit()

    # 2. Create a LibraryParty business entity
    biz_party = models.LibraryParty(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="Apex Infra Solutions Pvt Ltd",
        tax_no="29AAAAA0000A1Z5",
        address="123 Industrial Area, Bangalore",
    )
    db.add(biz_party)
    db.commit()

    # 3. Create a CompanyTeam linking BOTH user_id and library_party_id
    team_member = models.CompanyTeam(
        id=uuid.uuid4(),
        company_id=comp.id,
        user_id=individual_user.id,
        library_party_id=biz_party.id,
        priority_type="contractor",
    )
    db.add(team_member)
    db.commit()

    # 4. Assert resolve_party_name returns the business name (LibraryParty first)
    resolved = resolve_party_name(db, team_member.id)
    assert resolved == "Apex Infra Solutions Pvt Ltd", f"Expected 'Apex Infra Solutions Pvt Ltd', got '{resolved}'"

    # 5. Assert user fallback when library_party_id is None
    user_only = models.User(
        id=uuid.uuid4(),
        name="Suresh User Only",
        email=f"suresh-{uuid.uuid4().hex[:6]}@vendor.com",
        mobile=f"+9198{uuid.uuid4().hex[:8]}",
        password_hash="test",
    )
    db.add(user_only)
    db.commit()

    team_user_only = models.CompanyTeam(
        id=uuid.uuid4(),
        company_id=comp.id,
        user_id=user_only.id,
        library_party_id=None,
        priority_type="contractor",
    )
    db.add(team_user_only)
    db.commit()
    assert resolve_party_name(db, team_user_only.id) == "Suresh User Only"

    # 6. Assert bill PDF output uses the business name
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="Prec-Proj",
        code=f"PRJ-PREC-{uuid.uuid4().hex[:6]}", status="Ongoing", state="Karnataka",
    )
    db.add(project)
    db.commit()

    bill = models.Bill(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=project.id,
        party_company_user_id=team_member.id,
        invoice_number="INV-PREC-001",
        invoice_date=datetime.datetime.utcnow(),
        invoice_type="sale",
        subtotal=50000.0,
        gst_amount=9000.0,
        total_payable=59000.0,
        status="approved",
    )
    db.add(bill)
    db.commit()

    res = client.get(f"/apis/v3/billing/bills/{bill.id}/pdf", headers=hdr)
    assert res.status_code == 200
    assert b"Apex Infra Solutions Pvt Ltd" in res.content
