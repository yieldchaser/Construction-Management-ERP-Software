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

**Is this just deploy lag?** No, and the question is worth answering precisely because it applies
to every `NOT_IN_PROD` verdict.

- Both fixes are on **`origin/main`**, not only `campaign/waves` — `e0f2f6e` and `b4c0a37` are
  both ancestors of `origin/main`, which is what Render deploys.
- The running build is current. `bills.wo_id` exists in production, and the only mechanism that
  creates it is `ensure_postgres_schema_sync` running at boot against code that already contains
  `e2a6963` (2026-08-21 11:56). So the live instance booted from a build at or after that commit,
  which is three commits before the tip.
- **Most decisive: deploy currency cannot change the outcome.** A model-level `UniqueConstraint`
  has no path to Postgres at all. `create_all` only creates missing *tables*; the boot sync only
  adds *columns*. No amount of redeploying will produce these constraints — a migration is the
  only route, and none exists.

That is what separates `NOT_IN_PROD` from "not shipped yet". The test is not "is the commit
deployed" but "is there any mechanism by which this fix could take effect in the running system".

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

Each of these findings **is** correctly fixed — all five were checked and all five hold. The defect
here is that nothing protects the fix. A later edit removes it and the suite stays green. Verified by re-evaluating each pin's own
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
the pre-fix nor the post-fix file, so the assertion is vacuous. **Correction to an earlier draft of this entry:** I first wrote that the fix "only relabelled the
button" and that the underlying defect might survive. I have since checked it. The menu reads
*"Export as CSV (Excel-compatible)"* and the toast says CSV; `xlsx` survives only as an internal
format key, never as a claim to the user. **R2-040's fix is correct** — only its pin is vacuous.

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
| 11 | `dashboard/page.tsx` | 131-134 | **four** fabricated fallbacks in one object literal — `health \|\| "Healthy"`, `status \|\| "Ongoing"`, `startDate \|\| today`, `endDate \|\| "2027-12-31"` | absent should render `—`, as its neighbours already do. See R2-083 below |

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

## Class E — one class finding

### R2-717 · HIGH · 29 closed findings disclose unresolved work in their own note and carry no tracking id

**Method.** Every closed row's note was matched against explicit hand-off phrasing — `Sibling:`,
`follow-up`, `is deferred`, `not implemented`, `left open`, `remains open`, `out of scope`. Loose
matches on the bare word "still" were excluded because they produce false positives on innocent
phrasing.

**40 of the 315 closed rows disclose unresolved work. 11 name a tracking id. 29 do not.**
By severity of the parent row: 1 CRITICAL, 3 HIGH, 24 MEDIUM, 1 LOW.

This is the same shape as R2-191, which wrote *"prod needs a Supabase migration to dedupe existing
rows + CREATE UNIQUE INDEX"* into its note and was then closed `FIXED` — the remaining work was
identified honestly and then lost, because a note is not a queue. The disclosure is good practice.
The gap is that nothing converts it into a tracked row.

#### Notable instances

**R2-068 (parent CRITICAL) — the disclosure understates it.** The note says `gatePhotoUrl` is
*"an in-session objectURL — nothing persists it server-side"*. What the code actually does
(`d/procurement/page.tsx:1066-1069`):

```
if (f) setGrnGatePhoto(URL.createObjectURL(f));
...
{grnGatePhoto && <span className="text-emerald-400 font-bold mt-1 block">✓ Photo Attached</span>}
```

The user selects a GRN gate photo, is told **"✓ Photo Attached"** in green, and the file is
discarded on navigation. It is never sent — `photo_url` appears nowhere in the request, and the
`gatePhotoUrl` type field at `:66` is now referenced by nothing. So this is not merely a missing
upload: it is a **fabricated success affirmation**, which is the exact defect class R2-068 was
raised to remove. The fix deleted the stock-photo URL and left the false confirmation in place.

**R2-007 (parent HIGH)** — `handleCreatePO` still prepends the PO row optimistically even when the
POST fails. The note names it "the same fake-optimistic family" and defers it. Untracked.

**R2-008 (parent HIGH)** — wiring the RFQ drawer to the real `rfq.py` endpoints is deferred pending
an API contract. The fabricated data is gone and the empty state is honest, so the parent closure
is sound, but the feature is inert and nothing tracks finishing it.

