"""Runtime SQLite schema-sync coverage (hermetic, no real DB, no network).

The 9 ensure_sqlite_* functions in app/main.py are the dev-only fallback that
keeps a local SQLite schema aligned with models.py (production uses Supabase
migrations). They were 0% tested. This file:

  * drives them against a fresh temp-file SQLite engine (never the repo's real
    *.db / test_phase*.db),
  * proves each one actually ADDS the columns it owns (we create the schema via
    SQLAlchemy, DROP the target column, then call the function and assert it is
    re-added),
  * proves ensure_sqlite_schema_sync() is the catch-all across tables,
  * proves idempotency (a second run must not raise).
"""
import os
import tempfile
from datetime import datetime, timezone
from sqlalchemy import create_engine, inspect

from app import models
from app import main as main_mod
from app.main import (
    ensure_sqlite_library_party_columns,
    ensure_sqlite_company_team_party_link,
    ensure_sqlite_library_cost_code_columns,
    ensure_sqlite_company_slug_column,
    ensure_sqlite_company_parent_column,
    ensure_sqlite_project_tab_columns,
    ensure_sqlite_bill_columns,
    ensure_sqlite_task_columns,
    ensure_sqlite_schema_sync,
)


def _new_sqlite_engine():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    os.remove(path)
    return create_engine(f"sqlite:///{path}"), path


def _build(monkeypatch):
    """Create a fresh temp SQLite engine, replace main.engine, build the schema."""
    engine, path = _new_sqlite_engine()
    monkeypatch.setattr(main_mod, "engine", engine)
    models.Base.metadata.create_all(engine)
    return engine, path


def _drop(engine, table, column):
    """Remove a single column so we can prove the ensure_* function re-adds it.

    A direct ALTER TABLE DROP COLUMN works for unconstrained columns. For columns
    involved in a FK/index (e.g. company_team.library_party_id, companies.slug,
    companies.parent_company_id, library_cost_codes.parent_id) SQLite refuses the
    in-place drop, so we rebuild that one table minus the target column instead."""
    try:
        with engine.begin() as conn:
            conn.exec_driver_sql(f'ALTER TABLE "{table}" DROP COLUMN "{column}"')
    except Exception:
        _rebuild_without(engine, table, column)


def _rebuild_without(engine, table, column):
    """Drop `table` and recreate it with the same model shape minus `column`.

    foreign_keys pragma is OFF for these connections, so the parent drop is
    allowed; child tables keep their FK definitions intact."""
    from sqlalchemy import Table, MetaData

    meta = MetaData()
    tbl = Table(table, meta, autoload_with=engine)
    cols = [c for c in tbl.columns if c.name != column]
    ddl = ", ".join(f'"{c.name}" {c.type.compile(dialect=engine.dialect)}' for c in cols)
    with engine.begin() as conn:
        conn.exec_driver_sql(f'DROP TABLE "{table}"')
        conn.exec_driver_sql(f'CREATE TABLE "{table}" ({ddl})')


def _cols(engine, table):
    return {c["name"] for c in inspect(engine).get_columns(table)}


def test_ensure_sqlite_library_party_columns(monkeypatch):
    engine, path = _build(monkeypatch)
    target = "creator_name"
    _drop(engine, "library_parties", target)
    assert target not in _cols(engine, "library_parties")
    ensure_sqlite_library_party_columns()
    assert target in _cols(engine, "library_parties")


def test_ensure_sqlite_company_team_party_link(monkeypatch):
    engine, path = _build(monkeypatch)
    _drop(engine, "company_team", "library_party_id")
    assert "library_party_id" not in _cols(engine, "company_team")
    ensure_sqlite_company_team_party_link()
    assert "library_party_id" in _cols(engine, "company_team")


def test_ensure_sqlite_library_cost_code_columns(monkeypatch):
    engine, path = _build(monkeypatch)
    _drop(engine, "library_cost_codes", "sub_cost_code")
    assert "sub_cost_code" not in _cols(engine, "library_cost_codes")
    ensure_sqlite_library_cost_code_columns()
    assert "sub_cost_code" in _cols(engine, "library_cost_codes")


def test_ensure_sqlite_company_slug_column(monkeypatch):
    engine, path = _build(monkeypatch)
    _drop(engine, "companies", "slug")
    assert "slug" not in _cols(engine, "companies")
    ensure_sqlite_company_slug_column()
    assert "slug" in _cols(engine, "companies")


def test_ensure_sqlite_company_parent_column(monkeypatch):
    engine, path = _build(monkeypatch)
    _drop(engine, "companies", "parent_company_id")
    assert "parent_company_id" not in _cols(engine, "companies")
    ensure_sqlite_company_parent_column()
    assert "parent_company_id" in _cols(engine, "companies")


def test_ensure_sqlite_project_tab_columns(monkeypatch):
    engine, path = _build(monkeypatch)
    for table, col in [
        ("projects", "project_value"),
        ("library_cost_codes", "parent_id"),
        ("library_materials", "alternate_unit"),
        ("project_parties", "status"),
    ]:
        _drop(engine, table, col)
        assert col not in _cols(engine, table)
    ensure_sqlite_project_tab_columns()
    assert "project_value" in _cols(engine, "projects")
    assert "parent_id" in _cols(engine, "library_cost_codes")
    assert "alternate_unit" in _cols(engine, "library_materials")
    assert "status" in _cols(engine, "project_parties")


def test_ensure_sqlite_bill_columns(monkeypatch):
    engine, path = _build(monkeypatch)
    _drop(engine, "bills", "items_json")
    assert "items_json" not in _cols(engine, "bills")
    ensure_sqlite_bill_columns()
    assert "items_json" in _cols(engine, "bills")
    assert "payment_ref" in _cols(engine, "bills")


def test_ensure_sqlite_task_columns(monkeypatch):
    engine, path = _build(monkeypatch)
    _drop(engine, "tasks", "progress")
    assert "progress" not in _cols(engine, "tasks")
    ensure_sqlite_task_columns()
    assert "progress" in _cols(engine, "tasks")
    assert "baseline_start" in _cols(engine, "tasks")


def test_ensure_sqlite_schema_sync_catchall(monkeypatch):
    engine, path = _build(monkeypatch)
    # Drop several model columns across tables, then let the catch-all restore them.
    _drop(engine, "bills", "items_json")
    _drop(engine, "tasks", "progress")
    _drop(engine, "companies", "slug")
    _drop(engine, "company_team", "library_party_id")
    for t, c in [("bills", "items_json"), ("tasks", "progress"), ("companies", "slug"), ("company_team", "library_party_id")]:
        assert c not in _cols(engine, t)
    ensure_sqlite_schema_sync()
    assert "items_json" in _cols(engine, "bills")
    assert "progress" in _cols(engine, "tasks")
    assert "slug" in _cols(engine, "companies")
    assert "library_party_id" in _cols(engine, "company_team")


def test_ensure_sqlite_idempotent(monkeypatch):
    engine, path = _build(monkeypatch)
    ensure_sqlite_schema_sync()  # first run (all columns present)
    # Second run must not raise (ADD COLUMN IF NOT EXISTS / exists-guard).
    ensure_sqlite_schema_sync()
    # Spot-check a representative column still present after the second pass.
    assert "items_json" in _cols(engine, "bills")
