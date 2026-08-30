"""R2-444 - the DPR dashboard asserted "No consumption logged" and
"No GRNs today" directly above the very DPR and GRN that recorded 500 cft of
consumption and 10,000 tonne received that same day.

The tiles summed `l.material_received` / `l.material_used`, fields that do not
exist on the DPR payload, so they rendered their empty-state string on every
day the screen was opened regardless of recorded activity.

Gate: GET /dpr/summary answers material_received_today / material_used_today
from the stock ledger (material_transactions) for today's UTC date, scoped to
the project, so a day with recorded consumption/receipt can no longer render
as empty - and another project's activity does not bleed in.
"""
import uuid
from datetime import datetime

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _mk_project(db, comp):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=f"P444-{_SUFFIX}",
        code=f"PRJ-444-{_SUFFIX}", status="Ongoing",
    )
    db.add(p)
    db.commit()
    return p


def test_r2_444_summary_tiles_agree_with_stock_ledger(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"R2444-{_SUFFIX}", user_name="U444",
        mobile=f"+9194{_SUFFIX}", email=f"r2444-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    other = _mk_project(db, comp)

    r = client.post(
        "/apis/v3/dpr",
        headers=hdr,
        json={
            "project_id": str(project.id),
            "dpr_date": datetime.utcnow().isoformat(),
            "executed_qty": 12.0,
            "materials_consumed": [{"material_name": "ZZ R8 Phantom Sand", "quantity": 500.0, "unit": "cft"}],
        },
    )
    assert r.status_code == 201, r.text

    # The GRN half: a receipt transaction created today (what a GRN writes).
    db.add(models.MaterialTransaction(
        id=uuid.uuid4(), project_id=project.id,
        material_name="ZZ R8 Tonne Stone", qty=10000.0,
        type="received", unit="tonne",
    ))
    # Another project's ledger rows must not bleed into this project's tile.
    db.add(models.MaterialTransaction(
        id=uuid.uuid4(), project_id=other.id,
        material_name="Other Project Cement", qty=77.0,
        type="used", unit="bag",
    ))
    db.commit()

    s = client.get(f"/apis/v3/dpr/summary?project_id={project.id}", headers=hdr)
    assert s.status_code == 200, s.text
    body = s.json()
    assert body["material_used_today"] == 500.0, body
    assert body["material_received_today"] == 10000.0, body
    assert body["activities_tracked"] >= 1, body

    o = client.get(f"/apis/v3/dpr/summary?project_id={other.id}", headers=hdr)
    assert o.status_code == 200, o.text
    obody = o.json()
    assert obody["material_used_today"] == 77.0, obody
    assert obody["material_received_today"] == 0.0, obody
