"""Tier 0 - build VERIFICATION_REGISTER.md from the agent's fix register.

One row per CLOSED finding (FIXED or FIX_VERIFIED). Columns:
  R2-id | severity | status | commit | files | test? | pin? | TIER | VERDICT | evidence

test?  = an R2 id appears in any file under backend/tests (campaign/waves)
pin?   = that reference is inside test_regression_pins.py specifically
TIER   = triage: 1 if it has a test (gate integrity is checkable)
                 2 if no test but schema/live observable (migration touched, or frontend file)
                 3 otherwise (no evidence obtainable without new work)
"""
import os
import re
import sys
from collections import defaultdict

S = os.path.dirname(os.path.abspath(__file__))
REG = os.path.join(S, "register.md")
TESTS = os.path.join(S, "waves", "backend", "tests")
LOG = os.path.join(S, "waves_log.txt")
OUT = os.path.join(S, "VERIFICATION_REGISTER.md")

ID_RE = re.compile(r"R2[-_ ]?(\d{3})", re.I)


def norm(m):
    return "R2-" + m.group(1)


# --- 1. test / pin references ------------------------------------------------
test_refs = defaultdict(set)   # id -> set of test file basenames
for root, _dirs, files in os.walk(TESTS):
    for fn in files:
        if not fn.endswith(".py"):
            continue
        path = os.path.join(root, fn)
        with open(path, encoding="utf-8", errors="replace") as fh:
            body = fh.read()
        for m in ID_RE.finditer(body):
            test_refs[norm(m)].add(fn)

# --- 2. commit subjects ------------------------------------------------------
commits = defaultdict(list)    # id -> [(sha, subject)]
with open(LOG, encoding="utf-8", errors="replace") as fh:
    for line in fh:
        sha, _, subj = line.rstrip("\n").partition("\t")
        for m in ID_RE.finditer(subj):
            commits[norm(m)].append((sha, subj))

# --- 3. register rows --------------------------------------------------------
rows = []
with open(REG, encoding="utf-8", errors="replace") as fh:
    for line in fh:
        if not line.startswith("| R2-"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        # id, severity, wave, file1, file2, status, commit, notes
        if len(cells) < 7:
            continue
        rows.append({
            "id": cells[0],
            "sev": cells[1],
            "wave": cells[2],
            "file1": cells[3],
            "file2": cells[4],
            "status": cells[5],
            "commit": cells[6],
            "notes": cells[7] if len(cells) > 7 else "",
        })

closed = [r for r in rows if r["status"] in ("FIXED", "FIX_VERIFIED")]

SEV_ORDER = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}

SCHEMA_HINT = re.compile(
    r"migration|column|constraint|unique|index|backfill|nullable|alter table", re.I)
FRONTEND_HINT = re.compile(r"\.tsx|\.ts\b|frontend/", re.I)


def tier(r):
    if r["id"] in test_refs:
        return 1
    if SCHEMA_HINT.search(r["notes"]):
        return 2
    if FRONTEND_HINT.search(r["file1"] + r["file2"]):
        return 2
    return 3


# --- 3b. Tier-1 gate verdicts from gatecheck.py ------------------------------
import json
GATE = os.path.join(S, "gatecheck.json")
gate = {}
if os.path.exists(GATE):
    for g in json.load(open(GATE, encoding="utf-8")):
        if g.get("id"):
            gate[g["id"]] = g

# Hand-confirmed against the diffs. A mechanical FAKE_GATE is only reported as one after the
# fix commit's own diff was read; these are the ones that survived that check.
CONFIRMED_FAKE = {
    "R2-040": "the pin asserts `.xlsx` (with the dot) is absent, but that literal is in neither "
              "the pre-fix nor the post-fix file, and the Excel button still calls "
              "`handleExportSelect(\"xlsx\")` after the fix. Passes either way.",
    "R2-077": "the pin reads `reports/[slug]/page.tsx`; `exportSchemas` only ever existed in "
              "`reports/page.tsx`, which is the file the fix changed. Watches the wrong file.",
    "R2-341": '`"PO Pending Qty"` was already in reports.py pre-fix as `"PO Pending Qty": ""`. '
              "The fix filled the value in; the pin only asserts the key exists.",
    "R2-351": "`unit=po_item.unit` was already at procurement.py:672 (a different call site) "
              "pre-fix. The fix added a second occurrence at :683; the pin cannot tell.",
    "R2-578": "both `msg.user_id = ct.id` and `msg.user_name = current_user.name` were present "
              "pre-fix (lines 153-154). The fix changed control flow around them - dropping the "
              "client-supplied fields and raising 403 - which the pin does not test at all.",
}
EVIDENCE_CLOSE = {"R2-001", "R2-118", "R2-428"}

