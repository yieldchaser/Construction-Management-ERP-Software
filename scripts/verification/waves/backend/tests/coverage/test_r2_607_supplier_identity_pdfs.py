"""R2-607 - the registered supplier identity (legal name, GSTIN, phone,
address) stored on the Company row must be printed on every client-facing
document PDF, not only bills (R2-403): purchase orders, BOQ documents and
client progress reports all carry it under their masthead now.
"""
import os
import uuid

from app import models
from app.routers.reports import REPORTS_DIR


def _mk_project(db, comp):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P", code=f"PRJ-{uuid.uuid4().hex[:8]}",
        status="Ongoing",
    )
    db.add(p)
    db.commit()
    return p


def _store_identity(db, comp):
    comp.legal_business_name = "Suraj Construction Pvt Ltd"
    comp.gstin = "29ABCDE1234F1Z5"
    comp.phone = "7667359544"
    comp.billing_address = "12 MG Road, Bengaluru 560001"
    db.commit()


def test_po_pdf_prints_registered_supplier_identity(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="AK Construction", user_name="U607A")
    _store_identity(db, comp)
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    po = models.PurchaseOrder(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        po_number=f"PO-R607-{uuid.uuid4().hex[:6]}", po_date=__import__("datetime").datetime(2026, 6, 1),
        status="draft", gross_amount=1000.0, tax_amount=180.0, total_amount=1180.0,
    )
    db.add(po)
    db.commit()

    r = client.get(f"/apis/v3/procurement/pos/{po.id}/pdf", headers=hdr)
    assert r.status_code == 200, r.text
    body = r.content
    assert b"Legal Name: Suraj Construction Pvt Ltd" in body
    assert b"GSTIN: 29ABCDE1234F1Z5" in body
    assert b"Phone: 7667359544" in body
    assert b"Address: 12 MG Road, Bengaluru 560001" in body


def test_boq_pdf_prints_registered_supplier_identity(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="BQ Builders", user_name="U607B")
    _store_identity(db, comp)
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    doc = models.BOQDocument(id=uuid.uuid4(), project_id=project.id, title="Main BOQ")
    db.add(doc)
    db.commit()

    r = client.get(f"/apis/v3/budgeting/boq-documents/{doc.id}/pdf", headers=hdr)
    assert r.status_code == 200, r.text
    body = r.content
    assert b"GSTIN: 29ABCDE1234F1Z5" in body
    assert b"Legal Name: Suraj Construction Pvt Ltd" in body
    assert b"Address: 12 MG Road, Bengaluru 560001" in body


def test_client_report_pdf_prints_registered_supplier_identity(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="CR Infra", user_name="U607C")
    _store_identity(db, comp)
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    r = client.post(
        f"/apis/v3/reports/generate/{project.id}",
        json={"report_name": "R607 Progress"},
        headers=hdr,
    )
    assert r.status_code == 201, r.text
    pdf_filename = r.json()["pdf_url"].rsplit("/", 1)[-1]
    try:
        with open(os.path.join(REPORTS_DIR, pdf_filename), "rb") as f:
            body = f.read()
        assert b"GSTIN: 29ABCDE1234F1Z5" in body
        assert b"Legal Name: Suraj Construction Pvt Ltd" in body
        assert b"Phone: 7667359544" in body
        assert b"Address: 12 MG Road, Bengaluru 560001" in body
    finally:
        if os.path.exists(os.path.join(REPORTS_DIR, pdf_filename)):
            os.remove(os.path.join(REPORTS_DIR, pdf_filename))


def test_po_pdf_omits_identity_lines_when_company_stores_none(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="Bare Co", user_name="U607D")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    po = models.PurchaseOrder(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        po_number=f"PO-R607-{uuid.uuid4().hex[:6]}", po_date=__import__("datetime").datetime(2026, 6, 1),
        status="draft",
    )
    db.add(po)
    db.commit()

    r = client.get(f"/apis/v3/procurement/pos/{po.id}/pdf", headers=hdr)
    assert r.status_code == 200
    body = r.content
    assert b"GSTIN:" not in body
    assert b"Legal Name:" not in body
