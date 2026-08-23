"""R2-386 + R2-543 - document-number unique constraints reach prod, not just metadata.

Guarantees, per the orphan-sweep context (create_all never alters existing
tables; boot schema-sync adds COLUMNS only; UniqueConstraint/Index reach prod
ONLY via supabase/migrations):

1. All seven constraints exist on the SQLAlchemy model metadata:
   the five earlier-wave orphans (material_indents, purchase_orders,
   goods_receipt_notes, work_orders, bills) plus the two NEW ones from this
   sweep (uq_ncrs_project_id_ncr_number, uq_payments_company_id_reference_number).
2. The additive migration file carries all seven ALTER TABLE ... ADD CONSTRAINT
   statements using the duplicate-safe NOTICE-skip idiom, so legacy duplicate
   rows cannot brick deploy.
3. Runtime dedupe works end to end: SQLite's create_all honors these plain
   multi-column UNIQUE constraints, so ORM double-inserts raise IntegrityError;
   production enforcement is delivered by the migration against Postgres
   because create_all cannot alter live tables there (honest scope note).
4. The routers' friendly pre-checks answer 409 before any insert:
   POST /quality/ncr (added this wave) and POST /finance/payments (existing).
"""
import datetime
import os
import uuid

import pytest
from sqlalchemy.exc import IntegrityError

from app import models

MIGRATION = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "..", "..",
    "supabase", "migrations", "20260823_000002_orphan_unique_constraints.sql",
)

# (model class, constraint name) - every constraint this wave guarantees.
EXPECTED_CONSTRAINTS = [
    (models.MaterialIndent, "uq_material_indents_company_id_indent_number"),
    (models.PurchaseOrder, "uq_purchase_orders_company_id_po_number"),
    (models.GoodsReceiptNote, "uq_goods_receipt_notes_company_id_grn_number"),
    (models.WorkOrder, "uq_work_orders_company_id_wo_number"),
    (models.Bill, "uq_bills_company_id_invoice_number"),
    # R2-386: ncrs is project-scoped (project_id FK), so uniqueness is per
    # project, which transitively scopes it within the owning company.
    (models.NCR, "uq_ncrs_project_id_ncr_number"),
    # R2-543: reference_number scoped per company; NULLs stay distinct.
    (models.Payment, "uq_payments_company_id_reference_number"),
]


@pytest.mark.parametrize("model,name", EXPECTED_CONSTRAINTS, ids=[n for _, n in EXPECTED_CONSTRAINTS])
def test_constraint_exists_on_model_metadata(model, name):
    names = {c.name for c in model.__table__.constraints if c.name}
    assert name in names, f"{name} missing from {model.__tablename__} metadata"


def test_migration_file_creates_all_seven_constraints_duplicate_safe():
    src = open(MIGRATION, encoding="utf-8").read()
    for _, name in EXPECTED_CONSTRAINTS:
        assert f"ADD CONSTRAINT {name}" in src, f"migration never creates {name}"
        assert f"conname = '{name}'" in src, f"{name} lacks the pg_constraint re-run guard"
    # Duplicate-safe NOTICE-skip idiom so legacy dup rows cannot brick deploy.
    assert src.count("RAISE NOTICE 'skipping") >= 7
    assert "additive-only" in src.lower()


def _mk_project(db, comp):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P", code=f"PRJ-{uuid.uuid4().hex[:8]}", status="Ongoing"
    )
    db.add(p)
    db.commit()
    return p


def test_duplicate_ncr_number_rejected_at_orm_level(client, db, make_tenant):
    """Runtime enforcement demo on SQLite; production enforces via the migration."""
    comp, user, team = make_tenant(company_name="R386A", user_name="U386A")
    project = _mk_project(db, comp)
    db.add(models.NCR(project_id=project.id, ncr_number="NCR-DUP-1", title="First"))
    db.commit()

    db.add(models.NCR(project_id=project.id, ncr_number="NCR-DUP-1", title="Blind insert"))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()

    # Same number under a different project stays legal (scope is per project).
    other = _mk_project(db, comp)
    db.add(models.NCR(project_id=other.id, ncr_number="NCR-DUP-1", title="Other project"))
    db.commit()


def test_raise_ncr_answers_friendly_409_before_insert(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R386B", user_name="U386B")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    r1 = client.post("/apis/v3/quality/ncr", headers=hdr, json={
        "project_id": str(project.id), "ncr_number": "NCR-R386", "title": "Honeycombing",
    })
    assert r1.status_code == 201, r1.text

    r2 = client.post("/apis/v3/quality/ncr", headers=hdr, json={
        "project_id": str(project.id), "ncr_number": "NCR-R386", "title": "Second try",
    })
    assert r2.status_code == 409, r2.text
    assert "NCR-R386" in r2.json()["detail"], r2.text


def test_duplicate_payment_reference_rejected_at_orm_level_and_nulls_stay_free(client, db, make_tenant):
    comp_a, user_a, team_a = make_tenant(company_name="R543A", user_name="U543A")
    comp_b, user_b, team_b = make_tenant(company_name="R543B", user_name="U543B")

    def _pay(comp, ref):
        return models.Payment(
            company_id=comp.id, payment_type="out", amount=100, unsettled_amount=100,
            payment_method="Cash", reference_number=ref,
            payment_date=datetime.datetime(2026, 8, 20),
        )

    db.add(_pay(comp_a, "REF-R543"))
    db.commit()

    # Same reference within the company conflicts (the race R2-543 closed).
    db.add(_pay(comp_a, "REF-R543"))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()

    # Same reference at another company is fine (company-scoped).
    db.add(_pay(comp_b, "REF-R543"))
    # Multiple NULL references never group together, mirroring the router guard.
    db.add(_pay(comp_a, None))
    db.add(_pay(comp_a, None))
    db.commit()


def test_create_payment_answers_friendly_409_on_duplicate_reference(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R543C", user_name="U543C")
    hdr = auth_headers(user, comp)

    body = {
        "company_id": str(comp.id),
        "payment_type": "out",
        "amount": 2500,
        "payment_method": "Cash",
        "reference_number": "VCH-R543",
        "payment_date": datetime.datetime(2026, 8, 22).isoformat(),
    }
    r1 = client.post("/apis/v3/finance/payments", headers=hdr, json=body)
    assert r1.status_code == 201, r1.text

    r2 = client.post("/apis/v3/finance/payments", headers=hdr, json=body)
    assert r2.status_code == 409, r2.text
    assert "reference_number 'VCH-R543'" in r2.json()["detail"], r2.text

    # A payment without a reference is unaffected by the dedupe rule.
    body.pop("reference_number")
    r3 = client.post("/apis/v3/finance/payments", headers=hdr, json=body)
    assert r3.status_code == 201, r3.text