# Verdicts reached by hand, one finding at a time. E1 = code read, E3 = live product.
# NOT_IN_PROD is a FIFTH verdict, added deliberately - see the header note in the emitted file.
VERDICTS = {
    "R2-017": ("CONFIRMED", "E1: the four files it names are free of fabricated strings. Claim "
                            "holds exactly as written. The defect CLASS survives elsewhere - "
                            "raised as R2-712, which does not detract from this closure."),
    "R2-110": ("CONFIRMED", "E1: no Diwali seed; `fetchHolidays` GETs /hr/holidays/{companyId} "
                            "(hr/page.tsx:276,278); delete calls the API (:305,307)."),
    "R2-061": ("CONFIRMED", "E1: `setFleet` is called at exactly two sites - `:108` with API "
                            "data and `:133` with `[]`. No fabricated fleet remains."),
    "R2-085": ("CONFIRMED", "E1: case-insensitive sweep of the whole console returns one hit, "
                            "ZATCA 'Phase 1' in settings, which is domain terminology."),
    "R2-149": ("CONFIRMED", "E1: pure removal of 144 lines. Zero repeat/recurrence/endsDate "
                            "residue left in d/todo/page.tsx."),
    "R2-008": ("CONFIRMED", "E1: fabricated VENDORS, RFQ_DATA and 'L1 PREFERRED' are gone. The "
                            "note's disclosed caveat is accurate - `selectedRFQItem` survives "
                            "at :224 and is write-only."),
    "R2-441": ("CONFIRMED", "E1: `_TASK_PROGRESS` covers every value the UI can emit - the "
                            "frontend option list is exactly not_started/start/in_progress/"
                            "completed, and the map holds all four plus `ongoing`. "
                            "E3: production task statuses are `not_started` only."),
    "R2-580": ("CONFIRMED", "E1: ProjectUpdate.status is pattern-constrained and ProjectCreate "
                            "has no status field at all, so there is no unguarded write path. "
                            "E3: live project statuses are Ongoing and Planning, both allowed."),
    "R2-512": ("CONFIRMED", "E1: the duplicate POST /backfill-rbac is gone and the live "
                            "`backfill_rbac_roles` still serves the same route at "
                            "admin_migrations.py:114. Claim accurate."),
    "R2-336": ("CONFIRMED", "E1: the `inv.category = req.category` overwrite is removed. The "
                            "note's disclosed sibling (`inv.unit` still overwritten) is real and "
                            "is carried by R2-717, not by this row."),
    "R2-378": ("CONFIRMED", "E1: dead `TransactionRetention` model removed and zero references "
                            "remain anywhere in app/. The table was left in place as the note "
                            "says, so nothing is destructive."),
    "R2-452": ("CONFIRMED", "E1: `quantity = round(quantity, float_limit)` is gone from the "
                            "importer, and BOTH write paths - Excel import (:204) and manual add "
                            "(:416-430) - now store the typed quantity with `float_limit` kept "
                            "only as `quantity_float_limit` display metadata."),
    "R2-062": ("CONFIRMED", "E1: zero residue for all six named symbols "
                            "(fallbackWorkforceEmployees, fallbackMaterials, workforceRows, "
                            "materialRows, snapshotFilters, uniqueValues)."),
    "R2-065": ("CONFIRMED", "E1: `computePayslips` and its 'Mock Data' header are gone from "
                            "d/hr/page.tsx."),
    "R2-070": ("CONFIRMED", "E1: the indent card's file input is gone and the photoUrl view "
                            "button survives at :624 as claimed. The one remaining "
                            "createObjectURL in the file is the GRN gate photo, a different "
                            "control (R2-068 / R2-717). Minor undisclosed residue: "
                            "`newIndentPhoto` is still read at :271 but `setNewIndentPhoto` has "
                            "no call site, so it always sends undefined - dead, not wrong."),
    "R2-078": ("CONFIRMED", "E1: no notification, bell or badge symbol remains in PageHeader."),
    "R2-115": ("CONFIRMED", "E1: the demo-tenant INSERT on GET is gone; unknown companies now "
                            "404. NOTE - this row's separate judgement that the residual demo "
                            "chain is 'cosmetic only' is contradicted by R2-719: six pages still "
                            "send the sentinel company id and the attendance path writes against "
                            "the sentinel user. The fix is right; that assessment is not."),
    "R2-207": ("CONFIRMED", "E1: the recipe allowance is applied - 8 x 2 x 1.05 = 16.8 matches "
                            "the audit example. E3: I suspected float(recipe.wastage_pct) could "
                            "500 on NULL, and DISPROVED it - production_recipes.wastage_pct is "
                            "NOT NULL in Supabase, and the Pydantic field is bounded 0..100."),
    "R2-050": ("CONFIRMED", "E1: both handleApproveIndent (:309-313) and handleApprovePO "
                            "(:390-394) now check res.ok and alert the server detail on non-2xx "
                            "instead of patching state unconditionally. The note's disclosed "
                            "residue on handleCreatePO is carried by R2-717."),
    "R2-051": ("CONFIRMED", "E1: zero occurrences of placeholder-, PO-2026-043, IND-2026-003 or "
                            "the pos.length+43 auto-increment remain."),
    "R2-091": ("CONFIRMED", "E1: the hardcoded material literals are gone and the page fetches "
                            "GET /library/materials/{companyId} at :123."),
    "R2-148": ("CONFIRMED", "E1 + E3 LIVE, end to end in the test company. Ticking a to-do fires "
                            "PUT /apis/v3/todos/{id} then re-fetches the list; after a full page "
                            "reload Pending held 2 and Completed held 1, so completion persists "
                            "server-side - the exact defect ('vanished on the next fetch') is "
                            "gone. Delete fires DELETE /apis/v3/todos/{id} then re-fetches. "
                            "Probe rows created for the test were removed afterwards."),
    "R2-554": ("CONFIRMED", "BEHAVIOURAL, not a read. Executed `_gstin_checksum_ok` against an "
                            "independently written implementation of the canonical GSTN mod-36 "
                            "algorithm: 400 GSTINs carrying an independently computed check "
                            "digit were accepted 400/400, and all 400x35 = 14,000 wrong check "
                            "digits were rejected. The public sample 27AAPFU0939F1ZV passes."),
    "R2-405": ("CONFIRMED", "E1: no `User.phone` reference survives in app/ (the one grep hit is "
                            "a comment in google_sheets.py explaining its absence). The model "
                            "carries `mobile`."),
    "R2-212": ("CONFIRMED", "E1: IncidentClose.root_cause and .corrective_action both carry "
                            "Field(..., min_length=10) at safety.py:44-45."),
    "R2-582": ("CONFIRMED", "E1: ProjectPartyStatusUpdate.status is "
                            "Field(..., pattern='^(Active|Inactive)$') at projects.py:527."),
    "R2-382": ("CONFIRMED", "E1: `enforce_entry_editing_window` is called on both mutations - "
                            "billing.py:447 and :891 - so cancel and match-link are covered, not "
                            "just task updates."),
    "R2-032": ("CONFIRMED", "E1: CTC is `grossMonthly + basic * (pfEmployerPct ?? 12) / 100` at "
                            "hr/page.tsx:935, and `pfEmployerPct` is mapped from the API's "
                            "`pf_employer_pct` at :263, so the employee half is no longer "
                            "double-counted and the rate is per-employee."),
    "R2-069": ("CONFIRMED", "E1: the field is labelled 'Reference / document name (file is not "
                            "uploaded)' at finance/page.tsx:4112 - the affordance is honest."),
    "R2-168": ("CONFIRMED", "E1: `payrollMonth` defaults to the current month "
                            "(`new Date().toISOString().slice(0,7)`, hr/page.tsx:220), not the "
                            "hardcoded 2026-06. The note's own follow-up on `daysInMonth` is "
                            "disclosed residue and is carried by R2-717."),
    "R2-060": ("CONFIRMED", "E1: zero matches for 12.9716 / 77.5946 / 'Metro Geofence Yard' "
                            "across frontend/src. `captureLocation` returns null on every "
                            "failure path (no geolocation :400, error callback :410) and "
                            "`queuePunch` blocks the punch with an alert when it is null, so no "
                            "invented coordinate can reach the geofence audit trail."),
    "R2-363": ("CONFIRMED", "E1: quality.py builds valid_item_ids from insp.checklist_id and "
                            "raises 400 at :308 inside the response loop, before any upsert, so "
                            "a foreign checklist item cannot be written."),
    "R2-526": ("CONFIRMED", "E1: statutory.py:168 sets report.filed_by = current_user.name; a "
                            "blank acknowledgment is 422 at :163 and an empty return is 400 at "
                            ":165. All three claims hold."),
    "R2-551": ("CONFIRMED", "E1: result_value Field(..., ge=0) at :155, both acceptance limits "
                            "ge=0 at :157-158, and a model_validator at :162 rejecting "
                            "min_acceptable > max_acceptable."),
    "R2-186": ("CONFIRMED", "E1: POST /auth/switch-company calls get_company_membership at "
                            "auth.py:955 before re-minting the session, so a non-member cannot "
                            "switch into a company."),
    "R2-583": ("CONFIRMED", "E1: the existing-link branch (projects.py:508-515) updates "
                            "advance_paid, to_pay and balance and the endpoint returns the new "
                            "state, so a re-posted opening balance is no longer a silent no-op."),
    "R2-034": ("CONFIRMED", "E1: `wo.subcontractor_name || nameMap[...] || \"Unassigned\"` - the "
                            "server field leads and the honest placeholder is last. The three "
                            "swallowed fetch failures now log, and the effect dependency array "
                            "gained companyId. Nuance: the failures log to console rather than "
                            "surfacing to the user, which matches the note's wording but is not "
                            "a user-visible error."),
    "R2-525": ("CONFIRMED", "E1: estimate_penalty takes company_id, report_type and "
                            "return_period only - no caller-supplied wages param survives in the "
                            "signature - and loads the StatutoryReport row at :178 to read the "
                            "stored totals."),
    "R2-292": ("CONFIRMED", "E1: all four guards present in settings.py - empty matrix 400 at "
                            ":522, the `all` superuser flag gated on owner_equivalent at :536, "
                            "and _LOCKED_ROLES = {Owner, Admin} at :500 with the locked-role "
                            "check at :524."),
    "R2-391": ("CONFIRMED", "E1: list_inspection_responses returns per-item rows carrying "
                            "`remarks` and `photo_url`, behind get_company_membership at :265."),
    "R2-230": ("CONFIRMED", "E1: BOTH surfaces are covered - drawing create and revision create "
                            "each have Field(..., min_length=1) plus a validator rejecting a "
                            "whitespace-only file_url (drawings.py:63-69 and :74-81). The note's "
                            "own disclosure that the UI half is unwired is accurate and belongs "
                            "to R2-717."),
    "R2-007": ("CONFIRMED", "E1: 'Shree Cement Traders' is gone from frontend/src entirely and "
                            "the PO modal fetches /billing/subcontractors at :122. The note's "
                            "disclosed residue - handleCreatePO still prepending optimistically "
                            "on failure - is real and is carried by R2-717."),
    "R2-111": ("CONFIRMED", "E1: the two dropdowns this finding names, the workforce drawer and "
                            "the employee drawer, carry no fabricated cost codes - the only "
                            "hardcoded cost codes left in the console are in d/finance, a "
                            "different surface already filed as R2-712 instance 4."),
    "R2-285": ("CONFIRMED", "E1, and checked for completeness on BOTH mutation paths: "
                            "_validate_rule_approvers and _reject_overlapping_band are each "
                            "called on create (settings.py:390-391) and on update (:413-414), "
                            "with the amount-band validator at :198. All three claims hold and "
                            "neither path is left unguarded."),
    "R2-071": ("CONFIRMED", "E1: the work-order terms field reads e.currentTarget.innerText at "
                            "finance/page.tsx:1550 and `innerHTML` appears nowhere in the file, "
                            "so no unsanitised markup can reach /billing/work-orders."),
    "R2-020": ("CONFIRMED", "E1: the fabricated takeoff rows ('Main Floor 2 Slab section A', "
                            "'Beam drop grid B-C') are gone from frontend/src entirely."),
    "R2-019": ("CONFIRMED", "E1: no 'Diwali' seed anywhere in frontend/src; holidays load from "
                            "GET /hr/holidays/{companyId}. Consistent with R2-110, which covers "
                            "the same defect from the other page."),
    "R2-006": ("CONFIRMED", "E1: the revision flow POSTs /apis/v3/drawings first when no drawing "
                            "exists (drawings/page.tsx:272), so the first drawing can be created."),
    "R2-013": ("CONFIRMED", "E1: the holiday flow is wired end to end - POST /hr/holidays/{cid} "
                            "at :967, DELETE at :975 and the list GET at :1020."),
    "R2-077": ("CONFIRMED", "THE FIX IS GOOD; ONLY ITS GATE IS FAKE. `exportSchemas` is gone "
                            "from frontend/src entirely and CSV headers now derive from "
                            "Object.keys(rows[0]) at reports/page.tsx:259. The pin watches the "
                            "wrong file, which is a defect in the TEST and is carried by R2-705 - "
                            "it says nothing against this fix."),
    "R2-521": ("CONFIRMED", "E1: backend calculators.py:61 uses D**2 / 162.0 and the console uses "
                            "/162.0 at three sites, so the two agree. Nuance worth recording: the "
                            "physically exact divisor is ~162.2 (pi/4 x 7850 / 1e6), and 162 is "
                            "the standard Indian site approximation - defensible, but the fix's "
                            "stated rationale is parity with the console, not correctness."),
    "R2-572": ("CONFIRMED", "E1: items is Field(..., min_length=1) at procurement.py:69, so an "
                            "empty PO is rejected at the schema. The note's disclosed siblings "
                            "(IndentCreateRequest.items, RFQ items) are real and sit in R2-717."),
    "R2-103": ("CONFIRMED", "E1: no 'ONS-' reference survives anywhere in frontend/src."),
    "R2-208": ("CONFIRMED", "E1: attendee_count is Field(0, ge=0) at safety.py:53. Note the "
                            "register's own file attribution for this row is wrong - the fix is "
                            "in safety.py, not p/budgeting/page.tsx - which the note itself "
                            "flags. Disclosed sibling (conducted_by/checked_by free text) sits "
                            "in R2-717."),
    "R2-164": ("CONFIRMED", "E1: the calculator discloses 'Paint and putty quantities include a "
                            "10% application allowance; primer a 5% allowance' at :1979, so the "
                            "allowance is no longer silently baked into the number."),
    "R2-227": ("CONFIRMED", "E1: is_pinned is emitted by the shared project serializer at "
                            "projects.py:154 and the toggle returns it at :360, so list, get and "
                            "the mutation agree."),
    "R2-022": ("CONFIRMED", "E1: the loader effect's outer gate changed from `if (projectId)` to "
                            "`if (companyId)`, so a company with no active project now loads "
                            "Finance. The two remaining `if (projectId)` checks at :299 and :354 "
                            "are inner guards for genuinely project-scoped sub-fetches, which is "
                            "correct."),
    "R2-040": ("CONFIRMED", "THE FIX IS GOOD; ONLY ITS GATE IS FAKE (R2-709). The menu now reads "
                            "'Export as CSV (Excel-compatible)' and the toast says CSV - `xlsx` "
                            "survives only as an internal format key, not as a claim to the "
                            "user. The defect was shipping a CSV named and described as Excel, "
                            "and that is resolved."),
    "R2-341": ("CONFIRMED", "THE FIX IS GOOD; ONLY ITS GATE IS FAKE (R2-708). reports.py:360 "
                            "computes `max(0.0, ordered_qty - received_qty)` instead of the "
                            "blank string that was the defect."),
    "R2-351": ("CONFIRMED", "THE FIX IS GOOD; ONLY ITS GATE IS FAKE (R2-707). Both call sites "
                            "now carry the PO item's unit - procurement.py:737 and :748 - and "
                            ":748 is the one the fix added."),
    "R2-578": ("CONFIRMED", "THE FIX IS GOOD; ONLY ITS GATE IS FAKE (R2-706). chat.py:179 raises "
                            "403 for a non-member, and the sender identity is stamped from the "
                            "session rather than the client payload."),
    "R2-150": ("CONFIRMED", "E1: todos.py:155 sets created_by=membership.id - the company_team "
                            "FK space, not users.id - and TodoCreate declares no created_by at "
                            "all, so a client cannot supply it."),
    "R2-247": ("CONFIRMED", "E1, and the interesting part is what is ABSENT. NCRCreate (:116) "
                            "declares neither raised_by nor assigned_to, and "
                            "SiteInspectionCreate declares no inspected_by, so "
                            "`NCR(**payload.model_dump(), raised_by=current_user.id, ...)` at "
                            ":362 cannot collide on a duplicate keyword. The raised_by/"
                            "assigned_to at :135-136 belong to NCRResponse, which is output "
                            "only. Identity is stamped from the caller on both endpoints."),
    "R2-251": ("CONFIRMED", "E1: mom.py:108 stamps created_by=current_user.name on create, and "
                            "the update path at :161-162 overwrites any client-supplied value "
                            "with the session name, so the body value is inert."),
    "R2-130": ("CONFIRMED", "E1: the invented formula is gone - statutory.py:189 returns "
                            "estimated_penalty 0.0. The note's own disclosure that the frontend "
                            "modal is now honest-but-dead is accurate and sits in R2-717."),
    "R2-287": ("CONFIRMED", "E1: opening_balance_amount is Field(0.0, ge=0) and "
                            "opening_balance_direction carries pattern "
                            "'^(will_pay|will_receive)$' (projects.py:456-457), so a negative "
                            "amount or a non-canonical direction is a 422 rather than a silent "
                            "200-with-zero."),
    "R2-269": ("CONFIRMED", "E1: the payslip CSV header row leads with 'Employee Code' at "
                            "hr.py:781. Register attribution says labour.py; the fix is in "
                            "hr.py, which the note itself corrects."),
    "R2-117": ("CONFIRMED", "E1: no build-plan, roadmap or 'Phase N of' copy survives in the "
                            "settings page."),
    "R2-119": ("CONFIRMED", "E1, verified as an EXACT vocabulary match rather than a spot check: "
                            "the frontend APPROVAL_CATEGORIES list (settings/page.tsx:476-481) "
                            "is character-for-character identical to the backend feature_type "
                            "Literal (settings.py:186-191) - the same twelve entries in the same "
                            "order. This is the frontend/backend vocabulary-drift class the "
                            "audit hit repeatedly, and here the two agree."),
    "R2-535": ("CONFIRMED", "E1: the duplicate-PO check normalises BOTH sides - "
                            "func.lower(func.trim(PurchaseOrder.po_number)) == "
                            "func.lower(func.trim(po_number)) at vendor_performance.py:183. "
                            "Normalising only the input would have left the defect."),
    "R2-134": ("CONFIRMED", "E1: MATCH_TOLERANCE_MIN = 1.0 and MATCH_TOLERANCE_PCT = 0.01, "
                            "combined as max(1.0, abs(po_amount) * 0.01) at three_way.py:117 - "
                            "exactly the 'max(Rs 1, 1%)' the finding asked for, replacing the "
                            "one-paisa tolerance."),
    "R2-193": ("CONFIRMED", "E1: last_used_at is written only when it is None, tz-naive, or "
                            "older than 300s (bi_export.py:79), which is the 5-minute throttle "
                            "plus the legacy naive-datetime guard the note claims."),
    "R2-361": ("CONFIRMED", "E1: the dead Quotation model is gone from models.py, so create_all "
                            "stops making the table, and nothing was dropped destructively. Its "
                            "disclosed sibling (LibraryRetention) sits in R2-717."),
    "R2-367": ("CONFIRMED", "E1: one line carries both claims - drawings.py:257 sets "
                            "`revision.approved_by = None if req.approval_status == 'pending' "
                            "else membership.id`, so approval is derived from the membership and "
                            "cleared on a return to pending. The pattern at :85 admits pending."),
    "R2-293": ("CONFIRMED", "E1: onsite_transaction_type and tally_voucher_type are Literals at "
                            "tally.py:70 and :72, constraining both to the canonical Tally "
                            "vocabulary the voucher builder consumes."),
    "R2-486": ("CONFIRMED", "E1: the paint calculator labels the rate ('Economy Emulsion "
                            "(115 sqft/L)' at :1264, constant 115.0 at :302) and `paintMode` is "
                            "gone from the file."),
    "R2-012": ("CONFIRMED", "E1: the Payment Method radios are controlled - "
                            "`checked={paymentMethod === m}` at finance/page.tsx:3416 - and no "
                            "`defaultChecked` survives in the file."),
    "R2-129": ("CONFIRMED", "BEHAVIOURAL - executed calculate_due_date directly, the one pin in "
                            "the suite that calls application code. pf/esi/bocw return the 15th "
                            "of the FOLLOWING month and tds the 7th, and the December rollover "
                            "is right (2026-12 -> 2027-01). Note surfaced separately: "
                            "report_type is case-sensitive and unconstrained - filed as R2-721."),
    "R2-553": ("CONFIRMED", "E1: confidence_score Field(None, ge=0, le=1), lat Field(ge=-90, "
                            "le=90), lng Field(ge=-180, le=180) - all three bounds present."),
    "R2-089": ("CONFIRMED", "E1: status_counts seeds all six canonical statuses plus Other "
                            "(analytics.py:432), legacy 'Onhold' normalises to 'On Hold' at "
                            ":437, and an unrecognised status falls to Other at :441 rather "
                            "than being dropped."),
    "R2-596": ("CONFIRMED", "E1: handleTimesheetAction mutates local state only inside "
                            "`if (res.ok)`; a non-2xx alerts the server detail and the catch "
                            "block alerts on transport failure, so a failed submit or approve "
                            "can no longer render as success."),
    "R2-514": ("CONFIRMED", "E1: the help answer now says multi-level approvals are not "
                            "'enforced on transactions; do not rely on them as an approval' "
                            "control (helpContent.tsx:427). The copy wraps across lines, which "
                            "is why a single-line grep for the phrase misses it."),
    "R2-004": ("CONFIRMED", "E1: two 'wastage allowance' disclosures present, matching the "
                            "Concrete and Plaster panels the note names."),
    "R2-146": ("CONFIRMED", "E1: the chat empty state distinguishes no-groups from "
                            "no-active-project. Its disclosed sibling (create-group without a "
                            "project) sits in R2-717."),
    "R2-467": ("CONFIRMED", "E1: the drawings revision approval-status register and wiring are "
                            "present, consistent with R2-367 which covers the backend half."),
    "R2-443": ("CONFIRMED", "E1: _serialize computes is_overdue only when due_date is set and "
                            "status != 'done', with the naive/aware tz guard (todos.py:42-47). "
                            "The repeat_type half is founder-gated and the UI half disclosed - "
                            "both belong to R2-717, not to this row."),
    "R2-162": ("CONFIRMED", "E1: CITY_MAP gives riyadh cur 'SAR' (:353) and the symbol map "
                            "renders 'SAR ' (:357); `houseCurrency` is gone."),
    "R2-026": ("CONFIRMED", "E1: the hardcoded `useState(3)` became `useState(0)` and a real "
                            "fetch of /todos/company/{id} now counts the pending rows, so the "
                            "card can no longer contradict the To Do module."),
    "R2-472": ("CONFIRMED", "E1, and complete on BOTH surfaces: an http(s) regex filters the "
                            "urls on send AND again on render, so a non-http value can neither "
                            "be posted nor displayed from an existing row."),
    "R2-493": ("CONFIRMED", "E1: zatcaEnabled is read from /settings/company and gates both the "
                            "ZATCA column header and the per-row cell, so the column disappears "
                            "entirely when the feature is off."),
    "R2-600": ("CONFIRMED", "E1: featuredProject binds to filteredProjects and all four "
                            "fabricated fallbacks ('No projects yet', 'No code', 'Pending', "
                            "'Address not set') became an em-dash. This is the HONEST form of "
                            "the pattern R2-719 catalogues elsewhere - a useful contrast."),
    "R2-501": ("CONFIRMED", "E1: analytics imports the shared fmtINR from @/lib/siteflow and "
                            "formatCurrency delegates to it at :81."),
    "R2-496": ("CONFIRMED", "E1: the three-way page imports the shared fmtINR and uses it for "
                            "po_amount, invoiced_amount and variance_amount. Its disclosed "
                            "sibling is REAL and still present - d/billing/page.tsx:477 defines "
                            "a local fmtINR that shadows the shared one - and belongs to R2-717."),
    "R2-183": ("CONFIRMED", "E1: auth.py imports the SHARED _validate_gstin from settings and "
                            "binds it as a field_validator at :790, so onboarding inherits the "
                            "same mod-36 checksum I verified behaviourally under R2-554 - "
                            "400/400 valid accepted, 0 of 14,000 wrong digits. Verifying this "
                            "row is also what surfaced R2-722."),
    "R2-159": ("CONFIRMED", "E1: entity_type and field_type carry the shared pattern constants "
                            "on BOTH create paths (custom_fields.py:30, :33, :63)."),
    "R2-492": ("CONFIRMED", "E1: list_project_members joins ProjectMember on "
                            "ProjectMember.company_team_id == CompanyTeam.id (projects.py:385), "
                            "so unassigned staff are excluded rather than listed."),
    "R2-016": ("CONFIRMED", "E1: updateProgress applies the local value only inside "
                            "`if (res.ok)`, alerts the server detail on non-2xx, and alerts "
                            "'your change was not saved' on transport failure - so a 422 or 500 "
                            "can no longer leave the new number rendered as if saved."),
    "R2-174": ("CONFIRMED", "E1: _txn_party_name walks CompanyTeam -> User -> LibraryParty and "
                            "keeps the 'Walk-in Party' / 'Unknown Party' vocabulary "
                            "(finance.py:912-917) rather than inventing a name."),
    "R2-402": ("CONFIRMED", "E1: the PO PDF gains a 'Received' header and sums GRNItem."
                            "received_qty per po_item_id. Register attributes this to a frontend "
                            "file; the fix is in the backend PDF builder."),
    "R2-213": ("CONFIRMED", "E1: the PPE gauge renders an em-dash and 'no checks recorded yet' "
                            "when ppeChecks is empty, instead of a red 0% that reads as total "
                            "non-compliance."),
    "R2-573": ("CONFIRMED", "E1: a received_date_not_future validator raises on a future GRN "
                            "date (procurement.py:120-124). Its disclosed sibling - "
                            "POCreateRequest.po_date still accepting a future date - sits in "
                            "R2-717."),
    "R2-273": ("CONFIRMED", "E1: all three guards present - phone_no pattern at crm.py:75, "
                            "EmailStr at :77, and an expected_closure validator at :92."),
    "R2-376": ("CONFIRMED", "E1: the zero-UUID sentinel is replaced by tower_id=None (:180) and "
                            "the no-tower branch now computes variance = total_budget - "
                            "total_billed where it previously hardcoded 0.0 - a real improvement "
                            "beyond what the note claims."),
    "R2-398": ("CONFIRMED", "E1: all three claims hold - exportColumns drops all-blank columns, "
                            "formatExportCell renders ISO timestamps as en-IN, and the cell "
                            "mapping moved from `row[col] || \"\"` to formatExportCell(row[col]), "
                            "which is what preserves a legitimate 0."),
    "R2-045": ("CONFIRMED", "E1: material_actual counts invoice_type in (purchase, expense) and "
                            "equipment_actual counts equipment bills plus deployment hours and "
                            "fuel, mirroring get_project_pl (bi_export.py:256-293). Verifying "
                            "this is what surfaced R2-723."),
    "R2-066": ("CONFIRMED", "E1: same function and same commit as R2-045 - expense and equipment "
                            "bills are no longer orphaned from the BI feed."),
    "R2-268": ("CONFIRMED", "E1: the DPR export resolves reported_by to a User name and falls "
                            "back safely when the value is not a UUID, so a raw id is never "
                            "rendered as the author."),
    "R2-232": ("CONFIRMED", "E1: billing.py:449-450 stamps cancelled_at/cancelled_by, and the "
                            "dedicated regression file test_r2_232_cancel_exclusion.py exists. "
                            "The exclusion reached finance.py but NOT budget/towers/bi_export - "
                            "8 missed call sites, raised as R2-723, not against this row."),
    "R2-001": ("CONFIRMED", "Evidence-close and it holds: the Material card really does open a "
                            "working drawer, so there was nothing to fix. Its pin passes "
                            "pre-fix for that reason, which is why gatecheck flags it - "
                            "correctly, and harmlessly."),
    "R2-504": ("CONFIRMED", "E1: assets.py:73-78 rejects a straight_line schedule whose "
                            "depreciation_pct is not 100/useful_life_years when salvage is 0, "
                            "with a 422 naming the expected value. Register attributes this to "
                            "a depreciation.py that does not exist; the fix is in assets.py."),
    "R2-282": ("CONFIRMED", "E1: calculators.py builds a conflicts list naming each duplicated "
                            "parameter pair (diameter/diameter_mm, count/num_bars, "
                            "length_or_height/length_m) and 422s when it is non-empty."),
    "R2-532": ("CONFIRMED", "E1: safety create schemas type project_id as uuid.UUID in all "
                            "three places and ZERO raw uuid.UUID()/fromisoformat calls remain."),
    "R2-558": ("CONFIRMED", "E1: a global exception handler for IntegrityError is registered at "
                            "main.py:503. Its disclosed sibling - 18 FKs still lacking ondelete "
                            "- sits in R2-717."),
    "R2-563": ("CONFIRMED", "E1: hr.py normalises entry_date, week_start and week_end to aware "
                            "datetimes and 422s when the entry falls outside the inclusive "
                            "window, naming the range in the detail."),
    "R2-044": ("CONFIRMED", "E1: the ZATCA gate reads `bill.invoice_type not in "
                            "REVENUE_INVOICE_TYPES` (billing.py:503) rather than testing one "
                            "literal, so material_sales is treated as revenue."),
    "R2-084": ("CONFIRMED", "E1: the status filter and both counters accept the canonical and "
                            "legacy spellings together (On Hold/Onhold, Planning/Not Started), "
                            "so a legacy row is no longer dropped from its own bucket."),
    "R2-460": ("CONFIRMED", "E1: a local fmtDate helper renders dd MMM yyyy and is applied "
                            "across the gantt page's date cells."),
    "R2-015": ("CONFIRMED", "E1: the quick-add button now POSTs /apis/v3/todos/ instead of "
                            "incrementing a local counter and showing a success toast."),
    "R2-225": ("CONFIRMED", "E1: handleSaveTimesheet sets tsFormError instead of returning "
                            "silently, so a missing project or party is visible. Register "
                            "attribution is off - the fix is in d/team-action/page.tsx, which "
                            "the note itself corrects."),
    "R2-190": ("CONFIRMED", "E1: zoho_books.py logs upstream failures server-side with an "
                            "8-hex correlation ref, so support can tie a report to a log line "
                            "without echoing the upstream body to the client."),
    "R2-290": ("CONFIRMED", "E1: BranchCreate.gstin carries the canonical 15-char pattern AND "
                            "binds _validate_gstin at settings.py:163, so the branch path runs "
                            "the mod-36 checksum too. I first read the binding as belonging to "
                            "a company schema and filed R2-724 against the supposed gap - that "
                            "finding is RETRACTED."),
    "R2-101": ("CONFIRMED", "E1: unbilledCount and pendingCount are useMemo at component scope "
                            "(:903, :907) and feed both the header chip and the toolbar, which "
                            "is the claim. The note labels itself a partial fix and names three "
                            "residues - honest, and they belong to R2-717."),
    "R2-072": ("CONFIRMED", "E1: the dead controls are gone (Filter, Aadhaar, PAN, drop-files) "
                            "and the Unbilled Materials toggle gained a real onClick. Its two "
                            "disclosed still-dead siblings sit in R2-717."),
    "R2-114": ("CONFIRMED", "E1, and it is the row that corrected me. It claims company AND "
                            "branch GSTIN write paths enforce the pattern plus the mod-36 check "
                            "digit; both do - BranchCreate binds _validate_gstin at "
                            "settings.py:163. I briefly filed R2-724 against a gap that does not "
                            "exist; that finding is retracted. The helper itself is verified "
                            "behaviourally under R2-554."),
    "R2-176": ("CONFIRMED", "E1, and a genuinely good security fix: files.py carries an "
                            "ALLOWED_CONTENT_TYPES allowlist, sniffs magic bytes and rejects "
                            "MZ (PE) and 0x7fELF headers, and returns 415 when the sniffed type "
                            "is not allowed - so a renamed executable does not pass on its "
                            "declared content-type alone."),
    "R2-122": ("CONFIRMED", "E1: POST /boq-documents/{doc_id}/items exists at budgeting.py:405 "
                            "behind the budgeting:edit permission."),
    "R2-555": ("CONFIRMED", "E1: 42 max_length bounds across library.py, so an over-long string "
                            "is a 422 rather than a database 500. Its disclosed sibling - 440+ "
                            "other unbounded string columns - sits in R2-717."),
    "R2-548": ("CONFIRMED", "E1: twelve ge=0 / le=4 bounds across the settings schemas."),
    "R2-135": ("CONFIRMED", "E1: method is Field(pattern='^(straight_line|wdv)$') at "
                            "assets.py:18. The finding lives in assets.py despite its W22 label, "
                            "which the note itself says."),
    "R2-298": ("CONFIRMED", "E1: rfq.py handles valid_until and rejects the invalid cases with "
                            "400. The row labels itself PARTIAL and names what is deferred."),
    "R2-145": ("CONFIRMED", "E1: Add Member fetches /crm/team-members/{companyId} and offers a "
                            "select, so a free-text UUID can no longer be typed in."),
    "R2-064": ("CONFIRMED", "E1: the phrase 'using demo data' is gone from frontend/src - the "
                            "import-failure path no longer claims a fallback that never "
                            "happened."),
    "R2-057": ("CONFIRMED", "E1: the gantt link handler only reports 'Link loop detected' when "
                            "the server detail actually contains 'circular', and otherwise "
                            "surfaces the real detail (:367-368). That is the fix - previously "
                            "every non-2xx was reported as a loop."),
    "R2-038": ("CONFIRMED", "E1: the analytics page imports the shared fmtINR and returns it "
                            "from its formatter."),
    "R2-005": ("CONFIRMED", "E1: the brick-specific notes render only under "
                            "`activeCalc === \"bricks\"`."),
    "R2-056": ("CONFIRMED", "E1: the payroll-attendance handlers carry try/catch blocks that "
                            "surface the thrown message. Its disclosed sibling sits in R2-717."),
    "R2-003": ("CONFIRMED", "E1, counted rather than eyeballed: ENTITY_TYPES holds exactly 29 "
                            "entries, `lead` and `workorder` are absent, and `crm_lead` - the "
                            "spelling the backend actually writes - is present. Every filter "
                            "option now matches a real row."),
    "R2-094": ("CONFIRMED", "E1: the broken 'Log Usage -' control is resolved as the note "
                            "describes."),
    "R2-035": ("CONFIRMED", "E1: _project_progress reads the column - "
                            "float(t.progress or 0.0)/100.0 when progress is not None - and "
                            "falls back to _TASK_PROGRESS by status only when it is null "
                            "(projects.py:107). That is the defect, resolved."),
    "R2-067": ("CONFIRMED", "E1, and its note is unusually precise. labour_actual comes from "
                            "PayrollLineItem.net_payable joined by project and equipment_actual "
                            "from equipment bills plus deployment hours plus fuel, which is what "
                            "the finding was about - a permanent zero actual and a falsely "
                            "favourable variance. It openly discloses that labour/equipment "
                            "`committed` remain 0.0 because no committed source exists, that "
                            "the per-tower loop still uses project-wide totals, and that its own "
                            "test seeds a company_team id into PayrollLineItem.employee_id and "
                            "only passes because SQLite has FK enforcement off. That last one is "
                            "this phase's thesis in miniature. All three sit in R2-717."),
    "R2-096": ("CONFIRMED", "E1: the party balance is "
                            "advance_paid + to_receive - advance_received - to_pay at "
                            "finance.py:724 with net-sign status derivation at :727."),
    "R2-014": ("CONFIRMED", "E1: flushQueue POSTs each punch individually, keeps every failure "
                            "in `remaining` rather than dropping it, and counts synced/failed "
                            "honestly - so the Sync button can no longer delete queued punches "
                            "and report success."),
    "R2-364": ("CONFIRMED", "E1: the pass-rate denominator is len(quality_tests_assessed), "
                            "counting only tests where is_pass is not None, and the unassessed "
                            "count is exposed separately (reports.py:101-104)."),
    "R2-433": ("CONFIRMED", "E1: _po_response resolves vendor_name through User.name and falls "
                            "back to LibraryParty.name (procurement.py:431-438)."),
    "R2-552": ("CONFIRMED", "E1, complete on BOTH schemas: project_value ge=0 le=1e15 and "
                            "attendance_radius_meters ge=0 le=100000 on create (:180, :186) and "
                            "again on update (:209, :218)."),
    "R2-182": ("CONFIRMED", "E1: a storage listener watches `access_token` and ignores no-op "
                            "events via an oldValue !== newValue guard, so another tab's session "
                            "change reloads this one."),
    "R2-088": ("CONFIRMED", "E1: STATIC_DIR is derived module-relative from __file__ rather "
                            "than the process working directory, and the mount uses it."),
    "R2-331": ("CONFIRMED", "E1: the status Query param carries WASTAGE_STATUS_PATTERN "
                            "(wastage.py:102) and wastage_type carries its own pattern at :20."),
    "R2-489": ("CONFIRMED", "E1: the em-dash placeholder is filtered out of the inspector "
                            "options at BOTH quality pages - two sites, as the note claims."),
    "R2-011": ("CONFIRMED", "E1: party_type is a case-insensitive union of the full backend "
                            "vocabulary (library.py:24), so a legitimate type is no longer "
                            "rejected."),
    "R2-097": ("CONFIRMED", "E1: partyTabStatus defaults to 'All' rather than 'Active'."),
    "R2-309": ("CONFIRMED", "E1: release=_app_settings.SENTRY_RELEASE or None is wired at "
                            "main.py:447 with the setting declared in config.py."),
    "R2-063": ("CONFIRMED", "E1: checklist responses persist remarks as null rather than a "
                            "fabricated string."),
    "R2-018": ("CONFIRMED", "E1: the hardcoded defaultValue='2026-07-04' is gone; the input is "
                            "controlled."),
    "R2-095": ("CONFIRMED", "E1: the Indent tab's bare header and the internal '(Stock "
                            "Contextual)' phrasing are resolved as the note describes."),
    "R2-118": ("CONFIRMED", "Evidence-close and it holds: HR holidays load from the same "
                            "/hr/holidays/{cid} endpoint Settings uses, and no Diwali seed "
                            "exists anywhere - consistent with R2-110 and R2-019, which cover "
                            "the same defect from other pages."),
    "R2-079": ("CONFIRMED", "E1: the demo-construction fallback chain is gone from BOTH files "
                            "it names, and a missing company_id redirects to /login. Its claim "
                            "is scoped to PageHeader.tsx and reports/page.tsx and is accurate "
                            "there. The sentinel-UUID fallback survives in ELEVEN other files - "
                            "not a failure of this row, and it corrected the site count in "
                            "R2-719."),
    "R2-261": ("CONFIRMED", "E1: create_dpr returns 409 on a second DPR for the same project and "
                            "date. Register attributes this to team_schedule.py; the fix is in "
                            "dpr.py, which the note says."),
    "R2-154": ("CONFIRMED", "E1: committed counts POs whose status is in (sent, partial, "
                            "received) and work orders that are not cancelled "
                            "(budget.py:82, :94) - so draft and cancelled documents no longer "
                            "inflate commitment."),
    "R2-566": ("CONFIRMED", "E1: TaskCreateRequest.status defaults to not_started and the "
                            "constructor uses it, so a client omitting status gets the declared "
                            "default rather than an empty string."),
    "R2-255": ("CONFIRMED", "E1: duration_days is Field(ge=0) on BOTH the create and the update "
                            "schema (planning.py:53, :63)."),
    "R2-277": ("CONFIRMED", "E1: x_coordinate and y_coordinate are Field(ge=0, le=9999.99), "
                            "which matches the Numeric(6,2) column so the DB cannot overflow."),
    "R2-461": ("CONFIRMED", "E1, complete across all three paths the note claims - the "
                            "inclusive `duration - 1` appears in propagate (:224), create "
                            "(:451) and update (:527)."),
    "R2-029": ("CONFIRMED", "E1: _search_vendor takes contact_type with a 'vendor' default and "
                            "applies it only when set, so the duplicate search can run "
                            "unfiltered across contact types."),
    "R2-031": ("CONFIRMED", "E1: update_task derives status from progress when status is not "
                            "supplied, and progress from status when progress is not - each "
                            "guarded so an explicit value always wins."),
    "R2-508": ("CONFIRMED", "E1: ltif_basis is a parameter defaulting to 200000 with the OSHA "
                            "convention documented at safety.py:175-183."),
    "R2-446": ("CONFIRMED", "E1: MOM_STATUSES includes Draft."),
    "R2-023": ("CONFIRMED", "E1: no PHASE build label survives anywhere in frontend/src."),
    "R2-002": ("CONFIRMED", "E1: no emoji codepoint remains in Sidebar.tsx."),
    "R2-420": ("CONFIRMED", "E1: the party balance renders through Math.abs with a direction "
                            "chip and TransactionRow carries project_name."),
    "R2-121": ("CONFIRMED", "E1: the Subcon page no longer renders terminal empty states in "
                            "place of real data."),
    "R2-082": ("CONFIRMED", "E1: burn-rate and labour KPIs render an em-dash for no-data rather "
                            "than a fabricated zero, and subcontractor names resolve through "
                            "library_party."),
    "R2-124": ("CONFIRMED", "E1: both equipment pages render honest empty states, with a CTA on "
                            "Fleet."),
    "R2-048": ("CONFIRMED", "E1: the Help page renders a real Modules directory from "
                            "HELP_MODULE_LINKS."),
    "R2-036": ("CONFIRMED", "E1: the invoice-type buckets are used 18 times across analytics.py, "
                            "budget.py and towers.py, so all five systemic sites filter bill "
                            "sums by bucket. Separately, some of those same aggregations omit "
                            "the CANCELLED filter - that is R2-723, a different predicate."),
    "R2-068": ("CONFIRMED", "E1: `unsplash` returns zero matches across frontend/src, so every "
                            "fabricated photo-evidence control is gone. Its disclosed residue - "
                            "the GRN gate photo still rendering a green tick without uploading - "
                            "is real and is carried by R2-717, where it is the worst instance."),
    "R2-054": ("CONFIRMED", "E1: the PR number generator loops on a candidate and re-queries "
                            "PaymentRequest.request_no == candidate until free (finance.py:1119-"
                            "1125), so a deletion no longer reissues a live number."),
    "R2-098": ("CONFIRMED", "E1: the party PID generator uses the same candidate loop against "
                            "LibraryParty.party_id_custom (library.py:145)."),
    "R2-204": ("CONFIRMED", "E1: NCR review stamps reviewed_by from current_user (:389) and "
                            "close stamps closed_by (:415)."),
    "R2-256": ("CONFIRMED", "E1: close_incident stamps closed_by from the session (safety.py:157) "
                            "and the column is returned in both read paths."),
    "R2-037": ("CONFIRMED", "E1: wastage is gated on has_consumption - the quantity is zero and "
                            "the percentage is None when nothing has been consumed "
                            "(analytics.py:344-346), so un-issued stock no longer reports 100%."),
    "R2-147": ("CONFIRMED", "E1: the message poll takes a since_id cursor and resolves it to an "
                            "anchor timestamp before filtering (chat.py:191-209)."),
    "R2-379": ("CONFIRMED", "E1: Advance Recovery sums the party+project advance cumulatively "
                            "and rejects a draw beyond it (billing.py:661-669)."),
    "R2-136": ("CONFIRMED", "E1, complete on both schemas: the predecessor link type carries "
                            "PREDECESSOR_LINK_TYPE_PATTERN (:72) and milestone type/status carry "
                            "their patterns on create (:92-93) AND update (:99-100). The row "
                            "labels itself PARTIAL for the instances outside planning.py."),
    "R2-107": ("CONFIRMED", "E1: no hardcoded UI date defaults survive - the only 2026-06-30 / "
                            "2026-07-04 strings left in frontend/src are blog publishDate values "
                            "in CMS content, which are legitimate."),
    "R2-295": ("CONFIRMED", "E1: the limiter takes a shared storage_uri when "
                            "RATE_LIMIT_STORAGE_URI is set and falls back to in-process storage "
                            "when it is not (rate_limit.py:11-12) - config-gated, as claimed."),
    "R2-108": ("CONFIRMED", "E1: employee creation compares trimmed-lowercase names against the "
                            "existing list and asks for confirmation before creating a second "
                            "one, rather than silently duplicating."),
    "R2-436": ("CONFIRMED", "E1: `form.created_by` is gone from both MOM pages. This is the row "
                            "whose pin gatecheck flagged as partially vacuous - the fix is "
                            "sound, the pin's third assertion is not (R2-717 family)."),
    "R2-411": ("CONFIRMED", "E1: the Tally XML builder emits an ALTERID element "
                            "(tally_xml.py:57), which is the create-if-absent ledger-master "
                            "behaviour the finding asked for."),
    "R2-144": ("CONFIRMED", "E1: media_url and voice_note_url are gone from the chat router's "
                            "client contract."),
    "R2-104": ("CONFIRMED", "E1: the Tally panel's last-export and last-marked summaries are "
                            "real state (finance.py:266-267) rendered with an honest 'Not yet' "
                            "when unset."),
    "R2-120": ("CONFIRMED", "E1: the Integrations page lists the connectors as the note "
                            "describes."),
    "R2-083": ("UNVERIFIED", "E1 FAILS on completeness. The two edits are correct, but the note's "
                             "claim that these were 'the last two fabricated attribute fallbacks' "
                             "is wrong - four remain in the same object literal, including "
                             "`health || \"Healthy\"`. Raised as R2-712 instance 11 / R2-719."),
    "R2-559": ("NOT_IN_PROD", "E0: zero unique indexes on the six tables in Supabase; by column "
                              "set the only one is <table>_pkey on id. Correct in code, absent "
                              "in production. Escalated as R2-701."),
    "R2-191": ("NOT_IN_PROD", "E0: company_team's only unique index is its pkey. Correct in "
                              "code, absent in production. Escalated as R2-702."),
    "R2-253": ("UNVERIFIED", "E0 passes - bills.wo_id is live. Behaviour not yet exercised."),
    "R2-338": ("UNVERIFIED", "E0 passes - both columns live. Behaviour not yet exercised."),
    "R2-202": ("UNVERIFIED", "E0 passes - column live. Behaviour not yet exercised."),
}

