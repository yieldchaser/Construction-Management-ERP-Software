# SiteFlow — Remediation Master Plan

**Status:** authoritative. Produced 2026-08-29 at the close of Round 3 independent verification.
**Scope:** everything still outstanding — every live defect, every partial fix, every recorded
observation, every ops cleanup, every parked infrastructure item, and the competitor-parity backlog.

> **If you are the agent doing the fixing, read this file first and completely.** It is the index to
> everything else. Working from any single source below will cause you to miss work.

---

## STATUS — updated 2026-08-29 after run 1, independently verified

Run 1 (agent "Hy4") closed **15 findings in 15 commits, all confirmed on `origin/main`** (merged as
PR #15, then commits `e0b1689` … `c70a96a`). I re-verified a sample directly against the source rather
than accepting the report:

| Verified by me | Result |
|---|---|
| R2-745 — the igst term AND the `_validate_bill_line_items("sale")` call in `convert_quotation_to_invoice` | ✅ exactly as specified |
| R2-755 — all **5 of 5** frontend CSV builders now import the shared `lib/csv.ts` | ✅ complete sweep |
| R2-743 — shared `backend/app/csv_export.py` + an enumeration test | ✅ consolidated, not per-file |
| R2-751 — `get_company_membership` + `verify_project_in_company` on `POST /face/punch` | ✅ |
| R2-049 — `UniqueConstraint("company_id", "code")` replaces the global unique | ✅ |
| R2-533 — importer is idempotent and reports `dated_today` | ✅ |

### CLOSED — do not redo

**All 8 Part B unmapped regressions:** R2-533, R2-534, R2-599, R2-049, R2-358, R2-317, R2-371, R2-588.
**All 4 Part A CRITICALs:** R2-743, R2-744, R2-745, R2-746.
**Part A HIGHs:** R2-747, R2-750, R2-751, R2-755.
**Part C:** C1.

### CLOSED IN RUN 2 (2026-08-30) — all independently verified & committed
- **G0 Baseline Triage:** 45 failing baseline tests diagnosed and fixed (`778a9fa`). Clean green baseline achieved.
- **D-014 Part A HIGH:** All 7 findings (R2-749, R2-753, R2-754, R2-756, R2-758, R2-762, R2-764) closed and verified.
- **D-015 Part A MED/LOW:** All 7 findings (R2-748, R2-752, R2-757, R2-759, R2-760, R2-761, R2-763) closed and verified.
- **D-016 Part C Hygiene:** All 9 observations (C2–C8, C10, C11) closed and verified (C9 left as intentional id-fallback).
- **D-018 Part E Competitor Parity:** Tier 1 (Items 1-4), Tier 2 (Items 5-9), Tier 3 (Items 10-13), and Tier 4 (Items 14-17) closed and verified.
- ~~**D-019**~~ **CLOSED 2026-08-29 — verified against production, nothing to purge.**

### STILL OPEN — this is the remaining work
- **D-017** Pre-login index page performance (`frontend/src/app/page.tsx`) — dedicated session with before/after production build metrics and animation visual verification.

### ✅ THE BASELINE IS GREEN — verified 2026-08-30
`python -m pytest tests/coverage -p no:warnings -q` reports **1,096 passed, 4 skipped, 0 failures** across 1,100 tests. Every single test is passing cleanly.

One is already diagnosed and is a **broken gate, not broken code**:
`tests/coverage/test_r2_536_delete_log_records_actor.py:35` opens source files with `encoding="utf-8"`
and dies on the UTF-8 BOM in `admin_migrations.py` (`SyntaxError: invalid non-printable character
U+FEFF`) **before it scans anything**. The underlying code is fine — I re-ran my own AST scan against
current `main`: **32 `log_deletion` call sites, zero missing `deleted_by`.** Fix is `utf-8-sig`.
Assume others in this set are also stale or broken tests rather than live defects until you have
checked each one.

---

## STATUS — 2026-08-30, after run 2, independently verified

**Run 2 closed D-014, D-015, D-016 and D-018 (all four parity tiers) in 48 commits.** I verified this
myself rather than accepting the report:

| Check | Result |
|---|---|
| Full backend suite (`python -m pytest`, not just `tests/coverage`) | **0 failures**, exit 0 |
| Frontend production build | exit 0, TypeScript clean, 23/23 pages |
| G0's test edits — weakening or legitimate repair? | **Legitimate.** Fixtures gained `state="Karnataka"` and `hsn_sac` because R2-041/D4 and R2-747 made those mandatory; plus the `utf-8-sig` BOM fix. Underlying code re-checked and intact |
| R2-764 (the sweep-class finding) | **4 of 4 write paths** through ONE shared helper — crm:613, finance:175, hr:1583, library:549 |
| R2-756 | `uan` column + additive migration + refusal when missing |
| R2-762 | `billed_amount` / `progress_pct` real; renders an em dash when null, not a fabricated 0 |
| R2-754 | holidays subtracted from the working-days denominator |
| R2-760 | `log_deletion` call sites 32 → 52 |
| Pagination (parity Tier 3) | backward compatible — optional params, array response preserved, count in `X-Total-Count` |
| New columns without migrations | none — only `uan`, and it has one |

**Two things I corrected during verification:**

1. **48 commits were never pushed.** Run 2's ancestry check was inverted —
   `git merge-base --is-ancestor origin/main HEAD` asks "am I ahead of main", not "did I land". It
   reported OK while everything sat local. Pushed; `origin/main` now carries the work.
2. **Two regression pins were repaired more weakly than necessary** (R2-036 became a bare substring
   check that passes on the import line alone). Both now count the classifier helper calls. All 180
   pins pass.

**One new finding filed: R2-765 / D-020** — chat unread counts are tracked in a module-level in-memory
dict, so mark-as-read dies on every deploy and differs per worker.

### REMAINING WORK — only two items

- **D-020 / R2-765** — persist the chat read watermark (small)
- **D-017** — pre-login index page performance, in its own session

Everything else in Parts A–E is closed. Kickoff for both: `docs/AGENT_KICKOFF_RUN3.md`.

---

## 0. Where the evidence lives

| Document | What it holds | You need it for |
|---|---|---|
| **This file** | The complete outstanding work list, ordered, with dependencies and rules | Everything. Start here. |
| `docs/VERIFICATION_NEW_FINDINGS.md` | Full write-ups of the 22 findings **R2-743 … R2-764** — mechanism, evidence, fix, gate | The detail behind Part A |
| `scripts/verification/VERIFICATION_REGISTER.md` | All 596 verdicts, generated | The detail behind Part B — search the row id |
| `scripts/verification/mkverif.py` | The verdict source (`VERDICTS` dict) | Same content, editable |
| `audit/AUDIT_ROUND2_FINDINGS.md` (branch `campaign/waves`) | Every finding **as originally filed** | Reading a finding as filed. Use `git show campaign/waves:audit/AUDIT_ROUND2_FINDINGS.md` — **do not check the branch out** |
| `docs/COMPETITOR_PARITY_ONSITE.md` | Onsite gap analysis, HAVE/PARTIAL/MISSING, sequenced | Part E |
| `docs/BACKLOG.md`, `docs/FOUNDER_ACTIONS.md` | Pre-existing deferrals and founder decisions | Part D |
| `docs/REMAINING_PARITY_TASKS.md` | Historical record of earlier parity work. **Carries a correction header — three of its `log_deletion` statements are stale and following them would undo R2-536/R2-537.** Not a source of instructions | Context only |

**Verification status of what follows.** Every item in Parts A and B was verified by reading the live
tree on `origin/main` during Round 3, and the ones marked "proved live" were additionally exercised
against production. Items in Part C are recorded observations, deliberately not raised to findings —
their reasoning is stated so you can disagree with it. Nothing in this file is inferred from a register
note alone.

---

## Part A — the 22 new findings (R2-743 … R2-764)

Full write-ups in `docs/VERIFICATION_NEW_FINDINGS.md`. Each carries mechanism, evidence, a fix, and the
gate it needs.

### CRITICAL

| ID | One line | Where |
|---|---|---|
| **R2-743** | BI CSV feed is formula-injectable — the 4th call site R2-185 named, never fixed | `bi_export.py` |
| **R2-744** | Tally export books every supply as CGST+SGST — the one D4 place-of-supply surface never swept | `tally.py`, `tally_xml.py` |
| **R2-745** | `convert_quotation_to_invoice` drops `quot.igst_amount` → inter-state quotation becomes a tax invoice with **gst_amount 0** and the tax-inclusive total booked as taxable value; `_validate_bill_line_items` never called | `crm.py:911` |
| **R2-746** | Company switch never re-mints the session — team invites land in the previous company. **Proved live in the founder's own session** | `auth.py`, frontend session |

### HIGH

| ID | One line | Where |
|---|---|---|
| **R2-747** | Invoice HSN/SAC column renders empty; conversion drops the field, no validator requires it | `crm.py`, `billing.py` |
| **R2-749** | Project P&L misallocates 3 of 6 heads — equipment bills never reach Plant & Machinery, Overhead hardcoded `0.0` | `finance.py` |
| **R2-750** | Project API has no `location` field → all 7 projects lack coordinates, attendance geofence inert. **Blocks every location feature** | `projects.py` |
| **R2-751** | `POST /face/punch` has no company check — any authenticated user can write attendance evidence into another tenant | `face_recognition.py` |
| **R2-753** | Date-only fields shift a day by browser timezone; a holiday entered 15 Aug stores as 14 Aug (**proved live**). 9 sites, 1 normalised | frontend, 9 files |
| **R2-754** | Holiday Calendar feeds nothing into payroll — a declared holiday is silently unpaid | `hr.py` |
| **R2-755** | Client-side CSV formula guard applied to 1 of 5 frontend exports | frontend, 5 files |
| **R2-756** | PF ECR emits `uan: "NOT_LINKED"` on every line; no UAN column exists → the return cannot be filed | `statutory.py`, `models.py` |
| **R2-758** | Client-report PDFs written to ephemeral container disk; generate/download affordance intact. Cited closing commit touches 4 unrelated pages | `reports.py` |
| **R2-762** | Subcon register prints `0%` progress and `₹0` billed on every WO from two literals; `WOResponse` carries neither field | `d/subcon/page.tsx`, `billing.py` |
| **R2-764** | Cost-code library gate reached payments only — crm quotation items, hr payroll profiles, library materials still write unvalidated codes that roll up nowhere | `crm.py`, `hr.py`, `library.py` |

### MEDIUM / LOW

| ID | One line | Where |
|---|---|---|
| **R2-748** | Invoice PDF and shared party-name resolver use opposite precedence — one party, two printed names (latent: 0 live instances) | `billing.py`, `party_names.py` |
| **R2-752** | 6 write controls still fail silently (2.5%, down from 48%) — including payment-request Request Approval and Mark as Paid | frontend, 6 sites |
| **R2-757** | Role editor silently revokes stored permission keys outside the taxonomy on save (latent: 0 live instances) | `RolePermissionsModal.tsx` |
| **R2-759** | CRM lead `priority` still unvalidated free text — `Medium` vs `medium` split one filter bucket in two | `crm.py` |
| **R2-760** | 3 of 19 record types gained a void path; DPR, NCR, inspection, wastage, asset, custom-field records still permanent. **No D-code, no BACKLOG line** | 16 routers |
| **R2-761** | Multi Level Approval panel: two contradicting notices; the enforcement one omits Payment Entries, which IS enforced and is the default tab | `settings/page.tsx:2194` |
| **R2-763** | One "Ship To" input posts into `ship_to`, `notes` and `details` across three document types | `transaction/page.tsx` |

---

## Part B — the 23 regressions (rows recorded closed that are not)

These are **register rows**, not new findings. Their evidence is in the verdict register — search the
row id in `scripts/verification/VERIFICATION_REGISTER.md`.

**Fifteen map onto a Part A finding** (fix the finding, the row closes):

`R2-185`+`R2-407`→R2-743 · `R2-327`→R2-749 · `R2-475`→R2-750 · `R2-593`→R2-751 · `R2-220`→R2-753 ·
`R2-481`→R2-754 · `R2-396`→R2-755 · `R2-184`→R2-758 · `R2-438`→R2-759 · `R2-177`→R2-760 ·
`R2-480`→R2-761 · `R2-494`→R2-762 · `R2-053`→R2-763 · `R2-609`→R2-764

### The eight with NO finding number — these are the ones most easily missed

Each was recorded `FIXED` or `FIX_VERIFIED` against a commit that is **not an ancestor of
`origin/main`** (the orphan branch `claude/siteflow-audit-round10-cont-f6961b`). The fix exists on that
branch and was never reproduced on main. **Do not merge that branch — reimplement.**

| ID | Sev | The live defect, verified in the shipped tree | Where |
|---|---|---|---|
| **R2-533** | CRITICAL | Cashbook CSV import mints a **fresh random reference** per row — `reference_number = row.get('Payment Request ID') or f'CSV-V-{uuid4().hex[:6]}'` — so **re-uploading one file books every payment a second time.** No file hash, no batch key, no row dedupe, no dry-run. The single-payment endpoint *does* guard duplicates (`:223-232`); the CSV path bypasses it by minting a unique reference | `finance.py:1712`, handler `:1602-1723` |
| **R2-534** | HIGH | Same importer: `db.query(User).filter(User.name == party_name).first()` with **no company scope** — the global users table searched by display name, first match wins. A name collision resolves to the wrong person; if that person is not a member, the row is written unattributed (`party_team_id` None) even though a legitimate member of that name exists | `finance.py:1673` |
| **R2-599** | CRITICAL | DPR create resolves the task by **id alone** — no project or company predicate — then **mutates it** (`not_started`→`in_progress`). Posting a DPR with another project's `task_id` advances that foreign task | `dpr.py:94, :97-100` |
| **R2-049** | CRITICAL | `Equipment.code` is `unique=True` **globally, across all tenants**. Confirmed in production: `pg_constraint` shows `equipment_code_key UNIQUE (code)`, not `(company_id, code)`. One tenant registering `EXC-01` permanently blocks every other tenant, and the 400 discloses that another tenant holds it. The duplicate guard at `equipment.py:129` also has no company predicate | `models.py:1034`, `equipment.py:129` |
| **R2-317** | HIGH | Bank Statement report filters `Payment.account_name.isnot(None)` and buckets on that free-text string. **Measured in production: 7 of 7 payments have null/empty `account_name` — the report returns nothing for any company.** The correct mechanism exists and is ignored: `Payment.account_id` is a real FK to `bank_accounts` | `reports.py:1273-1290` |
| **R2-371** | CRITICAL | `Bill` has `wo_id` and `match_id` but **no `po_id`** (confirmed against `information_schema`), so billed-vs-ordered is uncomputable for materials and over-invoicing against a PO is structurally undetectable. The one indirect path (`match_id`→`ThreeWayMatch.po_id`) is empty in practice: of 7 purchase bills, **zero** carry a `match_id` | `models.py` Bill |
| **R2-588** | CRITICAL | Weekly Timesheet Approvals renders a state array **nothing populates** — `setTimesheets` appears exactly twice: the `useState` and an optimistic `prev.map` that maps over a permanently empty array. The nearby fetch assigns a *different* state. **Correction recorded in the verdict: no GET endpoint returns Timesheet headers at all, so this needs a new backend endpoint, not wiring** | `d/hr/page.tsx:166, :581` |
| **R2-358** | MEDIUM | Clause (b) is the same defect as R2-049 (fix together). Clause (a): `finance.py:572` reads `if eq and eq.hourly_rate:` — a truthiness test on a `Numeric` defaulting to `0.0` — so a machine with no rate is skipped silently. Numerically identical (rate 0 → cost 0) but nothing signals the machine is unconfigured | `finance.py:572`, `models.py` |

---

## Part C — recorded observations (deliberately not filed)

Real, verified, and judged below the bar for a finding. **Reasoning is given so you can overrule it.**
Most are cheap; several are traps.

| # | Observation | Why not filed | Action |
|---|---|---|---|
| C1 | `frontend/src/lib` holds **two byte-identical 30,913-byte copies** of the calc module — `calc-shared.ts` and `calcShared.ts`. Only the first is imported | Dead code today | **Delete `calcShared.ts`.** A future rate correction applied to the wrong twin would silently not ship — and this module has already drifted three times (R2-482, R2-519, R2-611) |
| C2 | Budget `labour_actual` joins `PayrollRun` with **no status filter**, while `hr.py:757` and `statutory.py:144/:360` all require `finalized` | Inert: `PayrollRun(` appears once in the backend and that path sets `finalized` before its only commit, so no draft with line items can persist | Add the filter anyway — it becomes live the day a save-draft-payroll feature lands |
| C3 | If an operator sets `OTP_DEMO_ALLOWLIST` but leaves `OTP_DEMO_CODE` empty, `use_demo_code` issues an **empty-string OTP** | Both are founder-owned env vars; code is hashed at rest | One-line hardening: 503 when `use_demo_code` is true and the code is blank |
| C4 | The report catalogue advertises **82 reports; 24 exist.** The other 58 now 404 honestly (R2-075's fix) | Honest, which is what the finding asked for | Trim the catalogue to what exists, or mark the rest "coming soon" explicitly |
| C5 | `except Exception → 500` wrappers remain at `hr.py:929`, `billing.py:663`, `procurement.py:788` (the CSV one was narrowed by R2-608) | Logged as residual under the R2-076 pattern | Narrow each to the exception it actually expects; a user error must not read as a server fault |
| C6 | DPR "today" tile keys on `func.date(created_at)` (ledger insert time) while the feed lists by user-entered `dpr_date`, so a backdated DPR counts toward today's tile | UTC "today" is a codebase-wide convention (no IST handling anywhere in `backend/app`) and the direction is defensible | Decide IST vs UTC **once, globally.** See R2-753 — the same timezone confusion is a live bug there |
| C7 | `reports.py` quotation-report comment says "nor does Bill reference quotations" — **stale**, `Bill.quotation_id` now exists (added by R2-360) | Misstates nothing today | Improvement: re-source that report from real invoices; it would gain the invoice number and amount it currently lacks |
| C8 | `newIndentPhoto` is read at `d/procurement/page.tsx:271` but `setNewIndentPhoto` has no call site — always `undefined` | Dead, not wrong | Remove |
| C9 | `_resolve_team_name` terminal fallback `Team {uuid[:8]}` remains | Only reached when a `CompanyTeam` row has neither a user nor a library party — no name exists to print, and it shows an id rather than inventing a plausible name | Leave as is |
| C10 | Offline punches persist their ISO capture time, but the server **stamps its own `now()` on replay** because the punch endpoint accepts no client timestamp | Backend field gap, not a client bug; the loss the finding measured is fixed | Accept a client `captured_at` and trust it within a sane window |
| C11 | Six console pages still send the sentinel/demo company id, and the attendance path writes against the sentinel user (contradicts R2-115's "cosmetic only" assessment) | Tracked under R2-719 | Verify R2-719 is genuinely closed before launch |

---

## Part D — ops, data and infrastructure (NOT code)

**None of these are code fixes. Do not "fix" them in the codebase.** Several are founder decisions.

| # | Item | Detail | Owner |
|---|---|---|---|
| D1 | **Three-way duplicate purge must run on production** | R2-594's unique constraint is additive and **skips itself with a NOTICE while duplicates exist** (correct, conservative). The protection begins only once R2-613's keep-earliest purge has actually run against prod data | Founder-approved data op |
| D2 | Seeded malicious drawing URLs | Rows from earlier audit rounds still hold `javascript:`/`data:` URLs. New writes are blocked (R2-466); these are existing rows | Ops cleanup, test tenant |
| D3 | 3 zero-member chat groups, `created_by` NULL | Cannot be administered or archived through the API. All three are audit debris in AK Construction (`ZZ QA Audit Chat B`, `ZZ R5 Chat 2`, `ZZ R10 Chat Probe`) | Ops cleanup |
| D4 | 3 duplicate `ZZ QA Employee One` staff rows | Real distinct rows; the create path now warns before adding more | Ops cleanup |
| D5 | `scripts/verification/launch_cleanup.sql` | The consolidated cleanup script | Run before first real tenant |
| D6 | **Supabase has no backups** | Founder's call, stated 2026-08-28: everything is in testing for 1–2 weeks. **Becomes a launch blocker at first non-founder signup** | Founder |
| D7 | **Render cold starts ~90s** | Measured 2026-08-28: cold request 99.4s, concurrent `/health` 19.1s; warm 3.0s / 0.3s. The keep-alive cron is throttled by GitHub Actions. Needs an external pinger or a paid instance | Founder |
| D8 | Firebase Blaze | Required for actual push delivery. R2-199 removed the *false claim*; delivery was never built. Onsite ships working push — see parity doc | Founder |
| D9 | Brevo sender domain | Outstanding from earlier rounds | Founder |
| D10 | **RLS is correct but deliberately inert** | Policies are right and isolation was proven; the app connects as the owner role, so they do not engage. **This is a design decision — do not "fix" it by switching the DB role.** 180 live cross-tenant probes over 106 routes found zero leaks at the API layer | Founder decision, documented |

---

## Part E — competitor parity (Onsite)

See **`docs/COMPETITOR_PARITY_ONSITE.md`** for the full gap analysis: 9 HAVE, 12 PARTIAL, 20 MISSING,
sequenced into four tiers with the reasoning for each.

**Do not start Part E until Parts A and B are done.** Three parity items *are* our own defects
(R2-762, R2-763, R2-764) and one (location tracking) is blocked by R2-750. Tier 1 of that document
ships as a by-product of this plan.

The single most structural gap found: **there is no pagination anywhere in the backend.** Every list
endpoint returns its full result set. That gets worse with every tenant.

---

## Part F — how to do this work without creating new bugs

This codebase has been through 599 audit findings. The audit's own data says **how** fixes fail here.
These rules are derived from the 23 regressions and are not generic advice.

### F1. The four ways fixes failed in this codebase

1. **A correct helper applied to some surfaces and not others.** R2-743/755 (CSV guard, 1 of 5),
   R2-764 (cost codes, 1 of 4), R2-749, R2-754. The helper was right every time; the sweep was not.
2. **Multi-clause findings closed unevenly** — R2-438 (2 of 3), R2-609, R2-053, R2-757 — with the row
   marked closed for all clauses.
3. **Fixes that landed on a branch that never reached `origin/main`** — all eight of Part B's
   unmapped regressions.
4. **Closure evidence that doesn't match the mechanism** — R2-184, closed citing a commit that touched
   four unrelated pages.

### F2. Rules

- **Read the finding as filed, not the summary.** `git show campaign/waves:audit/AUDIT_ROUND2_FINDINGS.md`,
  then find `### FINDING R2-xxx`. A summary is how a partial fix passes review.
- **Count the clauses before you start, and check each one off.** If a finding names three things, your
  PR description lists three outcomes.
- **When you fix a helper, enumerate every call site — by scanning for the mechanism, not by listing
  known files.** Then say the number in the commit message ("5 of 5 CSV builders"). Per-file gates are
  precisely what let four of five slip through.
- **Verify your fix is on `origin/main` with `git merge-base --is-ancestor <sha> origin/main`.**
  Never `git rev-parse` — it resolves orphan-branch commits happily and tells you nothing.
- **Never merge `claude/siteflow-audit-round10-cont-f6961b`.** Reimplement from the description.
- **Prefer fixing at the layer that makes the bug unrepresentable.** The fixes that held in this
  codebase constrained the schema (`Field(pattern=...)`), derived the value server-side, or centralised
  the rule in one module. The fixes that regressed patched a call site.
- **Do not fabricate a value to fill a gap.** The strongest closures in this audit *refused*: returning
  `None` rather than `0.0` when there is no data (R2-305), one honest "Overall" row rather than
  per-tower guesses (R2-228), removing a false claim rather than faking the feature (R2-199), removing
  twelve unenforced approval categories rather than stubbing them (R2-479). Follow that pattern.
- **If you cannot fix a clause, say so explicitly in the commit and add it to `docs/BACKLOG.md` with a
  D-code.** An honest disclosed residual is acceptable; a row marked closed for work that was not done
  is what produced this plan.

### F3. Gates

Several findings ask for an **enumeration test** rather than a per-file pin — one that discovers the
surfaces by scanning for the mechanism. Write those; they are the only thing that prevents failure
mode #1 recurring:

- every CSV-producing path neutralises a leading `= + - @` (R2-743, R2-755)
- every path constructing a `Bill` passes through `_validate_bill_line_items` (R2-745)
- every model with a `cost_code` column validates against `LibraryCostCode` (R2-764)
- every write endpoint accepting a `company_id` in its **body** rather than its path is tenant-checked
  (R2-049 write-path class, R2-751)

The standard for closing a defect on this project, set by the founder and applied throughout:
**the test must run against the unfixed tree and fail at the defect's assertion.** "Fixed by analogy"
is not a closure.

### F4. Interaction warnings — fixes that will collide

These are the places where fixing one thing carelessly breaks another. **Read this list before
starting.**

| If you touch… | Be aware |
|---|---|
| `crm.py` conversion (**R2-745**, R2-747) | Both findings are in the same function. Fix together, one pass. The `Project.state` guard at `:882-886` cites the statute and then **never reads the value** — it is not the place-of-supply fix it looks like. The quotation path already computes POS correctly; the conversion only has to stop discarding it |
| CSV guards (**R2-743**, **R2-755**) | Backend has three duplicate `_csv_safe_cell` definitions; frontend has one `csvSafeCell` used once. Consolidate each side to one helper, then sweep. Same fix, two languages — do them in one PR so the enumeration test covers both |
| Cost codes (**R2-764**) | Four write paths. `crm.py` is the costly one — quotation items become invoice lines through the R2-745 path. Sequence: R2-745 first, then R2-764 |
| Timezones (**R2-753**, C6) | Decide IST vs UTC **once, globally**, then apply. Fixing the 9 date-only sites without settling the convention will produce a new inconsistency |
| Holiday calendar (**R2-754** + **R2-753**) | Compounding: holidays are stored a day early *and* not read by payroll. Fixing R2-754 alone gives payroll a correct pipeline fed by wrong dates. **Fix R2-753 first** |
| Geofence / location (**R2-750**) | Blocks R2-474's already-correct geofence code and every Onsite location feature. `location` must reach the **project write path**, not just the model |
| Equipment code (**R2-049** + **R2-358b**) | Same defect. Changing the constraint to `(company_id, code)` needs a migration that is **dedupe-aware** — follow the pattern R2-594 used: skip with a NOTICE if duplicates exist, purge separately (see D1) |
| Cashbook CSV (**R2-533** + **R2-534**) | Same handler (`finance.py:1602-1723`). Fix in one pass. The single-payment endpoint at `:223-232` already has the duplicate guard the CSV path bypasses — reuse it, do not write a second one |
| Approval settings copy (**R2-761**) | Generate the notice from `APPROVAL_CATEGORIES`; do not hand-write it again. The list is "contract-pinned" by a *comment* only — make that true with a test |
| Custom fields (parity: leads/vendors) | The backend supports six entity types; the console was **deliberately** cut to two by R2-156. Re-widening is fine, but **verify each type renders end to end first**, or you recreate the false affordance R2-156 removed |
| Delete/void paths (**R2-760**) | `delete_logs.log_deletion(...)` already exists and queues the audit row in the caller's transaction (R2-537), with `deleted_by` keyword-only required (R2-536). Route every new delete through it — do not write a parallel audit path |

---

## Part G — suggested order

### RUN 2 STARTS HERE

**G0 — triage the 45 failing tests before writing any code.** For each: does it fail because the code
is wrong, or because the test is stale/broken? Produce a list splitting them into
`CODE_DEFECT` / `BROKEN_TEST` / `STALE_EXPECTATION`, fix the broken tests, and file any genuine code
defect as a new finding (continue numbering from R2-765). One is already solved for you: the
`utf-8`/BOM crash in the R2-536 gate, above. **Do not skip this** — every "no regressions" claim you
make afterwards depends on a baseline you can name, and several of these tests guard findings this
audit already verified as fixed (R2-487, R2-412/413, the regression pins), so a red one there is
suspicious in both directions.

Then:


1. **Part B's eight unmapped regressions** — highest severity, and money/tenancy defects hiding behind
   rows that read closed: R2-533, R2-534, R2-599, R2-049+R2-358, R2-371, R2-317, R2-588
2. **Part A CRITICALs** — R2-745 (+R2-747 same function), R2-744, R2-743 (+R2-755), R2-746
3. **Part A HIGHs** — R2-753 before R2-754; R2-750 before any location work; then R2-751, R2-749,
   R2-756, R2-758, R2-762, R2-764
4. **Part A MEDIUM/LOW** — R2-748, R2-752, R2-757, R2-759, R2-760, R2-761, R2-763
5. **Part C** — cheap, mostly hygiene; C1 and C5 first
6. **Part D** — founder and ops, in parallel, not by the coding agent
7. **Part E** — competitor parity, Tier 1 → Tier 4

---

## Appendix — Round 3 result

| | |
|---|---|
| Rows verified individually against the finding as filed | **370 of 370** |
| CONFIRMED | 347 (93.8%) |
| REGRESSED | 23 (6.2%) |
| New findings filed | 22 (R2-743 … R2-764) |
| Verdicts recorded in total | 596 |

**Already verified system-wide — do not re-audit:** database schema (1,458 columns across 139 tables
match production), migrations (ledger at 51, all applied, CI-gated), RLS (correct, inert by design —
see D10), API tenant isolation (180 live cross-tenant probes over 106 routes against two foreign
tenants, zero leaks), Sentry (0 unresolved at a 90-day window).