**R2-336 (parent MEDIUM)** — *"Sibling: `inv.unit` still overwritten by the movement"*. The fix
stopped material movements reclassifying the inventory master **category**; the same last-write-wins
overwrite on **unit** survives, disclosed and untracked.

**R2-378 (parent MEDIUM)** — *"Sibling: `LibraryRetention` still unreferenced by the write path"*.

#### Why this matters more than the individual items

Each parent closure is defensible — the finding as filed was fixed, and the residue was stated
plainly rather than hidden. But 29 pieces of known remaining work now exist only inside prose in a
column of a register, where no worklist, no count and no severity triage can reach them. They are
invisible to the campaign's own "how much is left" figure.

**Fix direction.** Two steps, both cheap. Sweep the 29 notes and open a row for each piece of
residue, inheriting a severity of its own rather than the parent's. Then make the closure checklist
refuse a `FIXED` whose note contains hand-off phrasing without an accompanying id — the same shape
as R2-711, a rule that closes the class rather than the instances.

### R2-083 · the CRITICAL closure that claims completeness it does not have

Not a separate finding — it is instance 11 above, recorded here because *how* it was closed is the
point.

R2-083 (**CRITICAL**, `FIXED`, `b8e314b`, note: *"No test added"*) states:

> the **last two** fabricated attribute fallbacks on real projects are gone

Its diff is exactly two lines:

```
-  category: dbProj.category || "General",     +  category: dbProj.category || "—",
-  projectStage: dbProj.stage || "Structure"   +  projectStage: dbProj.stage || "—"
```

Both edits are correct. The completeness claim is not. **Four fabricated fallbacks remain in the
same object literal**, two of them directly above the lines that were changed:

```
status:    dbProj.status     || "Ongoing",
health:    uiHealth          || "Healthy",
startDate: dbProj.start_date || new Date().toISOString().split('T')[0],
endDate:   dbProj.end_date   || "2027-12-31",
```

**`health || "Healthy"` is the serious one.** `uiHealth` is `dbProj.health` (null when the database
has none), so a project with no health value is rendered with a **green "Healthy" badge**
(`:991`) and counted in `healthyCount` (`:483`). A dashboard risk indicator defaults to the
reassuring answer when it has no data. `status || "Ongoing"` does the same for project status.

The author changed two adjacent lines and described them as the last two, without re-reading the
eight-line block they sit in. With no test and no pin on this row, nothing else could have caught
it.

## Class F — one class finding

### R2-718 · HIGH · 169 of 315 closed findings have no automated gate of any kind

**Distinct from R2-710.** That finding says the pins test source text rather than behaviour. This
one says that for most closures **there is no pin at all**.

| cut | count |
|---|---|
| closed findings in the pinned snapshot | 315 |
| **with no `REAL_GATE` pin** | **169** — 61 CRITICAL, 43 HIGH, 55 MEDIUM, 10 LOW |
| note explicitly says "No test added" | 43 — 5 CRITICAL, 9 HIGH |
| **both: no pin and no test** → zero automated evidence | **28** — 4 CRITICAL, 6 HIGH |

So of 315 closures, 146 have a text pin (which R2-710 shows proves only textual presence), and 169
have nothing. **61 CRITICAL findings are closed with no automated gate.** If any of them is undone
by a later edit, the suite stays green and the register still reads `FIXED`.

The four CRITICAL rows with neither a pin nor a test are R2-050, R2-051, R2-060 and R2-083. R2-083
is the one written up immediately above — closed on a claim that is demonstrably wrong, with
nothing in place to detect it. That is what this class costs in practice, not in theory.

**Fix direction.** Not 169 tests. Take the 61 CRITICAL closures, and for each ask whether a
behavioural test is possible; where it is, write it, and where it is not, record why in the row so
the absence is a decision rather than an omission. The 28 zero-evidence rows are the place to
start, because they are the only ones where *nothing* would notice a regression.

## Class G — one class finding

### R2-719 · CRITICAL · absent data is coalesced into an invented definite value in 90 places, including 8 sentinel UUIDs that resolve to real production rows

**Found by generalising R2-083.** Sweep: `scripts/verification/defaultsweep.py`, over all of
`frontend/src/app/c`. It reports `X || "literal"` and `X ?? "literal"`, and classifies the fallback
by whether it **admits absence** (`—`, `N/A`, `Unassigned`, `Unknown`) or **asserts a fact**. It
self-tests on the three known R2-083 lines and on the honest `category || "—"` sibling in the same
object literal before it will emit anything.

