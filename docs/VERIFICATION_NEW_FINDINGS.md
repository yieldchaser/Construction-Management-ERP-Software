# Verification-phase findings — R2-701 onward

Findings raised by the **independent verification** of findings the fix campaign has already
closed. Filed here, not in `audit/AUDIT_FIX_REGISTER.md`, because the other agent owns that file
and is running. Merge these rows into the register when it is idle.

**Id block R2-701..R2-799 is reserved for verification findings.** The register's highest id is
R2-601, so the fix campaign can keep allocating from 602 without collision.

**None of these reopens an existing row.** Each names the row it came from; that row keeps its
history and its status. See `docs/VERIFICATION_STRATEGY.md` (`git show
363d5a2:docs/VERIFICATION_STRATEGY.md`) for the rule.

Evidence source for the live rows: Supabase SQL editor against the production project
(`ujdxgiqafaobhrskzkmr`), 2026-08-21.

---

## Class A — closed `FIXED`, provably not in effect in production

### R2-701 · CRITICAL · six document-number unique constraints do not exist in production

**From:** R2-559 (`e0f2f6e`, status `FIXED`).
**Files:** `backend/app/models.py`, `supabase/migrations/` (absent).

R2-559 added six `UniqueConstraint` declarations to models.py — `purchase_orders(company_id,
po_number)`, `goods_receipt_notes(company_id, grn_number)`, `material_indents(company_id,
indent_number)`, `bills(company_id, invoice_number)`, `work_orders(company_id, wo_number)`,
`library_cost_codes(company_id, code)` — and **nothing else**. Its own commit message says
"Blast-radius: 1 file".

`Base.metadata.create_all` builds those constraints on a fresh SQLite test database, so `pytest`
passes. On Supabase the tables already exist, and the boot-time helper
`ensure_postgres_schema_sync` (`app/main.py:270`) adds **columns only** — it never emits a
constraint or an index. No migration file creates them either.

**Live evidence.** Constraints named `uq_*`: 0. Indexes named `uq_*`: 0. Sanity checks in the same
query returned 72 unique constraints and 156 unique indexes overall, so the query shape is sound.
Checked again by column set rather than by name, in case Postgres had auto-named them: on all six
tables the only unique index is `<table>_pkey` on `id`.

**Impact.** Duplicate PO, GRN, indent, bill, work-order and cost-code numbers are accepted in
production today. This is the exact defect R2-559 was raised to fix.

**Fix direction.** One migration creating the six unique indexes. **Do it now:** the duplicate
count is currently **zero** on all six pairs, so the migration applies cleanly. Once real
duplicates exist, `CREATE UNIQUE INDEX` fails and someone has to decide which row survives.

### R2-702 · HIGH · `company_team` membership uniqueness does not exist in production

**From:** R2-191 (`b4c0a37`, status `FIXED`).

Same mechanism as R2-701, for `UniqueConstraint(company_id, user_id)` on `company_team`. The only
unique index on that table in production is `company_team_pkey` on `id`, so the same person can
still be enrolled in one company twice.

Notable: **R2-191's own register note already says this** — *"prod needs a Supabase migration to
dedupe existing rows + CREATE UNIQUE INDEX (schema-sync only affects fresh DBs)"*. It was
correctly diagnosed and then closed `FIXED` anyway. Worth treating as a process signal, not just a
missing migration: a note that names remaining work should block closure.

---

## Class B — production defects found while verifying

### R2-703 · HIGH · `work_orders` has no primary key in production

The table exists and holds 2 rows, but has **no unique index at all** — not even
`work_orders_pkey`, while every sibling table (`bills`, `purchase_orders`,
`goods_receipt_notes`, `material_indents`, `library_cost_codes`, `company_team`) has one.

Not caused by the fix campaign; surfaced by the same query. Consequences to confirm: row identity,
replication, and any `ON CONFLICT` upsert against that table.

**Next step:** confirm whether the constraint is genuinely absent or merely unindexed, then add it
while the table holds 2 rows.

### R2-704 · MEDIUM · the Postgres schema auto-sync silently skips NOT NULL columns

`ensure_postgres_schema_sync` (`app/main.py:270`, called at boot from the lifespan at `:483`) adds
any missing model column to production with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. A column
that is **non-nullable with no default** is skipped with a `print(...)` and execution continues.

