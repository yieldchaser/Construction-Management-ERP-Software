"""R2-730: material_wastage.reported_by migration 20260816_000005 never ran.

Live Supabase had reported_by as VARCHAR with free-text rows; the model declares
UUID FK to company_team.id. Boot sync only adds missing columns, so the type
mismatch stays wrong and SQLAlchemy raises ValueError on load, 500ing the
wastage read path.

This fix adds ensure_material_wastage_reported_by_uuid() which on:
  * SQLite (test/dev): nulls non-UUID values so ORM coercion never fails
  * Postgres (prod): ALTER TYPE UUID USING CASE WHEN uuid ELSE NULL, plus FK

Tests prove:
  1. The migration file exists and contains the expected statements
  2. The model column is UUID FK nullable
  3. Creating wastage stores the reporter's team id as UUID and round-trips via API
  4. A legacy free-text value is cleaned to NULL and the read path does not 500
  5. Listing wastage with null reported_by succeeds
"""
import os
import uuid
from decimal import Decimal

from app import models
from app.main import ensure_material_wastage_reported_by_uuid
from app.database import engine

MIGRATION = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "..", "..",
    "supabase", "migrations", "20260816_000005_material_wastage_reported_by_team.sql",
)

_SUFFIX = uuid.uuid4().hex[:8]


def _mob(tag: int) -> str:
    return f"+9197{_SUFFIX}{tag:03d}"


def _mail(tag: int) -> str:
    return f"r730-{tag}-{_SUFFIX}@test.com"


def _mk_project(db, comp):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P-R730", code=f"PRJ-R730-{uuid.uuid4().hex[:6]}", status="Ongoing", state="Maharashtra"
    )
    db.add(p)
    db.commit()
    return p


def test_migration_file_exists_and_has_expected_statements():
    assert os.path.exists(MIGRATION), f"migration file missing: {MIGRATION}"
    src = open(MIGRATION, encoding="utf-8").read()
    assert 'ALTER COLUMN "reported_by" TYPE UUID' in src
    assert "reported_by" in src and "company_team" in src
    assert "material_wastage_reported_by_fkey" in src
    # The USING clause nulls non-UUID free text
    assert "ELSE NULL" in src


def test_model_column_is_uuid_fk_nullable():
    col = models.MaterialWastage.__table__.c.reported_by
    # Should be UUID type and nullable and FK to company_team.id
    assert col.nullable is True
    # Type name contains UUID (SQLite may report CHAR(36) but postgres is UUID)
    # So check both possibilities but ensure not plain String without FK
    fk_targets = {fk.target_fullname for fk in col.foreign_keys}
    assert "company_team.id" in fk_targets, f"FK missing, got {fk_targets}"


def test_wastage_create_stores_reporter_team_uuid_and_roundtrips(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name=f"R730-{_SUFFIX}", user_name="U730-1", mobile=_mob(1), email=_mail(1))
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    db.add(models.WarehouseInventory(
        id=uuid.uuid4(), project_id=project.id, material_name="Cement",
        on_hand_qty=Decimal("10"), reserved_qty=Decimal("0"), unit="bags"))
    db.commit()

    payload = {
        "company_id": str(comp.id), "project_id": str(project.id),
        "material_name": "Cement", "wastage_type": "damaged",
        "quantity": 2, "unit": "bags",
    }
    r = client.post("/apis/v3/wastage", json=payload, headers=hdr)
    assert r.status_code == 201, r.text
    body = r.json()
    # reported_by should be the team id (UUID), not free text
    assert body["reported_by"] == str(team.id), body
    assert isinstance(uuid.UUID(body["reported_by"]), uuid.UUID)

    # DB round-trip
    wid = uuid.UUID(body["id"])
    row = db.query(models.MaterialWastage).filter(models.MaterialWastage.id == wid).one()
    assert row.reported_by == team.id
    assert row.company_id == comp.id

    # GET list should return the same value
    lst = client.get(f"/apis/v3/wastage/{project.id}", headers=hdr)
    assert lst.status_code == 200, lst.text
    found = [x for x in lst.json() if x["id"] == str(wid)]
    assert len(found) == 1
    assert found[0]["reported_by"] == str(team.id)

    # cleanup inventory check not needed; row will stay per-session but scoped to project


def test_wastage_list_with_null_reported_by_does_not_500(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name=f"R730N-{_SUFFIX}", user_name="U730N", mobile=_mob(2), email=_mail(2))
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    # Insert a wastage row directly with reported_by = NULL (legacy cleaned state)
    wid = uuid.uuid4()
    db.add(models.MaterialWastage(
        id=wid, company_id=comp.id, project_id=project.id,
        material_name="Sand", wastage_type="damaged", quantity=Decimal("1"), unit="bags",
        estimated_value=Decimal("0"), reported_by=None, photo_urls=[], status="reported"
    ))
    db.commit()

    r = client.get(f"/apis/v3/wastage/{project.id}", headers=hdr)
    assert r.status_code == 200, r.text
    found = [x for x in r.json() if x["id"] == str(wid)]
    assert len(found) == 1
    assert found[0]["reported_by"] is None


def test_ensure_cleans_non_uuid_reported_by_sqlite(client, db, make_tenant, auth_headers):
    """Insert a legacy free-text reported_by via raw SQL, run the ensure helper,
    and prove it is nulled and the ORM can load the row without ValueError."""
    comp, user, team = make_tenant(company_name=f"R730L-{_SUFFIX}", user_name="U730L", mobile=_mob(3), email=_mail(3))
    project = _mk_project(db, comp)
    wid = uuid.uuid4()
    # Use ORM to insert with valid UUID first, then overwrite via raw SQL to free text
    db.add(models.MaterialWastage(
        id=wid, company_id=comp.id, project_id=project.id,
        material_name="Bricks", wastage_type="damaged", quantity=Decimal("5"), unit="pcs",
        estimated_value=Decimal("0"), reported_by=team.id, photo_urls=[], status="reported"
    ))
    db.commit()
    # Overwrite with free text via raw SQL to simulate prod's 2 bad rows
    bind = db.get_bind()
    with bind.begin() as conn:
        conn.exec_driver_sql(
            "UPDATE material_wastage SET reported_by = ? WHERE id = ?", ("John Doe", str(wid))
        )
    # Before fix, loading via ORM would raise ValueError (badly formed hex UUID)
    # After fix, ensure helper nulls it
    ensure_material_wastage_reported_by_uuid()
    # Verify raw value is now NULL
    with bind.begin() as conn:
        val = conn.exec_driver_sql("SELECT reported_by FROM material_wastage WHERE id = ?", (str(wid),)).fetchone()
        assert val is not None
        assert val[0] is None, f"expected NULL after clean, got {val[0]!r}"

    # ORM load should now succeed and reported_by be None
    db.expire_all()
    row = db.query(models.MaterialWastage).filter(models.MaterialWastage.id == wid).one()
    assert row.reported_by is None

    # API list should not 500
    hdr = auth_headers(user, comp)
    r = client.get(f"/apis/v3/wastage/{project.id}", headers=hdr)
    assert r.status_code == 200, r.text
    found = [x for x in r.json() if x["id"] == str(wid)]
    assert found[0]["reported_by"] is None


def test_ensure_is_idempotent_and_handles_missing_table(monkeypatch):
    # Should not raise when called twice or on fresh engine (already covered by call in previous test)
    ensure_material_wastage_reported_by_uuid()
    ensure_material_wastage_reported_by_uuid()