**90 data-fabrication sites. 68 further sites excluded as legitimate** — `err.detail || "Save
failed"` is a message shown to a human, not a value written to a record. The exclusion count is
reported so it is visible rather than silent.

#### Tier 1 — sentinel UUIDs that point at real rows (8 sites)

| file:line | expression |
|---|---|
| `d/chat/page.tsx:38` | `params?.company_id as string \|\| "e0000000-…-000000000000"` |
| `d/services/page.tsx:20` | same |
| `d/subcon/page.tsx:31` | same |
| `reports/[slug]/page.tsx:485` | same |
| `reports/dpr/page.tsx:12` | same |
| `reports/item-wise-sales/page.tsx:12` | same |
| `d/attendance/page.tsx:421` | `selectedEmpId \|\| "e0000000-…-000000000100"` |
| `p/[project_id]/attendance/page.tsx:417` | same |

**These are not dead sentinels. Both rows exist in the production database:**

- `companies e0000000-…-000000000000` → **"Demo Construction Ltd"**, holding **5 projects**
- `users e0000000-…-000000000100` → **"Demo Engineer" / demo@siteflow.co**

So whenever `useParams()` has not resolved the route segment, six console pages — chat, services,
subcon and three report pages — issue their fetches against a **real tenant that is not the
signed-in one**, and will render its projects. It is a demo tenant rather than a paying customer,
which caps the blast radius, but it is a real row, visible to RLS, and the pages cannot tell the
difference.

The attendance pair is worse because it **writes**. `queuePunch` guards with
`if (!selectedEmpId && employees.length > 0) return`, so when the roster is *empty* the guard does
not fire and the punch is queued against **Demo Engineer**. `attendance_logs` currently holds zero
rows for that id, so this has not happened in production yet.

**That a demo tenant carrying 5 projects exists in the production database at all** needs its own
decision, independent of this finding.

#### Tier 2 — risk indicators that default to reassuring (10 sites, 4 files)

```
dashboard/page.tsx:131-132      dbProj.status || "Ongoing"    uiHealth || "Healthy"
d/home/page.tsx:60,73           project.status || "Ongoing"   project.health || "Healthy"
p/[project_id]/layout.tsx:60,62 data.status || "Ongoing"
p/[project_id]/party/page.tsx:75,89,178,183   p.status || "Active"
```

R2-083's `health` case is not isolated: `d/home` defaults status and health the same way, and party
status defaults to `Active` in four places. A dashboard health badge and a party's active flag are
both decision inputs, and both silently read "fine" when the data is missing.

#### Tier 3 — fabricated values on paths that matter (selection from 71)

| site | fallback | why it matters |
|---|---|---|
| `d/dpr/page.tsx:138` | `reportedBy \|\| "Site Engineer"` | actor-from-client on a signed daily report |
| `d/chat/page.tsx:530-531` | `msg.user_name \|\| "SiteFlow"` | a message with no sender is attributed to the product |
| `d/finance/page.tsx:3305,3320,3870` | `u.role \|\| "Staff"` / `"Employee"` | role drives approval rights |
| `d/finance/page.tsx:463-464,474,490` | `name \|\| "Sender"` / `"Receiver"`, `refNum \|\| "P2P-OUT"` | party and reference on a money transfer |
| `d/attendance/page.tsx:423` | `customMultiplierVal \|\| "1.0"` | payroll multiplier |
| `d/payroll-attendance/page.tsx:289,311,752-753,765-766` | `day_off \|\| "Sunday"`, `shift_start \|\| "09:00"`, `shift_end \|\| "18:00"` | payroll shift window |
| `d/attendance/page.tsx:658`, `d/hr/page.tsx:722,1153` | `designation \|\| "Labor"` / `"Staff"` | wage-band adjacent |

**Fix direction.** Tier 1 first, on its own terms: a missing route param must fail loudly rather
than fall back to an id, and the demo tenant needs a decision. Tier 2 is a mechanical edit to the
honest form these same files already use elsewhere. Tier 3 needs judgement per site — some are
defensible product defaults and some are fabrications, so the table above is triage, not verdict.
Then a lint rule forbidding a non-honest string literal on the right of `||` where the left is a
fetched field, so the class cannot regrow.

## Class H

### R2-720 · HIGH · Internal Transfer is completely inert — Save fires no request and reports nothing

**Found while discharging D-V3**, which asked what the Internal Transfer endpoint persists. The
answer is: nothing, because no request is ever made.

