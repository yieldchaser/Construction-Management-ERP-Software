# Founder-gated decisions — resolved, one by one

**Written 2026-08-26 by the verification agent, at the founder's instruction to decide each gated
item rather than hand back a menu.**

Every item below carries: **the decision**, **why** (framed against the end goal — an ERP for Indian
construction companies), **what it unblocks**, **blast radius and new-bug risk**, and **where it
sits in the sequence**.

**Two items are business policy, not engineering.** They are marked **POLICY** and I give the
industry-standard default plus the condition under which the founder should override me. Everything
else has a defensible right answer and I have taken it.

**Scope:** the 17 `TODO` rows in `audit/AUDIT_FIX_REGISTER.md` (all founder-gated) plus the 5
decisions raised by the verification pass (`D-V1`..`D-V5`).

---

## Part 0 — Recap: what the verification pass found

25 live findings, `R2-701`..`R2-730` (one filed and retracted). Full text with evidence in
`docs/VERIFICATION_NEW_FINDINGS.md`.

### The four that are live defects in production right now

| id | sev | what |
|---|---|---|
| **R2-729** | CRITICAL | Delete Logs page fetches in an unbounded loop — **measured live at ~3.4 req/s** against the production pool, for as long as the tab is open |
| **R2-728** | CRITICAL | Attendance punch-out subtracts a naive datetime from an aware one → `TypeError` → **500 on Postgres**, passes on SQLite so the suite cannot see it |
| **R2-712** | CRITICAL | Fabricated data hardcoded into console forms — 11 instances, incl. Internal Transfer offering three bank accounts that exist for **no company** |
| **R2-730** | HIGH | `material_wastage.reported_by` is still free text; migration `20260816_000005` exists and **never ran** |

R2-726 (Enterprise Rollup net-balance sign error) was the fifth; the campaign has already fixed it
at `bbb6d51`.

### The structural findings — why those four were invisible

| id | sev | what |
|---|---|---|
| **R2-727** | CRITICAL | **94 closed rows cite commits that are not ancestors of `campaign/waves`** — they resolve only on the orphaned branch. 48 CRITICAL. R2-726/728/729 are all confirmed misses from this set |
| **R2-718** | HIGH | 169 of 315 closures have **no automated gate at all**; 61 CRITICAL; 28 have zero evidence of any kind |
| **R2-710** | HIGH | The 176 regression pins assert **source text**, not behaviour — exactly one calls application code |
| **R2-717** | HIGH | 29 closed rows disclose unresolved work in their own notes with **no tracking id** |
| **R2-725** | HIGH | 93 rows cite an RC suite that was absent from the live lineage (campaign has since restored the doc; its 4 test files are still missing) |
| **R2-719** | CRITICAL | 90 invented-default sites; 16 sentinel-UUID occurrences across 13 files |

### The rest

`R2-701`/`R2-702` (seven unique constraints never migrated) · `R2-703` (`work_orders` has no primary
key in production) · `R2-704` (boot sync silently skips NOT NULL columns) · `R2-705`..`R2-709` (five
pins that gate nothing — **the fixes themselves are all good**) · `R2-711` (nothing gates a model
constraint against having a migration) · `R2-720` (Internal Transfer is inert — Save fires no
request) · `R2-721` (statutory `report_type` unvalidated) · `R2-722` (second demo-tenant creation
path + demo OTP defaults in source) · `R2-723` (cancelled bills still counted — campaign fixed at
`55af851`).

**Verification standing: 220 of 315 closed rows worked, 211 CONFIRMED. 211 of 214 closure claims
verified exactly as written.** The campaign's individual fixes hold up under reading. What failed
was the evidence layer around them, and the lineage of that evidence.

---

## Part 1 — Decisions from the verification pass (D-V1..D-V5)

### D-V1 · The demo tenant in the production database → **DECIDED: remove the code path, then delete the rows**

