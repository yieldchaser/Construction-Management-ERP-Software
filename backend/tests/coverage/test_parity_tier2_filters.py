"""Tier 2 Parity Item 8: Project and status filters on company payment requests and indents.
"""
from datetime import datetime, timezone
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _tenant(make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"P8-{_SUFFIX}",
        user_name="U-P8",
        mobile=f"+9191{uuid.uuid4().hex[:8]}",
        email=f"p8-{uuid.uuid4().hex[:8]}@test.com",
    )
    return comp, user, team, auth_headers(user, comp)


def test_parity_tier2_payment_request_and_indent_filters(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)

    proj1 = models.Project(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="Project North",
        status="active",
        created_at=datetime.now(timezone.utc),
    )
    proj2 = models.Project(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="Project South",
        status="active",
        created_at=datetime.now(timezone.utc),
    )
    db.add_all([proj1, proj2])
    db.commit()

    now = datetime.now(timezone.utc)

    # 1. Create Payment Requests
    pr1 = models.PaymentRequest(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=proj1.id,
        party_company_user_id=team.id,
        party_name="Vendor A",
        amount=5000.0,
        status="pending",
        created_at=now,
    )
    pr2 = models.PaymentRequest(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=proj1.id,
        party_company_user_id=team.id,
        party_name="Vendor A",
        amount=8000.0,
        status="approved",
        created_at=now,
    )
    pr3 = models.PaymentRequest(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=proj2.id,
        party_company_user_id=team.id,
        party_name="Vendor B",
        amount=12000.0,
        status="pending",
        created_at=now,
    )
    db.add_all([pr1, pr2, pr3])

    # 2. Create Material Indents
    ind1 = models.MaterialIndent(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=proj1.id,
        requested_by=user.id,
        indent_number="IND-001",
        status="pending",
        created_at=now,
    )
    ind2 = models.MaterialIndent(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=proj2.id,
        requested_by=user.id,
        indent_number="IND-002",
        status="approved",
        created_at=now,
    )
    db.add_all([ind1, ind2])
    db.commit()

    # TEST PAYMENT REQUESTS FILTERS
    # Filter by project_id
    r_pr_proj = client.get(f"/apis/v3/finance/payment-requests/{comp.id}?project_id={proj1.id}", headers=hdr)
    assert r_pr_proj.status_code == 200
    ids_proj = {r["id"] for r in r_pr_proj.json()}
    assert ids_proj == {str(pr1.id), str(pr2.id)}

    # Filter by status
    r_pr_status = client.get(f"/apis/v3/finance/payment-requests/{comp.id}?status=approved", headers=hdr)
    assert r_pr_status.status_code == 200
    ids_status = {r["id"] for r in r_pr_status.json()}
    assert ids_status == {str(pr2.id)}

    # Filter by both project_id and status
    r_pr_both = client.get(f"/apis/v3/finance/payment-requests/{comp.id}?project_id={proj1.id}&status=pending", headers=hdr)
    assert r_pr_both.status_code == 200
    ids_both = {r["id"] for r in r_pr_both.json()}
    assert ids_both == {str(pr1.id)}

    # TEST INDENTS FILTERS
    # Filter by project_id
    r_ind_proj = client.get(f"/apis/v3/procurement/indents/company/{comp.id}?project_id={proj1.id}", headers=hdr)
    assert r_ind_proj.status_code == 200
    ids_ind_proj = {r["id"] for r in r_ind_proj.json()}
    assert ids_ind_proj == {str(ind1.id)}

    # Filter by status
    r_ind_status = client.get(f"/apis/v3/procurement/indents/company/{comp.id}?status=approved", headers=hdr)
    assert r_ind_status.status_code == 200
    ids_ind_status = {r["id"] for r in r_ind_status.json()}
    assert ids_ind_status == {str(ind2.id)}
