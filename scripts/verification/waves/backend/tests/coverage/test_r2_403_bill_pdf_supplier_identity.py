"""R2-403 - the company's registered supplier identity (legal name, GSTIN,
phone, address) must be printed on the invoice PDF, not ignored.

Gate: a company that stored its GSTIN/legal entity name/phone/address in
Settings sees all of them under the masthead of the bill PDF (Rule 46
supplier side); a company storing nothing prints no identity lines; when the
masthead resolves to an issuing branch, that branch's GSTIN/address win over
the company-level ones.
"""
import uuid
import datetime

from app import models


def _mk_project(db, comp, branch_id=None):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P", code=f"PRJ-{uuid.uuid4().hex[:8]}",
        status="Ongoing", branch_id=branch_id,
    )
    db.add(p)
    db.commit()
    return p


def _mk_bill(db, comp, project, party_team_id):
    bill = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=party_team_id,
        invoice_number=f"INV-R403-{uuid.uuid4().hex[:6]}", invoice_type="sale",
        invoice_date=datetime.datetime(2026, 2, 1),
        subtotal=1000.0, total_payable=1000.0,
    )
    db.add(bill)
    db.commit()
    return bill


def test_bill_pdf_prints_registered_supplier_identity(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="AK Construction", user_name="U403A")
    comp.legal_business_name = "Suraj Construction Pvt Ltd"
    comp.gstin = "29ABCDE1234F1Z5"
    comp.phone = "7667359544"
    comp.billing_address = "12 MG Road, Bengaluru 560001"
    db.commit()

    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    bill = _mk_bill(db, comp, project, team.id)

    r = client.get(f"/apis/v3/billing/bills/{bill.id}/pdf", headers=hdr)
    assert r.status_code == 200, r.text
    body = r.content
    assert b"Legal Name: Suraj Construction Pvt Ltd" in body
    assert b"GSTIN: 29ABCDE1234F1Z5" in body
    assert b"Phone: 7667359544" in body
    assert b"Address: 12 MG Road, Bengaluru 560001" in body


def test_bill_pdf_omits_identity_lines_when_company_stores_none(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="Bare Co", user_name="U403B")
    db.commit()

    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    bill = _mk_bill(db, comp, project, team.id)

    r = client.get(f"/apis/v3/billing/bills/{bill.id}/pdf", headers=hdr)
    assert r.status_code == 200, r.text
    body = r.content
    assert b"GSTIN:" not in body
    assert b"Legal Name:" not in body


def test_branch_masthead_prints_branch_gstin_and_address(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="HQ Industries", user_name="U403C")
    comp.document_company_name_display = "branch"
    comp.gstin = "29COMPANY0000AA1"
    comp.billing_address = "Company-level address"
    branch = models.CompanyBranch(
        id=uuid.uuid4(), company_id=comp.id, branch_name="Mysore Branch",
        gstin="29BRANCHXX999K1", billing_address="Branch-level address",
    )
    db.add_all([branch])
    db.commit()

    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, branch_id=branch.id)
    bill = _mk_bill(db, comp, project, team.id)

    r = client.get(f"/apis/v3/billing/bills/{bill.id}/pdf", headers=hdr)
    assert r.status_code == 200, r.text
    body = r.content
    assert b"GSTIN: 29BRANCHXX999K1" in body
    assert b"Address: Branch-level address" in body
    assert b"29COMPANY0000AA1" not in body
