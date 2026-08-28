"""R2-157 - GET /custom-fields/values/{entity_type}/{entity_id} authorized
against the first value row's company and skipped the check entirely for an
empty result. A row set spanning two companies was released to whichever
company sorted first, a poisoned foreign-company row 403'd the real owner out
of its own entity, and any authenticated user could probe arbitrary UUIDs for
stored values. The reader now resolves the parent entity, derives the tenant
from it, checks membership before returning anything, and filters rows to the
derived company. (The write path already pins both field and entity to the
claimed company; the last two tests pin that guard against regression.)
"""
import uuid

from app import models


def _seed_project_with_values(db, company, *, poison_from=None):
    project = models.Project(company_id=company.id, name="CF tenant probe")
    db.add(project)
    db.flush()
    field = models.CustomField(
        company_id=company.id,
        entity_type="project",
        field_name="handover_date",
        field_label="Handover Date",
        field_type="date",
    )
    db.add(field)
    db.flush()
    own = models.CustomFieldValue(
        company_id=company.id,
        field_id=field.id,
        entity_type="project",
        entity_id=project.id,
        value_text="own row",
    )
    db.add(own)
    if poison_from is not None:
        db.add(
            models.CustomFieldValue(
                company_id=poison_from.id,
                field_id=uuid.uuid4(),
                entity_type="project",
                entity_id=project.id,
                value_text="poisoned cross-tenant row",
            )
        )
    db.commit()
    return project


def test_owner_reads_only_own_rows_and_foreign_member_is_403(
    client, db, make_tenant, auth_headers
):
    comp_a, user_a, _ = make_tenant(company_name="R2-157 A", user_name="A Owner")
    comp_b, user_b, _ = make_tenant(company_name="R2-157 B", user_name="B Owner")
    project = _seed_project_with_values(db, comp_b, poison_from=comp_a)

    # Company B's member: 200 with only company B's row - the poisoned
    # company A row must not be released and must not DoS the owner.
    r = client.get(
        f"/apis/v3/custom-fields/values/project/{project.id}",
        headers=auth_headers(user_b, comp_b),
    )
    assert r.status_code == 200, r.text
    rows = r.json()
    assert len(rows) == 1
    assert rows[0]["company_id"] == str(comp_b.id)

    # Company A's member: denied outright - membership is checked against the
    # entity's company even though a row stamped company A exists.
    ra = client.get(
        f"/apis/v3/custom-fields/values/project/{project.id}",
        headers=auth_headers(user_a, comp_a),
    )
    assert ra.status_code == 403, ra.text


def test_empty_result_no_longer_probes_arbitrary_uuids(
    client, db, make_tenant, auth_headers
):
    comp_a, user_a, _ = make_tenant(company_name="R2-157 probe", user_name="Prober")
    comp_b, user_b, _ = make_tenant(company_name="R2-157 quiet", user_name="Quiet")
    # A real project of company B with NO custom-field values yet.
    project = models.Project(company_id=comp_b.id, name="No values yet")
    db.add(project)
    db.commit()

    r = client.get(
        f"/apis/v3/custom-fields/values/project/{project.id}",
        headers=auth_headers(user_a, comp_a),
    )
    # A non-member is denied even though the response would have been empty -
    # the old code returned 200 [] without any membership check.
    assert r.status_code == 403, r.text

    # ...and the owner still gets a clean empty list.
    ok = client.get(
        f"/apis/v3/custom-fields/values/project/{project.id}",
        headers=auth_headers(user_b, comp_b),
    )
    assert ok.status_code == 200, ok.text
    assert ok.json() == []


def test_write_path_pins_entity_and_field_to_claimed_company(
    client, db, make_tenant, auth_headers
):
    comp_a, user_a, _ = make_tenant(company_name="R2-157 W A", user_name="W A")
    comp_b, _, _ = make_tenant(company_name="R2-157 W B", user_name="W B")
    project = models.Project(company_id=comp_b.id, name="B project")
    db.add(project)
    field = models.CustomField(
        company_id=comp_a.id,
        entity_type="project",
        field_name="vendor_rank",
        field_label="Vendor Rank",
        field_type="text",
    )
    db.add(field)
    db.commit()

    # Company A admin names their own company but targets company B's entity:
    # the entity lookup is scoped to the claimed company, so this 404s instead
    # of stamping a foreign record.
    r = client.post(
        "/apis/v3/custom-fields/values",
        json={
            "company_id": str(comp_a.id),
            "field_id": str(field.id),
            "entity_type": "project",
            "entity_id": str(project.id),
            "value_text": "cross-tenant",
        },
        headers=auth_headers(user_a, comp_a),
    )
    assert r.status_code == 404, r.text
    assert not (
        db.query(models.CustomFieldValue)
        .filter_by(entity_id=project.id)
        .first()
    )
