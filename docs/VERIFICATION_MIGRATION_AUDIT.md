# Migration audit — models.py vs `supabase/migrations/` @ `campaign/waves`

**Run 2026-08-21. Offline half only.** Supabase access will settle the other half (was each
migration actually *applied*). Tool: `scratchpad/migaudit.py`, self-tested against four
known-positive columns from three different SQL shapes before its output was believed.

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

No row moves to `CONFIRMED` on this evidence. Twelve rows are candidates for
`UNVERIFIED` → new finding, pending the live check:

- R2-253, R2-338, R2-202, R2-368 — closed `FIXED` on a column production may not have.
- R2-559 (six constraints), R2-191 — closed `FIXED` on a constraint production certainly does not
  have, because no migration exists to create it anywhere.

R2-559 and R2-191 do not need Supabase to decide: the migration does not exist in the repo, so it
cannot have been applied. Those two are the safest immediate escalation.

## Next

1. Read the live Supabase schema; check the five columns and the seven constraints.
2. Same pass over migration *application*: a file existing in `supabase/migrations/` is not
   evidence it ran. The nine files dated 2026-08-15 and later are the ones most likely to be
   unapplied.
