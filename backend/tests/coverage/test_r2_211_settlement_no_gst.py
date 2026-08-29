"""R2-211 - settlement vouchers must not carry GST.

Gate: POST /billing/bills rejects a settlement-type bill (payment_in /
payment_out / i_paid / i_received) whose gst_pct is non-zero. These are
cash movements against already-taxed invoices, not taxable supplies; the
live repro booked a 10,000 Payment In as 11,800 because the form's
default 18% was applied. A zero rate books the voucher at face value.
"""
import datetime
import uuid

from app import models


def _mk_project(db, comp):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P", code=f"PRJ-{uuid.uuid4().hex[:8]}", status="Ongoing", state="Karnataka",
    )
    db.add(p)
    db.commit()
    return p


def _payload(comp, project, team, **kw):
    payload = {
        "company_id": str(comp.id),
        "project_id": str(project.id),
        "party_company_user_id": str(team.id),
        "invoice_number": f"PMT-R211-{uuid.uuid4().hex[:6]}",
        "invoice_date": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "invoice_type": "payment_in",
        "subtotal": 10000.0,
        "gst_pct": 18.0,
        "deductions": [],
    }
    payload.update(kw)
    return payload


def test_settlement_voucher_with_gst_rejected_zero_rate_books_face_value(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R211", user_name="U211")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    # The live defect shape: a Payment In posted with the form's default 18%.
    r = client.post("/apis/v3/billing/bills", json=_payload(comp, project, team), headers=hdr)
    assert r.status_code == 422, r.text
    detail = r.json()["detail"].lower()
    assert "settlement" in detail, detail
    assert "gst" in detail, detail

    # The corrected shape: zero rate books the receipt at face value.
    ok = client.post(
        "/apis/v3/billing/bills",
        json=_payload(comp, project, team, gst_pct=0),
        headers=hdr,
    )
    assert ok.status_code == 201, ok.text
    body = ok.json()
    assert body["gst_amount"] == 0.0, body
    assert body["total_payable"] == 10000.0, body