for r in closed:
    g = gate.get(r["id"])
    gv = g["verdict"] if g else ""
    if r["id"] in CONFIRMED_FAKE:
        r["gate"] = "FAKE_GATE"
    elif r["id"] in EVIDENCE_CLOSE:
        r["gate"] = "EVIDENCE_CLOSE"
    elif gv in ("FAKE_GATE", "FAKE_GATE_PARTIAL"):
        r["gate"] = "FAKE?"
    elif gv == "REAL_GATE":
        r["gate"] = "text-pin"
    elif gv:
        r["gate"] = gv.lower()
    else:
        r["gate"] = "—"

for r in closed:
    r["tier"] = tier(r)
    r["test"] = "yes" if r["id"] in test_refs else "no"
    r["pin"] = "yes" if "test_regression_pins.py" in test_refs.get(r["id"], ()) else "no"
    cs = commits.get(r["id"], [])
    # oldest commit naming the id = the original fix, and the one gatecheck.py diffed against
    r["sha"] = cs[-1][0] if cs else (
        r["commit"] if re.fullmatch(r"`?[0-9a-f]{7,40}`?", r["commit"]) else "—")
    g = gate.get(r["id"])
    if g and g.get("fix"):
        r["sha"] = g["fix"]

closed.sort(key=lambda r: (SEV_ORDER.get(r["sev"], 9), r["tier"], r["id"]))

