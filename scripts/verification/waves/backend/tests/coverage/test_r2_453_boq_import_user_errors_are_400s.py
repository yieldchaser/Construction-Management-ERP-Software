"""R2-453 - user-fixable BOQ import errors come back as 400s, never 500s.

Gate: the importer's outer `except Exception` swallowed its own deliberate
400s (re-raising "Invalid headers..." as 500 "Import failed: 400: ...") and
let openpyxl's raw library message escape for a fake upload
(500 "Import failed: File is not a zip file"), so every wrong file looked
like a server fault.
"""
import io
import uuid

from openpyxl import Workbook

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _tenant(make_tenant, auth_headers):
    comp, user, _ = make_tenant(
        company_name=f"R453-{_SUFFIX}-{uuid.uuid4().hex[:4]}",
        user_name="U453",
        mobile=f"+9196{uuid.uuid4().hex[:8]}",
        email=f"r453-{uuid.uuid4().hex[:8]}@test.com",
    )
    return comp, user, auth_headers(user, comp)


def _project(db, comp):
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=f"P453-{_SUFFIX}",
        code=f"PRJ-{_SUFFIX}", status="Ongoing",
    )
    db.add(project)
    db.commit()
    return project


def _import(client, hdr, project_id, content):
    return client.post(
        "/apis/v3/budgeting/boq/import",
        headers=hdr,
        files={"file": (
            "boq.xlsx",
            io.BytesIO(content),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )},
        data={"project_id": str(project_id)},
    )


def _xlsx_with_headers(header_row, data_rows):
    wb = Workbook()
    ws = wb.active
    ws.append(header_row)
    for r in data_rows:
        ws.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def test_fake_excel_upload_is_400_without_library_internals(client, db, make_tenant, auth_headers):
    """A garbage blob named .xlsx is a user error, reported as a clean 400."""
    comp, user, hdr = _tenant(make_tenant, auth_headers)
    project = _project(db, comp)

    r = _import(client, hdr, project.id, b"this is definitely not an excel file")
    assert r.status_code == 400, r.text
    detail = r.json()["detail"]
    assert "excel" in detail.lower()
    # No openpyxl/zipfile internals leak to the user.
    assert "zip" not in detail.lower()

    assert db.query(models.BOQItem).filter(models.BOQItem.project_id == project.id).count() == 0


def test_invalid_header_sheet_keeps_its_actionable_400(client, db, make_tenant, auth_headers):
    """The handler must pass its own deliberate 400s through untouched."""
    comp, user, hdr = _tenant(make_tenant, auth_headers)
    project = _project(db, comp)

    content = _xlsx_with_headers(["wrong_one", "wrong_two"], [["x", 1]])
    r = _import(client, hdr, project.id, content)
    assert r.status_code == 400, r.text
    detail = r.json()["detail"]
    assert detail.startswith("Invalid headers."), detail
    # Not re-wrapped by the generic handler as "Import failed: 400: ...".
    assert "Import failed" not in detail