Nothing is affected today — every column the campaign added is nullable. But the failure mode is
silent and deferred: a future `NOT NULL` column passes CI on SQLite, prints one line into Render's
log at boot, and never exists in production. The first query that selects it 500s.

**Fix direction.** Fail the boot, or emit a startup error the deploy surfaces. A `print` is not a
signal anyone reads.

---

## Class C — gates that do not gate

Each of these findings may well be **correctly fixed**; the defect is that nothing protects the
fix. A later edit removes it and the suite stays green. Verified by re-evaluating each pin's own
assertion against the fix commit's first parent, then reading the commit diff by hand.

### R2-705 · MEDIUM · `test_pin_R2_077_report_export_schemas_removed` watches the wrong file

Asserts `exportSchemas` is absent from `reports/[slug]/page.tsx`. That string **never existed** in
that file. The fix (`160aaec`) changed `reports/page.tsx`. Reintroducing `exportSchemas` in the
file that actually had it leaves the pin green.

### R2-706 · MEDIUM · `test_pin_R2_578_chat_server_stamps_sender_identity` asserts unchanged lines

Asserts `msg.user_id = ct.id` and `msg.user_name = current_user.name` are present in `chat.py`.
Both were already there pre-fix, at lines 153-154. The fix (`83d9cf0`) changed the **control flow**
around them — dropping the client-supplied `user_id`/`user_name` and raising 403 for a non-member.
None of that is tested. This one matters: the finding is an identity-spoofing fix.

### R2-707 · MEDIUM · `test_pin_R2_351_grn_transaction_keeps_po_item_unit` cannot see its own fix

Asserts `unit=po_item.unit` appears in `procurement.py`. It already appeared at line 672, a
different call site. The fix (`53b9499`) added a **second** occurrence at line 683. A substring
test cannot distinguish one occurrence from two; deleting the new line leaves the pin green.

### R2-708 · MEDIUM · `test_pin_R2_341_po_item_pending_qty_report` pins the label, not the value

Asserts `"PO Pending Qty"` is in `reports.py`. Pre-fix the file contained
`"PO Pending Qty": ""` — the column existed and was blank, which **was the defect**. The fix
(`57f78de`) computed the value. The pin passes against the broken version.

### R2-709 · LOW · `test_pin_R2_040_report_export_never_xlsx` asserts a string that never existed

Asserts `.xlsx` (with the dot) is absent from `reports/[slug]/page.tsx`. That literal is in neither
the pre-fix nor the post-fix file, so the assertion is vacuous. Separately, the fix only relabelled
the button — it still calls `handleExportSelect("xlsx")`. Whether R2-040's *underlying* defect is
actually resolved needs its own look.

### R2-710 · HIGH · the regression-pin suite tests source text, never behaviour

**The finding the five above are symptoms of.**

`backend/tests/coverage/test_regression_pins.py` is 1037 lines and 176 tests. It imports `pathlib`
and nothing else. 174 tests read a source file as text and assert a substring is present or
absent; one scans the filesystem for stock photos; **exactly one**
(`test_pin_R2_129_statutory_due_date_derivation`) imports application code and calls it. There is
no `TestClient` in the file and no HTTP request anywhere in it.

176 pins cover 177 of the 315 closed findings — so this is the primary evidence behind most
closures. A green pin proves the edit is still textually present. It cannot show the code is
reached, runs, or is correct, and it cannot catch a regression expressed as a change in behaviour
rather than a change in text. That is why every closed finding in
`docs/VERIFICATION_REGISTER.md` sits at `UNVERIFIED` and not `CONFIRMED`.

**Fix direction.** Not "rewrite 176 tests". Rank the closed findings by severity and give the
CRITICAL and HIGH ones a behavioural test that exercises the endpoint. Keep the text pins as a
cheap second layer — they are useful, they are just not evidence of correctness.

### R2-711 · MEDIUM · nothing gates a model constraint against having a migration

R2-701 and R2-702 are invisible to `pytest` **by construction**: `create_all` builds every
constraint on a fresh SQLite database, so a constraint with no migration is indistinguishable from
one that has a migration. The suite cannot fail.