# --- 4. emit -----------------------------------------------------------------
lines = []
W = lines.append
W("# SiteFlow — INDEPENDENT VERIFICATION REGISTER (Tier 0)")
W("")
W("Generated by `scratchpad/mkverif.py` from `audit/AUDIT_FIX_REGISTER.md` @ `campaign/waves`.")
W("**This file is mine. The agent owns `audit/*`; do not merge this into it while the agent runs.**")
W("")
W("One row per **closed** finding — the agent's `FIXED` (its own pytest) or `FIX_VERIFIED` ")
W("(founder live-confirmed). Purpose: prove independently that the fix holds in production and ")
W("that its test actually gates something.")
W("")
W("Verdicts, and only these four:")
W("")
W("- `CONFIRMED` — evidence obtained, fix holds.")
W("- `FAKE_GATE` — the test passes against the *unfixed* tree, so it gates nothing.")
W("- `REGRESSED` — worked before, broken now.")
W("- `UNVERIFIED` — no evidence obtainable. Honest answer, not a failure.")
W("")
W("- `NOT_IN_PROD` — **a fifth verdict, added during the pass.** The fix is correct in code and ")
W("  demonstrably not in effect in production. None of the original four fit: the gate is real, ")
W("  nothing regressed, and `UNVERIFIED` would understate a defect that has been positively ")
W("  proven. Used only where live evidence shows the fix absent from the running system.")
W("")
W("Anything not `CONFIRMED` gets a **new** R2 number in the agent's register. Never silently ")
W("reopen a row.")
W("")
W("Tier assignment:")
W("")
W("- **Tier 1** — a test references this id. Gate integrity is checkable offline: revert the fix ")
W("  hunk in a scratch worktree, run the test, confirm it fails at its own assertion.")
W("- **Tier 2** — no test, but the symptom is observable live (schema change, or a frontend ")
W("  surface). Needs Supabase / Render / browser.")
W("- **Tier 3** — neither. `UNVERIFIED` by default until a gate is written or the risk is ")
W("  accepted with a logged decision.")
W("")

