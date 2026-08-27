"""R2-400 - the bill/invoice PDF must address the counterparty by its business
name held on LibraryParty (the vendor master), not print "N/A" or whoever
happens to hold a platform login.

Gate: a userless CompanyTeam linked to LibraryParty prints the vendor master
name (the exact live repro: ZZ-QA-NOGST-001 printed Party: N/A); when both a
login and a vendor-master link exist the business name wins; teams without a
library link keep falling back to the member display name; nothing resolvable
still prints N/A.
"""
import uuid
import datetime

from app import models


def _mk_project(db, comp):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P", code=f"PRJ-{uuid.uuid4().hex[:8]}", status="Ongoing"
    )
    db.add(p)
    db.commit()
    return p


def _mk_bill(db, comp, project, party_team_id):
    bill = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=party_team_id, invoice_number=f"INV-R400-{uuid.uuid4().hex[:6]}",
        invoice_date=datetime.datetime(2026, 2, 1), invoice_type="purchase",
        subtotal=1000.0, total_payable=1000.0,
    )
    db.add(bill)
    db.commit()
    return bill


def _get_pdf(client, hdr, bill):
    r = client.get(f"/apis/v3/billing/bills/{bill.id}/pdf", headers=hdr)
    assert r.status_code == 200, r.text
    assert r.headers["content-type"] == "application/pdf"
    return r.content


def test_bill_pdf_prints_vendor_master_name_for_loginless_party(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R400A", user_name="U400A")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    # A vendor who never signed up: userless CompanyTeam linked to the master.
    vendor = models.CompanyTeam(
        id=uuid.uuid4(), company_id=comp.id, user_id=None, priority_type="subcontractor"
    )
    lp = models.LibraryParty(id=uuid.uuid4(), company_id=comp.id, name="ZZ QA NoGST Vendor")
    vendor.library_party_id = lp.id
    db.add_all([vendor, lp])
    db.commit()

    bill = _mk_bill(db, comp, project, vendor.id)
    body = _get_pdf(client, hdr, bill)
    assert b"Party: ZZ QA NoGST Vendor" in body
    assert b"N/A" not in body


def test_bill_pdf_prefers_business_name_over_platform_login(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R400B", user_name="founder-login-name")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    lp = models.LibraryParty(id=uuid.uuid4(), company_id=comp.id, name="Tally Linked Vendor Co")
    team.library_party_id = lp.id
    db.add(lp)
    db.commit()

    bill = _mk_bill(db, comp, project, team.id)
    body = _get_pdf(client, hdr, bill)
    assert b"Party: Tally Linked Vendor Co" in body
    assert b"founder-login-name" not in body


def test_bill_pdf_falls_back_to_member_name_without_library_link(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R400C", user_name="Solo Member Name")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    bill = _mk_bill(db, comp, project, team.id)
    body = _get_pdf(client, hdr, bill)
    assert b"Party: Solo Member Name" in body


def test_bill_pdf_still_prints_na_when_nothing_resolvable(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R400D", user_name="U400D")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    orphan = models.CompanyTeam(
        id=uuid.uuid4(), company_id=comp.id, user_id=None, priority_type="subcontractor"
    )
    db.add(orphan)
    db.commit()

    bill = _mk_bill(db, comp, project, orphan.id)
    body = _get_pdf(client, hdr, bill)
    assert b"Party: N/A" in body
