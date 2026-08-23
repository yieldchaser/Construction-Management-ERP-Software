"""R2-322 / R2-323 / R2-324: report honesty fixes pinned as behavior.

1. R2-322: the party ledger's Creator Name must never be the counterparty.
   No ledger source table carries a created-by column, so rows carry an
   honest empty rather than a fabricated attribution to Party Name.
2. R2-323: material stock movement keys its running balance by
   (project_id, material_name, unit), so same-named materials in different
   projects or units never merge into one series, and UOM comes from the
   transaction's unit instead of a hardcoded blank.
3. R2-324: a malformed company_id/project_id fails 422 naming the parameter,
   and _project_ids_for_company no longer swallows database failures into []
   (which builders read as "no projects"); the failure surfaces via the
   top-level errors marker with a logged traceback.
"""

import logging
import uuid
from datetime import datetime
from decimal import Decimal

from app import models
from app.routers import reports as reports_mod

DATA_URL = "/apis/v3/reports/data"


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


def test_party_ledger_creator_name_is_never_the_counterparty(
    client, db, make_tenant, auth_headers
):
    company, user, _team = make_tenant(company_name="Wave Co", user_name="Wave Owner")
    vendor = _second_party(db, company, "Alpha Vendor")

    project = models.Project(id=uuid.uuid4(), company_id=company.id, name="Wave Project")
    db.add(project)
    db.commit()

    bill = models.Bill(
        id=uuid.uuid4(),
        company_id=company.id,
        project_id=project.id,
        party_company_user_id=vendor.id,
        invoice_number=f"BILL-{uuid.uuid4().hex[:8]}",
        invoice_date=datetime(2026, 8, 1, 10, 0),
        invoice_type="sale",
        status="Unpaid",
        subtotal=Decimal("100.00"),
        gst_amount=Decimal("0"),
        total_payable=Decimal("100.00"),
    )
    payment = models.Payment(
        id=uuid.uuid4(),
        company_id=company.id,
        project_id=project.id,
        party_company_user_id=vendor.id,
        payment_type="in",
        amount=Decimal("40.00"),
        unsettled_amount=Decimal("40.00"),
        payment_method="Cash",
        payment_date=datetime(2026, 8, 2, 10, 0),
    )
    db.add_all([bill, payment])
    db.commit()

    resp = client.get(
        f"{DATA_URL}/party-ledger?company_id={company.id}",
        headers=auth_headers(user, company),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["errors"] == []
    assert len(body["rows"]) == 2
    for row in body["rows"]:
        # The defect printed the counterparty's own name here on every row.
        assert row["Creator Name"] != row["Party Name"]
        # No source table carries a created-by column, so honest empty is
        # the correct emission; anything non-empty would be fabricated.
        assert row["Creator Name"] == ""
    assert {row["Party Name"] for row in body["rows"]} == {"Alpha Vendor"}


def test_material_stock_movement_separates_same_named_materials_and_fills_uom(
    client, db, make_tenant, auth_headers
):
    company, user, _team = make_tenant(company_name="Wave Co", user_name="Wave Owner")
    p1 = models.Project(id=uuid.uuid4(), company_id=company.id, name="Tower A")
    p2 = models.Project(id=uuid.uuid4(), company_id=company.id, name="Tower B")
    db.add_all([p1, p2])
    db.commit()

    def txn(project, name, unit, qty, kind, when):
        return models.MaterialTransaction(
            id=uuid.uuid4(),
            project_id=project.id,
            material_name=name,
            qty=qty,
            type=kind,
            unit=unit,
            created_at=when,
        )

    # Same material name across two projects and two units. Keyed by name
    # alone these merged into one climbing series; per (project, name, unit)
    # each row's Opening/Closing reflects only its own stream.
    db.add_all([
        txn(p1, "Cement", "bag", Decimal("100"), "received", datetime(2026, 8, 1, 9, 0)),
        txn(p1, "Cement", "tonne", Decimal("10"), "received", datetime(2026, 8, 1, 10, 0)),
        txn(p2, "Cement", "bag", Decimal("50"), "received", datetime(2026, 8, 1, 11, 0)),
        txn(p1, "Cement", "tonne", Decimal("4"), "used", datetime(2026, 8, 2, 9, 0)),
    ])
    db.commit()

    resp = client.get(
        f"{DATA_URL}/material-stock-movement?company_id={company.id}",
        headers=auth_headers(user, company),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["errors"] == []
    rows = body["rows"]
    assert len(rows) == 4

    def find(project, unit, direction):
        col = "Stock In" if direction == "in" else "Stock Out"
        matches = [
            r for r in rows
            if r["Project Name"] == project.name
            and r["UOM"] == unit
            and r[col] > 0
        ]
        assert len(matches) == 1, f"expected exactly one {project.name}/{unit} {direction} row"
        return matches[0]

    r_p1_bag = find(p1, "bag", "in")
    assert r_p1_bag["Opening Qty"] == 0.0 and r_p1_bag["Closing Qty"] == 100.0

    # Under the name-only key this row showed Opening 100 / Closing 110,
    # silently netting the bag stream into the tonne stream.
    r_p1_tonne_in = find(p1, "tonne", "in")
    assert r_p1_tonne_in["Opening Qty"] == 0.0 and r_p1_tonne_in["Closing Qty"] == 10.0

    r_p2_bag = find(p2, "bag", "in")
    assert r_p2_bag["Opening Qty"] == 0.0 and r_p2_bag["Closing Qty"] == 50.0

    # And the tonne stream continues from its own balance only.
    r_p1_tonne_out = find(p1, "tonne", "out")
    assert r_p1_tonne_out["Opening Qty"] == 10.0 and r_p1_tonne_out["Closing Qty"] == 6.0

    # UOM is populated from each transaction's unit, never hardcoded blank.
    assert all(r["UOM"] in ("bag", "tonne") for r in rows)


def test_malformed_ids_fail_422_naming_parameter(client, make_tenant, auth_headers):
    company, user, _team = make_tenant(company_name="Wave Co", user_name="Wave Owner")

    resp = client.get(
        f"{DATA_URL}/party-ledger?company_id=not-a-uuid",
        headers=auth_headers(user, company),
    )
    assert resp.status_code == 422
    assert "company_id" in resp.json()["detail"]

    resp = client.get(
        f"{DATA_URL}/party-ledger?company_id={company.id}&project_id=also-not-a-uuid",
        headers=auth_headers(user, company),
    )
    assert resp.status_code == 422
    assert "project_id" in resp.json()["detail"]

    # Sanity: well-formed ids still pass validation and reach the handler.
    resp = client.get(
        f"{DATA_URL}/party-ledger?company_id={company.id}",
        headers=auth_headers(user, company),
    )
    assert resp.status_code == 200


def test_project_ids_helper_failure_surfaces_errors_marker(
    client, make_tenant, auth_headers, monkeypatch, caplog
):
    company, user, _team = make_tenant(company_name="Wave Co", user_name="Wave Owner")

    # Make the Project query inside _project_ids_for_company raise. The old
    # swallow turned that into [] and every builder answered "empty report";
    # now the traceback is logged and the response carries the errors marker.
    class Boom:
        def __getattr__(self, item):
            raise RuntimeError("synthetic project lookup failure")

    monkeypatch.setattr(reports_mod, "Project", Boom())

    with caplog.at_level(logging.ERROR, logger="app.routers.reports"):
        resp = client.get(
            f"{DATA_URL}/dpr?company_id={company.id}",
            headers=auth_headers(user, company),
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["rows"] == []
    assert body["errors"], "expected a top-level failure marker instead of silent []"
    error_records = [
        r for r in caplog.records
        if r.name == "app.routers.reports" and r.exc_info
    ]
    assert error_records, "expected the swallowed exception to be logged with traceback"
