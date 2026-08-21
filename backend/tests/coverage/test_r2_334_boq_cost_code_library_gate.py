"""R2-334 — BOQ cost codes must come from the company's Cost Code Library.

Gate: the spreadsheet importer wrote whatever sat in the cost_code cell
(strip() was the entire validation), so one typo silently forked a sixth
code that never rolls up; and boq_items.cost_code was VARCHAR(50) against
the library's VARCHAR(100), so a library-valid code longer than 50 chars
crashed the import with a bare 500 (StringDataRightTruncation).

After the fix:
  * import rejects unknown codes with 400 naming them, and writes nothing,
  * POST /budgeting/boq-documents/{id}/items applies the same gate,
  * the column width matches the library (100).
"""
import uuid
from io import BytesIO

from openpyxl import Workbook

from app import models

_SUFFIX = uuid.uuid4().hex[:8]
_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _make_project(db, comp):
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=f"P334-{_SUFFIX}",
        code=f"PRJ-{_SUFFIX}", status="Ongoing",
    )
    db.add(project)
    db.commit()
    return project


def _add_library_code(db, comp, code):
    db.add(models.LibraryCostCode(
        id=uuid.uuid4(), company_id=comp.id, code=code, name=f"CC {code}",
    ))
    db.commit()


def _xlsx(rows):
    wb = Workbook()
    ws = wb.active
    ws.append(["item_name", "qty", "unit", "rate", "cost_code"])
    for r in rows:
        ws.append(r)
    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _import(client, hdr, project, data):
    return client.post(
        "/apis/v3/budgeting/boq/import",
        data={"project_id": str(project.id)},
        files={"file": ("boq.xlsx", data, _XLSX_MIME)},
        headers=hdr,
    )


def test_column_width_matches_library():
    assert models.BOQItem.__table__.columns["cost_code"].type.length == 100
    assert models.LibraryCostCode.__table__.columns["code"].type.length == 100


def test_import_rejects_unknown_cost_code_and_writes_nothing(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(
        company_name=f"R334a-{_SUFFIX}", user_name="U334a",
        mobile=f"+9190{_SUFFIX}01", email=f"r334a-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    project = _make_project(db, comp)
    _add_library_code(db, comp, "CC-01")

    data = _xlsx([["Footing", 10, "Nos", 100, "CC-01"],
                  ["Wall", 5, "Nos", 50, "TYPO-99"]])
    r = _import(client, hdr, project, data)
    assert r.status_code == 400, r.text
    assert "TYPO-99" in r.json()["detail"]

    items = db.query(models.BOQItem).filter(models.BOQItem.project_id == project.id).all()
    assert items == []


def test_import_accepts_library_cost_code(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(
        company_name=f"R334b-{_SUFFIX}", user_name="U334b",
        mobile=f"+9190{_SUFFIX}02", email=f"r334b-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    project = _make_project(db, comp)
    _add_library_code(db, comp, "CC-01")
    long_code = "C" * 100  # valid in the library, used to truncate at 50
    _add_library_code(db, comp, long_code)

    data = _xlsx([["Footing", 10, "Nos", 100, "CC-01"],
                  ["Slab", 2, "Nos", 80, long_code],
                  ["Misc", 1, "Nos", 10, None]])
    r = _import(client, hdr, project, data)
    assert r.status_code == 201, r.text
    assert r.json()["imported_count"] == 3

    items = db.query(models.BOQItem).filter(models.BOQItem.project_id == project.id).all()
    assert sorted(i.cost_code for i in items if i.cost_code) == sorted(["CC-01", long_code])


def test_create_item_rejects_unknown_cost_code(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(
        company_name=f"R334c-{_SUFFIX}", user_name="U334c",
        mobile=f"+9190{_SUFFIX}03", email=f"r334c-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    project = _make_project(db, comp)
    doc = models.BOQDocument(
        id=uuid.uuid4(), project_id=project.id, title="R334 BOQ",
        milestone_done=0, milestone_total=5,
    )
    db.add(doc)
    db.commit()

    payload = {"item_name": "Footing", "unit": "Nos", "quantity": 1, "rate": 10}
    r = client.post(
        f"/apis/v3/budgeting/boq-documents/{doc.id}/items",
        json={**payload, "cost_code": "GHOST-1"},
        headers=hdr,
    )
    assert r.status_code == 400, r.text

    _add_library_code(db, comp, "CC-01")
    r2 = client.post(
        f"/apis/v3/budgeting/boq-documents/{doc.id}/items",
        json={**payload, "cost_code": "CC-01"},
        headers=hdr,
    )
    assert r2.status_code == 201, r2.text
    assert r2.json()["cost_code"] == "CC-01"
