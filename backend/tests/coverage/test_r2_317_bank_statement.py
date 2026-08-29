"""R2-317 - the Bank Statement report must not silently drop payments.

_rep_bank_statement filtered `Payment.account_name.isnot(None)` and bucketed on
that free-text string. Measured in production: 7 of 7 payments had a null or
empty account_name, so the report returned nothing for any company. Three
consequences, all closed here:

  1. Payments with no account_name were absent from the statement entirely,
     with no "unassigned" bucket and no total revealing the omission -- the
     statement could never be reconciled against the bank.
  2. "HDFC Current", "HDFC current" and "HDFC Current " were three separate
     statements, each with its own running balance.
  3. The rows could not be tied to a real account: BankAccount has no
     account_name column at all, and Payment.account_id -- a real FK -- was
     imported and never used.

The statement now buckets on account_id and keeps an honest "Unassigned" bucket
for payments recorded against no account, so nothing disappears.
"""
import uuid
from datetime import datetime, timezone

from app import models

REPORT = "/apis/v3/reports/data/bank-statement"


def _account(db, company_id, holder="SiteFlow Ltd", bank="HDFC", number="100200300",
             ifsc="HDFC0000001"):
    acc = models.BankAccount(
        id=uuid.uuid4(),
        company_id=company_id,
        account_holder_name=holder,
        bank_name=bank,
        account_number=number,
        ifsc_code=ifsc,
        balance=0.0,
    )
    db.add(acc)
    db.commit()
    return acc


def _payment(db, company_id, *, amount, payment_type, account_id=None, account_name=None,
             when=None):
    p = models.Payment(
        id=uuid.uuid4(),
        company_id=company_id,
        payment_type=payment_type,
        amount=amount,
        unsettled_amount=amount,
        payment_method="Bank Transfer",
        payment_date=when or datetime(2026, 8, 10, tzinfo=timezone.utc),
        account_id=account_id,
        account_name=account_name,
    )
    db.add(p)
    db.commit()
    return p


def _rows(client, hdr, company_id):
    r = client.get(f"{REPORT}?company_id={company_id}", headers=hdr)
    assert r.status_code == 200, r.text
    return r.json()["rows"]


def test_payment_with_no_account_is_not_silently_dropped(client, db, make_tenant, auth_headers):
    """The production symptom: every payment unassigned -> report returned []."""
    comp, user, _ = make_tenant(company_name="R317A", user_name="U317A")
    hdr = auth_headers(user, comp)
    _payment(db, comp.id, amount=5000.0, payment_type="in")  # no account at all

    rows = _rows(client, hdr, comp.id)
    assert len(rows) == 1, "a payment recorded without an account vanished from the statement"
    assert rows[0]["Credit"] == 5000.0
    assert "Unassigned" in rows[0]["Account Name"]


def test_unassigned_bucket_is_labelled_not_blank(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R317B", user_name="U317B")
    hdr = auth_headers(user, comp)
    _payment(db, comp.id, amount=250.0, payment_type="out")

    rows = _rows(client, hdr, comp.id)
    assert len(rows) == 1
    label = rows[0]["Account Name"]
    assert label, "the unassigned bucket must be named, not blank"
    assert "Unassigned" in label


def test_payments_bucket_by_account_id_not_free_text(client, db, make_tenant, auth_headers):
    """Case/whitespace variants of one account must not fragment the statement."""
    comp, user, _ = make_tenant(company_name="R317C", user_name="U317C")
    hdr = auth_headers(user, comp)
    acc = _account(db, comp.id)

    _payment(db, comp.id, amount=1000.0, payment_type="in",
             account_id=acc.id, account_name="HDFC Current")
    _payment(db, comp.id, amount=200.0, payment_type="out",
             account_id=acc.id, account_name="HDFC current")

    rows = _rows(client, hdr, comp.id)
    assert len(rows) == 2, "one account rendered as two statements"
    assert len({r["Account Name"] for r in rows}) == 1, (
        "the same account_id produced more than one bucket"
    )
    # One running balance across the bucket: +1000 then -200.
    assert [r["Balance"] for r in rows] == [1000.0, 800.0], [r["Balance"] for r in rows]


def test_distinct_accounts_stay_separate(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R317D", user_name="U317D")
    hdr = auth_headers(user, comp)
    acc_a = _account(db, comp.id, bank="HDFC", number="111", ifsc="HDFC0000001")
    acc_b = _account(db, comp.id, bank="ICICI", number="222", ifsc="ICIC0000001")

    _payment(db, comp.id, amount=100.0, payment_type="in", account_id=acc_a.id,
             account_name="HDFC Current")
    _payment(db, comp.id, amount=50.0, payment_type="in", account_id=acc_b.id,
             account_name="ICICI Current")

    rows = _rows(client, hdr, comp.id)
    assert len({r["Account Name"] for r in rows}) == 2


def test_named_account_label_comes_from_the_bank_account_record(
    client, db, make_tenant, auth_headers
):
    comp, user, _ = make_tenant(company_name="R317E", user_name="U317E")
    hdr = auth_headers(user, comp)
    acc = _account(db, comp.id, bank="HDFC", number="100200300")

    _payment(db, comp.id, amount=10.0, payment_type="in", account_id=acc.id,
             account_name="typo'd free text")

    rows = _rows(client, hdr, comp.id)
    assert "HDFC" in rows[0]["Account Name"], (
        "the bucket label must come from the BankAccount row, not the free-text field"
    )
    assert "typo" not in rows[0]["Account Name"].lower()
