"""Item C5: Narrow broad exceptions in hr.py, billing.py, and procurement.py.
"""
from datetime import datetime, timezone
import uuid
from unittest.mock import patch

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _tenant(make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"C5-{_SUFFIX}",
        user_name="U-C5",
        mobile=f"+9198{uuid.uuid4().hex[:8]}",
        email=f"c5-{uuid.uuid4().hex[:8]}@test.com",
    )
    return comp, user, team, auth_headers(user, comp)


def test_c5_hr_payroll_upload_binary_returns_clean_400(client, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)

    res = client.post(
        "/apis/v3/hr/payroll/upload",
        headers=hdr,
        data={"company_id": str(comp.id)},
        files={"file": ("payroll.csv", b"\xff\xfe\x00\x00binary_data", "text/csv")},
    )
    assert res.status_code == 400
    assert "could not be decoded as UTF-8 text" in res.json()["detail"]


def test_c5_procurement_grn_vendor_performance_failure_logged_not_swallowed(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)

    project = models.Project(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="C5 Project",
        status="Ongoing",
    )
    db.add(project)

    po = models.PurchaseOrder(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=project.id,
        po_number=f"PO-C5-{_SUFFIX}",
        po_date=datetime.now(timezone.utc),
        total_amount=1000.0,
        status="sent",
        approval_flag="approved",
    )
    db.add(po)
    db.commit()

    with patch("app.routers.procurement.logger.exception") as mock_log:
        with patch("app.routers.vendor_performance.refresh_vendor_performance", side_effect=RuntimeError("simulated error")):
            res = client.post(
                "/apis/v3/procurement/grns",
                headers=hdr,
                json={
                    "company_id": str(comp.id),
                    "project_id": str(project.id),
                    "po_id": str(po.id),
                    "grn_number": f"GRN-C5-{_SUFFIX}",
                    "received_date": datetime.now(timezone.utc).isoformat(),
                    "items": [],
                },
            )
            assert res.status_code == 201, res.text
            assert mock_log.called
            assert "Failed to refresh vendor performance" in mock_log.call_args[0][0]


def test_c5_billing_pdf_invalid_items_json_handled_with_warning(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)

    project = models.Project(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="C5 Proj Bill",
        status="Ongoing",
        state="MH",
    )
    db.add(project)

    bill = models.Bill(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=project.id,
        party_company_user_id=team.id,
        invoice_number=f"INV-C5-{_SUFFIX}",
        invoice_date=datetime.now(timezone.utc),
        invoice_type="sale",
        subtotal=500.0,
        total_payable=500.0,
        items_json="{invalid_json",
        status="Unpaid",
    )
    db.add(bill)
    db.commit()

    with patch("app.routers.billing.logger.warning") as mock_log:
        res = client.get(f"/apis/v3/billing/bills/{bill.id}/pdf", headers=hdr)
        assert res.status_code == 200
        assert mock_log.called
        assert "unparseable items_json" in mock_log.call_args[0][0]
