"""R2-381 — money entries obey the Entry Controls back-dating window.

Gate: with restrict_entry_creation_enabled on, a payment dated deeper into the
past than restrict_entry_creation_days must be rejected with 400, exactly as
POST /billing/bills already rejects an old invoice_date. Before the fix every
money entry (payments, recorded payment requests, P2P transfers) accepted any
payment_date, so money could land in a closed period and re-order FIFO
settlement. The window stays a no-op while the flag is off.
"""
import datetime
import uuid

from app import models


def _enable_window(db, comp, days):
    comp.restrict_entry_creation_enabled = True
    comp.restrict_entry_creation_days = days
    db.commit()


def _old(days_ago):
    return (datetime.datetime.utcnow() - datetime.timedelta(days=days_ago)).isoformat()


def _payment_payload(comp, date_iso):
    return {
        "company_id": str(comp.id),
        "payment_type": "in",
        "amount": 100.0,
        "payment_method": "Cash",
        "payment_date": date_iso,
    }


def test_backdated_payment_is_rejected(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R381A", user_name="U381A")
    hdr = auth_headers(user, comp)
    _enable_window(db, comp, 7)

    r = client.post(
        "/apis/v3/finance/payments", json=_payment_payload(comp, _old(30)), headers=hdr
    )
    assert r.status_code == 400
    assert "Entry Controls" in r.json()["detail"]
    assert db.query(models.Payment).filter_by(company_id=comp.id).count() == 0


def test_recent_payment_still_passes(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R381B", user_name="U381B")
    hdr = auth_headers(user, comp)
    _enable_window(db, comp, 7)

    r = client.post(
        "/apis/v3/finance/payments", json=_payment_payload(comp, _old(2)), headers=hdr
    )
    assert r.status_code == 201
    assert db.query(models.Payment).filter_by(company_id=comp.id).count() == 1


def test_window_off_leaves_payments_untouched(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R381C", user_name="U381C")
    hdr = auth_headers(user, comp)

    r = client.post(
        "/apis/v3/finance/payments", json=_payment_payload(comp, _old(400)), headers=hdr
    )
    assert r.status_code == 201


def test_backdated_p2p_transfer_is_rejected(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R381D", user_name="U381D")
    hdr = auth_headers(user, comp)
    _enable_window(db, comp, 7)

    other_user = models.User(id=uuid.uuid4(), name="U381D-other")
    db.add(other_user)
    db.flush()
    other_team = models.CompanyTeam(
        id=uuid.uuid4(), company_id=comp.id, user_id=other_user.id, priority_type="partner"
    )
    db.add(other_team)
    db.commit()

    r = client.post(
        "/apis/v3/cashbook/p2p",
        json={
            "company_id": str(comp.id),
            "sender_company_user_id": str(team.id),
            "receiver_company_user_id": str(other_team.id),
            "amount": 50.0,
            "payment_date": _old(30),
        },
        headers=hdr,
    )
    assert r.status_code == 400
    assert "Entry Controls" in r.json()["detail"]
