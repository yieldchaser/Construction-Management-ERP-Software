# Decisions — the calls only the founder can make

**This file is the single durable home for every pending product/schema/architecture decision in the SiteFlow audit campaign.** It consolidates:
- **D1–D7** — the original decision set (raw log `AUDIT_ROUND2_FINDINGS.md` L161, L3201).
- **D-006 … D-013** — the later decision markers referenced across register Notes. Several of these were only ever written down as one-line parentheticals in the register; this file is where their surviving context is preserved so they are not lost again.
- **Campaign decisions (Sessions 8–20)** — everything discovered during the fix campaign that still needs a founder call.
- **Schema/migration status** — what is pending, and what would require an additive migration.

**Rules:**
- Do not guess a decision. Pick the wrong option and you ship code that is confidently wrong.
- When you take a decision, update this file (STATUS → ANSWERED, note the date) and the gated register rows in `AUDIT_FIX_REGISTER.md`.
- Migrations are additive-only (`supabase/migrations/`). Never modify a column in place.

---

## A. Original decisions (D1–D7)

### D1 — What is "Cash In" supposed to mean? *(blocks R2-021, R2-042)*
The project dashboard's CASH IN shows billed value, not cash received (proven: a real ₹50,000 receipt moved it by ₹0).
- **(a)** Make it genuinely cash — drive from `Bill.paid_amount`. The correct calculation already exists unused at `dashboard/page.tsx:246`. Requires R2-042 fixed first, otherwise `paid_amount` is always 0.
- **(b)** Keep it accrual and rename to "Billed In / Billed Out", leaving NET CASH POSITION as the cash-aware card (that card is already correct).
**Also decide:** margin basis — Transaction tab uses ex-GST subtotals (₹80,000); the dashboard uses GST-inclusive accrual (₹94,400). Pick one (ex-GST is conventional) and apply to both.

STATUS: **OPEN**