**Cause.** The drawer's Save calls `handleRecordPayment` (`d/finance/page.tsx:436`). That function
branches for `"Party to Party"` and then falls through to:

```
if (!amount || amtVal <= 0 || !partyName.trim()) return;
```

The Internal Transfer form has **no party field at all** — it collects From Bank, To Bank, Amount,
Reference No and Notes. `partyName` is therefore empty, the guard hits a **bare `return` with no
alert**, and the handler exits. `fromBank` and `toBank` are never read outside the JSX, so the
account selection is not sent anywhere either.

**Live evidence, production, test company ZZ R8 Throwaway.** Opened Finance → Transaction →
+ Internal Transfer, typed an amount of 2500 with real keystrokes, clicked Save:

- `window.fetch` instrumentation recorded **zero calls**
- the drawer stayed open, with the amount still showing 2500
- no alert, no toast, no console error

The instrumentation was then validated with a positive control (a deliberate `fetch` to
`/favicon.ico` was captured), so the empty result is a real absence and not a lost hook.

`"Cash Deposit"` and `"Cash Withdraw"` share the same handler and the same missing party field, so
all three transfer types are inert.

**This changes D-V3 rather than confirming it.** The concern was that a money path was writing
account names matching no record. It writes nothing. That removes the data-integrity worry and
replaces it with a plain one: **a money-movement feature that appears to work and does nothing**,
with no error to tell the user. Same family as the silent-write-control class.

**Fix direction.** Give Internal Transfer its own handler and endpoint, or — if the backend route
does not exist yet — remove the control, per the audit's standing preference for an honest absence
over a decorative affordance. At minimum the bare `return` must become a visible error; a Save
button that silently does nothing is the worst of the three options.

### R2-721 · MEDIUM · `report_type` is an unvalidated free-text discriminator on the statutory path

**Found while verifying R2-129**, whose fix is correct.

`StatutoryReportCreate.report_type` is a bare `str` (`statutory.py:18`) with no `Literal`, pattern
or enum anywhere. Three separate behaviours then key off an **exact lowercase** match:

| site | comparison | consequence when the case differs |
|---|---|---|
| `calculate_due_date` (:66-69) | `== "tds"`, `in ("pf","esi","bocw")` | returns `None` — the report is stored **with no due date** |
| BOCW cess (:145) | `report_type == "bocw"` | cess computed as **zero** |
| list filter (:96) | `StatutoryReport.report_type == report_type` | the report is invisible to its own filter |

Executed to confirm: `calculate_due_date("pf", "2026-01")` returns 2026-02-15, while
`calculate_due_date("PF", "2026-01")` and `("Pf", …)` both return `None`. No exception, no 422 —
the report simply saves without a due date.

**Latent, not live.** The console defaults `report_type: "pf"` (`d/statutory/page.tsx:52`) and
sends lowercase throughout, so the UI cannot currently trigger it. The exposure is the API surface:
BI keys, integrations, and any future screen that sends a display-cased value.

**This is a sibling of a class the campaign is already fixing** — R2-136 validated the planning
discriminators, R2-580 constrained project status, R2-293 constrained the Tally vocabulary, R2-582
constrained party status. Statutory was not swept.

**Fix direction.** `report_type: Literal["pf", "esi", "bocw", "tds"]`, matching how the other
discriminators were closed. One line, and it converts three silent wrong answers into a 422.

### R2-722 · HIGH · the demo tenant is still actively recreated, and a fixed OTP can reach it

**Found while verifying R2-183.** It also **corrects a claim I made in D-V1** — I wrote that
nothing recreates the demo tenant. That was wrong.

`auth.py:186` defines `_ensure_demo_company`, which creates the company
`e0000000-…-000000000000` ("Demo Construction Ltd", GSTIN `27AADCD2424B1ZP`) and then calls
`_seed_demo_projects` — which is where the 5 projects in production come from. It is invoked at
`auth.py:415` on **any successful login by an allowlisted demo number**, unconditionally:

```
if _is_demo_mobile(mobile):
    company = _ensure_demo_company(db)
```

R2-115 removed the *settings* endpoint's INSERT, correctly and verifiably. This is a **second,
independent creation path** in a different router that the R2-115 closure did not cover — and
nothing in the register points at it.

#### The allowlist and code are defaults in the source

