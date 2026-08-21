"""R2-349 — the three-way match reconciles against the bill, not a typed number.

Gate: POST /three-way requires invoice_id and reads the invoiced amount from
that bill's total_payable. Before the fix the amount was whatever the request
body typed, so the control compared the PO/GRN value against a caller-chosen
figure.
"""
import datetime
import uuid

from app import models


def _mk_project(db, comp):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P", code=f"PRJ-{uuid.uuid4().hex[:8]}", status="Ongoing"
    )
    db.add(p)
    db.commit()
    return p


def _mk_po_grn(db, comp, project, total):
    po = models.PurchaseOrder(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        po_number=f"PO-R349-{uuid.uuid4().hex[:8]}", po_date=datetime.datetime(2026, 1, 5),
        total_amount=total,
    )
    grn = models.GoodsReceiptNote(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id, po_id=po.id,
        grn_number=f"GRN-R349-{uuid.uuid4().hex[:8]}", received_date=datetime.datetime(2026, 1, 6),
    )
    db.add_all([po, grn])
    db.commit()
    return po, grn


def _mk_bill(db, comp, team, project, payable):
    b = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, invoice_number=f"INV-R349-{uuid.uuid4().hex[:8]}",
        invoice_date=datetime.datetime(2026, 1, 10), invoice_type="purchase",
        subtotal=payable, total_payable=payable,
    )
    db.add(b)
    db.commit()
    return b


def test_invoiced_amount_read_from_bill_total_payable(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R349A", user_name="U349A")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    po, grn = _mk_po_grn(db, comp, project, total=60000)
    bill = _mk_bill(db, comp, team, project, payable=75000)

    # A caller-typed invoiced_amount must be irrelevant; the bill is the source.
    r = client.post("/apis/v3/three-way", headers=hdr, json={
        "company_id": str(comp.id), "project_id": str(project.id),
        "po_id": str(po.id), "grn_id": str(grn.id),
        "invoice_id": str(bill.id),
        "invoiced_amount": 60000,
    })
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["invoiced_amount"] == 75000.0, body
    assert body["variance_amount"] == 15000.0, body


def test_missing_invoice_id_is_rejected(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R349B", user_name="U349B")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    po, grn = _mk_po_grn(db, comp, project, total=60000)

    r = client.post("/apis/v3/three-way", headers=hdr, json={
        "company_id": str(comp.id), "project_id": str(project.id),
        "po_id": str(po.id), "grn_id": str(grn.id),
        "invoiced_amount": 60000,
    })
    assert r.status_code == 422, r.text


def test_bill_from_other_company_rejected(client, db, make_tenant, auth_headers):
    comp_a, user_a, _team_a = make_tenant(company_name="R349C", user_name="U349C")
    hdr_a = auth_headers(user_a, comp_a)
    comp_b, _user_b, team_b = make_tenant(company_name="R349D", user_name="U349D")
    project_b = _mk_project(db, comp_b)
    bill_b = _mk_bill(db, comp_b, team_b, project_b, payable=75000)

    project_a = _mk_project(db, comp_a)
    po_a, grn_a = _mk_po_grn(db, comp_a, project_a, total=60000)

    r = client.post("/apis/v3/three-way", headers=hdr_a, json={
        "company_id": str(comp_a.id), "project_id": str(project_a.id),
        "po_id": str(po_a.id), "grn_id": str(grn_a.id),
        "invoice_id": str(bill_b.id),
    })
    assert r.status_code == 403, r.text
