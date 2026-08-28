"""R2-415 - the BOCW cess return is derived and validated, not typed by hand.

Every material figure in BOCWCreate was caller-supplied with nothing derived,
validated or reconciled: month_year had no pattern ("last month" was accepted),
contractor_name was free text beside an optional contractor_id, workers_count
ignored the attendance in the same module, wages_paid ignored the payroll runs,
and contribution_amount - the one number a BOCW filing turns on - was a free
decimal although the BOCW Cess Act fixes it at 1% of the cost of construction
held in the bill ledger.

Gate: month_year must be YYYY-MM; a supplied contractor_id resolves the stored
name from the directory; omitted figures derive from attendance, payroll runs
and money-out bills (cess = 1% of bill subtotals); explicitly supplied figures
still land verbatim.
"""
import uuid
from datetime import datetime

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _post(client, hdr, company_id, project_id, **body):
    payload = {"company_id": str(company_id), "project_id": str(project_id)}
    payload.update(body)
    return client.post("/apis/v3/labour/bocw", headers=hdr, json=payload)


def test_r2_415_bocw_return_derives_figures_and_validates(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"R2415-{_SUFFIX}", user_name="Raja Constructions",
        mobile=f"+9196{_SUFFIX}", email=f"r2415-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P2415",
        code=f"PRJ-2415-{_SUFFIX}", status="Ongoing",
    )
    db.add(project)
    db.flush()
    e1 = models.StaffEmployee(id=uuid.uuid4(), company_id=comp.id, project_id=project.id, name="Emp One")
    e2 = models.StaffEmployee(id=uuid.uuid4(), company_id=comp.id, project_id=project.id, name="Emp Two")
    db.add_all([e1, e2])
    for e in (e1, e2):
        db.add(models.AttendanceLog(
            id=uuid.uuid4(), employee_id=e.id, project_id=project.id,
            attendance_date=datetime(2026, 8, 3, 9, 0, 0),
            status="Present", hours_worked=8.0, overtime_hours=0.0,
        ))
    db.add(models.PayrollRun(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        payroll_month="2026-08", status="completed",
        total_gross=120000, total_deductions=20000, total_net=100000,
    ))
    db.add_all([
        models.Bill(
            id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
            party_company_user_id=team.id, invoice_number=f"INV-{_SUFFIX}-1",
            invoice_date=datetime(2026, 8, 5), invoice_type="purchase",
            status="Unpaid", subtotal=3000000, total_payable=3540000,
        ),
        models.Bill(
            id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
            party_company_user_id=team.id, invoice_number=f"INV-{_SUFFIX}-2",
            invoice_date=datetime(2026, 8, 20), invoice_type="subcon",
            status="Partially Paid", subtotal=2000000, total_payable=2360000,
        ),
        # Cancelled money never enters the cost of construction.
        models.Bill(
            id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
            party_company_user_id=team.id, invoice_number=f"INV-{_SUFFIX}-3",
            invoice_date=datetime(2026, 8, 21), invoice_type="purchase",
            status="Cancelled", subtotal=9999999, total_payable=9999999,
        ),
    ])
    db.commit()

    # Hand-off filing: no figures, contractor named only by id. The free-text
    # "Ghost Contractor" must NOT win over the resolved directory name.
    r = _post(
        client, hdr, comp.id, project.id,
        contractor_id=str(team.id), contractor_name="Ghost Contractor",
        month_year="2026-08",
    )
    assert r.status_code == 201, r.text
    row = r.json()
    assert row["workers_count"] == 2, row                       # both punched employees
    assert float(row["wages_paid"]) == 100000.0, row            # payroll run net
    assert float(row["contribution_amount"]) == 50000.0, row    # 1% of 50,00,000 live bills
    assert row["contractor_name"] == "Raja Constructions", row  # resolved from contractor_id

    # A malformed period can no longer enter a statutory return.
    r_bad = _post(client, hdr, comp.id, project.id, contractor_name="X", month_year="last month")
    assert r_bad.status_code == 422, r_bad.text

    # Explicit figures are still respected verbatim.
    r2 = _post(
        client, hdr, comp.id, project.id,
        contractor_name="Solo Supplier", month_year="2026-07",
        workers_count=5, wages_paid=10.0, contribution_amount=0.5,
    )
    assert r2.status_code == 201, r2.text
    row2 = r2.json()
    assert row2["contractor_name"] == "Solo Supplier", row2
    assert row2["workers_count"] == 5 and float(row2["wages_paid"]) == 10.0, row2
    assert float(row2["contribution_amount"]) == 0.5, row2
