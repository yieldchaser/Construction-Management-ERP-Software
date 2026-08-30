"""Tier 2 Parity Item 7: Party-type filter in Party Library with constrained vocabulary.
"""
from pathlib import Path
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _tenant(make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"P7-{_SUFFIX}",
        user_name="U-P7",
        mobile=f"+9191{uuid.uuid4().hex[:8]}",
        email=f"p7-{uuid.uuid4().hex[:8]}@test.com",
    )
    return comp, user, team, auth_headers(user, comp)


def test_parity_tier2_party_type_filter(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)

    p1 = models.LibraryParty(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="UltraTech Cement",
        party_type="Supplier",
    )
    p2 = models.LibraryParty(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="Shree Electrical Works",
        party_type="Subcontractor",
    )
    p3 = models.LibraryParty(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="Metro City Developers",
        party_type="Client",
    )
    db.add_all([p1, p2, p3])
    db.commit()

    # 1. Unfiltered query returns all 3
    res_all = client.get(f"/apis/v3/library/parties/{comp.id}", headers=hdr)
    assert res_all.status_code == 200
    all_names = {p["name"] for p in res_all.json()}
    assert "UltraTech Cement" in all_names
    assert "Shree Electrical Works" in all_names
    assert "Metro City Developers" in all_names

    # 2. Filter by Supplier
    res_supplier = client.get(f"/apis/v3/library/parties/{comp.id}?party_type=Supplier", headers=hdr)
    assert res_supplier.status_code == 200
    names = [p["name"] for p in res_supplier.json()]
    assert names == ["UltraTech Cement"]

    # 3. Filter case-insensitively by subcontractor
    res_subcon = client.get(f"/apis/v3/library/parties/{comp.id}?party_type=subcontractor", headers=hdr)
    assert res_subcon.status_code == 200
    names_subcon = [p["name"] for p in res_subcon.json()]
    assert names_subcon == ["Shree Electrical Works"]

    # 4. Check frontend party type filter exists in library page
    page_path = (
        Path(__file__).resolve().parents[3]
        / "frontend" / "src" / "app" / "c" / "[company_id]" / "d" / "library" / "page.tsx"
    )
    content = page_path.read_text(encoding="utf-8")
    assert "partyTypeFilter" in content or "All Party Types" in content, "Party type filter missing from library page"