```
backend/app/config.py:43   OTP_DEMO_ALLOWLIST: str = "9876543210,+919876543210"
backend/app/config.py:44   OTP_DEMO_CODE: str = "123456"
backend/app/config.py:65   EMAIL_OTP_DEMO_ALLOWLIST: str = "demo@siteflow.co"
```

**State the precondition precisely, because it decides the severity.** `send_otp` sets
`use_demo_code = is_demo and not provider_ready`. So the fixed code `123456` is accepted **only
when no SMS provider is configured**. With SMS wired, an allowlisted number receives a real random
OTP and there is no bypass.

**What is unconditional either way** is the tenant recreation at `:415` — that runs on any
successful demo-number login, configured provider or not.

#### What I did not test, and why

Distinguishing "SMS configured" from "not configured" on the live server means calling
`/auth/send-otp`, which sends a real message to whatever number is submitted. I did not do that:
probing it with an invented number risks messaging a real handset, and probing with the demo number
tells me nothing about `provider_ready`. **This needs the founder to check the Render environment**
for `SMS`/`OTP_DEMO_ALLOWLIST` overrides — added to the decisions file as D-V5.

#### Scope of the fix — swept, and it is bounded

I swept the backend for other demo/seed materialisation paths so the fix does not turn into a hunt:
`_seed_demo_projects` and `_ensure_demo_company` (both `auth.py`) are the **only** two. The one
other seeder, `seed_default_roles` (`settings.py:465`), is a legitimate RBAC preset and is not demo
data.

The **email** demo path (`EMAIL_OTP_DEMO_ALLOWLIST`, default `demo@siteflow.co`) gates a fixed code
the same way when SMTP is unconfigured, but it does **not** call `_ensure_demo_company` — only the
mobile path at `:415` does. So the tenant-creation defect is one call site, and the fixed-code
question covers two.

**Fix direction.** Independent of the env answer: the allowlist and demo code should have **no
usable defaults in source** (empty string, so an unset env disables the path entirely), and
`_ensure_demo_company` should not run on a production deploy at all. If a demo tenant is wanted,
it should be seeded deliberately rather than materialised by a login.

### R2-723 · HIGH · cancelled bills still count toward budget, BI and tower actuals — 8 sites

**Found while verifying R2-045/R2-066.** Both of those closures are correct; the inconsistency was
visible beside them.

R2-232 (CRITICAL, `FIX_VERIFIED`) added Cancelled-exclusion "across bill aggregations". It reached
`finance.py`. It did not reach `budget.py`, `towers.py` or `bi_export.py`.

**Sweep result — 8 of 18 bill aggregations omit the exclusion, and they cluster:**

| file:line | aggregation | invoice types |
|---|---|---|
| `bi_export.py:279` | `equipment_actual` (BI budget-variance feed) | `equipment` |
| `budget.py:108` | `equipment_bills` | `equipment` |
| `budget.py:86` | `material_actual` | `purchase` |
| `budget.py:98` | `subcon_actual` | `subcon` |
| `budget.py:163` | overall-project `actual` (no-towers branch) | `EXPENSE_INVOICE_TYPES` |
| `budget.py:175` | per-tower `actual` | `EXPENSE_INVOICE_TYPES` |
| `towers.py:175` | `total_billed` | `REVENUE_INVOICE_TYPES` |
| `towers.py:193` | `total_billed` | `REVENUE_INVOICE_TYPES` |

The other 10 aggregations — the `finance.py` family R2-232 actually touched — all carry
`status != "Cancelled"`. So this is a **missed set of call sites for a fix that is otherwise
correct**, not a wrong fix.

**The tell that it was an oversight rather than a decision:** `budget.py:92-94`, sitting between two
of the unguarded bill queries, *does* exclude cancelled work orders —
`WorkOrder.status != "cancelled"`. Cancellation was on the author's mind in that exact function;
bills were simply not swept.

**Impact.** Cancelling a bill reduces it in Finance and leaves it counted in Budget vs Actual, the
tower breakdown and the BI feed. Two surfaces disagree about the same money, and the BI feed is the
one customers point their own reporting at.

**Not yet quantified against live data.** Production currently holds no cancelled bills to
demonstrate the divergence, so this is a code-level finding with an obvious mechanism rather than an
observed wrong number. Worth stating plainly: the reasoning is sound, the demonstration is pending
data.

**Fix direction.** One predicate added at 8 call sites. Better, since the sweep shows the pattern
recurs: a shared helper (`_active_bills(db, project_id, types)`) that every aggregation goes
through, so the next aggregation cannot forget it — the same close-the-class shape as R2-711.