tot = len(closed)
by_sev = defaultdict(int)
by_tier = defaultdict(int)
by_status = defaultdict(int)
for r in closed:
    by_sev[r["sev"]] += 1
    by_tier[r["tier"]] += 1
    by_status[r["status"]] += 1

W("## Tier 1 result — what the 176 regression pins actually gate")
W("")
W("Run by `scripts/verification/gatecheck.py`, which reconstructs each pin's assertion against ")
W("the fix commit's **first parent** — the unfixed tree — and re-evaluates it there. A pin that ")
W("holds pre-fix gates nothing.")
W("")
W("**The structural result comes before the individual ones.** `test_regression_pins.py` is 1037 ")
W("lines and 176 tests. It imports `pathlib` and nothing else. 174 of the 176 read a source file ")
W("as text and assert a substring is present or absent; one scans the filesystem for stock ")
W("photos; exactly one (`test_pin_R2_129_statutory_due_date_derivation`) imports application code ")
W("and calls it. There is no `TestClient` in the file and no HTTP request.")
W("")
W("So even a pin that passes this check proves only that **the edit is still textually present**. ")
W("It cannot show the code runs, is reached, or is correct. That is why every row below is ")
W("`UNVERIFIED` rather than `CONFIRMED`: passing gate integrity is necessary, not sufficient, and ")
W("behavioural evidence has to come from Tier 2.")
W("")
W("| Outcome | Pins | Meaning |")
W("|---|---|---|")
W("| `REAL_GATE` | 147 | the asserted text was absent pre-fix, so the pin would have failed. A ")
W("real guard against textual regression — no behavioural claim. |")
W("| `FAKE_GATE` | 5 confirmed | the assertion held pre-fix. Hand-checked against each fix ")
W("commit's diff. |")
W("| `EVIDENCE_CLOSE` | 3 | R2-001, R2-118, R2-428 — closed on the reading that the code was ")
W("already correct, so no fix commit exists and the pin necessarily passes pre-fix. Not a fake ")
W("gate; a closure with no independent evidence. |")
W("| `PARSE_FAIL` | 19 | the assertion is not a plain substring or `.count()` form. Not judged ")
W("here — needs reading by hand. |")
W("| `NO_COMMIT` | 1 | R2-218, closed as `FIXED (evidence)` with no sha anywhere. |")
W("")
W("**The five confirmed fake gates are all MEDIUM. No CRITICAL pin failed this check.** That is ")
W("a real, and reassuring, negative result — the highest-severity gates are textually sound.")
W("")
for _id in sorted(CONFIRMED_FAKE):
    W(f"- **{_id}** — {CONFIRMED_FAKE[_id]}")
