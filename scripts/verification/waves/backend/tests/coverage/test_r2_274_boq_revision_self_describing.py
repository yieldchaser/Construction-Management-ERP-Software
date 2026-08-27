"""R2-274 — a BOQ revision must record what it changed.

Gate: the first revision on a BOQ document persisted previous_amount as null
because only prior revision rows were consulted, so delta came back null too
and the trail could not answer "what did this change?". After the fix the
first revision captures the value being replaced (the stored revised amount
or, failing that, the line-item sum) and delta is derived from it.
"""
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def test_first_boq_revision_records_previous_and_delta(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(
        company_name=f"R274-{_SUFFIX}", user_name="U274",
        mobile=f"+9190{_SUFFIX}01", email=f"r274-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=f"P274-{_SUFFIX}",
        code=f"PRJ-{_SUFFIX}", status="Ongoing",
    )
    db.add(project)
    db.flush()
    doc = models.BOQDocument(id=uuid.uuid4(), project_id=project.id, title="ZZ R5 BOQ")
    db.add(doc)
    db.flush()
    db.add(models.BOQItem(
        id=uuid.uuid4(), project_id=project.id, boq_document_id=doc.id,
        item_name="Excavation", unit="cum", quantity=100,
        rate=1500, supply_rate=0, installation_rate=0,
    ))
    db.commit()

    r = client.post(
        f"/apis/v3/budgeting/boq-documents/{doc.id}/revisions",
        json={"revised_amount": 750000, "reason": "R5 variation order"},
        headers=hdr,
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["revision_no"] == 1
    assert body["previous_amount"] == 150000.0, body
    assert body["delta"] == 600000.0, body

    r2 = client.post(
        f"/apis/v3/budgeting/boq-documents/{doc.id}/revisions",
        json={"revised_amount": 800000},
        headers=hdr,
    )
    assert r2.status_code == 201, r2.text
    body2 = r2.json()
    assert body2["revision_no"] == 2
    assert body2["previous_amount"] == 750000.0, body2
    assert body2["delta"] == 50000.0, body2

    db.expire_all()
    doc_row = db.query(models.BOQDocument).filter(models.BOQDocument.id == doc.id).first()
    assert float(doc_row.revised_amount) == 800000.0
