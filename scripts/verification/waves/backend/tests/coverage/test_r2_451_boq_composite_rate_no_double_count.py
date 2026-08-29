"""R2-451 - a BOQ line carrying both a composite rate and its split charges once.

Gate: amount was qty x (rate + supply_rate + installation_rate), so a sheet
that quoted a supply-and-fix item as one composite Rate column alongside its
supply/installation split stored the whole line at exactly double the real
value, inflating TOTAL BOQ VALUE, Estimated Margin and every % of BOQ ratio.
The composite rate wins; the split only fills in when no composite was given.
"""
import io
import uuid

from openpyxl import Workbook

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _tenant(make_tenant, auth_headers):
    comp, user, _ = make_tenant(
        company_name=f"R451-{_SUFFIX}-{uuid.uuid4().hex[:4]}",
        user_name="U451",
        mobile=f"+9196{uuid.uuid4().hex[:8]}",
        email=f"r451-{uuid.uuid4().hex[:8]}@test.com",
    )
    return comp, user, auth_headers(user, comp)


def _xlsx(header, rows):
    wb = Workbook()
    ws = wb.active
    ws.append(header)
    for r in rows:
        ws.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _project(db, comp):
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=f"P451-{_SUFFIX}",
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


def test_import_composite_rate_is_not_double_counted(client, db, make_tenant, auth_headers):
    comp, user, hdr = _tenant(make_tenant, auth_headers)
    project = _project(db, comp)

    # The finding's exact case: rate 1000 / supply 600 / install 400 quoted
    # together used to store 2000 per unit.
    content = _xlsx(
        ["item_name", "qty", "unit", "rate", "supply_rate", "installation_rate"],
        [
            ["Supply & fix item", 2, "Nos", 1000, 600, 400],   # composite wins: 2000
            ["Composite left blank", 1, "Nos", None, 600, 400],  # split fills in: 1000
        ],
    )
    r = _import(client, hdr, project.id, content)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["imported_count"] == 2
    assert body["total_estimated_cost"] == 3000.0  # not 5000.0

    items = {
        i.item_name: float(i.amount)
        for i in db.query(models.BOQItem).filter(models.BOQItem.project_id == project.id).all()
    }
    assert items["Supply & fix item"] == 2000.0
    assert items["Composite left blank"] == 1000.0


def test_import_split_only_sheet_still_sums_split(client, db, make_tenant, auth_headers):
    comp, user, hdr = _tenant(make_tenant, auth_headers)
    project = _project(db, comp)

    content = _xlsx(
        ["item_name", "qty", "unit", "supply_rate", "installation_rate"],
        [["Split-only item", 3, "Nos", 600, 400]],
    )
    r = _import(client, hdr, project.id, content)
    assert r.status_code == 201, r.text
    assert r.json()["total_estimated_cost"] == 3000.0


def test_create_and_patch_charge_composite_once(client, db, make_tenant, auth_headers):
    comp, user, hdr = _tenant(make_tenant, auth_headers)
    project = _project(db, comp)

    r = client.post("/apis/v3/budgeting/boq-documents", headers=hdr, json={
        "project_id": str(project.id), "title": "BOQ 451",
    })
    assert r.status_code == 201, r.text
    doc_id = r.json()["id"]

    r = client.post(f"/apis/v3/budgeting/boq-documents/{doc_id}/items", headers=hdr, json={
        "item_name": "Supply & fix", "unit": "Nos",
        "quantity": 2, "rate": 1000, "supply_rate": 600, "installation_rate": 400,
    })
    assert r.status_code == 201, r.text
    item = r.json()
    assert item["amount"] == 2000.0  # not 4000.0

    # Editing one side of the quote re-derives the same single charge.
    r = client.patch(f"/apis/v3/budgeting/boq/{item['id']}", headers=hdr, json={
        "rate": 1200, "supply_rate": 700, "installation_rate": 500,
    })
    assert r.status_code == 200, r.text
    assert r.json()["amount"] == 2400.0  # not 4800.0
