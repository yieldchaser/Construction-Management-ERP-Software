"""R2-177 - work orders get the void path billing already has for bills.

Gate: POST /billing/work-orders/{id}/cancel flips an active WO to status
"cancelled" (the value budget.py and the R2-253 subcon-billing cap already
exclude), refuses a WO that still has open bills, and refuses double-cancel.
Before the fix no endpoint could move a WO off "active", so a WO raised
against the wrong subcontractor was permanent and kept counting toward the
cumulative billing ceiling forever.
"""
import datetime
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _mk_project(db, comp):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=f"P177-{_SUFFIX}", code=f"PRJ-177-{_SUFFIX}", status="Ongoing"
    )
    db.add(p)
    db.commit()
    return p


def _create_wo(client, hdr, comp, project, team):
    r = client.post(
        "/apis/v3/billing/work-orders",
        headers=hdr,
        json={
            "company_id": str(comp.id),
            "project_id": str(project.id),
            "subcontractor_id": str(team.id),
            "wo_number": f"WO-177-{_SUFFIX}-{uuid.uuid4().hex[:6]}",
            "wo_date": datetime.datetime(2026, 8, 1).isoformat(),
            "items": [{"quantity": 10, "rate": 100}],
        },
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_cancel_work_order_flips_status(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R177", user_name="U177")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    wo = _create_wo(client, hdr, comp, project, team)

    r = client.post(f"/apis/v3/billing/work-orders/{wo['id']}/cancel", headers=hdr)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "cancelled"

    listing = client.get(f"/apis/v3/billing/work-orders?project_id={project.id}", headers=hdr)
    assert listing.status_code == 200, listing.text
    row = next(w for w in listing.json() if w["id"] == wo["id"])
    assert row["status"] == "cancelled"


def test_cancel_blocked_while_open_bills_reference_wo(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R177b", user_name="U177b")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    wo = _create_wo(client, hdr, comp, project, team)

    b = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, invoice_number=f"INV-177-{_SUFFIX}",
        invoice_date=datetime.datetime(2026, 8, 2), invoice_type="subcon",
        subtotal=500.0, total_payable=500.0, status="Unpaid", wo_id=wo["id"],
    )
    db.add(b)
    db.commit()

    r = client.post(f"/apis/v3/billing/work-orders/{wo['id']}/cancel", headers=hdr)
    assert r.status_code == 409, r.text

    b.status = "Cancelled"
    db.commit()
    r2 = client.post(f"/apis/v3/billing/work-orders/{wo['id']}/cancel", headers=hdr)
    assert r2.status_code == 200, r2.text


def test_double_cancel_conflicts(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R177c", user_name="U177c")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    wo = _create_wo(client, hdr, comp, project, team)

    first = client.post(f"/apis/v3/billing/work-orders/{wo['id']}/cancel", headers=hdr)
    assert first.status_code == 200, first.text
    again = client.post(f"/apis/v3/billing/work-orders/{wo['id']}/cancel", headers=hdr)
    assert again.status_code == 409, again.text
