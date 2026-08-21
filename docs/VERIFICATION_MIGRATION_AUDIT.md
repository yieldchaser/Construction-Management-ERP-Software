# Migration audit — models.py vs `supabase/migrations/` @ `campaign/waves`

**Run 2026-08-21, offline pass then checked against live Supabase the same day.** Tool:
`scripts/verification/migaudit.py`, self-tested against four known-positive columns from three
different SQL shapes before its output was believed.

---

## LIVE RESULT — read this before the offline reasoning below

The offline pass produced **one right answer and one wrong one.** Both are recorded here on
purpose; the wrong one is the argument for doing this rung at all.

### Columns — my offline claim was WRONG. No defect.

All four deployed columns are present in production:

| Column | live |
|---|---|
| `bills.wo_id` | present, `uuid` |
| `boq_documents.revised_amount` | present, `numeric` |
| `ncrs.vendor_id` | present, `uuid` |
| `purchase_orders.expected_delivery_date` | present, `timestamp with time zone` |

Because there is a **third** schema helper I missed: `ensure_postgres_schema_sync()`
(`app/main.py:270`, called at boot from the lifespan at `:483`). It walks every model table and
issues `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` on Postgres. Model columns therefore land in
production automatically, with no migration file, on the next deploy.

I missed it because I grepped for `ensure_sqlite_schema_sync` and `create_all`, then took
`test_ensure_sqlite_schema_sync.py`'s docstring — *"the dev-only fallback … production uses
Supabase migrations"* — as authority. That docstring is wrong about its own codebase, and I
quoted it as evidence instead of checking. **R2-253, R2-338, R2-202 keep their `FIXED` status on
the schema question.**

One real caveat remains: `ensure_postgres_schema_sync` **skips any non-nullable column with no
default**, printing a line and moving on. Every column the campaign added is nullable, so nothing
is currently affected — but a future NOT NULL column will silently never reach production.

### Constraints — the offline claim STANDS, and is now live-confirmed.

```
unique constraints in the DB (any name) : 72     <- sanity check, query shape works
unique indexes in public (any name)     : 156    <- sanity check
constraints named uq_*                  : 0
indexes named uq_*                      : 0
```

Checked by column set rather than by name, in case Postgres had auto-named them: on
`purchase_orders`, `goods_receipt_notes`, `material_indents`, `bills`, `library_cost_codes` and
`company_team` the **only** unique index is `<table>_pkey` on `id`. Nothing on
`(company_id, po_number)` or any of its siblings.

`ensure_postgres_schema_sync` adds columns and nothing else — no constraints, no indexes. So
**R2-559's six document-number uniques and R2-191 are inert in production**, confirmed live, not
inferred. Duplicate document numbers are accepted today.

Good news for the fix: **there are currently zero duplicates** on all six column pairs, so the
constraints can be added cleanly right now with no dedupe decision. That window closes as data
grows.

### Incidental finding — `work_orders` has no primary key in production

`work_orders` exists and holds 2 rows, but has **no unique index at all**, not even
`work_orders_pkey`, while every sibling table has one. Not something the fix campaign caused; found
by the same query. Needs its own finding number.

---

## Offline reasoning (kept for the record — the constraint half of this is what held up)

## Why this is the first check

Production schema comes **only** from `supabase/migrations/*.sql`.

- `Base.metadata.create_all` (`app/main.py:468`) creates *missing tables* on Postgres. It never
  adds a column to a table that already exists.
- The nine `ensure_sqlite_*` helpers (`app/main.py:241`) are dev-only. Their own test file says
  so: *"the dev-only fallback that keeps a local SQLite schema aligned with models.py (production
  uses Supabase migrations)"*.

So a model column with no migration is a **live 500** the first time the ORM selects it — and
SQLAlchemy emits every mapped column on a plain `db.query(Model)`, so it is not confined to the
endpoint that introduced it. A model `UniqueConstraint` with no migration is worse in a quieter
way: `pytest` on SQLite passes, and the fix **does nothing at all** in production.

## Result

Parsed 36 migration files (140 tables, 1488 columns, 22 named constraints) against models.py
(138 tables, 1431 columns, 7 named constraints).

**No table is missing.** Two classes of drift:

### A. Columns in models.py with no migration — pending 500s

