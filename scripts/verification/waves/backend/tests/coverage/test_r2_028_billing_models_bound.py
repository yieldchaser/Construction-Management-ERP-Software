"""R2-028 - the billing module name is bound; the three NameError endpoints run.

billing.py imported names from app.models but never bound the module itself,
so the first request touching models.LibraryParty / models.CompanyTeam raised
NameError -> HTTP 500 on GET and POST work-orders and POST subcontractors
(Sentry PYTHON-FASTAPI-9). The prescribed fix (`from app import models`) is
present at billing.py:14 on this lineage; these tests execute the previously
failing code paths end to end, because an import check alone cannot catch a
module that imports fine and only fails mid-request.
"""
import datetime
import uuid

from app import models
import app.routers.billing as billing_module


def test_module_binding_present():
    assert billing_module.models is models


def test_subcontractor_creation_runs_the_models_paths(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R028-S", user_name="U028S")
    hdr = auth_headers(user, comp)

    r = client.post(
        "/apis/v3/billing/subcontractors",
        json={"company_id": str(comp.id), "name": "R028 Subco"},
        headers=hdr,
    )
    assert r.status_code == 201, r.text

    body = r.json()
    party = db.query(models.LibraryParty).filter(models.LibraryParty.id == body["library_party_id"]).first()
    team = db.query(models.CompanyTeam).filter(models.CompanyTeam.id == body["company_team_id"]).first()
    assert party is not None, r.text
    assert team is not None, r.text
    assert team.library_party_id == party.id


def test_work_order_create_and_list_run_the_models_paths(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R028-W", user_name="U028W")
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P028", code="PRJ-028", status="Ongoing"
    )
    db.add(project)
    db.commit()

    sub = client.post(
        "/apis/v3/billing/subcontractors",
        json={"company_id": str(comp.id), "name": "R028 WO Subco"},
        headers=hdr,
    )
    assert sub.status_code == 201, sub.text
    team_id = sub.json()["company_team_id"]

    r = client.post(
        "/apis/v3/billing/work-orders",
        headers=hdr,
        json={
            "company_id": str(comp.id),
            "project_id": str(project.id),
            "subcontractor_id": team_id,
            "wo_number": f"WO-028-{uuid.uuid4().hex[:6]}",
            "wo_date": datetime.datetime(2026, 8, 1).isoformat(),
            "items": [{"quantity": 5, "rate": 200}],
        },
    )
    assert r.status_code == 201, r.text

    listing = client.get(f"/apis/v3/billing/work-orders?project_id={project.id}", headers=hdr)
    assert listing.status_code == 200, listing.text
    rows = listing.json()
    assert len(rows) == 1
    # The old intermittent path: the WO's team row carries library_party_id, so
    # the listing must resolve the name through it instead of NameError-ing.
    assert rows[0]["subcontractor_name"] == "R028 WO Subco"
