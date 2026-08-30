"""Tier 4 Parity Item 15: Rented equipment fleet query filter and alias support.
"""
from datetime import datetime, timezone
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _tenant(make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"P15-{_SUFFIX}",
        user_name="U-P15",
        mobile=f"+9191{uuid.uuid4().hex[:8]}",
        email=f"p15-{uuid.uuid4().hex[:8]}@test.com",
    )
    return comp, user, team, auth_headers(user, comp)


def test_parity_tier4_equipment_ownership_and_rented_filter(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)

    # 1. Create Owned and Hired equipment
    eq_owned = models.Equipment(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="JCB 3DX Excavator",
        code=f"EXC-{uuid.uuid4().hex[:4]}",
        category="Excavator",
        ownership_type="Owned",
        status="available",
        hourly_rate=1500.0,
    )
    eq_hired = models.Equipment(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="Tower Crane Hired",
        code=f"CRN-{uuid.uuid4().hex[:4]}",
        category="Crane",
        ownership_type="Hired",
        status="available",
        hourly_rate=3500.0,
    )
    db.add_all([eq_owned, eq_hired])
    db.commit()

    # 2. Query all fleet
    r_all = client.get(f"/apis/v3/equipment/{comp.id}", headers=hdr)
    assert r_all.status_code == 200
    all_eq = r_all.json()
    assert len(all_eq) == 2

    # 3. Filter by Owned
    r_owned = client.get(f"/apis/v3/equipment/{comp.id}?ownership_type=Owned", headers=hdr)
    assert r_owned.status_code == 200
    owned_list = r_owned.json()
    assert len(owned_list) == 1
    assert owned_list[0]["ownership_type"] == "Owned"
    assert owned_list[0]["id"] == str(eq_owned.id)

    # 4. Filter by Hired
    r_hired = client.get(f"/apis/v3/equipment/{comp.id}?ownership_type=Hired", headers=hdr)
    assert r_hired.status_code == 200
    hired_list = r_hired.json()
    assert len(hired_list) == 1
    assert hired_list[0]["ownership_type"] == "Hired"
    assert hired_list[0]["id"] == str(eq_hired.id)

    # 5. Filter by Rented (competitor terminology alias to Hired)
    r_rented = client.get(f"/apis/v3/equipment/{comp.id}?ownership_type=Rented", headers=hdr)
    assert r_rented.status_code == 200
    rented_list = r_rented.json()
    assert len(rented_list) == 1
    assert rented_list[0]["ownership_type"] == "Hired"
    assert rented_list[0]["id"] == str(eq_hired.id)
