"""Item C10: Attendance punches accept optional client captured_at within a sane window.
"""
from datetime import datetime, timezone, timedelta
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _tenant(make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"C10-{_SUFFIX}",
        user_name="U-C10",
        mobile=f"+9194{uuid.uuid4().hex[:8]}",
        email=f"c10-{uuid.uuid4().hex[:8]}@test.com",
    )
    return comp, user, team, auth_headers(user, comp)


def test_c10_attendance_punch_captured_at_window_and_calculation(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)

    project = models.Project(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="C10 Project",
        status="Ongoing",
        location="19.0760,72.8777",
        attendance_radius_meters=500,
    )
    db.add(project)

    emp = models.StaffEmployee(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="Worker C10",
        employee_code=f"EMP-{_SUFFIX}",
        status="active",
    )
    db.add(emp)
    db.commit()

    now = datetime.now(timezone.utc)

    # 1. Future punch beyond 5 minutes skew is rejected (400)
    res_future = client.post(
        "/apis/v3/hr/attendance/punch",
        headers=hdr,
        json={
            "employee_id": str(emp.id),
            "project_id": str(project.id),
            "lat": 19.0760,
            "lng": 72.8777,
            "punch_type": "in",
            "captured_at": (now + timedelta(minutes=15)).isoformat(),
        },
    )
    assert res_future.status_code == 400
    assert "cannot be in the future" in res_future.json()["detail"]

    # 2. Too old punch beyond 24 hours is rejected (400)
    res_old = client.post(
        "/apis/v3/hr/attendance/punch",
        headers=hdr,
        json={
            "employee_id": str(emp.id),
            "project_id": str(project.id),
            "lat": 19.0760,
            "lng": 72.8777,
            "punch_type": "in",
            "captured_at": (now - timedelta(hours=26)).isoformat(),
        },
    )
    assert res_old.status_code == 400
    assert "too old" in res_old.json()["detail"]

    # 3. Valid offline punch-in 6 hours ago is accepted
    offline_in = now - timedelta(hours=6)
    res_in = client.post(
        "/apis/v3/hr/attendance/punch",
        headers=hdr,
        json={
            "employee_id": str(emp.id),
            "project_id": str(project.id),
            "lat": 19.0760,
            "lng": 72.8777,
            "punch_type": "in",
            "captured_at": offline_in.isoformat(),
        },
    )
    assert res_in.status_code == 201, res_in.text
    in_data = res_in.json()
    assert in_data["punch_in"] is not None

    # 4. Valid offline punch-out 1 hour ago (worked 5 hours)
    offline_out = now - timedelta(hours=1)
    res_out = client.post(
        "/apis/v3/hr/attendance/punch",
        headers=hdr,
        json={
            "employee_id": str(emp.id),
            "project_id": str(project.id),
            "lat": 19.0760,
            "lng": 72.8777,
            "punch_type": "out",
            "captured_at": offline_out.isoformat(),
        },
    )
    assert res_out.status_code == 201, res_out.text
    out_data = res_out.json()
    assert out_data["hours_worked"] == 5.0
    assert out_data["overtime_hours"] == 0.0
