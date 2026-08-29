"""Item C2: Budget and finance labour_actual queries filter PayrollRun.status == 'finalized'.
"""
import uuid
from datetime import datetime, timezone

from app import models


def _tenant(make_tenant, auth_headers):
    sfx = uuid.uuid4().hex[:8]
    comp, user, team = make_tenant(
        company_name=f"C2-{sfx}", user_name=f"UC2-{sfx}",
        mobile=f"+9195{sfx}", email=f"c2-{sfx}@test.com",
    )
    return comp, user, team, auth_headers(user, comp)


def test_c2_budget_and_finance_ignore_non_finalized_payroll(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)

    proj = models.Project(id=uuid.uuid4(), company_id=comp.id, name="C2 Project", status="in_progress")
    db.add(proj)
    db.flush()

    emp = models.StaffEmployee(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="Test Worker",
        employee_code="EMP-C2",
    )
    db.add(emp)
    db.flush()

    # Draft payroll run with line item of 50,000
    run_draft = models.PayrollRun(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=proj.id,
        payroll_month="2026-05",
        status="draft",
    )
    db.add(run_draft)
    db.flush()

    item_draft = models.PayrollLineItem(
        id=uuid.uuid4(),
        payroll_run_id=run_draft.id,
        employee_id=emp.id,
        gross_salary=50000,
        net_payable=50000,
    )
    db.add(item_draft)

    # Finalized payroll run with line item of 30,000
    run_fin = models.PayrollRun(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=proj.id,
        payroll_month="2026-04",
        status="finalized",
    )
    db.add(run_fin)
    db.flush()

    item_fin = models.PayrollLineItem(
        id=uuid.uuid4(),
        payroll_run_id=run_fin.id,
        employee_id=emp.id,
        gross_salary=30000,
        net_payable=30000,
    )
    db.add(item_fin)
    db.commit()

    # Query budget committed & actuals
    res = client.get(f"/apis/v3/budget/committed/{proj.id}", headers=hdr)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["labour_actual"] == 30000.0, f"Expected 30000 (finalized only), got {data['labour_actual']}"

    # Query finance project pl
    res_fin = client.get(f"/apis/v3/finance/pl?project_id={proj.id}", headers=hdr)
    assert res_fin.status_code == 200, res_fin.text
    data_fin = res_fin.json()
    labour_item = next(item for item in data_fin if item["head"] == "Labour Cost")
    assert labour_item["actual"] == 30000.0, f"Expected 30000 in finance labor, got {labour_item['actual']}"
