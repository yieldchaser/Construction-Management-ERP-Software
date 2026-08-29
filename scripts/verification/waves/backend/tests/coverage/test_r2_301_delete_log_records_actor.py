"""R2-301 regression pin: the deletion audit trail must record who performed
the deletion. The payment and payment-request delete routes previously wrote
DeleteLog rows with deleted_by left null even though the authenticated actor
was in scope, so the audit screen could never answer "who removed this"."""
import datetime
import uuid

from app import models


def test_payment_delete_log_records_actor(client, db, make_tenant, auth_headers):
    comp, user_a, _ = make_tenant(company_name="A", user_name="Alice Actor", mobile="+919999993101")
    _, user_b, _ = make_tenant(company_name="B", user_name="Bob Outsider", mobile="+919999993102")

    p = models.Payment(
        id=uuid.uuid4(), company_id=comp.id, payment_type="out", amount=50.0,
        unsettled_amount=50.0, payment_method="cash",
        payment_date=datetime.datetime(2026, 1, 1),
    )
    db.add(p)
    db.commit()

    # A member of company A deletes the payment.
    r = client.delete(f"/apis/v3/finance/payments/{p.id}", headers=auth_headers(user_a, comp))
    assert r.status_code == 204

    log = (
        db.query(models.DeleteLog)
        .filter(models.DeleteLog.entity_type == "payment", models.DeleteLog.entity_id == str(p.id))
        .first()
    )
    assert log is not None
    assert log.deleted_by == "Alice Actor"