**What is true.** `companies e0000000-…-000` is "Demo Construction Ltd" with 5 seeded projects;
`users e0000000-…-100` is "Demo Engineer". `_ensure_demo_company` (`auth.py:186`) recreates both on
any successful login by an allowlisted demo number. 11 console pages coalesce a missing `company_id`
into that tenant's id; the attendance path defaults the employee id to the demo user and **writes**.

**Decision.**
1. Delete `_ensure_demo_company` and `_seed_demo_projects` outright.
2. Replace the 11 fallbacks with the guard **that already exists** at `layout.tsx:44` — extended so
   it fires on a *missing* id, not only on an id equal to the sentinel.
3. Then delete both rows and their 5 projects.

**Why.** A demo tenant reachable from production code is a multi-tenancy hazard in a product whose
entire value proposition is that one company's costs are that company's. It is also unnecessary: a
demo can be a real company seeded deliberately, logged in normally. Order matters — deleting rows
first accomplishes nothing, because the next demo login recreates them.

**Unblocks.** R2-719 Tier 1, R2-722, and part of R2-024/D6.

**Blast radius / new-bug risk.** Low but not zero. The 11 fallbacks currently *hide* a missing
`company_id`; removing them converts a silent wrong-tenant fetch into a visible redirect. Expect a
handful of "page now redirects to login" reports on malformed routes — that is the correct behaviour
surfacing, not a regression. Cascade check before deleting the 5 projects.

**Sequence.** After D-V5 is answered (they touch the same file).

---

### D-V2 · The seven missing unique constraints → **DECIDED: migrate now, this week**

**Decision.** Write one migration creating all seven unique indexes — the six document-number pairs
(PO, GRN, indent, bill, work order, cost code) plus `company_team(company_id, user_id)`.

**Why, and why now.** Duplicate document numbers are an audit-trail failure in a business that is
audited: two POs numbered `PO-2026-043` is a dispute waiting to happen with a vendor. **The
duplicate count is zero today**, so the migration applies cleanly. Every week of real data raises
the chance it becomes a "which row survives" exercise on live records.

**Note this interacts with R2-613** (below), which is the same class already biting on
`three_way_matches` — legacy duplicates blocking a constraint. That is what this decision is
preventing on six more tables.

**Blast radius / new-bug risk.** Genuine and worth stating: after this, a duplicate document number
becomes a **409 instead of a silent second row**. Any code path that retries a create without
checking will start surfacing errors. That is the point, but it should ship with the
`IntegrityError` handler (R2-558, already in place) so the 409 names the constraint.

---

### D-V3 · Internal Transfer is inert → **DECIDED: remove the control**

**Decision.** Remove the Internal Transfer entry and its three transfer types from the Create
Transaction menu. Do not build the endpoint now.

**Why.** It fires no request and reports nothing (R2-720), and it offers bank accounts that exist
for no company (R2-712 instance 3). Internal fund movement between a company's own accounts is a
real ERP feature — but a decorative one is worse than an absent one, because a site accountant will
believe a transfer happened. Build it when `bank_accounts` is actually populated (it holds **zero
rows database-wide** today), which makes this a feature request, not a bug fix.

**Blast radius.** None — nothing depends on a control that issues no request.

---

### D-V4 · Backfill behavioural tests for the gate-less CRITICALs → **DECIDED: the 28 zero-evidence rows only, plus two lint-style gates**

**Decision.**
1. Write a behavioural test for each of the **28 rows that have neither a pin nor a test**.
2. For the remaining 133 gate-less rows, record *why* no test exists, in the row. Absence becomes a
   decision rather than an oversight.
3. Add the two cheap class gates: **R2-711** (a model `UniqueConstraint`/`Index` with no migration
   fails the suite) and the R2-717 rule (a closure whose note contains hand-off phrasing without an
   id cannot be marked FIXED).

