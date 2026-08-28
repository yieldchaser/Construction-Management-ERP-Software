"""R2-276 - /finance/ledger resolves party names through the shared helper.

get_ledger walked CompanyTeam -> users only and silently printed placeholders
("Walk-in Party" / "Vendor/Client") for real parties whose name lives on the
linked LibraryParty (user_id NULL), while /transactions already used the
LibraryParty-aware _txn_party_name helper. The ledger now routes through the
same shared resolution.
"""
import datetime
import uuid

from app import models


def _mk_project(db, comp, name):
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=name, code=name, status="Ongoing"
    )
    db.add(project)
    db.commit()
    return project


def _mk_external_team(db, comp, party_name):
    party = models.LibraryParty(id=uuid.uuid4(), company_id=comp.id, name=party_name)
    team = models.CompanyTeam(
        id=uuid.uuid4(), company_id=comp.id, user_id=None,
        priority_type="subcontractor", library_party_id=party.id,
    )
    db.add_all([party, team])
    db.commit()
    return team


def test_ledger_resolves_library_party_names(client, db, make_tenant, auth_headers):
    import os as _os

    tag = _os.urandom(3).hex()
    comp, user, _team = make_tenant(
        company_name=f"R276A{tag}", user_name="U276A",
        mobile=f"+9199000{tag[:5]}", email=f"r276a{tag}@test.com",
    )
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, "R276-P1")
    ext = _mk_external_team(db, comp, "ZZ Library Subcon Co")

    payment = models.Payment(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=ext.id, payment_type="in",
        amount=700.0, unsettled_amount=700.0, payment_method="Cash",
        payment_date=datetime.datetime(2026, 2, 1),
    )
    bill = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=ext.id, invoice_number=f"INV-R276-{tag}",
        invoice_date=datetime.datetime(2026, 2, 2), invoice_type="purchase",
        subtotal=500.0, total_payable=500.0,
    )
    db.add_all([payment, bill])
    db.commit()

    r = client.get(f"/apis/v3/finance/ledger?project_id={project.id}", headers=hdr)
    assert r.status_code == 200, r.text
    rows = r.json()
    assert len(rows) == 2

    by_type = {row["type"]: row for row in rows}
    assert by_type["Receipt"]["party"] == "ZZ Library Subcon Co"
    assert by_type["Expense"]["party"] == "ZZ Library Subcon Co"


def test_ledger_placeholders_only_for_unresolvable_parties(client, db, make_tenant, auth_headers):
    import os as _os

    tag = _os.urandom(3).hex()
    comp, user, _team = make_tenant(
        company_name=f"R276B{tag}", user_name="U276B",
        mobile=f"+9199100{tag[:5]}", email=f"r276b{tag}@test.com",
    )
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, "R276-P2")

    ghost_payment = models.Payment(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=uuid.uuid4(), payment_type="in",
        amount=10.0, unsettled_amount=10.0, payment_method="Cash",
        payment_date=datetime.datetime(2026, 3, 1),
    )
    anon_payment = models.Payment(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=None, payment_type="in",
        amount=20.0, unsettled_amount=20.0, payment_method="Cash",
        payment_date=datetime.datetime(2026, 3, 2),
    )
    db.add_all([ghost_payment, anon_payment])
    db.commit()

    r = client.get(f"/apis/v3/finance/ledger?project_id={project.id}", headers=hdr)
    assert r.status_code == 200, r.text
    rows = r.json()
    assert len(rows) == 2

    parties = sorted(row["party"] for row in rows)
    # Unknown team id -> honest fallback; no party at all -> walk-in placeholder.
    assert parties == sorted(["Unknown Party", "Walk-in Party"])
