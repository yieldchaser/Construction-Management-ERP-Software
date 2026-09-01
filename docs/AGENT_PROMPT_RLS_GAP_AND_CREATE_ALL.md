> **DONE, not by an agent. Do not run this file.** Fixed directly at `397cb89`:
> migration `20260902_000001_kyc_access_logs_rls.sql`, `create_all` gated to SQLite,
> and `test_rls_covers_every_model_table.py` as the permanent guard.
> The migration still needs applying to Supabase.

# AGENT PROMPT: one table has no RLS, and the mechanism that will keep making more

Supabase raised `rls_disabled_in_public` on the production project. It is correct.
One table has row level security on no migration, and the reason it slipped
through will do the same to the next table anyone adds.

**Do this run before the outstanding Group A items.** It is the only security
item currently open.

Report as before: command, exit code, one sentence. No pasted output.
"Not run" is acceptable.

---

# PART 1: `kyc_access_logs` has no row level security

Every other table is covered. I diffed all 140 `__tablename__` values in
`models.py` against every `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL
SECURITY` statement across `supabase/migrations/`:

```
model tables                            140
covered by some migration               139
NOT covered anywhere                    kyc_access_logs
```

The table is `models.py:2202`:

```python
__tablename__ = "kyc_access_logs"
company_id     = Column(UUID, ForeignKey("companies.id", ...), index=True, nullable=True)
party_id       = Column(UUID, ForeignKey("library_parties.id", ...), nullable=False)
party_name     = Column(String(255), nullable=True)
document_type  = Column(String(50), nullable=False)  # "aadhaar_file", "pan_file", "aadhaar_number_reveal"
accessed_by    = Column(String(255), nullable=False)
accessed_at    = Column(DateTime(timezone=True), ...)
```

**This is the audit trail for Aadhaar and PAN access.** It does not hold the
document numbers, which are masked, but it holds the names of parties who have
Aadhaar on file, who looked at it, and when. It is the record that would prove or
disprove misuse of identity documents, and it is the one table in the product
with no row level security.

## The fix

Add a migration following the existing convention, enabling **and forcing** RLS
with the same tenant predicate its sibling tables use. `library_parties`, which
this table points at, is the model to copy verbatim from
`20260824_000001_rls_tenant_predicates_and_force.sql:1033`:

```sql
ALTER TABLE IF EXISTS "kyc_access_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "kyc_access_logs" FORCE ROW LEVEL SECURITY;
CREATE POLICY "kyc_access_logs_tenant_scoped" ON "kyc_access_logs"
  FOR ALL TO authenticated
  USING (
      company_id IN (
        SELECT ct.company_id FROM company_team ct
        WHERE ct.user_id = auth.uid()
      )
  )
  WITH CHECK ( … same … );
```

**Note `company_id` is nullable here** and it is not nullable on
`library_parties`. A NULL company_id makes the predicate NULL, which is not TRUE,
so those rows become invisible to every authenticated caller rather than visible
to all. That is the safe direction, but say in your report whether any existing
rows have a NULL `company_id`, because if so their audit trail becomes
unreadable through that path and the founder needs to know. Do not change the
column to NOT NULL in this run.

# PART 2: the mechanism, which matters more than the table

No migration creates `kyc_access_logs`. It exists in production because
`backend/app/main.py:485` runs on **every boot**:

```python
Base.metadata.create_all(bind=engine)
```

The comment two lines above says schema changes run via Supabase migrations in
production and that this is a "local/SQLite dev auto-fallback". **The call is not
gated on SQLite.** It runs against whatever `DATABASE_URL` points at, so in
production it silently creates any model table that has no migration, and a table
created that way has no RLS, no policy, and no linter coverage until Supabase
notices.

So this is not a one-off. Every future model added without a hand-written
migration lands in production unprotected, and the only thing that catches it is
an email from Supabase.

## The fix, and be careful here

**Gate `create_all` to SQLite.** The helpers right beside it already do exactly
this: `ensure_sqlite_library_party_columns()` at `main.py:35` returns early
unless `engine.url.drivername.startswith("sqlite")`. Apply the same guard.

Do not simply delete the call: local and test runs depend on it to build a fresh
SQLite schema, and `migration_runner.py:181` and `:219` both reference
`create_all` behaviour for empty databases. Read those before you touch it.

After gating it, a model added without a migration will fail loudly in
production instead of appearing unprotected. That is the point.

# PART 3: make it impossible to reintroduce

Add a test that fails if any model table lacks RLS in every migration. This is
the check I ran by hand; it should be permanent:

- Parse `__tablename__` from `models.py`.
- Parse `ALTER TABLE … ENABLE ROW LEVEL SECURITY` and `… FORCE ROW LEVEL
  SECURITY` from every file in `supabase/migrations/`.
- Assert the set difference is empty.

**Self-test it before you believe it**: temporarily add a fake table name to the
model list and confirm the test fails; remove it and confirm it passes. Report
that you did this.

The two SQL-only tables `quotations` and `transaction_retentions` are covered by
migrations but have no model, so compare in the direction "every model table is
covered", not "every covered table has a model".

---

# What is not at risk, so the report is accurate

Establish these rather than restating them:

- **The frontend ships no Supabase client and no key.** `grep -rn SUPABASE
  frontend/src` returns nothing and `supabase` is not in `frontend/package.json`.
  Confirm both still hold.
- **No key is committed.** Only env var references appear in the repo.
- **The service role key stays server-side**, already asserted by
  `test_r2_510_rls_tenant_isolation.py:141`.

What that bounds is the exposure, not the defect. Supabase's model treats RLS as
the boundary because the anon key is publishable by design, so "no key in the
repo" is not the same as "no key will ever reach anyone".

# Rules

- No authoring scripts.
- Migration file named to the existing convention, in `supabase/migrations/`.
- Do not alter any other table's policies in this run.
- Do not change `company_id` nullability.
- No frontend change.

# Definition of done

- [ ] Migration adds ENABLE and FORCE plus a tenant-scoped policy on
      `kyc_access_logs`, matching the `library_parties` pattern.
- [ ] Whether any existing rows have a NULL `company_id`, stated plainly.
- [ ] `create_all` is gated to SQLite, with the two `migration_runner`
      references read and reported as still correct.
- [ ] A test asserts every model table has RLS in some migration, and you have
      self-tested it in both directions. Report what the self-test showed.
- [ ] The three "not at risk" facts above re-confirmed, each with its command.
- [ ] `python scripts/verification/check_route_reachability.py` reports
      **0 unreachable**, exemptions still 30. Report the route total.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` fully green.
      Report passed and skipped counts.
- [ ] `cd frontend && npx tsc --noEmit` and `npm run build` both clean.
- [ ] **Commit and push to `origin/main`.**
- [ ] Say plainly that the migration still needs applying to Supabase, since
      pushing the file does not run it.
