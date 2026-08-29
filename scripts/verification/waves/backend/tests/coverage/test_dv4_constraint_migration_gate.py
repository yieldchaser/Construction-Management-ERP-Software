"""D-V4 + R2-711 class gate: every model UniqueConstraint/Index must have a migration.

R2-701/R2-702 are invisible to pytest by construction: create_all builds every
constraint on a fresh SQLite database, so a constraint with no migration is
indistinguishable from one with a migration. The suite cannot fail.

This gate walks Base.metadata for every named UniqueConstraint and unique
Index and asserts a matching CREATE ... / ADD CONSTRAINT exists somewhere in
supabase/migrations/. It closes the whole class rather than the seven
instances. Fails loudly with the missing constraint names.

D-V4 decision: two cheap class gates - R2-711 (UniqueConstraint/Index with
no migration fails the suite) and R2-717 (sibling note without tracking id).
This file is the first gate.

Blast-radius: test-only. No production code.
"""
import os
import re

import sqlalchemy as sa
from app.database import Base
from app import models  # noqa: F401 - ensure all models are imported and registered


# Migrations dir is <repo-root>/supabase/migrations, three levels up from
# backend/tests/coverage.
MIGRATIONS_DIR = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "supabase", "migrations")
)


def _collect_named_constraints():
    """Return list of (table_name, constraint_name, columns) for every named UniqueConstraint/Index."""
    found = []
    for table in Base.metadata.tables.values():
        # UniqueConstraint objects (including those from __table_args__)
        for cons in table.constraints:
            if isinstance(cons, sa.UniqueConstraint) and cons.name:
                # Only gate constraints that are part of the uq_* family.
                # Column-level unique=True creates auto-named indexes like ix_companies_slug
                # which are already covered by the initial CREATE TABLE ... UNIQUE in
                # 20260710_000001_full_schema_sync.sql without an explicit ADD CONSTRAINT line.
                # Those would false-positive if we required the auto name to appear.
                if cons.name.startswith("uq_"):
                    cols = tuple(c.name for c in cons.columns)
                    found.append((table.name, cons.name, cols))
        # Unique indexes (including column-level unique=True which creates an index)
        for idx in table.indexes:
            # Gate only named unique indexes in the uq_* family.
            if idx.name and idx.unique and idx.name.startswith("uq_"):
                cols = tuple(c.name for c in idx.columns)
                found.append((table.name, idx.name, cols))
    # Deduplicate by name (same constraint may appear via both paths on some SA versions)
    seen = set()
    deduped = []
    for table_name, name, cols in found:
        if name not in seen:
            seen.add(name)
            deduped.append((table_name, name, cols))
    return sorted(deduped, key=lambda x: x[1])


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


def test_every_named_unique_constraint_has_a_migration():
    constraints = _collect_named_constraints()
    assert constraints, "No named UniqueConstraints found - models import may be broken"

    migrations_text, migration_files = _load_migrations_text()
    assert migration_files, f"No migration files found in {MIGRATIONS_DIR}"
    assert migrations_text.strip(), "Migrations text is empty"

    missing = []
    for table_name, name, cols in constraints:
        # The migration must mention the constraint name verbatim (ADD CONSTRAINT <name>
        # or CREATE UNIQUE INDEX <name>). This is the cheapest reliable signal.
        if name not in migrations_text:
            # Fallback: check that at least the column set appears near the table name in
            # some migration, to catch cases where the constraint was created inline via
            # CREATE TABLE ... UNIQUE (...) without an explicit ADD CONSTRAINT line.
            # For now we require the name; the fallback is only for diagnostics.
            missing.append((table_name, name, cols))

    if missing:
        details = "\n".join(
            f"  - {name} on {table} ({', '.join(cols) if cols else 'no columns'})"
            for table, name, cols in missing
        )
        # Loud failure: list every missing constraint and hint the fix.
        assert False, (
            f"D-V4/R2-711 gate failed: {len(missing)} model constraint(s) have no migration.\n"
            f"Every UniqueConstraint/Index with an explicit name must appear in supabase/migrations/.\n"
            f"Migrations dir: {MIGRATIONS_DIR}\n"
            f"Files scanned: {len(migration_files)} ({', '.join(sorted(migration_files)[:5])}...)\n"
            f"Missing:\n{details}\n"
            f"Fix: add a migration that creates each missing constraint, e.g.:\n"
            f"  ALTER TABLE <table> ADD CONSTRAINT <name> UNIQUE (<cols>);\n"
            f"Use the duplicate-safe NOTICE-skip idiom from 20260823_000002_orphan_unique_constraints.sql.\n"
        )


def test_migration_gate_covers_at_least_expected_constraints():
    """Sanity check that the gate is actually scanning the known R2-701 family."""
    constraints = _collect_named_constraints()
    names = {n for _, n, _ in constraints}
    # The six document-number pairs from R2-701 plus the two from R2-702/R2-386/R2-543
    must_exist_in_models = [
        "uq_material_indents_company_id_indent_number",
        "uq_purchase_orders_company_id_po_number",
        "uq_goods_receipt_notes_company_id_grn_number",
        "uq_work_orders_company_id_wo_number",
        "uq_bills_company_id_invoice_number",
        "uq_library_cost_codes_company_id_code",
        "uq_company_team_company_id_user_id",
    ]
    missing_from_models = [n for n in must_exist_in_models if n not in names]
    assert not missing_from_models, (
        f"Expected constraints missing from models.py - gate is mis-configured:\n"
        f"{missing_from_models}\nFound: {sorted(names)}"
    )