**Why.** 61 CRITICALs with no gate is too many to test exhaustively at this stage of the campaign,
and most are frontend-honesty fixes where a behavioural test is disproportionate. The 28 with
*nothing* are different: for those, a regression is undetectable by any means. The two class gates
are worth more than any ten individual tests, because they stop the classes recurring.

**Explicitly not recommending** a rewrite of the 176 text pins (R2-710). They are cheap and they do
catch textual regressions. The error was calling them behavioural evidence, and that is a
documentation fix.

---

### D-V5 · Is the demo OTP path live on Render? → **DECIDED as far as I can: fix the source defaults regardless**

**Decision, independent of the env answer.** Change `config.py:43-44` so
`OTP_DEMO_ALLOWLIST` and `OTP_DEMO_CODE` default to **empty strings**, and make `_is_demo_mobile`
return `False` on an empty allowlist. Same for `EMAIL_OTP_DEMO_ALLOWLIST`.

**Why.** A known credential should never be *enabled by an unset variable*. Today a fresh deploy
with no env configured accepts `9876543210` / `123456`. Whether that is currently reachable on
Render is worth knowing, but it does not change what the code should do — the safe default is off,
and the env turns it on.

**Still needs the founder** only for the severity question: if Render has no SMS provider
configured, this is *currently exploitable* and jumps to the top of the queue. If SMS is wired,
there is no live bypass and the change is hardening. **That answer does not gate the fix.**

---

## Part 2 — The campaign's 17 gated rows, decided

### CD-1 · R2-178 (CRITICAL) · Approval categories → **DECIDED: (b) cut to the two that work, now; wire the rest as a funded feature**

**What is true.** The approval-rules screen offers 15 categories; `find_matching_rule` has exactly
two callers (Payment Request, Purchase Order). An admin can build a three-level approval chain for
GRN Material and no code will ever consult it.

**Decision.** Cut `APPROVAL_CATEGORIES` to the two that are wired. Add an explicit note in the UI
that more categories are coming. Wire the remaining 13 incrementally afterwards, highest-value
first: **Material Indent → GRN Material → Bill/Payment Entries** (that is the order money actually
flows on a site).

**Why this way round.** A compliance control that silently fails **in the permissive direction** is
the worst object in an ERP. An owner who configures "GRN above ₹5 lakh needs my approval" and is
never asked has been actively misled, and will only discover it during a dispute. Removing the
option is honest immediately; wiring 13 features is weeks of work. Do the honest thing now and the
feature properly after.

**Unblocks.** R2-178, and the family R2-113 sits in.

**New-bug risk.** Low. Existing rules for the 13 dead categories should be **preserved in the
database, not deleted** — hidden from the UI, so that wiring them later reactivates real intent
rather than losing it. That is the one implementation detail that matters here.

---

### D7 · R2-073, R2-113, R2-169 (all CRITICAL) · Permissions fail-open → **DECIDED: (a) backfill, then fail closed**

**What is true.** An empty permissions dict currently grants everything, so the role editor's most
restrictive setting is also its most permissive. Fixing it naively locks out tenants whose roles
predate the column.

**Decision.**
1. Backfill every existing role from `DEFAULT_ROLE_PRESETS` (covers all 11 seeded role names).
2. Any role not matching a preset gets **Viewer**, and the tenant owner is notified in-app.
3. Then fail **closed** — empty means no permissions.
4. `role_id = NULL` on a non-partner member is rejected; default them to Viewer.

**Why not (c), the read-open/write-closed middle option.** Because for a construction ERP the
read side is the sensitive side. Rates, margins, subcontractor pricing and payroll are exactly what
you do not want a junior site engineer browsing. "Fail open on read" sounds cautious and is the
riskier choice here.

**Unblocks.** Three CRITICALs — the largest single unblock in this file.

**Blast radius / new-bug risk.** The highest of any item here, and it deserves respect: a botched
backfill locks real users out of their own data on a Monday morning. Mitigations, in order —
(i) run the backfill as a dry run first and print the resulting matrix per tenant for eyeball
review; (ii) ship behind a flag defaulting to the current behaviour, flip per tenant; (iii) keep the
old fail-open code path for one release, reachable by config, so a rollback is a setting rather than
a deploy.

