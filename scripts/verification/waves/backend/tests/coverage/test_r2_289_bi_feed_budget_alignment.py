"""R2-289 - the BI budget-variance feed must agree head-for-head with Budget.

Gate: the feed filtered literal invoice_type tuples ("purchase", "expense" for
material) so expense bills were silently folded into material_actual while the
Budget module books them as other_actual, and the shared cost-head constant was
imported but never used. After the fix the feed partitions one pass over
EXPENSE_INVOICE_TYPES exactly like budget.py (purchase -> material, subcon ->
subcon, equipment -> equipment, anything else -> other_actual), cancelled bills
stay excluded and totals are unchanged.
"""
import datetime
import uuid

from app import models
from app.routers.bi_export import _hash_key


_SUFFIX = uuid.uuid4().hex[:8]

_RAW_KEY = f"siteflow_bi_r2289{_SUFFIX}"


def _mob(t):
    return f"+9190{_SUFFIX}{t:02d}"


def _mail(t):
    return f"r289-{t}-{_SUFFIX}@test.com"


def _mk_bill(db, comp, project, team, amount, itype, tag, cancelled=False):
    b = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id,
        invoice_number=f"INV-R289-{tag}-{_SUFFIX}",
        invoice_date=datetime.datetime(2026, 1, 1),
        invoice_type=itype, subtotal=amount, total_payable=amount,
        approval_flag="approved",
        status="Cancelled" if cancelled else "Unpaid",
    )
    db.add(b)
    db.commit()
    return b


def test_bi_budget_variance_partitions_heads_like_budget_module(client, db, make_tenant):
    comp, user, team = make_tenant(
        company_name="R289BI", user_name="U289", mobile=_mob(1), email=_mail(1)
    )
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P289", code=f"PRJ-{_SUFFIX}-1",
        status="Ongoing",
    )
    db.add(project)
    key = models.BiApiKey(company_id=comp.id, label="r289", key_hash=_hash_key(_RAW_KEY))
    db.add(key)
    db.commit()

    _mk_bill(db, comp, project, team, 100.0, "purchase", "PUR")
    _mk_bill(db, comp, project, team, 40.0, "expense", "EXP")
    _mk_bill(db, comp, project, team, 200.0, "subcon", "SUB")
    _mk_bill(db, comp, project, team, 50.0, "equipment", "EQP")
    # Cancelled purchase must not book cost anywhere in the feed.
    _mk_bill(db, comp, project, team, 999.0, "purchase", "CXLED", cancelled=True)

    r = client.get(
        f"/apis/v3/integrations/bi/feed/{comp.id}/budget-variance?fmt=json",
        headers={"X-API-Key": _RAW_KEY},
    )
    assert r.status_code == 200, r.text
    rows = [row for row in r.json() if row["project_id"] == str(project.id)]
    assert len(rows) == 1, rows
    row = rows[0]
    # Head-for-head agreement with the Budget module's partition.
    assert row["material_actual"] == 100.0, row
    assert row["subcon_actual"] == 200.0, row
    assert row["equipment_actual"] == 50.0, row
    assert row["other_actual"] == 40.0, row
    assert row["total_actual"] == 390.0, row

    # CSV feed carries the same columns.
    r = client.get(
        f"/apis/v3/integrations/bi/feed/{comp.id}/budget-variance",
        headers={"X-API-Key": _RAW_KEY},
    )
    assert r.status_code == 200, r.text
    header = r.text.splitlines()[0]
    for col in (
        "material_actual", "subcon_actual", "labour_actual",
        "equipment_actual", "other_actual", "total_actual", "total_variance",
    ):
        assert col in header, header
