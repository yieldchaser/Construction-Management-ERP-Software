"""R2-076 / R2-312 / R2-560: report handler exceptions must be visible.

A crashing report builder must never masquerade as an empty report. These
tests pin three behaviors:

1. A guarded handler whose query raises still returns the resilient fallback
   shape, but the traceback reaches the logger AND the response carries a
   top-level ``errors`` failure marker.
2. An unguarded handler that raises through the dispatcher gets the same
   treatment at the wrapper.
3. A genuinely empty report carries NO failure marker, so emptiness and
   failure stay distinguishable.
4. R2-560/R2-313: the party ledger accumulates per party, so one party's
   balance never includes another party's transactions.
"""

import logging
import uuid
from datetime import datetime
from decimal import Decimal

from app import models
from app.routers import reports as reports_mod

DATA_URL = "/apis/v3/reports/data"


def _bill(db, company, project, party_team_id, number, invoice_type, amount, when):
    bill = models.Bill(
        id=uuid.uuid4(),
        company_id=company.id,
        project_id=project.id,
        party_company_user_id=party_team_id,
        invoice_number=number,
        invoice_date=when,
        invoice_type=invoice_type,
        status="Unpaid",
        subtotal=amount,
        gst_amount=Decimal("0"),
        total_payable=amount,
    )
    db.add(bill)
    db.commit()
    return bill


def _second_party(db, company, name):
    user = models.User(id=uuid.uuid4(), name=name)
    db.add(user)
    db.flush()
    team = models.CompanyTeam(
        id=uuid.uuid4(), company_id=company.id, user_id=user.id, priority_type="vendor"
    )
    db.add(team)
    db.commit()
    return team


def test_guarded_handler_failure_is_logged_and_marked(
    client, db, make_tenant, auth_headers, monkeypatch, caplog
):
    company, user, _team = make_tenant(company_name="Wave Co", user_name="Wave Owner")

    # Swap the model class the handler passes into Session.query for a plain
    # object, so the query itself raises inside _rep_payment_request's try
    # block. The handler must swallow into the fallback shape while logging
    # the traceback and flagging the failure to the caller.
    monkeypatch.setattr(reports_mod, "PaymentRequest", object())

    with caplog.at_level(logging.ERROR, logger="app.routers.reports"):
        resp = client.get(
            f"{DATA_URL}/payment-request?company_id={company.id}",
            headers=auth_headers(user, company),
        )

    assert resp.status_code == 200
    body = resp.json()
    # Resilient-empty contract preserved...
    assert body["slug"] == "payment-request"
    assert body["rows"] == []
    assert body["generated_at"]
    # ...but honestly marked as failed, never publishable as data.
    assert body["errors"], "expected a top-level failure marker"
    assert any("payment-request" in e for e in body["errors"])

    # The exception with full traceback reached the module logger.
    error_records = [
        r for r in caplog.records
        if r.name == "app.routers.reports" and r.exc_info
    ]
    assert error_records, "expected the swallowed exception to be logged with traceback"


def test_unguarded_handler_failure_is_logged_and_marked(
    client, make_tenant, auth_headers, monkeypatch, caplog
):
    company, user, _team = make_tenant(company_name="Wave Co", user_name="Wave Owner")

    def boom(db, cid, pid):
        raise RuntimeError("synthetic dpr failure")

    monkeypatch.setitem(reports_mod._REPORT_HANDLERS, "dpr", boom)

    with caplog.at_level(logging.ERROR, logger="app.routers.reports"):
        resp = client.get(
            f"{DATA_URL}/dpr?company_id={company.id}",
            headers=auth_headers(user, company),
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["rows"] == []
    assert any("dpr" in e for e in body["errors"])
    error_records = [
        r for r in caplog.records
        if r.name == "app.routers.reports" and r.exc_info
    ]
    assert error_records


def test_genuinely_empty_report_carries_no_failure_marker(client, db, make_tenant, auth_headers):
    company, user, _team = make_tenant(company_name="Wave Co", user_name="Wave Owner")

    # Same slug that fails above, but nothing goes wrong here: the company
    # simply has no payment requests. Empty must stay distinguishable from
    # failed.
    resp = client.get(
        f"{DATA_URL}/payment-request?company_id={company.id}",
        headers=auth_headers(user, company),
    )
    body = resp.json()
    assert resp.status_code == 200
    assert body["rows"] == []
    assert body["errors"] == []

    # Unknown slugs are honest too: no handler is not a failure.
    resp = client.get(
        f"{DATA_URL}/does-not-exist?company_id={company.id}",
        headers=auth_headers(user, company),
    )
    body = resp.json()
    assert resp.status_code == 200
    assert body["rows"] == []
    assert body["errors"] == []


def test_party_ledger_accumulates_per_party_not_company_wide(client, db, make_tenant, auth_headers):
    company, user, _team = make_tenant(company_name="Wave Co", user_name="Wave Owner")
    alpha = _second_party(db, company, "Alpha Vendor")
    beta = _second_party(db, company, "Beta Supplier")

    project = models.Project(id=uuid.uuid4(), company_id=company.id, name="Wave Project")
    db.add(project)
    db.commit()

    # Alpha sells 100 on day 1 (+100 receivable); Beta buys 40 on day 2
    # (-40 payable). Under R2-313's single company-wide accumulator both
    # parties ended up keyed to the running company total instead.
    _bill(db, company, project, alpha.id, f"ALPHA-{uuid.uuid4().hex[:8]}",
          "sale", Decimal("100.00"), datetime(2026, 8, 1, 10, 0))
    _bill(db, company, project, beta.id, f"BETA-{uuid.uuid4().hex[:8]}",
          "purchase", Decimal("40.00"), datetime(2026, 8, 2, 10, 0))

    resp = client.get(
        f"{DATA_URL}/all-party-balances?company_id={company.id}",
        headers=auth_headers(user, company),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["errors"] == []
    by_party = {row["Party Name"]: row for row in body["rows"]}
    assert by_party["Alpha Vendor"]["Balance Amount"] == 100.0
    assert by_party["Beta Supplier"]["Balance Amount"] == -40.0
    assert by_party["Alpha Vendor"]["Balance Type"] == "Receivable"
    assert by_party["Beta Supplier"]["Balance Type"] == "Payable"

    resp = client.get(
        f"{DATA_URL}/party-ledger?company_id={company.id}",
        headers=auth_headers(user, company),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["errors"] == []
    assert len(body["rows"]) == 2
    # Each row's Balance is that party's own running balance, not the
    # company-wide net position at that moment.
    assert body["rows"][0]["Party Name"] == "Alpha Vendor"
    assert body["rows"][0]["Balance"] == 100.0
    assert body["rows"][1]["Party Name"] == "Beta Supplier"
    assert body["rows"][1]["Balance"] == -40.0
