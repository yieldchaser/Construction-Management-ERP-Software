"""R2-243 - /finance/pl must not double-count subcontractor bills.

EXPENSE_INVOICE_TYPES contains "subcon", so material_actual summed every
subcon bill into Material Cost while subcon_actual summed the same bills
into Subcontractor Cost. After the fix material_actual excludes
invoice_type == "subcon", keeping the Cancelled exclusion intact.

Gate: one purchase bill + one subcon bill -> Material Cost == purchase only,
Subcontractor Cost == subcon only, no overlap between buckets.
"""
import datetime
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _mk_bill(db, comp, project, team, inv_type, amount, tag):
    b = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, invoice_number=f"INV-R243-{tag}-{_SUFFIX}",
        invoice_date=datetime.datetime(2026, 1, 1),
        invoice_type=inv_type, subtotal=amount, total_payable=amount,
        approval_flag="approved",
    )
    db.add(b)
    db.commit()
    return b


def test_pl_material_and_subcon_buckets_do_not_overlap(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name="R243", user_name="U243",
        mobile=f"+9192{_SUFFIX}", email=f"r243-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P243", code=f"PRJ-{_SUFFIX}", status="Ongoing"
    )
    db.add(project)
    db.commit()

    _mk_bill(db, comp, project, team, "purchase", 100.0, "mat")
    _mk_bill(db, comp, project, team, "subcon", 200.0, "sub")

    r = client.get(f"/apis/v3/finance/pl?project_id={project.id}", headers=hdr)
    assert r.status_code == 200, r.text
    pl = {row["head"]: row for row in r.json()}

    # Material Cost carries the purchase bill only.
    assert pl["Material Cost"]["actual"] == 100.0, pl
    # Subcontractor Cost carries the subcon bill only.
    assert pl["Subcontractor Cost"]["actual"] == 200.0, pl

    # No overlap: the subcon bill appears in exactly one bucket.
    assert pl["Material Cost"]["actual"] != pl["Subcontractor Cost"]["actual"], pl
