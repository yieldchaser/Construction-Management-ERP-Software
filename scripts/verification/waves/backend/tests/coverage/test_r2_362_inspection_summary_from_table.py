"""R2-362 — an inspection's summary is recomputed from its stored responses,
never from the current payload.

Sequence from the audit: submit 1 Pass / 4 Fail (status fail), then submit one
more passing item. Before the fix the payload-only counters made that single
Pass overwrite the register to 1 pass / 0 fail / status pass while four Fail
rows sat untouched in inspection_responses. After the fix the same partial
submit reads pass 2 / fail 4 / status partial.
"""
import uuid

from app import models


def _mk_project(db, comp, tag):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=f"P{tag}", code=f"PRJ-{uuid.uuid4().hex[:8]}-{tag}", status="Ongoing"
    )
    db.add(p)
    db.commit()
    return p


def _mk_checklist_with_items(client, comp, hdr, n_items):
    r = client.post(
        "/apis/v3/quality/checklists",
        json={"company_id": str(comp.id), "title": f"R362 checklist {uuid.uuid4().hex[:6]}", "category": "Concrete"},
        headers=hdr,
    )
    assert r.status_code == 201
    cl_id = r.json()["id"]
    item_ids = []
    for i in range(n_items):
        ri = client.post(
            f"/apis/v3/quality/checklists/{cl_id}/items",
            json={"sequence": i + 1, "description": f"Check {i + 1}"},
            headers=hdr,
        )
        assert ri.status_code == 201
        item_ids.append(ri.json()["id"])
    return cl_id, item_ids


def _start_inspection(client, project, cl_id, hdr):
    r = client.post(
        "/apis/v3/quality/inspections",
        json={
            "project_id": str(project.id),
            "checklist_id": cl_id,
            "zone": "Floor 3",
            "inspection_date": "2026-08-25T09:00:00Z",
        },
        headers=hdr,
    )
    assert r.status_code == 201
    return r.json()["id"]


def _respond(client, insp_id, hdr, responses):
    return client.patch(
        f"/apis/v3/quality/inspections/{insp_id}/respond",
        json={"responses": [{"checklist_item_id": i, "result": res} for i, res in responses]},
        headers=hdr,
    )


def test_single_pass_submit_no_longer_flips_failed_inspection(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R362A", user_name="U362A")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, 1)

    # Five items answered up front: 1 Pass / 4 Fail -> status fail.
    cl_id, items = _mk_checklist_with_items(client, comp, hdr, 5)
    insp_id = _start_inspection(client, project, cl_id, hdr)

    r1 = _respond(client, insp_id, hdr, [(items[0], "Pass"), (items[1], "Fail"),
                                         (items[2], "Fail"), (items[3], "Fail"), (items[4], "Fail")])
    assert r1.status_code == 200
    body = r1.json()
    assert body["pass_count"] == 1 and body["fail_count"] == 4
    assert body["status"] == "partial"

    # Add a sixth item to the checklist, answer just it as Pass.
    extra = client.post(
        f"/apis/v3/quality/checklists/{cl_id}/items",
        json={"sequence": 6, "description": "Late check"},
        headers=hdr,
    )
    assert extra.status_code == 201
    late_item = extra.json()["id"]

    r2 = _respond(client, insp_id, hdr, [(late_item, "Pass")])
    assert r2.status_code == 200
    body2 = r2.json()
    assert body2["pass_count"] == 2
    assert body2["fail_count"] == 4
    assert body2["na_count"] == 0
    assert body2["status"] == "partial", "one passing submit must not erase four stored failures"

    db.expire_all()
    rows = db.query(models.InspectionResponse).filter_by(inspection_id=insp_id).all()
    assert len(rows) == 6
    assert sum(1 for x in rows if x.result == "Fail") == 4

    # Correcting every failure through the same endpoint does reach "pass".
    flips = [(items[i], "Pass") for i in range(1, 5)]
    r3 = _respond(client, insp_id, hdr, flips)
    assert r3.status_code == 200
    body3 = r3.json()
    assert body3["pass_count"] == 6 and body3["fail_count"] == 0
    assert body3["status"] == "pass"


def test_na_and_empty_payloads_summarize_from_table(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R362B", user_name="U362B")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, 2)

    cl_id, items = _mk_checklist_with_items(client, comp, hdr, 3)
    insp_id = _start_inspection(client, project, cl_id, hdr)

    r0 = _respond(client, insp_id, hdr, [])
    assert r0.status_code == 200
    assert r0.json()["status"] == "pending"

    r1 = _respond(client, insp_id, hdr, [(items[0], "NA"), (items[1], "Pass"), (items[2], "Fail")])
    assert r1.status_code == 200
    b = r1.json()
    assert b["pass_count"] == 1 and b["fail_count"] == 1 and b["na_count"] == 1
    assert b["status"] == "partial"

    db.expire_all()
    insp = db.query(models.SiteInspection).filter_by(id=insp_id).first()
    assert (insp.pass_count, insp.fail_count, insp.na_count) == (1, 1, 1)
