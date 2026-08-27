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


# ── R2-738 / R2-739 / R2-740 correctness gates ─────────────────────────────────
# The 108 _tenant_scoped policies from 20260824_000001 were inert (BYPASSRLS +
# auth.uid() never matches public.users) and contained an infinite recursion
# on company_team (42P17). Migration 20260825_000007_rls_correctness makes them
# CORRECT without making them load-bearing (flag remains OFF, role still BYPASSRLS).
# Static file checks run on any engine; the RLS behaviour checks are Postgres-only
# (SQLite cannot see RLS, same as R2-728) and are skipped on SQLite via dialect.

import datetime as _dt
import os as _os
import uuid as _uuid

import pytest as _pytest
from sqlalchemy import text as _text

CORRECTNESS = MIGRATIONS / "20260825_000007_rls_correctness.sql"


def _is_postgres_engine() -> bool:
    url = _os.getenv("DATABASE_URL", "")
    try:
        from app.database import engine as _eng

        drv = getattr(getattr(_eng, "url", None), "drivername", "") or ""
        dialect = getattr(getattr(_eng, "dialect", None), "name", "") or ""
    except Exception:
        drv = ""
        dialect = ""
    return (
        "postgres" in drv.lower()
        or "postgres" in dialect.lower()
        or "postgres" in url.lower()
        or "postgresql" in url.lower()
    )


def test_r2_739_740_correctness_migration_exists_and_fixes_predicates():
    """Static gate: the correctness migration must exist and replace auth.uid() with
    pluggable identity (current_app_user_id / current_company_ids), fix the
    company_team recursion, and scope companies/users."""
    assert CORRECTNESS.exists(), f"correctness migration missing: {CORRECTNESS}"
    txt = CORRECTNESS.read_text(encoding="utf-8")

    # Functions must exist in dependency order: current_app_user_id before current_company_ids
    assert "CREATE OR REPLACE FUNCTION public.current_app_user_id()" in txt
    assert "CREATE OR REPLACE FUNCTION public.current_company_ids()" in txt
    assert txt.index("CREATE OR REPLACE FUNCTION public.current_app_user_id()") < txt.index(
        "CREATE OR REPLACE FUNCTION public.current_company_ids()"
    ), "current_app_user_id() must be created before current_company_ids() (dependency)"
    # Function bodies
    assert "current_setting('app.current_user_id'" in txt
    assert "auth.uid()" in txt  # fallback inside current_app_user_id only
    assert "SECURITY DEFINER" in txt
    assert "SET search_path = public" in txt
    assert "REVOKE EXECUTE ON FUNCTION public.current_company_ids() FROM PUBLIC" in txt
    assert "GRANT EXECUTE ON FUNCTION public.current_company_ids() TO authenticated" in txt

    # No policy predicate should still contain auth.uid() -- only the function fallback does.
    # Split after the GRANTs; the remainder is purely policy DDL.
    after_grants = txt.split("GRANT EXECUTE ON FUNCTION public.current_app_user_id()")[-1]
    assert "auth.uid()" not in after_grants, (
        "policies still reference auth.uid() -- all should have been replaced with "
        "current_app_user_id() / current_company_ids(); found in policy section"
    )
    # Every tenant policy must now reference the helper functions
    tenant_policies = re.findall(r'CREATE POLICY "[a-z0-9_]+_tenant_scoped"', txt)
    assert len(tenant_policies) == 108, f"expected 108 tenant_scoped policies, got {len(tenant_policies)}"
    # company_team must be simple, no self-subquery
    m = re.search(r'CREATE POLICY "company_team_tenant_scoped".*?;\n', txt, flags=re.S)
    assert m, "missing company_team_tenant_scoped policy"
    ct_block = m.group(0)
    assert "user_id = public.current_app_user_id()" in ct_block, (
        "company_team policy must be USING (user_id = public.current_app_user_id()) with no subquery"
    )
    # Extract the USING line only to check for self-subquery -- the header comment
    # contains the old query as documentation.
    using_match = re.search(r"USING\s*\(.*?\)", ct_block, flags=re.S)
    assert using_match, "company_team policy missing USING clause"
    assert "SELECT" not in using_match.group(0), (
        "company_team USING must not contain SELECT (no subquery over itself)"
    )
    # Other company-scoped and project-scoped predicates use the helper
    assert "SELECT public.current_company_ids()" in txt
    # companies and users must be scoped, not USING (true)
    assert 'CREATE POLICY "companies_authenticated_all" ON "companies"' in txt
    assert 'CREATE POLICY "users_authenticated_all" ON "users"' in txt
    # Verify they are membership-scoped, not blanket true
    comp_m = re.search(r'CREATE POLICY "companies_authenticated_all".*?;\n', txt, flags=re.S)
    assert comp_m and "current_company_ids()" in comp_m.group(0)
    assert comp_m and "USING (true)" not in comp_m.group(0)
    users_m = re.search(r'CREATE POLICY "users_authenticated_all".*?;\n', txt, flags=re.S)
    assert users_m and "current_app_user_id()" in users_m.group(0)
    assert users_m and "USING (true)" not in users_m.group(0)
    # The other 31 legacy *_authenticated_all remain documented as intentional allowlist
    # (child tables / global). At minimum companies/users are fixed; the rest may stay true.
    legacy_remaining = re.findall(r'CREATE POLICY "[a-z0-9_]+_authenticated_all".*?USING \(true\)', txt, flags=re.S)
    # No check on count here -- just that the two critical tables are not in that set
    for block in legacy_remaining:
        assert '"companies_authenticated_all"' not in block and '"users_authenticated_all"' not in block


