"""Finding R2-756: PF ECR export requires real UAN stored on StaffEmployee and refuses export on missing UAN.

Clauses:
1. StaffEmployee has a uan column.
2. POST /hr/employees and PUT /hr/employees/{id} validate and persist 12-digit UAN.
3. GET /statutory/{company_id}/pf-ecr refuses with 409 when any employee in the run lacks UAN.
4. GET /statutory/{company_id}/pf-ecr outputs each employee's real UAN (no placeholder "NOT_LINKED").
"""
import uuid
import datetime
import pytest

from app import models


def _tenant(make_tenant, auth_headers):
    sfx = uuid.uuid4().hex[:8]
    comp, user, team = make_tenant(
        company_name=f"PFUAN-{sfx}", user_name=f"UPFUAN-{sfx}",
        mobile=f"+9196{sfx}", email=f"pfuan-{sfx}@test.com",
    )
    return comp, user, team, auth_headers(user, comp)


def _project(db, comp):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="PFUAN-Proj",
        code=f"PRJ-PF-{uuid.uuid4().hex[:6]}", status="Ongoing", state="Karnataka",
    )
    db.add(p)
    db.commit()
    return p


def test_r2_756_pf_ecr_refuses_when_employee_missing_uan(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)
    project = _project(db, comp)

    # 1. Create an employee without UAN
    emp1 = models.StaffEmployee(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=project.id,
        name="Sunil Sharma",
        employee_code="EMP-SS-1",
        basic_salary=30000.0,
        status="active",
        uan=None,
    )
    db.add(emp1)
    db.commit()

    # Create attendance & payroll run
    att = models.AttendanceLog(
        id=uuid.uuid4(),
        project_id=project.id,
        employee_id=emp1.id,
        attendance_date=datetime.datetime(2026, 8, 1, 9, 0, tzinfo=datetime.timezone.utc),
        status="Present",
    )
    db.add(att)
    db.commit()

    pr_res = client.post(
        "/apis/v3/hr/payroll/run",
        headers=hdr,
        json={
            "company_id": str(comp.id),
            "project_id": str(project.id),
            "payroll_month": "2026-08",
        },
    )
    assert pr_res.status_code == 201, pr_res.text
    run_id = pr_res.json()["id"]

    # Finalize payroll
    run = db.query(models.PayrollRun).filter(models.PayrollRun.id == uuid.UUID(run_id)).first()
    run.status = "finalized"
    db.commit()

    # 2. Attempt PF ECR export -> Must refuse with 409 naming Sunil Sharma
    res = client.get(f"/apis/v3/statutory/{comp.id}/pf-ecr?month=8&year=2026", headers=hdr)
    assert res.status_code == 409, f"Expected 409 on missing UAN, got {res.status_code}: {res.text}"
    assert "Sunil Sharma" in res.text
    assert "UAN" in res.text


def test_r2_756_pf_ecr_success_with_valid_uan(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)
    project = _project(db, comp)

    # 1. Create employee with 12-digit UAN via POST /hr/employees
    e_res = client.post(
        "/apis/v3/hr/employees",
        headers=hdr,
        json={
            "company_id": str(comp.id),
            "project_id": str(project.id),
            "name": "Priya Patel",
            "employee_code": "EMP-PP-1",
            "basic_salary": 25000.0,
            "uan": "100987654321",
        },
    )
    assert e_res.status_code == 201, e_res.text
    emp_id = e_res.json()["id"]
    assert e_res.json().get("uan") == "100987654321"

    # 2. Update employee with PUT
    u_res = client.put(
        f"/apis/v3/hr/employees/{emp_id}",
        headers=hdr,
        json={"uan": "100112233445"},
    )
    assert u_res.status_code == 200, u_res.text
    assert u_res.json().get("uan") == "100112233445"

    # 3. Create attendance & finalized payroll
    att = models.AttendanceLog(
        id=uuid.uuid4(),
        project_id=project.id,
        employee_id=uuid.UUID(emp_id),
        attendance_date=datetime.datetime(2026, 8, 1, 9, 0, tzinfo=datetime.timezone.utc),
        status="Present",
    )
    db.add(att)
    db.commit()

    pr_res = client.post(
        "/apis/v3/hr/payroll/run",
        headers=hdr,
        json={
            "company_id": str(comp.id),
            "project_id": str(project.id),
            "payroll_month": "2026-08",
        },
    )
    assert pr_res.status_code == 201, pr_res.text
    run_id = pr_res.json()["id"]

    run = db.query(models.PayrollRun).filter(models.PayrollRun.id == uuid.UUID(run_id)).first()
    run.status = "finalized"
    db.commit()

    # 4. Generate PF ECR -> Must succeed with real UAN
    res = client.get(f"/apis/v3/statutory/{comp.id}/pf-ecr?month=8&year=2026", headers=hdr)
    assert res.status_code == 200, res.text
    ecr_data = res.json()
    assert len(ecr_data["ecr_lines"]) == 1
    line = ecr_data["ecr_lines"][0]
    assert line["uan"] == "100112233445"
    assert line["uan"] != "NOT_LINKED"