### D2 — Should payroll pay a full month when there is NO attendance data? *(blocks R2-033)*
Today, zero attendance silently pays full pro-rated days, displayed identically to measured attendance.
- **(a)** Keep the fallback but flag it — return `attendance_source: "recorded" | "assumed"`, badge assumed rows plus a run-level warning. *(Note: R2-033's row is already marked FIXED/FIX_VERIFIED — verify which option was taken before re-reading this.)*
- **(b)** Zero attendance means zero pay, with an explicit per-employee override.
- **(c)** Company setting choosing between (a) and (b).

STATUS: **OPEN** (register row R2-033 shows FIX_VERIFIED `e2e449d` — the option choice should be confirmed against what shipped)

### D3 — Should settlement types be `Bill` rows at all? *(underlies R2-043, R2-021, R2-036)*
`payment_in` / `payment_out` / `i_paid` / `i_received` create `Bill` records AND there is a separate `Payment` table. That duality is the root of several findings.
- **(a)** Keep both — then every bill aggregation and the Tally exporter must classify all four buckets explicitly, forever.
- **(b)** Stop creating Bills for settlement types — the Transaction page's Payment In/Out routes to `Payment` instead. Cleaner long-term; needs a migration for existing rows.
**This is the highest-leverage architectural decision in the report.**

STATUS: **OPEN**

### D4 — GST place of supply: derive it, or keep the documented assumption? *(blocks R2-041)*
`_gst_split` always splits 50/50 CGST/SGST and can never emit IGST. The data to derive place of supply exists (`Project.state`, party address, company GSTIN state prefix).
- **(a)** Derive it properly — correct for inter-state supply, required for accurate filing.
- **(b)** Keep the assumption but surface an on-screen caveat and remove the misleading always-zero IGST column.
**Prerequisite (from raw log L5409):** fix **R2-114** first — the company GSTIN is the dummy `29ABCDE1234F1Z5` (state 29, Karnataka) contradicting the registered Navi Mumbai address (27); deriving place of supply from that prefix would be wrong for this tenant on every invoice.

STATUS: **OPEN** (has prerequisite R2-114)

### D5 — BOQ line items: build manual entry, or stay Excel-only? *(blocks R2-030)*
There is no endpoint or UI to add a single BOQ line; the only path is an Excel import.
- **(a)** Add `POST /boq-documents/{id}/items` + inline row (recommended — BOQ lines change constantly).
- **(b)** Accept Excel-only and remove the implication that lines can be managed in-app.

STATUS: **OPEN**

### D6 — Is the demo OTP path live in production? *(blocks R2-024 — a 2-minute env check)*
Confirm whether `OTP_DEMO_ALLOWLIST` / `OTP_DEMO_CODE` are set on Render. If **unset**, the hardcoded `+919876543210` / `123456` in the client bundle are inert and R2-024 is cosmetic. If **set**, the demo login is reachable from the production frontend. **Delete the "Create Demo Request" button either way.**

STATUS: **OPEN** (needs you to check the Render env vars)

### D7 — What should "no permissions" mean? *(blocks R2-073, R2-113, R2-169)*
The fail-open exists to protect tenants whose roles predate the permissions column. Fixing it naively locks those tenants out; leaving it means the role editor's most restrictive setting grants everything.
- **(a)** Migrate then close the hole — backfill every existing role with an explicit permission set (`DEFAULT_ROLE_PRESETS` covers all 11 seeded role names), then fail **closed**. Cleanest; the presets make the backfill mechanical.
- **(b)** Explicit unmigrated marker — keep fail-open only for marked rows; treat a genuinely empty dict as "no permissions". Safer to deploy; leaves a flag to remove later.
- **(c)** Fail open on read, closed on write — allow `:view` when empty, deny `:edit`/`:approve`/`:manage`/`:delete`. Middle option keeping legacy tenants reading.
**Also decide:** should a member with `role_id = NULL` be allowed at all for non-partner `priority_type`? Recommend no — require a role, defaulting to Viewer.

STATUS: **OPEN** — gates R2-073/R2-113 (register rows TODO) and R2-169

---

## B. Later decision markers (D-006 … D-013)

> These were referenced from register Notes with one-line parentheticals. Full original wording was not preserved anywhere; what survives is recorded below verbatim from the register. When you take one, expand the context here.

| ID | Register reference | Surviving definition | Gates | STATUS |
|---|---|---|---|---|
| D-006 | closure audits RC-031/RC-032 (branch log) | Closure-audit standard for live-verification closures | verification protocol | ANSWERED (pre-campaign) |
| D-007 | R2-388 | 403 contract kept; the guard asserts refusal instead (WONTFIX rationale for delete-logs 403 behavior) | R2-388 → WONTFIX | ANSWERED (`4b7add4`) |
| D-008 | R2-335 | A missing feature, not a defect (deferral basis) | R2-335 | OPEN |
| D-010 | R2-184 | Needs object storage (escalation basis) | R2-184 | OPEN |
| D-011 | R2-041, R2-319 | Needs place-of-supply schema (ties into D4) | R2-041, R2-319 | OPEN |
| D-012 | R2-039 | 5 of 91 hardcoded-empty report columns closed with R2-321; the remaining 86 deferred | R2-039 | OPEN |
| D-013 | R2-195 | Performance task, needs measurements before fixing | R2-195 | OPEN |

---

## C. Campaign decisions (Sessions 8–20) — pending founder calls

### CD-1 — Approval categories: wire the 13 inert ones, or cut the list to 2? *(R2-178, CRITICAL; also covers R2-113's family)*
The approval-rules screen offers 15 categories; only Payment Request and Purchase Order are consulted by any code (`find_matching_rule` has exactly two callers). An admin can build a three-level chain for GRN Material or Leave Application and no code path will ever read it — a compliance control that fails in the permissive direction.
- **(a)** Wire the remaining 13 — the engine in `app/approvals.py` is generic; each feature needs a `find_matching_rule` call at its create/approve boundary (procurement.py:428 demonstrates it in ~10 lines).
- **(b)** Cut `APPROVAL_CATEGORIES` down to the two that work. Do not ship the list as-is.

STATUS: **OPEN** — the highest-priority open decision (gates R2-178, register row TODO)

### CD-2 — Calculators: pick one of the audit's three remedies *(R2-010, MEDIUM)*
14 calculator endpoints have zero callers; the console computes everything locally in `useMemo`. Two hand-maintained implementations can silently drift, and the backend hardening (`gt=0`, mix_ratio validation, route aliases) protects nobody.
- **(a)** Have the console call the API (single source of truth).
- **(b)** Extract the formulas into one shared module consumed by both.
- **(c)** Add contract tests asserting identical output for a fixed input matrix (cheapest).

STATUS: **OPEN**

### CD-3 — To-Do recurrence: does it exist at all? *(from R2-149, HIGH)*
The company To-Do page's decorative Repeat Settings modal was removed (R2-149). But the project-level To-Do page still SENDS `repeat_type` to a backend where **no scheduler, cron, or read-time expansion exists anywhere** — a "daily" to-do is a single row with a label. The stored value is dead either way.
- **(a)** Build the recurrence expansion job (real feature).
- **(b)** Remove the field/UI on the project page too (honest absence).

STATUS: **OPEN**

### CD-4 — EPF statutory wage ceiling: company setting, applied in one place *(from R2-032)*
The CTC fix uses the per-employee `pf_employer_pct` but applies it to uncapped basic. Statutory PF normally caps at ₹15,000/month basic. Contributing above the ceiling is legal and some employers choose it — but it should be a setting, not an accident. (The backend and the deleted frontend helper disagree about it today.)

STATUS: **OPEN** (needs a settings column + one-place application)

### CD-5 — Per-tower cost attribution needs a schema decision *(from R2-067)*
The budget tower breakdown (`budget.py:159`) reports the whole project's actual cost for every tower because bills have no `tower_id`. Fixing this properly needs an **additive migration** (`Bill.tower_id`, nullable, backfill by mapping) — or an explicit decision to keep project-level actuals and drop the per-tower claim.

STATUS: **OPEN** — if the schema option is chosen, a new additive migration is required (see Section D)

### CD-6 — Geofence badge wording *(from R2-106)*
The attendance header badge reads "Geofence: Active" unconditionally. The server now genuinely derives `location_verified` from the geofence (R2-106), but the badge still does not reflect whether a project actually HAS geofence config. Decide whether the badge should reflect the project's real config state.

STATUS: **OPEN** (cosmetic)

### CD-7 — RFQ status transitions: there is no "sent/issued" writer *(from R2-298, partial)*
`RFQ.status` vocabulary is draft/sent/closed (models.py:1805) but no endpoint or UI anywhere writes "sent". R2-298 enforced past-`valid_until` rejection and expired-quote gating, but the "quotes only on non-draft RFQs" gate was NOT enforced because doing so would make quote submission impossible (nothing can leave draft). Decide: (a) add a send/issue transition (endpoint + UI action), or (b) drop the "sent" state from the vocabulary and enforce on draft/closed only.

STATUS: **OPEN** — gates the remaining half of R2-298

### CD-8 — PO close/cancel transition does not exist *(from R2-341, partial)*
The PO item report now fills Received/Pending/Item Status, but the `closed` status is unreachable — no close/cancel endpoint exists anywhere in the product (same class as R2-232/R2-296). Decide: (a) add a close/reject transition for POs, or (b) drop the closed status from the report's vocabulary.

STATUS: **OPEN** — gates the remaining half of R2-341

### CD-9 — TaskTodo vs Todo: two live to-do vocabularies *(from R2-385, MEDIUM, models.py)*
`TaskTodo` (per-task, `is_completed`) and `Todo` (company/project, `status`) are both live and console-reachable. Merging them requires choosing one surviving vocabulary and reconciling the API/console consumers — or formally keeping both with a documented boundary. Either way the dead class must go.

STATUS: **OPEN** — gates R2-385 (currently TODO)

### Implementation follow-ups that need no decision (for completeness)
- `PunchRequest.location_verified` is dead schema after R2-106 — remove in a future pass.
- Quality lab-test mapping `material: t.material || "Concrete"` — same fabrication class as R2-063-ter.
- Quality mapping lines landed at column 0 (indentation) — restore 12-space indent on a future touch.
- `formatMoney` dead const in the dashboard — remove when next touching the file.

---

## D. Schema / Supabase migration status

**Nothing is pending.** No fix in Sessions 8–20 required a schema change (all changes were additive code; the register reflects them). Confirmed by search: no `SUPABASE MIGRATION` / `PENDING SCHEMA` entries exist in the raw log beyond this pointer.

If **CD-5** (per-tower attribution) or **CD-4** (EPF ceiling) is taken, a NEW additive migration is required, e.g.:
- CD-5 → add nullable `Bill.tower_id` FK, backfill, drop nothing (later migration may drop the old project-wide behavior).
- CD-4 → add nullable `pf_wage_ceiling` company-settings column, backfill from a default, apply in one place.

Follow the repo convention: `supabase/migrations/<YYYYMMDD>_<name>.sql`, additive-only, never `ALTER ... DROP COLUMN` in a single step.

---

## How to take a decision

1. Answer the question in this file: STATUS → ANSWERED, date, and the option chosen.
2. Update the gated register rows in `AUDIT_FIX_REGISTER.md` (Notes column: reference the decision id).
3. Append a SESSION_LOG entry so the trail is complete.
4. Hand the decision to the fix queue (the register's TODO rows for the gated findings).