**Sequence.** After D-V2 and CD-1. This is the one that wants a quiet weekday morning and someone
watching the logs.

---

### D1 · R2-021 (HIGH) · What "Cash In" means → **DECIDED: (b) rename to Billed In/Out, and standardise margin on ex-GST**

**Decision.** Keep the accrual figure and label it **"Billed In" / "Billed Out"**. Leave NET CASH
POSITION as the cash-aware card — it is already correct. Separately, make **both** the Transaction
tab and the dashboard compute margin on **ex-GST subtotals**.

**Why.** Option (a) — driving CASH IN from `Bill.paid_amount` — is the more attractive-sounding
answer and I am rejecting it deliberately: it makes the headline dashboard number depend on
settlement data being complete, and settlement completeness is exactly what several open findings
are about. A card labelled correctly today beats a card that becomes right only after a chain of
other fixes lands.

On margin: GST is a pass-through, not revenue. Computing margin on GST-inclusive figures inflates
it, and in a business quoting on thin percentages that is a live risk of mispricing a tender.
**Ex-GST is the conventional and correct basis.**

**Unblocks.** R2-021, and removes R2-042 from its critical path.

**New-bug risk.** Low — a rename plus one formula, no data change. The margin change **will** move
numbers on screen; that is a correction, and it is worth a line in the release note so nobody
reports it as a regression.

---

### D4 + D-011 · R2-041, R2-125, R2-319 · GST place of supply → **DECIDED: (a) derive it — and derive it from the SITE, not the party address**

**This is the item where the domain matters most, and where I am overriding the framing in the
existing options.**

**What is true.** `_gst_split` always splits 50/50 CGST/SGST and can never emit IGST. The options as
written propose deriving place of supply from the party address or the company GSTIN prefix.

**The domain correction.** For a **works contract** — which is what a construction company supplies —
place of supply is the **location of the immovable property**, under s.12(3) of the IGST Act. It is
not the customer's registered address and not the supplier's state. So:

- Site in the same state as the supplier's GSTIN → **CGST + SGST**
- Site in a different state → **IGST**

The data already exists: `Project.state`. Deriving from the party address would be **wrong**, and
would produce confidently incorrect returns — worse than today's honest 50/50 assumption.

**Decision.**
1. Derive place of supply from **`Project.state`** versus the company GSTIN's state prefix.
2. Make `Project.state` **required** for any project that will be invoiced (this is the small
   schema/UX change the deferral was waiting on).
3. Emit IGST when they differ; CGST+SGST when they match.
4. Apply the same rule to quotations (R2-125) — quoting the wrong tax head loses tenders.

**The stated prerequisite is now satisfied.** D4 says fix R2-114 first because the company GSTIN was
a dummy. R2-114 is closed and I verified it: company **and** branch GSTIN both enforce the 15-char
pattern *and* the mod-36 check digit, and I proved the checksum correct against 400 valid GSTINs and
14,000 wrong ones. **D4 is no longer blocked.**

**Unblocks.** R2-041, R2-125, R2-319, and D-011 as a whole.

**Blast radius / new-bug risk.** Real: this changes tax on live invoices. It must ship with
(i) a migration making `state` non-null only for invoiceable projects, (ii) a one-time report of
existing invoices whose head would change, for the accountant to review, and (iii) **no
retrospective rewrite** of already-filed invoices. New behaviour applies from a cut-off date.

**Sequence.** After D-V2. This is the highest-value item in the file for a real construction
business, because it is the difference between filing correctly and filing confidently wrong.

---

### D2 · R2-033 family · Zero-attendance payroll → **POLICY. Recommended: (c) a company setting, defaulting to "assumed" being flagged**

