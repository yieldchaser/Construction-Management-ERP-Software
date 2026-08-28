"""R2-487 - billing a party must link that party to the project.

The audit's evidenced scenario: a project carrying Rs 1,35,700 of unpaid
bills (including a Rs 1,11,100 subcon bill to an external subcontractor)
reported 'No parties linked to this project' and Rs 0.00 To Pay on the Party
register - because _party_settlement correctly iterates over ProjectParty
rows but nothing in the billing flow ever wrote one, so the loop ran zero
times and the correct helper returned zero.

Fix: create_bill now resolves the bill's CompanyTeam to its library party and
upserts the zero-opening ProjectParty link in the same transaction, so the
first bill against a party makes it visible with its live balance.

Gate: the register is empty before any bill; one subcon bill puts the party
on it at To Pay = total_payable; a second bill to the same party neither
duplicates the row nor loses balance; balances rollup agrees.
"""
import uuid
from datetime import datetime

import pytest

from app import models


def _tenant(make_tenant, auth_headers):
    sfx = uuid.uuid4().hex[:8]
    comp, user, _team = make_tenant(
        company_name=f"R2487-{sfx}", user_name=f"U{sfx}",
        mobile=f"+9196{sfx}", email=f"r2487-{sfx}@test.com",
    )
    return comp, user, auth_headers(user, comp)


def _project(db, comp):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id,
        name=f"P-{uuid.uuid4().hex[:6]}", code=f"PRJ-{uuid.uuid4().hex[:8]}", status="Ongoing",
    )
    db.add(p)
    db.commit()
    return p


def _subcon_party_and_team(db, comp):
    party = models.LibraryParty(
        id=uuid.uuid4(), company_id=comp.id,
        name=f"ZZ Subcon {uuid.uuid4().hex[:6]}",
        party_type="Subcontractor",
    )
    db.add(party)
    db.flush()
    team = models.CompanyTeam(
        id=uuid.uuid4(), company_id=comp.id, user_id=None,
        priority_type="subcontractor", library_party_id=party.id,
    )
    db.add(team)
    db.commit()
    return party, team


def _post_bill(client, hdr, comp, project, team, number, subtotal):
    r = client.post("/apis/v3/billing/bills", headers=hdr, json={
        "company_id": str(comp.id),
        "project_id": str(project.id),
        "party_company_user_id": str(team.id),
        "invoice_number": number,
        "invoice_date": "2026-08-01T00:00:00Z",
        "invoice_type": "subcon",
        "subtotal": subtotal,
        "gst_pct": 0,
    })
    assert r.status_code == 201, r.text
    return r.json()


def test_first_bill_creates_the_link_and_reports_the_balance(client, db, make_tenant, auth_headers):
    comp, _user, hdr = _tenant(make_tenant, auth_headers)
    project = _project(db, comp)
    _party, team = _subcon_party_and_team(db, comp)

    # Pre-condition: exactly the audit's empty register.
    r0 = client.get(f"/apis/v3/projects/{project.id}/parties", headers=hdr)
    assert r0.status_code == 200, r0.text
    assert r0.json() == [], r0.text

    bill = _post_bill(client, hdr, comp, project, team, "SUBCON-487A", 111100.0)

    r1 = client.get(f"/apis/v3/projects/{project.id}/parties", headers=hdr)
    assert r1.status_code == 200, r1.text
    rows = r1.json()
    assert len(rows) == 1, r1.text
    assert rows[0]["name"] == _party.name, r1.text
    assert rows[0]["to_pay"] == pytest.approx(111100.0), r1.text
    assert rows[0]["advance_paid"] == pytest.approx(0.0), r1.text
    assert bill["total_payable"] == pytest.approx(111100.0), r1.text

    rb = client.get(f"/apis/v3/projects/{project.id}/parties/balances", headers=hdr)
    assert rb.status_code == 200, rb.text
    assert rb.json()["to_pay"] == pytest.approx(111100.0), rb.text


def test_second_bill_neither_duplicates_the_row_nor_loses_balance(client, db, make_tenant, auth_headers):
    comp, _user, hdr = _tenant(make_tenant, auth_headers)
    project = _project(db, comp)
    _party, team = _subcon_party_and_team(db, comp)

    _post_bill(client, hdr, comp, project, team, "SUBCON-487B1", 50000.0)
    _post_bill(client, hdr, comp, project, team, "SUBCON-487B2", 24500.0)

    r = client.get(f"/apis/v3/projects/{project.id}/parties", headers=hdr)
    assert r.status_code == 200, r.text
    rows = r.json()
    assert len(rows) == 1, r.text
    assert rows[0]["to_pay"] == pytest.approx(74500.0), r.text


def test_team_without_library_party_still_bills_without_fabricating_a_link(client, db, make_tenant, auth_headers):
    comp, user, hdr = _tenant(make_tenant, auth_headers)
    project = _project(db, comp)
    # The tenant's own platform-user team carries no library_party_id.
    own_team = db.query(models.CompanyTeam).filter(
        models.CompanyTeam.company_id == comp.id,
        models.CompanyTeam.user_id == user.id,
    ).first()
    assert own_team is not None and own_team.library_party_id is None

    bill = _post_bill(client, hdr, comp, project, own_team, "SALE-487C", 1000.0)
    assert bill["total_payable"] == pytest.approx(1000.0)

    r = client.get(f"/apis/v3/projects/{project.id}/parties", headers=hdr)
    assert r.status_code == 200, r.text
    assert r.json() == [], r.text
