"""Tier 3 Parity Item 10: Pagination and search across list endpoints.
"""
from datetime import datetime, timezone
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _tenant(make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"P10-{_SUFFIX}",
        user_name="U-P10",
        mobile=f"+9191{uuid.uuid4().hex[:8]}",
        email=f"p10-{uuid.uuid4().hex[:8]}@test.com",
    )
    return comp, user, team, auth_headers(user, comp)


def test_parity_tier3_pagination_and_search(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)

    # 1. Seed 5 parties
    parties = []
    for i in range(5):
        p = models.LibraryParty(
            id=uuid.uuid4(),
            company_id=comp.id,
            name=f"Vendor Batch {i} TargetAlpha" if i == 3 else f"Vendor Batch {i}",
            party_type="Supplier",
            phone=f"987654321{i}",
            email=f"vendor{i}@test.com",
            party_id_custom=f"PID-P10-{i}",
        )
        parties.append(p)
    db.add_all(parties)

    # 2. Seed project and 4 bills
    proj = models.Project(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="Tower Alpha",
        status="active",
        created_at=datetime.now(timezone.utc),
    )
    db.add(proj)
    db.flush()

    party_team = models.CompanyTeam(
        id=uuid.uuid4(),
        company_id=comp.id,
        user_id=None,
        library_party_id=parties[0].id,
        priority_type="supplier",
    )
    db.add(party_team)
    db.flush()

    now = datetime.now(timezone.utc)
    bills = []
    for j in range(4):
        b = models.Bill(
            id=uuid.uuid4(),
            company_id=comp.id,
            project_id=proj.id,
            party_company_user_id=party_team.id,
            invoice_number=f"BILL-P10-{j}-UNIQUE" if j == 2 else f"BILL-P10-{j}",
            invoice_date=now,
            invoice_type="purchase",
            status="Pending",
            subtotal=1000.0 * (j + 1),
            gst_amount=180.0 * (j + 1),
            total_payable=1180.0 * (j + 1),
            paid_amount=0.0,
            approval_flag="approved",
            created_at=now,
        )
        bills.append(b)
    db.add_all(bills)
    db.commit()

    # --- TEST 1: Parties Pagination ---
    # Unpaginated: returns all 5
    r_all = client.get(f"/apis/v3/library/parties/{comp.id}", headers=hdr)
    assert r_all.status_code == 200
    assert len(r_all.json()) == 5
    assert r_all.headers.get("x-total-count") == "5"

    # Paginated: limit=2, offset=0
    r_p1 = client.get(f"/apis/v3/library/parties/{comp.id}?limit=2&offset=0", headers=hdr)
    assert r_p1.status_code == 200
    assert len(r_p1.json()) == 2
    assert r_p1.headers.get("x-total-count") == "5"

    # Paginated: limit=2, offset=2
    r_p2 = client.get(f"/apis/v3/library/parties/{comp.id}?limit=2&offset=2", headers=hdr)
    assert r_p2.status_code == 200
    assert len(r_p2.json()) == 2
    assert r_p2.headers.get("x-total-count") == "5"
    # Ensure page 1 and page 2 are disjoint
    ids_p1 = {p["id"] for p in r_p1.json()}
    ids_p2 = {p["id"] for p in r_p2.json()}
    assert ids_p1.isdisjoint(ids_p2)

    # Search: search=TargetAlpha
    r_search = client.get(f"/apis/v3/library/parties/{comp.id}?search=TargetAlpha", headers=hdr)
    assert r_search.status_code == 200
    assert len(r_search.json()) == 1
    assert r_search.json()[0]["name"] == "Vendor Batch 3 TargetAlpha"
    assert r_search.headers.get("x-total-count") == "1"

    # --- TEST 2: Bills Pagination ---
    # Unpaginated: returns 4
    r_bills_all = client.get(f"/apis/v3/billing/bills/{comp.id}", headers=hdr)
    assert r_bills_all.status_code == 200
    assert len(r_bills_all.json()) == 4
    assert r_bills_all.headers.get("x-total-count") == "4"

    # Paginated: limit=2
    r_bills_page = client.get(f"/apis/v3/billing/bills/{comp.id}?limit=2&offset=0", headers=hdr)
    assert r_bills_page.status_code == 200
    assert len(r_bills_page.json()) == 2
    assert r_bills_page.headers.get("x-total-count") == "4"

    # Search: search=UNIQUE
    r_bills_search = client.get(f"/apis/v3/billing/bills/{comp.id}?search=UNIQUE", headers=hdr)
    assert r_bills_search.status_code == 200
    assert len(r_bills_search.json()) == 1
    assert r_bills_search.json()[0]["invoice_number"] == "BILL-P10-2-UNIQUE"
    assert r_bills_search.headers.get("x-total-count") == "1"

    # --- TEST 3: Finance Transactions Pagination & Search ---
    r_txn_all = client.get(f"/apis/v3/finance/transactions/{comp.id}", headers=hdr)
    assert r_txn_all.status_code == 200
    assert len(r_txn_all.json()["transactions"]) == 4
    assert r_txn_all.headers.get("x-total-count") == "4"

    r_txn_page = client.get(f"/apis/v3/finance/transactions/{comp.id}?limit=2&offset=0", headers=hdr)
    assert r_txn_page.status_code == 200
    assert len(r_txn_page.json()["transactions"]) == 2
    assert r_txn_page.headers.get("x-total-count") == "4"

    r_txn_search = client.get(f"/apis/v3/finance/transactions/{comp.id}?search=UNIQUE", headers=hdr)
    assert r_txn_search.status_code == 200
    assert len(r_txn_search.json()["transactions"]) == 1
    assert r_txn_search.headers.get("x-total-count") == "1"

    # --- TEST 4: Materials Library Pagination & Search ---
    mats = [
        models.LibraryMaterial(
            id=uuid.uuid4(),
            company_id=comp.id,
            name=f"Cement Grade {m}",
            unit="Bag",
            category="Binding",
            item_code=f"MAT-CEM-{m}",
        )
        for m in range(3)
    ]
    db.add_all(mats)
    db.commit()

    r_mats_all = client.get(f"/apis/v3/library/materials/{comp.id}", headers=hdr)
    assert r_mats_all.status_code == 200
    assert len(r_mats_all.json()) == 3
    assert r_mats_all.headers.get("x-total-count") == "3"

    r_mats_page = client.get(f"/apis/v3/library/materials/{comp.id}?limit=1&offset=1", headers=hdr)
    assert r_mats_page.status_code == 200
    assert len(r_mats_page.json()) == 1
    assert r_mats_page.headers.get("x-total-count") == "3"

    r_mats_search = client.get(f"/apis/v3/library/materials/{comp.id}?search=CEM-2", headers=hdr)
    assert r_mats_search.status_code == 200
    assert len(r_mats_search.json()) == 1
    assert r_mats_search.json()[0]["item_code"] == "MAT-CEM-2"
    assert r_mats_search.headers.get("x-total-count") == "1"

