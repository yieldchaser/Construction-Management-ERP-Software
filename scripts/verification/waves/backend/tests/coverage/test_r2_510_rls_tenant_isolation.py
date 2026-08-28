"""R2-510: the base RLS migration enabled row level security on all tables but
every policy was USING (true) WITH CHECK (true), so the database enforced no
tenant isolation at all. The generated follow-up migration must:

1. put a real tenant predicate on every table that carries company_id or a
   project FK resolvable through projects.company_id,
2. FORCE ROW LEVEL SECURITY on every table so owners cannot bypass it,
3. leave only the documented no-tenancy-column tables unconditional,
4. keep the service-role key strictly server-side (frontend ships no Supabase
   client or key), which is what bounds the exposure today.
"""

import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
MIGRATIONS = REPO / "supabase" / "migrations"
BASE = MIGRATIONS / "20260723_000001_enable_rls_security.sql"
FOLLOWUP = MIGRATIONS / "20260824_000001_rls_tenant_predicates_and_force.sql"

# Tables added after the base migration that had NO RLS anywhere before the
# follow-up; they are covered there too (allowlisted, see below).
NEVER_RLS = {"revoked_tokens", "drawing_revision_approvals"}
# SQL-only tables missing from models metadata, classified manually from their
# CREATE TABLE schemas in 20260710_000001_full_schema_sync.sql.
MANUAL_COMPANY = {"quotations"}  # company_id UUID NOT NULL
MANUAL_UNLINKED = {"transaction_retentions"}  # child of bills via bill_id


def _base_tables():
    text = BASE.read_text(encoding="utf-8")
    return [
        m.group(1)
        for m in re.finditer(
            r'^ALTER TABLE IF EXISTS "([a-z0-9_]+)" ENABLE ROW LEVEL SECURITY;',
            text,
            flags=re.M,
        )
    ]


def _expected_tenancy():
    """table -> 'company' | 'project' | None straight from the live models."""
    import os
    import tempfile
    os.environ.setdefault("ENVIRONMENT", "test")
    os.environ.setdefault("DATABASE_URL", f"sqlite:///{tempfile.gettempdir()}/r2_510_pin.db")
    from app.database import Base
    import app.models  # noqa: F401

    out = {}
    for name, tbl in Base.metadata.tables.items():
        cols = {c.name for c in tbl.columns}
        if "company_id" in cols:
            out[name] = "company"
        elif "project_id" in cols:
            out[name] = "project"
    return out


def _policy_block(text, table):
    m = re.search(
        r'CREATE POLICY "%s_tenant_scoped" ON "%s".*?;\n' % (table, table),
        text,
        flags=re.S,
    )
    return m.group(0) if m else None


def test_followup_migration_hardens_every_rls_table():
    tables = _base_tables()
    assert len(tables) == 139
    text = FOLLOWUP.read_text(encoding="utf-8")

    forced = set(
        re.findall(r'ALTER TABLE IF EXISTS "([a-z0-9_]+)" FORCE ROW LEVEL SECURITY;', text)
    )
    assert forced == set(tables) | NEVER_RLS


def test_linked_tables_get_real_tenant_predicates():
    expected = _expected_tenancy()
    text = FOLLOWUP.read_text(encoding="utf-8")
    tables = _base_tables()

    scoped = set(re.findall(r'CREATE POLICY "([a-z0-9_]+)_tenant_scoped"', text))
    want = {
        t
        for t in tables
        if (
            t in MANUAL_COMPANY
            or (expected.get(t) is not None and t not in MANUAL_UNLINKED)
        )
    }
    assert scoped == want

    for t in sorted(scoped):
        block = _policy_block(text, t)
        assert block, f"missing tenant_scoped policy body for {t}"
        assert "auth.uid()" in block, f"{t} policy has no auth.uid() predicate"
        assert "USING (" in block and "WITH CHECK (" in block
        # The blanket policy must be gone for this table.
        assert f'DROP POLICY IF EXISTS "{t}_authenticated_all"' in text

    # No blanket policy survives on any tenant-scoped table.
    for t in scoped:
        assert not re.search(
            r'CREATE POLICY "%s_authenticated_all"' % t, text
        ), f"{t} still carries an unconditional authenticated_all policy"


def test_unconditional_policies_only_on_documented_allowlist():
    text = FOLLOWUP.read_text(encoding="utf-8")
    expected = _expected_tenancy()
    unlinked_allowlist = set(
        re.findall(
            r"^--   ([a-z0-9_]+)", text.split("Report-only follow-up")[1], flags=re.M
        )
    )

    blanket = set(re.findall(r'CREATE POLICY "([a-z0-9_]+)_authenticated_all"', text))

    # Blanket policies are allowed only on the documented allowlist (header),
    # the SQL-only child table, and the two never-RLS additions.
    assert blanket == unlinked_allowlist | MANUAL_UNLINKED | NEVER_RLS
    for t in blanket:
        if t in MANUAL_UNLINKED or t in NEVER_RLS:
            continue
        assert expected.get(t) is None, (
            f"{t} is linkable in models ({expected.get(t)}) but kept unconditional"
        )

    bodies = re.findall(
        r'CREATE POLICY "[a-z0-9_]+_authenticated_all"[^;]*FOR ALL TO authenticated\s+'
        r"USING \(true\) WITH CHECK \(true\);",
        text,
    )
    assert len(bodies) == len(blanket)


def test_service_role_key_stays_server_side():
    frontend_src = REPO / "frontend" / "src"
    banned = ("SUPABASE_SERVICE_ROLE_KEY", "@supabase/supabase-js", "NEXT_PUBLIC_SUPABASE")
    hits = []
    for p in frontend_src.rglob("*"):
        if not p.is_file():
            continue
        try:
            content = p.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for token in banned:
            if token in content:
                hits.append(f"{p.name}:{token}")
    assert hits == [], f"Supabase client/key material found in frontend: {hits}"