def test_r2_738_backend_wiring_flag_defaults_off_and_sets_context():
    """Backend wiring for R2-739 must exist behind flag RLS_SESSION_CONTEXT (default OFF).

    No DATABASE_URL change and no non-BYPASSRLS role creation -- RLS stays inert until
    explicit rollout. This is a source gate that runs on any engine."""
    from app.config import settings as _settings

    assert hasattr(_settings, "RLS_SESSION_CONTEXT"), "RLS_SESSION_CONTEXT flag missing in config.py"
    # Default must be falsy / OFF
    field = type(_settings).model_fields.get("RLS_SESSION_CONTEXT")
    assert field is not None
    assert field.default is False or field.default == 0 or str(field.default).lower() in ("0", "false")

    # Auth module must have the helper that does SET LOCAL / set_config
    import pathlib as _pl

    auth_path = REPO / "backend" / "app" / "auth.py"
    assert auth_path.exists()
    auth_src = auth_path.read_text(encoding="utf-8")
    assert "_set_rls_session_context" in auth_src
    assert "set_config('app.current_user_id'" in auth_src or "SET LOCAL app.current_user_id" in auth_src
    assert "RLS_SESSION_CONTEXT" in auth_src
    # Must mention transaction-scoped / pooler-safe in comment or docstring
    assert "pooler-safe" in auth_src or "SET LOCAL" in auth_src


# Postgres-only: prove company_team does NOT raise 42P17 when queried as authenticated
@_pytest.mark.skipif(
    not _is_postgres_engine(),
    reason="Postgres-only: SQLite has no RLS, cannot see 42P17 infinite recursion; this gate runs only when DATABASE_URL is postgres (same as R2-728)",
)
def test_r2_738_company_team_no_recursion_as_authenticated(db, make_tenant):
    """Gate: SELECT from company_team as authenticated must NOT raise 42P17.

    The old predicate queried company_team from its own policy and raised
    infinite recursion. After the fix the policy is user_id = current_app_user_id()
    and the helper is SECURITY DEFINER, so authenticated reads succeed."""
    from app.database import engine as _eng

    comp_a, user_a, _team_a = make_tenant(company_name="R738-A", user_name="U738A")
    # Ensure at least one row exists for the authenticated user
    with _eng.begin() as conn:
        conn.execute(_text("SET LOCAL ROLE authenticated"))
        conn.execute(_text("SELECT set_config('app.current_user_id', :uid, true)"), {"uid": str(user_a.id)})
        # This must not raise 42P17 (infinite recursion)
        try:
            rows = conn.execute(_text("SELECT id FROM company_team")).fetchall()
        except Exception as exc:
            _pytest.fail(f"company_team SELECT as authenticated raised {exc!r} (42P17 not fixed)")
        # At least the caller's own membership should be visible (policy is user_id = current_app_user_id)
        ids = {str(r[0]) for r in rows}
        # The user's own team row should be among results when visible (may be empty if RLS filters correctly? but should not error)
        # No assertion on count, just that no exception was raised
        assert isinstance(ids, set)