**Fix direction.** A test that walks `Base.metadata` for every named `UniqueConstraint`/`Index` and
asserts a matching `CREATE ... INDEX`/`ADD CONSTRAINT` exists somewhere in `supabase/migrations/`.
Cheap, and it closes the whole class rather than the seven instances.

---

## Class D — found by verifying a closed finding, in a file the closure never covered

### R2-712 · CRITICAL · the Material Transfer form ships a fabricated company and two fabricated projects, and cannot reach a real project

**Found while verifying:** R2-017 (CRITICAL, `FIXED`).
**File:** `frontend/src/app/c/[company_id]/d/finance/page.tsx` lines 2255, 2931, 2944-2945.
**Present on both `origin/main` and `campaign/waves` — deployed.**

Finance → Transaction → **+ Material Transfer** opens a drawer that is hardcoded:

- header caption: `PRESTIGE DEVELOPERS` (line 2255)
- **FROM**: a `readOnly` input with `value="Prestige Developers"` (line 2931) — not the signed-in
  company, and not editable
- **TO**: a `<select>` whose only options are `Skyline Premium Towers` and
  `Grand Orchard Villas` (lines 2944-2945) — two invented projects, hardcoded. **The company's own
  projects are not in the list.**

**Live evidence.** Verified in production against the test company *ZZ R8 Throwaway*
(`1fa705a4-7aa6-42f2-9906-65902c96916f`) on 2026-08-21. The rendered drawer reads
"MATERIAL TRANSFER / PRESTIGE DEVELOPERS", FROM shows `Prestige Developers`, and the TO select
enumerates exactly `Select Project / Skyline Premium Towers / Grand Orchard Villas`. Note that the
adjacent project picker on the same screen was still rendering `Loading projects...` from the real
API while this one was already populated with invented values — the two are unrelated code paths.

**Impact.** Material Transfer is unusable: a transfer can only be addressed to a project that does
not exist. Any record it does create names the wrong originating company. This is the same defect
class R2-017 was raised for and closed on — the closure swept four files
(`dashboard`, `reports/dpr`, `reports/item-wise-sales`, `hr`) and this fifth site was never in
scope. Worth checking whether it can write, and what it writes, before anyone uses it.

**Also visible in the same drawer, not yet investigated:** `TRANSFER OUT NO` renders as `0`.

### R2-713 · MEDIUM · the dashboard invents a start and end date for any project that has none

**Found while verifying:** R2-017.
**File:** `frontend/src/app/c/[company_id]/dashboard/page.tsx` lines 133-134.

R2-017's closure correctly removed the four fabricated projects and the `defaultMatch` merge, and
that part verifies clean — zero fabricated strings remain in the four files it names. But the
surviving real-data mapper still fabricates per-field:

```
startDate: dbProj.start_date || new Date().toISOString().split('T')[0],
endDate:   dbProj.end_date   || "2027-12-31",
```

A project with no dates in the database is displayed as starting today and ending 2027-12-31, with
nothing marking either as absent. Neighbouring fields in the same object literal handle this
correctly with `"—"` (`category`, `customerName`, `projectStage`), so the pattern to follow is
already there.

### R2-714 · CRITICAL · Internal Transfer moves money between three hardcoded bank accounts that do not exist

**Found while verifying:** R2-017, by sweeping the class instead of the four files.
**File:** `frontend/src/app/c/[company_id]/d/finance/page.tsx` lines 193-194, 3072-3073,
3083-3084, 3106-3107, 3122-3123. Deployed on `origin/main`.

Finance → Transaction → **+ Internal Transfer** offers a fixed pair of `<select>`s:

- **From**: `Main Savings Account (HDFC)` / `Escrow Account (SBI)`
- **To**: `Petty Cash Account (HDFC)` / `Escrow Account (SBI)`

The component state also *defaults* to these string literals
(`useState("Main Savings Account")`, `useState("Petty Cash Account")`), so a transfer submitted
without touching the dropdowns still carries them.

**Live evidence, two independent rungs.**

1. Browser, production, test company *ZZ R8 Throwaway*: the two selects enumerate exactly the
   options above. The tenant's own accounts are not offered.
