"""R2-450 - the BOQ importer reports every row it drops.

Gate: rows with a blank name or an unparseable quantity ("LS", "2 nos", a
datetime cell) were silently discarded, so a partial import was reported
exactly like a complete one, and float()'s TypeError on datetime cells
aborted the whole import into a 500 instead of skipping one row.
"""
import io
import uuid
from datetime import datetime

from openpyxl import Workbook

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _tenant(make_tenant, auth_headers):
    comp, user, _ = make_tenant(
        company_name=f"R450-{_SUFFIX}-{uuid.uuid4().hex[:4]}",
        user_name="U450",
        mobile=f"+9195{uuid.uuid4().hex[:8]}",
        email=f"r450-{uuid.uuid4().hex[:8]}@test.com",
    )
    return comp, user, auth_headers(user, comp)


def _xlsx(rows):
    wb = Workbook()
    ws = wb.active
    ws.append(["item_name", "qty", "unit", "rate"])
    for r in rows:
        ws.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _project(db, comp):
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=f"P450-{_SUFFIX}",
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


def test_import_counts_and_reports_skipped_rows(client, db, make_tenant, auth_headers):
    comp, user, hdr = _tenant(make_tenant, auth_headers)
    project = _project(db, comp)

    content = _xlsx([
        ["Good item", 10, "Nos", 100],                     # row 2: imports
        ["Lump sum item", "LS", "Nos", 500],               # row 3: ValueError
        ["As per drawing", datetime(2026, 1, 1), "kg", 12],  # row 4: TypeError (500 before)
        [None, 3, "Nos", 50],                              # row 5: data, blank name
        [None, None, None, None],                          # row 6: padding, ignored
    ])
    r = _import(client, hdr, project.id, content)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["success"] is True
    assert body["imported_count"] == 1
    assert body["skipped_count"] == 3
    assert body["total_estimated_cost"] == 1000.0

    # Row numbers point at the real spreadsheet rows (header is row 1).
    joined = "\n".join(body["warnings"])
    assert len(body["warnings"]) == 3
    for n in ("Row 3", "Row 4", "Row 5"):
        assert n in joined, joined

    # Only the good row reaches the database.
    items = db.query(models.BOQItem).filter(models.BOQItem.project_id == project.id).all()
    assert len(items) == 1
    assert items[0].item_name == "Good item"


def test_clean_sheet_import_reports_zero_skipped(client, db, make_tenant, auth_headers):
    comp, user, hdr = _tenant(make_tenant, auth_headers)
    project = _project(db, comp)

    content = _xlsx([
        ["Brick work", 25, "Nos", 40],
        ["Steel supply", 1.5, "kg", 700],
    ])
    r = _import(client, hdr, project.id, content)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["imported_count"] == 2
    assert body["skipped_count"] == 0
    assert body["warnings"] == []