**Why this is policy, not engineering.** Construction payroll has two populations: salaried staff who
do not punch, and daily-wage labour who must. "No attendance = full pay" is correct for the first
and financially dangerous for the second. No amount of code reading settles which the founder's
customers mostly employ.

**Recommendation.** Implement (c): a company setting `assume_full_month_when_no_attendance`,
defaulting **off** — but always return `attendance_source: "recorded" | "assumed"` and badge assumed
rows in the run, regardless of the setting. The flag already exists per the campaign's note; confirm
which option shipped before building.

**Override me if** the customer base is predominantly salaried-staff-heavy, in which case default it
on — but keep the badge either way. **The badge is not optional in either policy.** Paying a full
month against zero recorded attendance, displayed identically to measured attendance, is how payroll
fraud goes unnoticed.

---

### D3 · Settlement types as `Bill` rows → **DECIDED: (a) keep both, and classify explicitly — do NOT re-architect now**

**What is true.** `payment_in`/`payment_out`/`i_paid`/`i_received` create `Bill` rows while a
separate `Payment` table also exists. The campaign calls this the highest-leverage architectural
decision in the report, and recommends (b), stopping Bill creation for settlement types.

**I am deciding against (b), for now, and the reason is sequencing rather than architecture.**
(b) is the better end state. But it requires a data migration of existing rows, and it lands in
exactly the code the campaign has spent this entire campaign stabilising — the bill aggregations
that R2-036, R2-232 and R2-723 have each already corrected. Re-architecting that surface now would
invalidate a large share of the verification work just completed, and R2-727 has already shown what
happens when fixes and their evidence drift apart.

**Decision.** Keep both. Make the four settlement buckets **explicit named constants** consumed by
every aggregation and by the Tally exporter — one shared classifier, in the shape of the
`_active_bills()` helper R2-723 proposes, so the classification cannot drift per call site. Revisit
(b) as a planned migration after the register reaches zero.

**Unblocks.** Nothing directly, but it stops R2-043/R2-021/R2-036 recurring.

---

### D5 · R2-030 (MEDIUM) · BOQ manual entry → **DECIDED: (a) build it**

**Decision.** Add the inline row + `POST /boq-documents/{doc_id}/items`.

**Why.** BOQ lines change constantly on a live project — variations, extra items, rate revisions.
Excel-only means every single-line change is a full re-import, which in practice means people stop
using the BOQ module and keep the real BOQ in a spreadsheet. For a construction ERP that is the
module quietly dying.

**Good news on cost:** the endpoint **already exists** — I verified `POST
/boq-documents/{doc_id}/items` at `budgeting.py:405`, behind the `budgeting:edit` permission, while
confirming R2-122. This decision is now frontend-only.

**New-bug risk.** Low. Reuse the import path's validation so a typed row and an imported row are
validated identically.

---

### D6 · R2-024 (CRITICAL) · Demo OTP path → **DECIDED: delete the button, fix the defaults** (see D-V5)

**Decision.** Delete the "Create Demo Request" button unconditionally — the campaign's own note
already says "either way". Combine with D-V5's source-default change and D-V1's removal of
`_ensure_demo_company`. These three are one commit.

**Why.** All three are the same defect wearing different clothes: a demo pathway that reaches
production. The env answer changes the urgency, not the action.

---

### CD-2 · R2-010 (MEDIUM) · Calculators → **DECIDED: (b) one shared module, with (c)'s contract tests**

**Decision.** Extract the formulas into a single shared module consumed by both the console and the
API, and add the fixed-input contract tests.

**Why not (a), console-calls-the-API.** Site engineers use these calculators on patchy mobile data.
A quantity calculator that needs a round-trip is a calculator that fails on site. Keep the client
computing locally; make it compute from **one** source of truth.

**Why this matters more than MEDIUM suggests.** I verified R2-521, where the backend and console
steel constant disagreed (`162.89` vs `162.0`) until it was reconciled by hand. That is the drift
this decision permanently prevents.