2. Supabase: `bank_accounts` holds **0 rows for the entire database** — not merely none for this
   tenant. `cash_accounts` likewise 0 for this tenant. No account named Escrow, Main Savings or
   Petty Cash exists anywhere.

**Impact.** Every internal transfer is recorded against an account name that corresponds to no
account record, for any company. Account selection is a free-text literal rather than a foreign
key. This is a money-movement path, so it should be treated ahead of the rest of this batch —
and what the endpoint actually persists needs checking before anyone transfers anything.

### R2-715 · HIGH · the item-wise sales report still filters on fabricated clients and items

**Found while verifying:** R2-017 — whose closure explicitly claims it removed *"the hardcoded
demo filter options in reports/item-wise-sales/page.tsx (-3)"*.

Three were removed. Six remain in the same file:

- Client filter (lines 88-90): `L&T Construction`, `Public Works Dept`, `Alpha Builders Ltd`
- Item filter (lines 112-114): `Reinforcement Steel`, `Ready Mix Concrete`, `OPC Cement`

Two consequences. The report filters by a client the tenant does not have, so it returns nothing
and reads as "no sales" rather than "wrong filter". And `L&T Construction` is a **real competitor's
name** shipped in the product — the campaign scrubbed competitor branding elsewhere, so this is a
straggler from that sweep too.

This one is worth noting as a process signal: the closure counted lines removed and stopped, rather
than re-reading the file for the same pattern.

### R2-716 · HIGH · attendance branch selector is hardcoded to two invented offices

**File:** `frontend/src/app/c/[company_id]/d/attendance/page.tsx` lines 179, 1260-1262, and the
same block in `p/[project_id]/attendance/page.tsx`.

The company-branch `<select>` offers only `Pune Main Office (Branch #1)` and
`Mumbai Central (Branch #2)`, and `company_branch` initialises to the literal string
`"Select Company Address"` — the placeholder itself is a submittable value, so an untouched form
posts the placeholder as data.

Attendance is geofenced, so branch is not cosmetic. Needs checking against what the punch endpoint
does with an unrecognised branch string.

## Summary

| id | sev | class | from |
|---|---|---|---|
| R2-701 | CRITICAL | not in effect in prod | R2-559 |
| R2-702 | HIGH | not in effect in prod | R2-191 |
| R2-703 | HIGH | prod defect | — |
| R2-704 | MEDIUM | latent prod defect | — |
| R2-705 | MEDIUM | fake gate | R2-077 |
| R2-706 | MEDIUM | fake gate | R2-578 |
| R2-707 | MEDIUM | fake gate | R2-351 |
| R2-708 | MEDIUM | fake gate | R2-341 |
| R2-709 | LOW | fake gate | R2-040 |
| R2-710 | HIGH | evidence class | the pin suite |
| R2-711 | MEDIUM | evidence class | — |
| R2-712 | CRITICAL | live prod defect, proved in browser | found via R2-017 |
| R2-713 | MEDIUM | fabricated fallback data | found via R2-017 |
| R2-714 | CRITICAL | live prod defect, money path, proved in browser + SQL | found via R2-017 class sweep |
| R2-715 | HIGH | fabricated filters + competitor brand | found via R2-017 class sweep |
| R2-716 | HIGH | fabricated branch list on a geofenced path | found via R2-017 class sweep |

## Verified clean so far

Recorded so the pass is not only a list of complaints. Each claim was re-checked against the tree,
not taken from the note.

| id | sev | claim | result |
|---|---|---|---|
| R2-017 | CRITICAL | fabricated demo data gone from 4 named files | **holds** — zero matches in all four |
| R2-110 | CRITICAL | holiday seed gone, `fetchHolidays` GETs, delete calls the API | **holds** — `hr/page.tsx:276,278,305,307` |
| R2-061 | MEDIUM | `setFleet` only ever called with API data or `[]` | **holds** — only `:108` and `:133` |
| R2-085 | LOW | no internal phase labels remain | **holds** — only ZATCA "Phase 1", legitimate domain term |

The four closures are accurate about what they claim. R2-712..R2-716 exist because three of them
were scoped to named files rather than to the defect class.

R2-701 and R2-711 together are the highest-value pair: one is a live defect, the other is the
reason it could be closed as fixed without anyone noticing.