### R2-724 · MEDIUM · branch GSTIN skips the checksum that company GSTIN enforces

**Found while verifying R2-290**, whose claim is accurate - it promises the canonical
15-character pattern and delivers exactly that.

The codebase applies two different GSTIN standards, two of them in the same file:

| schema | validation |
|---|---|
| `CompanySettingsUpdate` (`settings.py:149`) | `_validate_gstin` -> pattern **and** mod-36 check digit |
| onboarding `CreateCompanyRequest` (`auth.py:790`) | `_validate_gstin` -> pattern **and** check digit |
| **`BranchCreate.gstin`** (`settings.py:154`) | **pattern only** - no checksum |

So a branch accepts a GSTIN the company field would reject. The demo tenant's own
`27AADCD2424B1ZP` is a worked example: structurally valid, check digit wrong (should be `A`), and
it would save as a branch while failing as a company.

`BranchResponse.gstin` being a bare `str` is fine - it is output only.

**Why it matters beyond tidiness.** Branch GSTIN is the place-of-supply identifier that reaches
invoices and the GSTR exports. An invalid one is a filing problem, and the checksum exists
precisely to catch transcription errors at entry.

**Fix direction.** One line - bind `_validate_gstin` to `BranchCreate` exactly as the other two
schemas do. The helper is already verified: I executed it against 400 valid GSTINs and 14,000
wrong check digits under R2-554.

## Verified clean so far

Recorded so the pass is not only a list of complaints. Each claim was re-checked against the tree,
not taken from the note.

| id | sev | claim | result |
|---|---|---|---|
| R2-017 | CRITICAL | fabricated demo data gone from 4 named files | **holds** — zero matches in all four |
| R2-110 | CRITICAL | holiday seed gone, `fetchHolidays` GETs, delete calls the API | **holds** — `hr/page.tsx:276,278,305,307` |
| R2-061 | MEDIUM | `setFleet` only ever called with API data or `[]` | **holds** — only `:108` and `:133` |
| R2-085 | LOW | no internal phase labels remain | **holds** — only ZATCA "Phase 1", legitimate domain term |

The four closures are accurate about what they claim. R2-712 exists anyway, because three of them
were scoped to the files a finding named rather than to the defect class.

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
| **R2-712** | **CRITICAL** | **class finding, 11 instances, proved live in browser + SQL** | R2-017 class sweep |
| ~~R2-713~~ | — | merged into R2-712 as instance 11 | — |
| ~~R2-714~~ | — | merged into R2-712 as instance 3, the money path | — |
| ~~R2-715~~ | — | merged into R2-712 as instance 6 | — |
| ~~R2-716~~ | — | merged into R2-712 as instances 7-8 | — |
| **R2-717** | **HIGH** | **class finding — 29 closed rows disclose untracked residue** | register-wide sweep |
| **R2-718** | **HIGH** | **class finding — 169 closures have no gate; 61 of them CRITICAL** | register-wide sweep |
| **R2-719** | **CRITICAL** | **class finding — 90 invented-default sites; 8 sentinel UUIDs resolve to real production rows** | generalised from R2-083 |
| **R2-720** | **HIGH** | **Internal Transfer is inert — Save fires no request, no error** | discharging D-V3 |
| **R2-721** | **MEDIUM** | **statutory `report_type` unvalidated — silent no-due-date, zero cess** | found verifying R2-129 |
| **R2-722** | **HIGH** | **second demo-tenant creation path in auth.py; demo OTP allowlist/code default in source** | found verifying R2-183 |
| **R2-723** | **HIGH** | **cancelled bills still counted in budget/BI/tower actuals — 8 sites R2-232 missed** | found verifying R2-045/066 |
| **R2-724** | **MEDIUM** | **branch GSTIN pattern-only — skips the mod-36 checksum company GSTIN enforces** | found verifying R2-290 |

**Twenty live findings.** R2-713..R2-716 were filed separately first and are struck through, not
deleted, so the history stays traceable.

Three to act on first, for different reasons:

- **R2-712 instance 3** — a money-movement form writing account names that exist for nobody.
- **R2-701** — a live defect with a closing window: the migration applies cleanly only while the
  duplicate count is still zero.
- **R2-711** — the reason R2-701 could be closed as fixed without anyone noticing. Cheap, and it
  closes the whole class rather than the seven instances.