---

### CD-3 · To-Do recurrence → **DECIDED: (b) remove the field and UI on the project page**

**Decision.** Remove `repeat_type` from the project To-Do page and stop sending it. Do not build the
scheduler.

**Why.** No scheduler, cron, or read-time expansion exists anywhere; a "daily" to-do is a single row
wearing a label. Recurring site tasks are a real feature worth building later, but shipping the
control without the engine is the same fabrication class the campaign has spent the whole campaign
removing. Consistency with R2-149, which already removed the company-page version.

---

### CD-4 · EPF wage ceiling → **POLICY. Recommended: add the setting, default it to capped at ₹15,000**

**Decision.** Add a company setting for the EPF wage ceiling, default **₹15,000/month basic**, and
apply it in exactly one place.

**Why capped by default.** ₹15,000 is the statutory ceiling. Contributing above it is legal and some
employers do it, but it must be a deliberate choice. Today the backend and the deleted frontend
helper disagree, which means the number is currently an accident either way.

**Override me if** the founder's customers commonly contribute on uncapped basic — then default it
off. Either way, one setting, one application site.

---

### CD-5 · R2-067 · Per-tower cost attribution → **DECIDED: add `Bill.tower_id`, additive and nullable**

**Decision.** Additive migration adding nullable `Bill.tower_id`; attribute where known; **show
"project-level" explicitly** wherever the tower attribution is unknown rather than repeating the
project total per tower.

**Why.** Tower-wise cost is a genuine requirement for real estate developers — it is how a builder
knows Tower B is over budget while Tower A is fine. Today `budget.py:159` reports the whole
project's cost against every tower, which is not merely imprecise, it is **actively misleading**:
every tower looks equally over budget.

**Interim behaviour matters more than the migration.** Until bills carry a tower, the honest display
is "project-level, not tower-attributed" — not a number that looks tower-specific.

---

### CD-6 · R2-106 · Geofence badge wording → **DECIDED: make the badge reflect real config**

**Decision.** The badge reads "Geofence: Active" only when the project actually has geofence
configuration; otherwise "Geofence: Not configured".

**Why.** Trivial to build, and it is an attendance-integrity signal. A supervisor trusting a badge
that is unconditionally "Active" will believe punches are location-verified when they may not be.
Small item, real consequence.

---

### CD-7 · R2-298 · RFQ "sent" state → **DECIDED: (a) add the send/issue transition**

**Decision.** Add a send/issue endpoint and UI action moving an RFQ draft → sent, then enforce
"quotes only on non-draft RFQs".

**Why not (b), dropping "sent".** Issuing an RFQ to vendors is a real, meaningful procurement event
— it starts the clock on `valid_until` and it is what a buyer means by "I've floated the enquiry".
Dropping the state to make the vocabulary consistent would remove a genuine business step to tidy an
enum. The campaign's note says the quotes-gate could not be enforced *because* nothing can leave
draft; adding the writer fixes both halves.

---

### CD-8 · R2-341 · PO close/cancel → **DECIDED: (a) add the transition**

**Decision.** Add a PO close/cancel endpoint with the same shape as the bill-cancel the campaign
already shipped under R2-370 (guard, `cancelled_at`/`cancelled_by`, exclusion from aggregations).

**Why.** POs get cancelled constantly — vendor can't supply, rates renegotiated, project descoped.
There is currently **no way to cancel a PO anywhere in the product**, which means the only way to
correct one is to leave it open forever or delete it. The pattern is already proven in this
codebase, so this is replication rather than design.

**Reuse note.** Follow R2-370's implementation exactly, and include the new state in the R2-723
`_active_bills()`-style exclusion from the start, so it does not become another missed-call-site
finding.

---

### CD-9 · R2-385 (MEDIUM) · TaskTodo vs Todo → **DECIDED: keep both, document the boundary, delete the dead class**

