"""R2-344/R2-316 - POST /finance/payments no longer admits payment_type "transfer".

"transfer" was admitted by the create schema but every consumer was two-valued:
FIFO settlement treated it as an expense outflow (settling vendor bills for
money never paid to vendors), the running balances counted neither direction
and the summary rendered it as "Payment Out". No product path ever wrote it
(the P2P transfer endpoint writes a literal in/out pair), so the schema now
admits only "in"/"out" and rejects "transfer" with a pointer to the P2P
transfer endpoint.
"""
import datetime
import uuid

from app import models


def _payload(comp, payment_type):
    return {
        "company_id": str(comp.id),
        "payment_type": payment_type,
        "amount": 100.0,
        "payment_method": "Cash",
        "payment_date": datetime.datetime.utcnow().isoformat(),
    }


def test_transfer_payment_type_is_rejected(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R344A", user_name="U344A")
    hdr = auth_headers(user, comp)

    r = client.post("/apis/v3/finance/payments", json=_payload(comp, "transfer"), headers=hdr)

    assert r.status_code == 422
    body = str(r.json())
    assert "'in'" in body and "'out'" in body
    assert "P2P" in body
    assert db.query(models.Payment).filter_by(company_id=comp.id).count() == 0


def test_in_payment_still_accepted(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R344B", user_name="U344B")
    hdr = auth_headers(user, comp)

    r = client.post("/apis/v3/finance/payments", json=_payload(comp, "in"), headers=hdr)

    assert r.status_code == 201
    assert r.json()["payment_type"] == "in"
    assert db.query(models.Payment).filter_by(company_id=comp.id).count() == 1


def test_out_payment_still_accepted(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R344C", user_name="U344C")
    hdr = auth_headers(user, comp)

    r = client.post("/apis/v3/finance/payments", json=_payload(comp, "out"), headers=hdr)

    assert r.status_code == 201
    assert r.json()["payment_type"] == "out"
    assert db.query(models.Payment).filter_by(company_id=comp.id).count() == 1
