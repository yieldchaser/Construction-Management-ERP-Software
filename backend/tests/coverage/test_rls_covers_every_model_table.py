"""Every model table must have row level security in some Supabase migration.

Supabase raised rls_disabled_in_public on 2026-08-31 for kyc_access_logs. It was
the only one of 140 model tables with RLS on no migration, because no migration
created it: Base.metadata.create_all() ran against production on boot and made
the table with no policy. main.py now gates that call to SQLite, and this test
is the guard that stops the same gap reopening.

Compare in the direction "every model table is covered". The reverse does not
hold: quotations and transaction_retentions are SQL-only tables with migrations
and no model.
"""

import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
MODELS = REPO / "backend" / "app" / "models.py"
MIGRATIONS = REPO / "supabase" / "migrations"

_RLS = re.compile(
    r'ALTER TABLE (?:IF EXISTS )?"?([a-z0-9_]+)"?\s+'
    r'(?:ENABLE|FORCE) ROW LEVEL SECURITY',
    re.IGNORECASE,
)


def _model_tables():
    src = MODELS.read_text(encoding="utf-8")
    return set(re.findall(r'__tablename__\s*=\s*[\'"]([a-z0-9_]+)[\'"]', src))


def _rls_covered():
    covered = set()
    for path in sorted(MIGRATIONS.glob("*.sql")):
        covered |= set(m.group(1) for m in _RLS.finditer(path.read_text(encoding="utf-8")))
    return covered


def test_every_model_table_has_rls_in_a_migration():
    missing = sorted(_model_tables() - _rls_covered())
    assert not missing, (
        "Model tables with row level security on no migration: "
        f"{missing}. A table created by create_all instead of a migration "
        "reaches production with no policy. Add ENABLE + FORCE ROW LEVEL "
        "SECURITY and a tenant-scoped policy, as in "
        "20260902_000001_kyc_access_logs_rls.sql."
    )


def test_kyc_access_logs_specifically_is_covered():
    """The table the Supabase linter flagged. Pinned by name so a future
    refactor of the general test cannot quietly drop it."""
    assert "kyc_access_logs" in _rls_covered(), "kyc_access_logs RLS regressed"


def test_the_detector_would_notice_an_uncovered_table():
    """Self-test, in both directions.

    A sweep that finds nothing passes a positive-only check trivially, so assert
    the parser sees a table that IS covered and does NOT see one that is not.
    """
    covered = _rls_covered()
    assert "library_parties" in covered, "parser failed to see a known-covered table"
    assert "zzz_not_a_real_table" not in covered, "parser invented a table"

    # And the set difference must actually flag a fabricated model table.
    fake = {"zzz_not_a_real_table"}
    assert fake - covered == fake, "set difference would not flag an uncovered table"