@_pytest.mark.skipif(
    not _is_postgres_engine(),
    reason="Postgres-only: SQLite cannot enforce RLS predicates; isolation can only be verified against Postgres (same as R2-728)",
)
def test_r2_739_740_tenant_isolation_as_authenticated(db, make_tenant):
    """Gate: with app.current_user_id set to user in company A, projects/bills/companies
    return ONLY company A rows and zero company B rows (and users shows only same-tenant)."""
    from app import models as _models
    from app.database import engine as _eng

    sfx = _uuid.uuid4().hex[:6]
    comp_a, user_a, team_a = make_tenant(
        company_name=f"R739A-{sfx}", user_name=f"UA739{sfx}", mobile=f"+91900{sfx}01", email=f"a739-{sfx}@test.com"
    )
    comp_b, user_b, team_b = make_tenant(
        company_name=f"R739B-{sfx}", user_name=f"UB739{sfx}", mobile=f"+91900{sfx}02", email=f"b739-{sfx}@test.com"
    )

    proj_a = _models.Project(id=_uuid.uuid4(), company_id=comp_a.id, name=f"PA-{sfx}", code=f"PA-{sfx}", status="Ongoing")
    proj_b = _models.Project(id=_uuid.uuid4(), company_id=comp_b.id, name=f"PB-{sfx}", code=f"PB-{sfx}", status="Ongoing")
    db.add_all([proj_a, proj_b])
    db.commit()

    bill_a = _models.Bill(
        id=_uuid.uuid4(),
        company_id=comp_a.id,
        project_id=proj_a.id,
        party_company_user_id=team_a.id,
        invoice_number=f"BILLA-{sfx}",
        invoice_date=_dt.datetime(2026, 1, 1, tzinfo=_dt.timezone.utc),
        invoice_type="purchase",
        subtotal=100.0,
        total_payable=100.0,
    )
    bill_b = _models.Bill(
        id=_uuid.uuid4(),
        company_id=comp_b.id,
        project_id=proj_b.id,
        party_company_user_id=team_b.id,
        invoice_number=f"BILLB-{sfx}",
        invoice_date=_dt.datetime(2026, 1, 1, tzinfo=_dt.timezone.utc),
        invoice_type="purchase",
        subtotal=200.0,
        total_payable=200.0,
    )
    db.add_all([bill_a, bill_b])
    db.commit()

    with _eng.begin() as conn:
        # Become authenticated and bind to company A user
        conn.execute(_text("SET LOCAL ROLE authenticated"))
        conn.execute(_text("SELECT set_config('app.current_user_id', :uid, true)"), {"uid": str(user_a.id)})

        # projects: only A visible
        proj_rows = conn.execute(_text("SELECT id FROM projects")).fetchall()
        proj_ids = {str(r[0]) for r in proj_rows}
        assert str(proj_a.id) in proj_ids, f"project A not visible to its member: {proj_ids}"
        assert str(proj_b.id) not in proj_ids, f"project B leaked to company A user: {proj_ids}"

        # bills: only A visible
        bill_rows = conn.execute(_text("SELECT id FROM bills")).fetchall()
        bill_ids = {str(r[0]) for r in bill_rows}
        assert str(bill_a.id) in bill_ids, f"bill A not visible: {bill_ids}"
        assert str(bill_b.id) not in bill_ids, f"bill B leaked to company A user: {bill_ids}"

        # companies: only A visible
        comp_rows = conn.execute(_text("SELECT id FROM companies")).fetchall()
        comp_ids = {str(r[0]) for r in comp_rows}
        assert str(comp_a.id) in comp_ids, f"company A not visible: {comp_ids}"
        assert str(comp_b.id) not in comp_ids, f"company B leaked: {comp_ids}"

        # users: user A sees self, and sees other members of same company but NOT user B
        user_rows = conn.execute(_text("SELECT id FROM users")).fetchall()
        user_ids = {str(r[0]) for r in user_rows}
        assert str(user_a.id) in user_ids, f"self not visible in users: {user_ids}"
        assert str(user_b.id) not in user_ids, f"cross-tenant user B leaked: {user_ids}"

        # company_team: only own row visible (simple predicate, no recursion)
        ct_rows = conn.execute(_text("SELECT id, company_id, user_id FROM company_team")).fetchall()
        # At least team_a should be visible, team_b should not
        ct_ids = {str(r[0]) for r in ct_rows}
        assert str(team_a.id) in ct_ids, f"own company_team row not visible: {ct_ids}"
        assert str(team_b.id) not in ct_ids, f"cross-tenant team leaked: {ct_ids}"