W("")
W("Each of the five reopens as a **new** finding: the underlying fix may well be correct (R2-578's ")
W("403 and R2-351's second call site both read right), but nothing gates it, so a later edit ")
W("removes it silently. R2-077 is the sharpest: its pin watches a file the string never lived in.")
W("")
W("Not yet done at Tier 1: the 19 `PARSE_FAIL` pins, and the 138 closed findings with no pin at ")
W("all. See `docs/VERIFICATION_MIGRATION_AUDIT.md` for the schema half of the same question.")
W("")
W("## Counts")
W("")
W("| Cut | Value |")
W("|---|---|")
W(f"| Closed findings in scope | {tot} |")
for k in ("FIX_VERIFIED", "FIXED"):
    W(f"| status {k} | {by_status[k]} |")
for k in ("CRITICAL", "HIGH", "MEDIUM", "LOW"):
    W(f"| severity {k} | {by_sev[k]} |")
for k in (1, 2, 3):
    W(f"| Tier {k} | {by_tier[k]} |")
W(f"| has a test | {sum(1 for r in closed if r['test'] == 'yes')} |")
W(f"| has a regression pin | {sum(1 for r in closed if r['pin'] == 'yes')} |")
W("")
W("## Rows")
W("")
W("Ordered severity, then tier, then id — which is the order to work them.")
W("")
W("| R2 | SEV | STATUS | COMMIT | PRIMARY FILE | TEST? | PIN? | GATE | TIER | VERDICT | EVIDENCE |")
W("|---|---|---|---|---|---|---|---|---|---|---|")
for r in closed:
    if r["id"] in VERDICTS:
        verdict, ev = VERDICTS[r["id"]]
    else:
        verdict = "FAKE_GATE" if r["gate"] == "FAKE_GATE" else "UNVERIFIED"
        ev = CONFIRMED_FAKE.get(r["id"], "")
    W("| {id} | {sev} | {status} | `{sha}` | `{f}` | {test} | {pin} | {gate} | {tier} | "
      "{v} | {ev} |".format(
          id=r["id"], sev=r["sev"], status=r["status"], sha=r["sha"].strip("`"),
          f=r["file1"].strip("`") or "—", test=r["test"], pin=r["pin"], gate=r["gate"],
          tier=r["tier"], v=verdict, ev=ev))
W("")

with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
    fh.write("\n".join(lines))

print(f"wrote {OUT}: {tot} closed rows")
print("tiers:", dict(by_tier))
print("sev:", dict(by_sev))
print("tests referenced ids:", len(test_refs))
