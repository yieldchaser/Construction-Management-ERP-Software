# SiteFlow — Production-readiness pass (database + deferred technical debt)

## Context
This is the "get ready to actually launch" pass. Two parts: (1) move off SQLite dev DB onto a real hosted Postgres (Supabase, staying on its free tier for the first ~100 users), (2) close out every deferred technical-debt item flagged across the entire build (auth gaps, storage gaps, unwired settings toggles, etc — listed exhaustively below so nothing gets missed).

## Part 1 — Supabase migration

Audit first: `supabase/migrations/*.sql` already has 3 migration files from earlier rounds (project_tab_foundation, transaction_task_columns, finance_tab_columns) — these were written for a future Postgres target but the app has been running on SQLite dev the whole build. Check whether these migrations are complete/consistent with the CURRENT state of `backend/app/models.py` (a lot of tables/columns were added since those 3 files were written, likely via SQLite-only runtime ALTERs in `ensure_sqlite_schema_sync()` — those need a real migration file equivalent for Postgres, since Supabase won't have that runtime shim).

Steps:
1. Generate/complete the full migration set so Supabase's schema matches every table/column currently in `models.py` — not just the 3 already-written migration files. Consider using Alembic (or SQLAlchemy's own metadata) to autogenerate the diff rather than hand-writing 40+ new tables' worth of SQL.
2. Point the app at Supabase's Postgres connection string (env var, not hardcoded). Confirm `engine.url.drivername.startswith("sqlite")` branches in `models.py` (the `SQLiteUUID`/`JSONB` fallback) correctly no-op on Postgres — they should, since Postgres gets `postgresql.UUID`/`postgresql.JSONB` natively, but verify.
3. **Files tab migration — do this as part of the DB move, not after.** Files currently stores documents as BLOBs in the SQLite/Postgres DB itself (flagged as a stopgap since day one). Migrate to **Supabase Storage** (a bucket, not the DB) — this matters specifically because Supabase's free tier caps the *database* at 500MB but Storage is separate; leaving file BLOBs in the DB burns the wrong budget. Update `files.py` router to read/write Supabase Storage instead of the `ProjectFile.data` LargeBinary column; keep the `ProjectFile` metadata row (filename, content_type, folder_id) but store a Storage path/URL instead of raw bytes.
4. Seed data: confirm `seed_demo_data.py` (or equivalent) works against Supabase Postgres, not just SQLite.
5. Confirm Render (backend) and Vercel (frontend) both have the Supabase connection string configured as an env var, not committed to the repo.

## Part 2 — Auth: extend to every router (batch pass)
Auth (`get_current_user` dependency) currently only exists on the 8 routers touched during this build (projects, todos, files, billing, budgeting, library, planning, procurement). Every other router (~30) has zero auth — reachable without a token. Add the same router-level `dependencies=[Depends(get_current_user)]` pattern to every remaining router. This was deferred repeatedly through the build specifically so it could be done once, comprehensively, here — don't skip it now.

## Part 3 — Wire up every "stored but not enforced" flag from the Setting tab
Every one of these was built as storage+UI only, with enforcement explicitly deferred. Wire real enforcement now:
- **Workflow Controls**: Entry Controls (restrict create/edit of entries older than N days — actually block those API calls), Progress Controls (restrict progress entry beyond 100%/estimate — enforce in the Task progress-update endpoint), Finance Controls (Pre-Tax Deduction/Retention — actually switch the calc order in Transaction/Quotation/BOQ wherever Deduction/Retention is applied), Material Controls (all 8 restriction toggles — enforce in the relevant material/PO/GRN endpoints), GRN Numbering (Project vs Company level — actually use the selected numbering scheme when generating GRN numbers).
- **Document & Fields**: PDF Template flags (`custom_pdf_template_enabled`, `document_company_name_display`) — wire into whatever generates PDFs (invoices, quotations, reports). Terms & Conditions — wire Sales Invoice / Subcon Work Order / CRM Quotation forms to pull their default `terms` text from the company's stored T&C instead of starting blank. Number Format (`currency_decimal_places`, `quantity_decimal_places`) — make `fmtINR` and any quantity formatter actually read these instead of hardcoding decimals.
- **Multi Level Approval**: `ApprovalRule` records are stored but nothing currently checks them before allowing an action. Build the actual enforcement — when a covered action (payment, PO, material request, etc.) is created above/within a rule's amount range, require the configured approval chain before it's considered final.
- **Custom Fields**: field *definitions* exist and are manageable in Settings, but no entity form (Project, Party, Sales Invoice, etc.) actually renders/saves custom field values yet. Wire at least Project and Sales Invoice to render+persist their configured custom fields, as a proof of the framework actually working end-to-end.

## Part 4 — Smaller standing items
- **Shared `UNITS` constant** — no shared unit-of-measurement list exists anywhere; Transaction/BOQ/Material/Library forms all free-text the unit field. Add one shared constant (the full list from the original Project Tab spec — Barrel, Brass, cft, cum, kg, sqft, tonne, etc.) and wire it into every form that currently free-texts a unit.
- **Delete-log coverage** — `log_deletion()` is only called from 3 routers (library, planning, projects). Extend the same call to every other router's delete endpoints so the Delete Logs tab actually reflects all deletions, not just some.
- **Google Sheets integration** — currently just the auth/phone-whitelist layer, no real Sheets API connection. Decide whether to build the real integration now or leave it as a documented future item — don't build half of it silently.

## Part 5 — General production hardening
- Basic rate limiting on public-facing endpoints.
- Error monitoring/logging (even a simple structured-logging + external error tracker like Sentry free tier, if not already present).
- Health-check endpoint for Render's uptime monitoring.
- Confirm no secrets (API keys, DB credentials) are committed anywhere in the repo — audit `.env`/`.env.example` handling.

## Rules
- Audit each part before building — several of these may be partially done already, check first.
- This is inherently a "touch a lot of files" pass — still disclose every file touched, every round, same as always.
- Migration/schema work is genuinely risky (data layer change) — test against a real Supabase project before calling any part done, don't just assume the SQL is correct.
- One part at a time (suggested order: Supabase migration first since everything else depends on a stable DB target → Auth batch pass → Setting-flag enforcement → smaller items → hardening). Stop after each part, report back for verification.
- Flag anything that needs a decision only the user can make (e.g., Google Sheets real integration — build now or defer) rather than guessing.
