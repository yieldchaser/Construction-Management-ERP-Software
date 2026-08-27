"""R2-417 - /finance/pl and /finance/ledger must survive a payroll line item.

The salary branch read StaffEmployee.company_user_id, a column that does not
exist on the model (StaffEmployee carries company_id / project_id / name).
Any project whose PayrollLineItem rows carry an employee_id raised
AttributeError inside get_ledger -> HTTP 500.

The correct identity source is the direct name column, as every sibling
router (hr, face_recognition, statutory, google_sheets) already resolves it.
"Staff Member" stays the default until a real employee resolves.

Gate: project with one payroll line item referencing a seeded StaffEmployee
-> /finance/pl returns 200 with the Labour Cost actual equal to net_payable,
and /finance/ledger returns 200 with the salary row's party set to the
employee's name.
"""
import uuid
from decimal import Decimal

from app import models

_SUFFIX = uuid.uuid4().hex[:8]

_NET = Decimal("30000")


def _mk_payroll(db, comp, project):
    emp = models.StaffEmployee(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        name=f"Suresh Kumar {_SUFFIX}", status="active",
    )
    run = models.PayrollRun(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        payroll_month="2026-08", status="finalized",
    )
    db.add_all([emp, run])
    db.flush()
    db.add(models.PayrollLineItem(
        id=uuid.uuid4(), payroll_run_id=run.id, employee_id=emp.id,
        days_present=26, days_in_month=26, gross_salary=_NET,
        basic=_NET / 2, hra=_NET / 4, other_allowances=_NET / 4,
        overtime_amount=0.0, pf_employee=0.0, pf_employer=0.0,
        esi_employee=0.0, esi_employer=0.0, tds=0.0,
        advance_recovery=0.0, other_deductions=0.0,
        total_deductions=0.0, net_payable=_NET,
    ))
    db.commit()
    return emp


def test_pl_and_ledger_survive_payroll_line_with_employee(client, db, make_tenant, auth_headers):
    comp, user, _team = make_tenant(
        company_name=f"R2417-{_SUFFIX}", user_name="U2417",
        mobile=f"+9193{_SUFFIX}", email=f"r2417-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P2417",
        code=f"PRJ-{_SUFFIX}", status="Ongoing",
    )
    db.add(project)
    db.commit()

    emp = _mk_payroll(db, comp, project)

    # P&L must return 200 with the salary cost present (no AttributeError).
    r = client.get(f"/apis/v3/finance/pl?project_id={project.id}", headers=hdr)
    assert r.status_code == 200, r.text
    labour = next(h for h in r.json() if h["head"] == "Labour Cost")
    assert labour["actual"] == float(_NET), labour

    # The ledger salary branch is where the bogus attribute was read: it must
    # return 200 and resolve the party from the employee's real name.
    r = client.get(f"/apis/v3/finance/ledger?project_id={project.id}", headers=hdr)
    assert r.status_code == 200, r.text
    rows = [e for e in r.json() if e["category"] == "Labour Wages"]
    assert len(rows) == 1, r.json()
    row = rows[0]
    assert row["party"] == f"Suresh Kumar {_SUFFIX}", row
    assert row["amount"] == -float(_NET), row
    assert row["ledger"] == "Labour Cost", row