| Column | Introduced by | R2 | On `origin/main`? | Router code that reads it |
|---|---|---|---|---|
| `bills.wo_id` | `e2a6963` | R2-253 | **yes — deployed** | `billing.py` (`Bill.wo_id`) |
| `purchase_orders.expected_delivery_date` | `959ae3b` | R2-338 | **yes — deployed** | `procurement.py`, `vendor_performance.py` |
| `ncrs.vendor_id` | `959ae3b` | R2-338 | **yes — deployed** | `vendor_performance.py` |
| `boq_documents.revised_amount` | `42d2c9a` | R2-202 | **yes — deployed** | BOQ/budget path |
| `bills.zoho_bill_id` | `52179b9` | R2-368 | no — `campaign/waves` only | `zoho_books.py` |

`boq_documents.revised_amount` is a genuinely separate column from `boq_revisions.revised_amount`,
which *does* have a migration (`20260715_000002`). The name collision is what makes a plain grep
say this one is covered when it is not.

Four of the five are already on `origin/main`, which is what Render deploys. If they are absent
from Supabase, every ORM read of `Bill`, `PurchaseOrder` and `NCR` fails — that is the whole
billing, procurement and quality surface, not one endpoint.

**This is an offline inference, not a live observation.** It is possible the founder applied the
columns to Supabase by hand, or that Render is not tracking `main`. That is exactly the question
Supabase access answers, and it is the first thing to check.

### B. Named constraints in models.py with no migration — inert fixes

**All seven named constraints in models.py lack a migration. Not a sample — the whole set.**

| Constraint | Table | R2 |
|---|---|---|
| `uq_purchase_orders_company_id_po_number` | `purchase_orders` | R2-559 |
| `uq_goods_receipt_notes_company_id_grn_number` | `goods_receipt_notes` | R2-559 |
| `uq_material_indents_company_id_indent_number` | `material_indents` | R2-559 |
| `uq_bills_company_id_invoice_number` | `bills` | R2-559 |
| `uq_work_orders_company_id_wo_number` | `work_orders` | R2-559 |
| `uq_library_cost_codes_company_id_code` | `library_cost_codes` | R2-559 |
| `uq_company_team_company_id_user_id` | `company_team` | R2-191 |

R2-559 (`e0f2f6e`, "company-scoped unique constraints on PO, GRN, indent, bill, WO and cost-code
numbers … **Blast-radius: 1 file**") changed models.py alone. On a fresh SQLite test DB
`create_all` builds the constraints and the test passes. On Supabase the tables already exist, so
nothing happens and duplicate document numbers stay acceptable. The fix is real in the test suite
and absent in production.

R2-191's own register note already says this out loud: *"prod needs a Supabase migration to
dedupe existing rows + CREATE UNIQUE INDEX (schema-sync only affects fresh DBs)"* — correctly
identified by the agent, then closed as `FIXED` anyway.

Note the ordering trap for whoever writes these migrations: a `CREATE UNIQUE INDEX` on live data
**fails** if duplicates already exist. Each of the seven needs a dedupe step first, and the dedupe
is a data decision (which duplicate survives), not a mechanical one.

## Verdicts

| Finding | Verdict | Basis |
|---|---|---|
| R2-253 (`bills.wo_id`) | schema rung **passes** | column live in Supabase |
| R2-338 (`purchase_orders.expected_delivery_date`, `ncrs.vendor_id`) | schema rung **passes** | both live |
| R2-202 (`boq_documents.revised_amount`) | schema rung **passes** | column live |
| R2-368 (`bills.zoho_bill_id`) | schema rung **n/a** | not deployed yet; will auto-add on deploy |
| **R2-559** (six document-number uniques) | **not fixed in production** | 0 matching unique indexes live; duplicates accepted |
| **R2-191** (`company_team` membership unique) | **not fixed in production** | same |

Passing the schema rung is **not** `CONFIRMED` — it only means the column exists. The behaviour
those four findings claim still has to be exercised (E1 code read + E3 live) before any of them
moves off `UNVERIFIED`.

R2-559 and R2-191 are the first real verification results: closed `FIXED` on a green SQLite test
suite, and demonstrably not in effect in production.

## Next

1. R2-559 / R2-191 → new finding numbers, with a migration that adds the seven constraints while
   the duplicate count is still zero.
2. Add a gate that fails when a model `UniqueConstraint` or `Index` has no migration — this class
   of miss is invisible to `pytest` on SQLite by construction, so it will recur otherwise.
3. Confirm whether migration *files* were applied at all. A file in `supabase/migrations/` is not
   evidence it ran, and the auto-sync masks the column half of that question entirely.
