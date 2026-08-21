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

## Class D — one class finding

### R2-712 · CRITICAL · fabricated data is hardcoded into console forms that write real records

**Found while verifying:** R2-017 (CRITICAL, `FIXED`), by sweeping the defect class rather than
the four files that closure named. R2-017's own claim **verifies clean** — the four files it lists
are free of fabricated strings. The pattern simply lives in nine other places.

**This is one finding with many instances on purpose.** They share a single root cause and one
fixer can clear them in a single pass. Sub-ids R2-713..R2-716 were filed separately first and are
folded in below; they are kept in the table so the history is traceable.

**Sweep:** `scripts/verification/fabsweep.py`, run over all of `frontend/src/app/c`. It looks for
four shapes — entity names in `<option value>`, in `readOnly`/`defaultValue` inputs, as
`useState` defaults, and as fallback object arrays in `catch` blocks — and filters an explicit,
reviewable domain-vocabulary list so statuses and invoice types are not reported as data. It
self-tests against five hand-confirmed instances and against three known-vocabulary strings before
it will emit anything. 34 candidate sites; 20 survive triage as real instances.

#### Instances

| # | file | lines | what is hardcoded | should come from |
|---|---|---|---|---|
| 1 | `d/finance/page.tsx` | 2255, 2930 | `Prestige Developers` as the Material Transfer FROM party and header caption, `readOnly` | the signed-in company |
| 2 | `d/finance/page.tsx` | 2944-2945 | `Skyline Premium Towers`, `Grand Orchard Villas` as the only TO projects | `projects` |
| 3 | `d/finance/page.tsx` | 193-194, 3072-3073, 3083-3084, 3106-3107, 3122-3123 | `Main Savings Account (HDFC)`, `Escrow Account (SBI)`, `Petty Cash Account (HDFC)` on Internal Transfer, **and as the `useState` defaults** | `bank_accounts` / `cash_accounts` |
| 4 | `d/finance/page.tsx` | 150, 3354-3356, 3433-3436 | cost codes `1.2.1 Site Conveyance`, `2.1 Raw Materials`, `3.5 Subcontractor Labours` | `library_cost_codes` |
| 5 | `d/finance/page.tsx` | 165 | `Pune Site Office Address` as the Bill-To/Ship-To default | company addresses |
| 6 | `reports/item-wise-sales/page.tsx` | 88-90, 112-114 | clients `L&T Construction`, `Public Works Dept`, `Alpha Builders Ltd`; items `Reinforcement Steel`, `Ready Mix Concrete`, `OPC Cement` | parties / material library |
| 7 | `d/attendance/page.tsx` | 179, 1260-1262 | branches `Pune Main Office (Branch #1)`, `Mumbai Central (Branch #2)` | company addresses |
| 8 | `p/[project_id]/attendance/page.tsx` | 1257-1258 | same two branches | same |
| 9 | `d/procurement/page.tsx` | 259 | `DPR Column C-1 concrete pour` as the source-reference default | the referenced DPR |
| 10 | `d/subcon/work-orders/amendments/page.tsx` | 39 | `Project Manager` as the `amendedBy` default | the authenticated user |
| 11 | `dashboard/page.tsx` | 133-134 | `endDate: dbProj.end_date \|\| "2027-12-31"` and `startDate: … \|\| today` | absent should render `—`, as its neighbours already do |

**Borderline, deliberately excluded** — flagging so nobody re-files them: `transferType` defaults to
`"Bank To Bank"` (a typed union, legitimate); `purchaseLedgerInput`/`salesLedger` default to
`Purchase A/c`/`Sales A/c` (standard Tally ledger names); `rateCategory` defaults to `Civil Works`.
These are defaults drawn from vocabulary, not invented records.

#### The two that matter most

**Instance 3 is a money path.** Internal Transfer moves funds between three accounts, and the
component state *defaults* to those literals, so a form submitted without touching either dropdown
still carries them. Two independent rungs of evidence: the browser shows exactly those options in
production for the test company *ZZ R8 Throwaway*, and Supabase shows **`bank_accounts` holds zero
rows for the entire database** — no account by any of those names exists for anyone. Account
selection is a free-text string, not a foreign key. What the endpoint persists should be checked
before anyone transfers anything.

**Instance 2 makes Material Transfer unusable.** The tenant's real projects are absent from the TO
list, so a transfer can only be addressed to a project that does not exist. Verified live; the
project picker beside it was still rendering `Loading projects...` from the real API while this one
was already populated with invented values.

#### A separate bug found inside instance 4

```
<option value="1.2.1 Site Conveyance">Select Cost Code</option>
```

The **placeholder option carries a real-looking value.** A user who never opens the dropdown, or
who deliberately picks "Select Cost Code", silently submits the cost code `1.2.1 Site Conveyance`.
The same shape appears at `d/attendance/page.tsx:179`, where `company_branch` initialises to the
literal `"Select Company Address"` — there the placeholder is submitted as data instead. Both are
the placeholder-is-a-value error; they just fail in opposite directions.

#### Why the campaign missed it

Not carelessness — **scope**. R2-017 was filed against the dashboard, and the fix cleaned the four
files the finding named. Its note even counts the lines removed from `item-wise-sales` (`-3`); three
fabricated options went and six remained in that same file, because the closure was measured
against the finding text rather than against the file.

**Fix direction.** One pass, not eleven. Every instance is the same edit: replace the literal with
the fetch the page already performs elsewhere, and give every placeholder option `value=""`. Then a
lint rule or a test asserting no `<option value>` in `app/c` matches a proper-noun pattern outside
the vocabulary list, so the class cannot return.

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