**Decision.** `Todo` (company/project, `status` vocabulary) and `TaskTodo` (checklist items under a
planning task, `is_completed`) are **different domain objects** and should both survive. Document
the boundary in `models.py`, delete whichever class is genuinely unreferenced, and do **not** merge
the vocabularies.

**Why not merge.** A punch-list item under a task and a standalone company to-do behave differently
— one is a subtask of scheduled work, the other is an independent action item. Merging them to
reduce two vocabularies to one would force an artificial parent on every standalone to-do. The
finding is real; the right resolution is a documented boundary rather than a merge.

---

### D-008 · R2-335 (HIGH) · **DECIDED: confirm as a feature request, move it off the defect register**

A missing feature is not a defect. Record it as a backlog item with a real description and remove it
from the findings register, so the register's remaining count means "known defects" and nothing
else. **A register that mixes defects with wishes cannot be driven to zero.**

### D-010 · R2-184 (CRITICAL) · **DECIDED: de-escalate to a feature, needs object storage**

Same reasoning, and it also matters for R2-068/R2-717 — the GRN gate photo that renders a green tick
and uploads nothing. **Until object storage exists, every upload affordance in the product must be
removed rather than shown**, which is a defect fix that does not need the storage decision. Then
build storage as a funded feature. Severity CRITICAL is right for the *false affordance*, not for
the absent feature.

### D-011 · R2-041, R2-319 · **RESOLVED by D4 above** — place of supply derives from `Project.state`. No longer blocked.

### D-012 · R2-039 (CRITICAL) · 86 hardcoded-empty report columns → **DECIDED: remove the columns, do not fill them**

A column that is always blank teaches users the report is broken. Remove all 86 from their report
definitions; reintroduce individually when each has a real data source. **Severity is right** —
these are shipped reports that an owner may hand to a bank or an auditor.

### D-013 · R2-195 (HIGH) · **DECIDED: measure first, with a defined trigger**

Correct as deferred, but a deferral with no trigger never returns. Set one: **profile it when any
tenant exceeds 500 bills or 50 projects**, whichever first. Record that trigger in the row so it is
a plan rather than a shelf.

### R2-613 (HIGH) · Legacy duplicate three-way rows → **DECIDED: approve the purge, with a snapshot**

**Decision.** Approve the purge SQL, with three conditions: (i) `SELECT` the rows into a timestamped
backup table first; (ii) keep the **earliest** row of each duplicate group, not an arbitrary one;
(iii) run the constraint creation in the same migration so the window cannot reopen.

**Why.** This is D-V2's problem already arrived — legacy duplicates blocking an additive unique
constraint. It is also the argument for doing D-V2 **now**, while its six tables are still clean.

---

## Sequencing — the order I would run these

| # | item | why here |
|---|---|---|
| 1 | **R2-729** (Delete Logs loop) | one line, degrading production continuously |
| 2 | **D-V5 + D6 + D-V1** (demo paths) | one commit, closes a credential-shaped hole |
| 3 | **D-V2 + R2-613** (constraints + purge) | time-sensitive; duplicate count is zero today |
| 4 | **R2-728** (punch-out 500) | daily-use path, blocks hours and payroll |
| 5 | **CD-1** (approval categories) | compliance control failing permissively |
| 6 | **D7** (permissions) | three CRITICALs; highest risk, wants a calm morning |
| 7 | **D4** (place of supply) | highest business value; needs the cut-off plan |
| 8 | **R2-712 / R2-719** (fabricated data) | one sweep, guard already exists in the codebase |
| 9 | CD-7, CD-8, D5, CD-2, CD-9, CD-6 | feature-shaped, low risk, parallelisable |
| 10 | D-V4 + R2-711 + R2-717 gates | stops the classes recurring |
| 11 | D3, D-008, D-010, D-013 | deliberately deferred, now with triggers |

**Two policy items need the founder's word before implementation: D2 and CD-4.** Everything else can
proceed on the decisions above.
