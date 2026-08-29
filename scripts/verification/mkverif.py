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
    "R2-374": ("CONFIRMED", "Same defect and same resolution as R2-228/R2-248, verified in the "
               "same read. consolidated_pnl returns a single row with tower_id=None and "
               "tower_name='Overall Project' (towers.py:182-183, :212) rather than repeating the "
               "project's figures once per tower, because no document in the schema carries a "
               "tower_id. A three-tower project can no longer report its costs three times."),
    "R2-205": ("CONFIRMED", "Fix present on main. The finding's defect was that reporting "
               "material wastage did not reduce stock, so the material stayed on the books as "
               "available. wastage.py now does both halves of the write: it decrements the "
               "warehouse balance (inv.on_hand_qty = on_hand_qty - payload.quantity, :97) and "
               "records the movement in the ledger (MaterialTransaction, :98), with "
               "WarehouseInventory and MaterialTransaction imported at :10. Wasted material "
               "leaves the available balance."),
    "R2-245": ("CONFIRMED", "Fix present on main, and all three clauses of the finding are "
               "addressed. (1) Wastage can no longer exceed existing stock - wastage.py:75 calls "
               "enforce_stock_availability(db, project_id, material_name, quantity, 'Material "
               "Wastage') before writing. (2) It reduces stock - see R2-205, :97-98. (3) It "
               "reaches a financial report - MaterialWastage.estimated_value is summed into the "
               "P&L material cost (finance.py:549-552, verified while reading R2-327), and the "
               "field itself is bounded Field(None, ge=0) at :24."),
    "R2-187": ("CONFIRMED", "Fix present on main. The finding's defect was that pushing a bill to "
               "Zoho was not idempotent and nothing recorded that it had been pushed, so every "
               "click created another bill in the customer's accounting system. The push now "
               "refuses a repeat: zoho_books.py:543-545 raises 409 when bill.zoho_bill_id is "
               "already set, so the identifier both records the push and prevents the duplicate. "
               "The vendor-contact path has the same shape - a duplicate-name response (code "
               "3062) is resolved to the existing contact rather than creating another (:316)."),
    "R2-209": ("CONFIRMED", "Fix present on main. The finding's defect was that the Zoho bill "
               "push failed 100% of the time - no bill had ever reached Zoho. The cause was the "
               "gst_treatment element, which some Zoho organisations reject outright (error code "
               "8). zoho_books.py:258-292 now handles that explicitly: the element is included "
               "only when the organisation accepts it and omitted otherwise, under a comment "
               "stating that a rejected gst_treatment must not break the bill push."),
    "R2-392": ("CONFIRMED", "Duplicate of R2-209 and closed by the same change (the register "
               "records both against 5096c8a). The gst_treatment element is omitted for "
               "organisations that reject it rather than failing the push - see the R2-209 "
               "entry for the code."),
    "R2-189": ("CONFIRMED", "Fix present on main. The finding's defect was that push_bill had no "
               "permission check, unlike every other endpoint in the same file - it required only "
               "company membership while its sibling authorize required settings:manage. "
               "push_bill (zoho_books.py:506) now resolves membership AND calls "
               "require_permission(db, current_user, company_id, 'billing:edit'), so pushing a "
               "bill into the customer's accounting system is permission-gated like the rest of "
               "the module."),
    "R2-199": ("CONFIRMED", "Fix present on main, resolved by removing the false claim rather "
               "than by shipping delivery. The finding's defect was that 'Enable Push' reported "
               "success while subscribing to nothing, so push could never be delivered. "
               "PwaControls.tsx now does exactly what it says: handleEnableNotifications requests "
               "Notification permission and reports the real outcome - 'Notifications allowed on "
               "this device' or 'Notifications blocked' or 'Notifications are not supported "
               "here' - and the control is labelled 'Enable Notifications'. It no longer claims a "
               "subscription it did not create. Actual push delivery remains a feature awaiting "
               "the Firebase work already on the founder's open-items list, not a defect of this "
               "row."),
    "R2-166": ("CONFIRMED", "Fix present on main. The finding's defect was that the Attendance "
               "mobile header was clipped by an overflow:hidden ancestor, so its right-hand "
               "controls could not be reached at all. The header band now carries overflow-x-auto "
               "with shrink-0 (p/[project_id]/attendance/page.tsx:606), so at mobile width the "
               "controls scroll into reach instead of being cut off by the parent."),
    "R2-547": ("CONFIRMED", "Closed by the same remedy verified under R2-288 - the statutory "
               "payroll percentages are now bounded at the schema (settings.py:705-707: pf "
               "employee and employer 0-12, esi employee 0-1, pf_wage_ceiling ge=0), so the "
               "unbounded-rate class this row belongs to cannot be expressed. The register "
               "records both rows against e9139f1."),
    "R2-522": ("CONFIRMED", "Fix present on main. The finding's defect was that /statutory/{cid}/"
               "gstr1 read the PAYROLL table and returned wages and TDS, so the company's actual "
               "GST outward supply was absent. export_gstr1 (statutory.py:270-300) is now built "
               "from the sales invoice ledger - Bill filtered to REVENUE_INVOICE_TYPES, excluding "
               "Cancelled, windowed to the return period. The annotation also records the "
               "separation-of-duties point the finding raised: GST is a finance responsibility, "
               "not a payroll one, so a payroll clerk must not be the reader of the GST return."),
    "R2-523": ("CONFIRMED", "Fix present on main with a residual the register itself discloses. "
               "The employer split the finding named is implemented: statutory.py:380-384 caps PF "
               "wages at the Rs 15,000 ceiling, computes EPS as 8.33% of PF wages and EPF as the "
               "remainder of the employer contribution, built from the period's finalized "
               "payslips (:349-352). RESIDUAL, disclosed in the register row rather than hidden: "
               "'uan': 'NOT_LINKED' is still emitted at :386 because no UAN column exists on any "
               "model (confirmed - grep over models.py finds none), and the register note states "
               "it explicitly: 'RESIDUAL: UAN column does not exist (schema + HR write path "
               "needed)'. So the ECR's arithmetic is now correct but the file still cannot be "
               "submitted, since UAN is mandatory in an ECR. Not filed separately because the "
               "residue is tracked on the row - but the module remains non-functional for its "
               "stated purpose until the schema lands."),
    "R2-524": ("CONFIRMED", "Fix present on main. The finding's defect was that Form 26Q was "
               "built from the SALARY population, so it excluded the only 194C deduction the "
               "company actually had. export_tds_26q (statutory.py:414-450) is now built from the "
               "transaction deduction ledger - TransactionDeduction joined to Bill, filtered to "
               "deduction_type == 'TDS' and the company, over the quarter's real calendar window "
               "- so it reports the TDS actually deducted on non-salary payments rather than a "
               "salary-derived approximation."),
    "R2-257": ("CONFIRMED", "Fix present on main, and closed at the write path rather than by "
               "escaping on render. The finding was stored XSS - a timesheet file_url accepting a "
               "javascript: URL that the Team Action page renders as a clickable link. "
               "team_schedule.py:25-33 now validates the URL server-side against a scheme "
               "allowlist, requiring scheme == 'https' and a non-empty netloc and rejecting "
               "everything else, under a comment naming the exact exposure (an <a href> in the "
               "app's own origin). A javascript: URL cannot be stored."),
    "R2-132": ("CONFIRMED", "Fix present on main. The finding's defect was that every match was "
               "created as 'pending' so the matched/mismatch classification was unreachable in "
               "normal operation. three_way.py:174-177 now always computes the verdict at "
               "creation - match_status = 'matched' if abs(variance) <= tolerance else 'mismatch' "
               "- under an annotation stating the rule that the verdict is server-computed. The "
               "classification runs on every match rather than waiting for a transition nothing "
               "triggered."),
    "R2-133": ("CONFIRMED", "Fix present on main. The finding's defect was that the caller could "
               "dictate both the match verdict and who approved it - a financial control whose "
               "outcome and audit attribution were client-supplied. three_way.py:28 records that "
               "match_status and matched_by are server-computed, and :174-175 states the caller "
               "cannot supply or override match_status. The verdict is derived from the variance "
               "and the attribution from the authenticated caller."),
    "R2-538": ("CONFIRMED", "Same defect as R2-133's first half and closed by the same change. "
               "The finding caught POST /three-way computing the verdict correctly and then "
               "accepting the client's verdict instead, leaving a live record reading 'matched' "
               "against a Rs 7,17,777 variance. The computed value is now the only one written "
               "(three_way.py:174-177); there is no path by which a supplied match_status "
               "reaches the row."),
    "R2-240": ("CONFIRMED", "Fix present on main. The finding's defect was that the three-way "
               "match measured the invoice against goods RECEIVED with no cap on receipt, so "
               "over-receiving raised the amount a vendor could over-bill. three_way.py:138-141 "
               "now caps the baseline at what the PO actually authorises - min(received_qty, "
               "ordered - already received) x rate - under a comment noting that receipt "
               "quantities are gated upstream by R2-239 but that this control must not depend on "
               "that. The ordered quantity is also surfaced on the response (:45-48) so the three "
               "numbers the control is named after are visible."),
    "R2-228": ("CONFIRMED", "Fix present on main, resolved by honest refusal rather than a "
               "fabricated split. The finding's defect was that per-tower P&L credited every "
               "tower with the ENTIRE project's POs, work orders and billing. consolidated_pnl "
               "(towers.py:167) accepts an optional tower_id and returns a single Overall row "
               "with tower_id=None (:182, :212), under a comment recording the reason - no "
               "document in the schema carries a tower_id (CD-5), so per-tower attribution is not "
               "derivable. The product no longer presents project-wide figures as if they were "
               "one tower's."),
    "R2-248": ("CONFIRMED", "Same root cause and same resolution as R2-228, on the committed-"
               "towers report. The finding measured a project's spend being multiplied by its "
               "number of towers because every per-tower report ignored the tower and returned "
               "the whole project. The report now returns a single Overall row rather than one "
               "duplicate row per tower, so the multiplication is arithmetically impossible - and "
               "the underlying limitation (no tower_id on any document) is stated in code rather "
               "than papered over."),
    "R2-252": ("CONFIRMED", "Fix present on main. The finding's defect was that incident_type was "
               "unvalidated free text while the LTIF calculation matched it by exact string, so "
               "an incident typed 'Fatality' was excluded from safety statistics. safety.py:28 "
               "now constrains it at the boundary - Field(pattern='^(Near Miss|First Aid|LTI|"
               "Fatal)$') - so only the four vocabulary values the statistics match can be "
               "stored. A variant spelling is a 422 rather than a silently uncounted incident."),
    "R2-073": ("CONFIRMED", "Fix present on main. The finding's defect was privilege escalation "
               "through the intended admin UI: emptying a role's permissions granted FULL access, "
               "because an empty dict was treated as unconfigured and therefore allowed. auth.py "
               "now has an explicit empty_permissions_fail_closed helper (:145) consulted during "
               "permission resolution (:182), so an empty permission set denies rather than "
               "grants. Paired with the D7 behaviour verified under R2-113/R2-169, where a NULL "
               "or dangling role_id resolves to Viewer grants rather than to everything."),
    "R2-288": ("CONFIRMED", "Fix present on main. The finding's defect was that statutory payroll "
               "percentages were completely unbounded - a 999% PF deduction and a negative "
               "employer contribution both accepted. settings.py now bounds each at the schema: "
               "pf_employee_pct and pf_employer_pct are Field(None, ge=0, le=12) (:705-706) and "
               "esi_employee_pct is Field(None, ge=0, le=1) (:707), matching the statutory "
               "ceilings, with pf_wage_ceiling Field(None, ge=0) at :154. Negative and "
               "absurd-high rates are rejected before they can be stored."),
    "R2-389": ("CONFIRMED", "Fix present on main. The finding's defect was that the entire "
               "team-management module 500'd on every company because it read a column that does "
               "not exist. GET /settings/team/{company_id} (settings.py:604) now reads u.mobile "
               "(:626, and :680 on the sibling path), and User.mobile is a real column - "
               "models.py declares it String(20), unique, nullable, with a comment explaining "
               "that phone is no longer the sole identity so mobile is nullable. The column the "
               "query names exists."),
    "R2-462": ("CONFIRMED", "Fix present on main, and the coverage is complete. The finding "
               "measured twenty-one project module tabs navigating to /c/undefined/... . Same "
               "root cause and same fix as R2-198 - the redirect stubs read company_id off a "
               "params object that is a Promise under Next 15. Counted every redirect stub under "
               "p/[project_id]: 29 stubs, and 29 carry 'await (params instanceof Promise ? "
               "params : Promise.resolve(params))' with ZERO missing, so the 21 the finding named "
               "are a subset of a fully-swept set."),
    "R2-541": ("CONFIRMED", "Fix present on main. The finding's defect was thirteen settings "
               "write routes requiring company membership but no permission - including the route "
               "that replaces the signature and stamp printed on tax invoices. settings.py now "
               "carries 20 require_permission calls, so the writes are permission-gated rather "
               "than membership-gated. Membership alone no longer authorises changing what is "
               "printed on a statutory document."),
    "R2-126": ("CONFIRMED", "Fix present on main, and the fix is annotated with the principle. "
               "The finding's defect was that statutory returns were computed from TODAY'S master "
               "data rather than the return period's payroll, so any past-period return went "
               "wrong the moment salaries changed. auto_populate (statutory.py:124-160) now "
               "sources every figure from the PayrollLineItem rows of the finalized runs whose "
               "payroll_month equals return_period, and REFUSES to generate when no finalized run "
               "exists for that period - 'Finalize payroll for the period before generating a "
               "statutory return.' A return is now a snapshot of the period it claims to "
               "describe."),
    "R2-127": ("CONFIRMED", "Fix present on main, closed by the same rework as R2-126. The "
               "finding's defect was that ESI was charged for every employee if ANY single "
               "employee was ESI-applicable, overstating the liability in a filed return. "
               "Applicability is now settled per employee inside payroll when the payslip is "
               "computed, and the statutory return carries those per-employee amounts verbatim "
               "(statutory.py:39-43, annotated). The per-employee determination itself is the "
               "gross-wage test verified under R2-197."),
    "R2-128": ("CONFIRMED", "Fix present on main. The finding's defect was that BOCW cess was "
               "levied on wages instead of the cost of construction - the wrong statutory base "
               "for a construction ERP. statutory.py:45-55 now computes it as 1% of the "
               "bill ledger for the period, filtered to purchase and subcon invoice types, "
               "under a comment citing the BOCW Cess Act and naming the base explicitly ('levies "
               "1% on the cost of construction, not on the wage bill'), using the same ledger "
               "base as labour/bocw per R2-415."),
    "R2-283": ("CONFIRMED", "Fix present on main. The finding's defect was that every statutory "
               "write 500'd because the code passed a column that does not exist, so PF, ESI, "
               "BOCW and TDS returns could not be filed at all. The schema issue is fixed and "
               "annotated at statutory.py:66 with the root cause - Optional[X] without a default "
               "is REQUIRED in Pydantic v2, which is what produced the failure - and the create "
               "path now assigns created_at explicitly (:201). The module can create records."),
    "R2-515": ("CONFIRMED", "Fix present on main. The finding's defect was that the offline punch "
               "queue was DELETED rather than transmitted, while printing 'Synced N queued "
               "punches successfully'. flushQueue (p/[project_id]/attendance/page.tsx:491-535) "
               "now POSTs each queued punch to /hr/attendance/punch, counts synced and failed "
               "separately, and - the part that matters - pushes any punch that fails, errors or "
               "lacks an employee/project id into a `remaining` list that is kept rather than "
               "discarded. A punch the server never accepted is no longer reported as synced and "
               "no longer lost."),
    "R2-171": ("CONFIRMED", "Closed by the same root fix verified under R2-172. The finding's "
               "defect was two seeded roles holding nine permission keys absent from the "
               "taxonomy, making those roles unsaveable. WORKFLOW_MODULES now carries 16 modules "
               "(permissions.py:46-62) so every preset-emitted key is representable, and "
               "backend/tests/coverage/test_r2_172_preset_keys_representable.py pins that no "
               "DEFAULT_ROLE_PRESETS key falls outside ALL_PERMISSION_KEYS. Production probe "
               "under R2-172 found zero stored keys outside the canonical set across all 24 "
               "roles."),
    "R2-337": ("CONFIRMED", "Closed by the same change verified under R2-511, and verified "
               "against the deployment rather than the repo. The finding's defect was that the "
               "rate limiter keyed on Render's internal proxy address, so every user shared one "
               "rotating bucket. backend/Dockerfile:35 runs uvicorn with "
               "--forwarded-allow-ips='*' so the real client address is trusted, and "
               "_auth_limit_key (auth.py:34) composes that address with the identifier being "
               "authenticated. E3: the Render service builds from backend/Dockerfile with an "
               "EMPTY Docker Command override, so that CMD is what actually runs."),
    "R2-458": ("CONFIRMED", "Fix present on main. The finding's defect was that the 14-day "
               "lookahead excluded overdue open work, so a task 23 days late at 75% appeared in "
               "no forward schedule. get_lookahead (planning.py:285-310) now ORs a second branch "
               "into the window filter - and_(Task.end_date < window_start, Task.status != "
               "'completed') - under a comment citing R2-458 and stating the rule: overdue work "
               "stays visible until it is actually done."),
    "R2-477": ("CONFIRMED", "Fix present on main, and swept rather than patched at one site. The "
               "finding's defect was that the 'Restrict creating entries older than N days' "
               "setting was enforced on three write paths and silently ignored by every other "
               "dated write. enforce_entry_creation_window is now called 23 times across NINE "
               "routers - billing, dpr, equipment, finance, hr, planning, procurement, quality "
               "and subcon_attendance - so the setting governs the dated writes it claims to "
               "govern."),
    "R2-178": ("CONFIRMED", "Fix present on main. The finding's defect was an approval-rules "
               "screen offering 15 categories of which only 2 were consulted by any code, so 13 "
               "configured nothing. The category list is now derived from a single canonical "
               "source - settings.py:20 imports APPROVAL_FEATURE_TYPES from app/approvals.py and "
               ":196 types the field as Literal[tuple(APPROVAL_FEATURE_TYPES)] - so a category "
               "that no engine consults cannot be offered or stored. Annotated at :193."),
    "R2-226": ("CONFIRMED", "Closed by the same guard verified LIVE under R2-300 and R2-557. The "
               "finding's defect was that project deletion was fire-and-forget - the response "
               "never checked on the most destructive action in the product. The endpoint now "
               "refuses without an explicit confirmation naming the project: observed live "
               "2026-08-28 returning 400 'This permanently deletes 2 dependent record(s) (tasks: "
               "2) and cannot be undone. Retry with confirm=...', then succeeding only with "
               "?confirm=<exact name> and returning {'success': true, 'deleted_dependents': 2}."),
    "R2-557": ("CONFIRMED", "Same guard as R2-226 and R2-300, verified live in the same "
               "observation. The finding's defect was a cascade to 51 child tables with no "
               "warning, no impact count and no way back. The refusal now NAMES the impact "
               "('deletes 2 dependent record(s) (tasks: 2)') before anything is destroyed and "
               "requires ?confirm=<project name> to proceed, and the response reports "
               "deleted_dependents so the caller learns the actual scope."),
    "R2-487": ("CONFIRMED", "Fix present on main. The finding's defect was that raising a bill "
               "against a party never linked that party to the project, so the project's Party "
               "register was empty and reported Rs 0 payable against Rs 1,35,700 of unpaid bills. "
               "billing.py:1183 now calls ensure_project_party_link(db, req.project_id, "
               "bill_team.library_party_id) on bill creation (imported at :18), so the party "
               "appears on the project register as soon as it is billed."),
    "R2-246": ("CONFIRMED", "Fix present on main. A Critical NCR can no longer be closed straight "
               "from open: close_ncr (quality.py:432-452) rejects with 400 'NCR must be reviewed "
               "before it can be closed' unless status is under_review, rejects an already-closed "
               "NCR, and records both closed_at and closed_by. The intermediate transition exists "
               "and is itself gated - ncr_under_review (:409-419) admits only open NCRs - so the "
               "review step cannot be skipped and the reviewer is recorded."),
    "R2-362": ("CONFIRMED", "Fix present on main, and fixed at the right layer. The finding's "
               "defect was that an inspection's pass/fail summary was computed from the CURRENT "
               "request, so a failed inspection became a pass by submitting one passing response. "
               "The summary is now recomputed from storage: quality.py groups InspectionResponse "
               "by result for the whole inspection_id and derives pass_count, fail_count and "
               "na_count from that aggregate, then sets status (pass only when fail_count is 0, "
               "fail when pass_count is 0, otherwise partial), under a comment citing R2-362. A "
               "single late response can no longer overwrite the verdict."),
    "R2-437": ("CONFIRMED", "Fix present on main. The finding's defect was that the funnel's "
               "expected status vocabulary and the CRM's shipped vocabulary were disjoint sets, "
               "so no lead could advance past stage 1. reports/[slug]/page.tsx:897-906 now "
               "carries an annotation naming the eight statuses crm.py DEFAULT_STATUSES actually "
               "ships (New Lead, Follow-Up, Proposal Stage, Converted, Won, Lost, No Response, "
               "Irrelevant Lead), and every stage filter accepts the shipped names alongside the "
               "legacy ones - Follow-Up and Proposal Stage and Converted now match - cumulative "
               "down the funnel with dead ends excluded. Verified the backend list independently "
               "at crm.py:471."),
    "R2-448": ("CONFIRMED", "Fix present on main. The finding's defect was that the project "
               "dashboard dropped the expense and payment_in invoice types entirely, so those "
               "amounts appeared in no tile. The page now declares the canonical buckets as "
               "module constants - EXPENSE_INVOICE_TYPES = purchase, subcon, expense, equipment "
               "(:66) and MONEY_IN_VOUCHER_TYPES = payment_in, i_received (:67) - and classifies "
               "against them, so every canonical type lands in a tile rather than falling through "
               "an unenumerated branch."),
    "R2-455": ("CONFIRMED", "Fix present on main, and fixed at the authoritative layer. The "
               "finding's defect was that every comment and progress entry was written under a "
               "hardcoded fictional identity while the server stored whatever name and user id "
               "the client sent. create_task_comment (planning.py:735-752) now stamps "
               "user_name=current_user.name from the authenticated caller, after resolving "
               "membership and requiring planning:edit. The client can no longer choose who "
               "authored an entry."),
    "R2-456": ("CONFIRMED", "Fix present on main, and it does what the finding asked rather than "
               "renaming the button. The measured quantity now reaches Task.progress: the client "
               "sends progress_qty_added on the comment payload (gantt/page.tsx:426-441), and "
               "the server converts it (planning.py:756-790) by summing every comment's "
               "progress_qty_added for the task and dividing by the LINKED BOQ item's contracted "
               "quantity, clamped to 0-100, writing task.progress and setting status to "
               "'completed' at 100%. The measurement book records a measurement again."),
    "R2-459": ("CONFIRMED", "Fix present on main. The task card now renders the state the finding "
               "said was missing: gantt/page.tsx:818 computes a clamped completion percentage "
               "from task.progress, and :819-820 derives overdue as status != 'completed' AND an "
               "end_date in the past. A 75%-complete task 23 days late is no longer visually "
               "identical to a fresh one."),
    "R2-464": ("CONFIRMED", "Fix present on main. The finding's headline was that the drawings "
               "module contains ZERO file inputs, so 'Upload New Revision' attached the first "
               "existing revision's file to the new one. d/drawings/page.tsx now contains a file "
               "input, so a revision can carry its own uploaded sheet rather than inheriting "
               "another's."),
    "R2-469": ("CONFIRMED", "Same defect as R2-270 and closed by the same change - the console "
               "sent a users.id into ChatGroup.created_by, a foreign key to company_team.id, "
               "producing a CORS-less 500 on every group creation. The client no longer sends the "
               "field (d/chat/page.tsx:195, annotated) and the server stamps it from the "
               "canonical company_team resolver (chat.py:144-155). The CORS half is separately "
               "closed by R2-194's handler, so even an unexpected 500 now reaches the browser as "
               "a status code."),
    "R2-473": ("CONFIRMED", "Fix present on main. The finding's defect was that 'Today's "
               "Attendance' opened on a hardcoded date literal so today's punches never showed. "
               "p/[project_id]/attendance/page.tsx:161 now initialises the date from the clock - "
               "useState(new Date().toISOString().split('T')[0]) - so the screen opens on the "
               "actual current day."),
    "R2-476": ("CONFIRMED", "Fix present on main, and both halves of the finding are addressed. "
               "The drawer no longer ships fifteen invented workers - it starts empty and refuses "
               "to submit without real input ('No crew rows with a worker count entered. Add a "
               "row and enter the worker count before saving.', :550). And it no longer posts "
               "without checking responses: results are counted per row and a partial failure is "
               "reported honestly while the drawer stays open for retry (:587), rather than "
               "reporting success for rows that failed."),
    "R2-482": ("CONFIRMED", "Fix present on main and centralised. The M5 cement factor is 2.77 "
               "(frontend/src/lib/calc-shared.ts:287, M5: [2.77, 0.48, 0.96]), the corrected "
               "value replacing the 3.2 the finding measured as inconsistent with the declared "
               "mix ratio and 1.54 dry factor. The calculators page imports the shared module "
               "(:21) rather than holding its own literals, and the page states the single-source "
               "intent at :238. OBSERVATION, not filed: frontend/src/lib/ contains TWO "
               "byte-identical 30913-byte copies of this module - calc-shared.ts and "
               "calcShared.ts - and only calc-shared.ts is imported. The unused twin is dead code "
               "today, but it holds the same calculation constants, so a future correction "
               "applied to the wrong file would silently not ship. Worth deleting during "
               "cleanup."),
    "R2-490": ("CONFIRMED", "Fix present on main. The finding measured TOTAL OUT Rs 0.00 printed "
               "above a table of Rs 1,41,600 of outflows, with four tiles using three different "
               "bases. transaction/page.tsx:214 now applies ONE classification covering every "
               "canonical invoice_type, explicitly mirroring the backend buckets, and :308 "
               "records the deliberate contract for the tiles - they are labelled as cash because "
               "they count cash movements, settlement vouchers plus folded-in Payment records "
               "(:213-216). The tiles and the table below them are computed from the same "
               "classification."),
    "R2-447": ("CONFIRMED", "PROVED LIVE. The finding's claim was that /planning/tasks/company/"
               "{cid} - the only source of tasks for the Team Schedule screen - returns 500, so "
               "the screen renders '0 tasks' and 'Loading schedule...' permanently. E3 2026-08-28 "
               "against AK Construction: the endpoint returns 200 with 1458 bytes of real task "
               "rows (the 19s latency was Render cold-start tail, not the endpoint). The route is "
               "declared at planning.py:240 with response_model List[CompanyTaskResponse]. Team "
               "Schedule has a populated source again."),
    "R2-214": ("CONFIRMED", "Fix present on main. The finding's defect was that the green "
               "'Auditor Approve' button only mutated local state - it approved nothing. "
               "handleApproveBill (d/billing/page.tsx:424-426) is now async and POSTs to a real "
               "endpoint, /apis/v3/billing/bills/{id}/approve, wired to the same button (:708). "
               "The backend side of that endpoint was verified separately under R2-343's second "
               "clause: approval is permission-gated (billing:approve), 409s a cancelled bill, "
               "and settlement now requires an approved bill (R2-346)."),
    "R2-215": ("CONFIRMED", "Fix present on main. The finding's defect was that 'Record Usage' "
               "decremented stock on screen with a client-generated id (TXN-${Date.now()}) and "
               "saved nothing. The handler now POSTs to /apis/v3/procurement/transactions "
               "(d/procurement/page.tsx:489), so the consumption reaches the server. That "
               "endpoint is also the guarded consume path verified under R2-380 - it enforces "
               "negative_stock_lock before writing."),
    "R2-270": ("CONFIRMED", "Fix present on main. The finding's defect was that the console sent "
               "a users.id into ChatGroup.created_by, a column referencing company_team, so "
               "group creation always failed. The client no longer sends the field at all - "
               "d/chat/page.tsx:195 carries the annotation explaining that created_by references "
               "company_team.id rather than users.id - and the server stamps it from the "
               "canonical resolver instead (chat.py:144-155, verified under R2-468). The client "
               "cannot supply a value in the wrong id space because it supplies none."),
    "R2-416": ("CONFIRMED", "Fix present on main. The finding's defect was that the "
               "company-level Finance dashboard gated its data effect on a project being "
               "selected, so it never loaded at company scope. The data effects at "
               "d/finance/page.tsx:382 and :736 are now both gated on 'if (companyId)', not "
               "projectId. The one remaining ungated effect (:372) only reads the tab from the "
               "query string and touches no data."),
    "R2-423": ("CONFIRMED", "Fix present on main. The four fabricated projects with invented "
               "clients and personnel are gone: dashboard/page.tsx:166 initialises projects as "
               "useState<any[]>([]) - an empty array - so a failed fetch renders an honest empty "
               "state rather than fiction. A grep for the invented project names and for any "
               "fallback/demo seed array returns nothing."),
    "R2-426": ("CONFIRMED", "Fix present on main. The '+ Create Demo Request' button that "
               "created a genuine Rs 45,000 payment request against a real party is gone - a "
               "grep for 'Demo Request' across d/payment-approval/page.tsx returns nothing, so "
               "both the control and its handler were removed rather than merely hidden."),
    "R2-434": ("CONFIRMED", "Fix present on main. The finding's defect was that every inspection "
               "was attributed to a hardcoded fictional inspector, offered as the only filter "
               "choice. d/quality/page.tsx:213 now maps the inspector from the record - "
               "insp.inspected_by, with an em-dash when absent rather than a fabricated name - "
               "and the filter options are derived from the actual data (:430 builds a Set over "
               "the mapped inspections, excluding the em-dash placeholder). The server owns the "
               "field per the register (fda5bd0, inspected_by server-owned)."),
    "R2-435": ("CONFIRMED", "Fix present on main. The finding's defect was that every drawing pin "
               "was rejected 422 because the console supplied created_by, and the failure was "
               "swallowed behind a local-only pin. The client no longer sends it - "
               "d/drawings/page.tsx:198 carries the annotation that created_by is derived "
               "server-side from the authenticated user - and the POST body now carries only the "
               "pin's own fields (:204 x_coordinate etc.), so the 422 cannot recur."),
    "R2-173": ("CONFIRMED", "Fix present on main. The finding measured the project Transaction "
               "page reporting Rs 0 received while the server reported Rs 90,000 in. The page now "
               "sources the company finance summary directly - fetch(getApi('/finance/"
               "transactions/{cid}')) at p/[project_id]/transaction/page.tsx:165 - and folds "
               "recorded Payment rows into the cash heads (:213-216) rather than counting "
               "settlement vouchers alone. Two annotations pin the intent: :308 (R2-490) states "
               "the In/Out tiles are deliberately labelled as cash, and :318 (R2-173) states the "
               "page must never present voucher-only cash tiles as if they were complete."),
    "R2-396": ("REGRESSED", "PARTIAL FIX. The guard is real and correct where it landed - "
               "reports/[slug]/page.tsx:669-670 defines csvSafeCell, documented as byte-identical "
               "to the backend _csv_safe_cell, and applies it to every cell before quoting "
               "(:780). It is applied to exactly ONE of the FIVE frontend CSV builders. Measured "
               "2026-08-28: csvSafeCell refs are 2 in reports/[slug]/page.tsx and 0 in "
               "reports/page.tsx, d/finance/page.tsx, d/team-action/page.tsx and "
               "projects/page.tsx. All four unprotected builders use quote-doubling only "
               "(String(x).replace(/\"/g, '\"\"') wrapped in quotes), which protects the "
               "delimiter and not the formula - the exact distinction R2-407 established. "
               "projects/page.tsx exports name, code and city, the very fields proved to carry a "
               "live =HYPERLINK payload through an export in R2-743. Filed as R2-755; this is the "
               "frontend twin of that backend finding, same shape - one correct helper, applied "
               "at one call site."),
    "R2-181": ("CONFIRMED", "Fix present on main. The finding's claim was that no code path "
               "anywhere creates a CompanyTeam row by invitation, so a tenant could only ever "
               "have one member. A real two-step flow now exists: POST /auth/team/invite "
               "(auth.py:964) creates or reuses the user by email and attaches the membership, "
               "and POST /auth/team/invite/accept (:1055) proves mailbox control via a code "
               "before the membership becomes usable - the design is documented at :945-950. "
               "CROSS-REFERENCE: this endpoint resolves its company from the JWT claim rather "
               "than a path or payload, which is why a post-switch invite lands in the previous "
               "company - filed separately as R2-746. The flow exists; which tenant it writes to "
               "is the open question."),
    "R2-221": ("CONFIRMED", "Same defect and same site as R2-244 and R2-356 - naive utcnow() "
               "subtracted from an aware EquipmentDeployment column, 500ing /finance/pl whenever "
               "any deployment is open. finance.py:568-585 takes recorded hours when present and "
               "normalizes both operands to aware UTC for the still-deployed fallback, under the "
               "R2-727 annotation. Verified in the same read as R2-244."),
    "R2-231": ("CONFIRMED", "Closed by e9dba8b (on main), the same commit verified under R2-042 "
               "and R2-345. The finding's claim was that the only settlement engine is "
               "unreachable, so every invoice stays permanently Unpaid with paid_amount 0. "
               "Settlement no longer requires a party: finance.py:259-269 scopes candidates by "
               "company always, project when present, and invoice direction (REVENUE for in, "
               "EXPENSE for out), applying the party filter only when one is supplied. The engine "
               "is reachable from the UI payload as it actually ships."),
    "R2-235": ("CONFIRMED", "Closed by the shared helper verified under R2-509 and R2-726. The "
               "finding named three call sites computing a balance that subtracts receivables. "
               "_net_balance (finance.py:890-894) now computes advance_paid + to_receive - "
               "advance_received - to_pay, and all three sites call it - :951 per-party, :1103 "
               "per-company rollup, :1122 consolidated total - so the sign cannot diverge between "
               "them. Corroborated live: AK Construction sums to -606754, which is 196000 - "
               "802754 under the corrected sign."),
    "R2-243": ("CONFIRMED", "Fix present on main and it is the change that closed R2-327's "
               "headline. finance.py:543-548 excludes subcon from the material bucket "
               "(Bill.invoice_type != 'subcon') under a comment citing R2-243 and explaining that "
               "EXPENSE_INVOICE_TYPES contains subcon, so subcontractor bills are counted once - "
               "in subcon_actual - rather than twice. NOTE: the P&L still misallocates other "
               "heads (equipment bills, Overhead), filed as R2-749 while verifying R2-327; that "
               "is a partition defect, not the double-count this row names."),
    "R2-123": ("CONFIRMED", "Fix present on main. The finding's claim was that three modules "
               "ignore the Library Hub in favour of hardcoded fiction. Five frontend modules now "
               "wire real library endpoints (finance, hr, library, procurement, dashboard), and a "
               "grep for the invented-list pattern - a module-level const array of MATERIALS / "
               "PARTIES / COST_CODES / VENDORS - returns nothing, so the fabricated dropdown "
               "sources are extinct rather than merely bypassed."),
    "R2-139": ("CONFIRMED", "Fix present on main, both halves. The greedy mount is gone: "
               "main.py:680 includes the router with prefix='/apis/v3/delete-logs' rather than at "
               "the API root, so @router.get('/{company_id}') can no longer swallow arbitrary "
               "single-segment paths under /apis/v3. And the path is UUID-typed - company_id: "
               "uuid.UUID (delete_logs.py:64) - so a non-UUID segment is a FastAPI 422 at the "
               "boundary instead of an unhandled ValueError reaching the handler and 500ing."),
    "R2-194": ("CONFIRMED", "Verified while confirming R2-236. main.py:600-619 registers an "
               "@app.exception_handler(Exception) that returns a generic 'Internal server error' "
               "detail - no internals leak - with CORS headers attached only when the request "
               "origin is in the whitelist, so allow_credentials stays valid. The handler's own "
               "comment explains the mechanism the finding identified: ServerErrorMiddleware sits "
               "OUTSIDE CORSMiddleware, so a bare 500 reached the browser without CORS headers "
               "and surfaced as an opaque network failure rather than a status code."),
    "R2-300": ("CONFIRMED", "Verified LIVE, incidentally, while cleaning up the R2-565 probe. "
               "Deleting a project with dependents returned 400 with a per-type inventory - "
               "'This permanently deletes 2 dependent record(s) (tasks: 2) and cannot be undone. "
               "Retry with confirm=...' - and the delete only proceeded once the confirmation "
               "naming the project was supplied, returning {'success': true, "
               "'deleted_dependents': 2}. The finding's requirement (refuse, name what would be "
               "destroyed, require explicit confirmation) is met end to end."),
    "R2-116": ("CONFIRMED", "Closed by the same change verified under R2-310. The unbounded "
               "refetch loop is structurally impossible: authHeaders is useMemo'd on "
               "[accessToken] (delete-logs/page.tsx:65-68) so it is a stable reference rather "
               "than a fresh object each render, fetchLogs is useCallback'd on primitives plus "
               "that stable value (:70-96), and the effect is keyed to the callback (:99-101). "
               "The new-object -> new-callback -> effect -> setState -> render chain is broken at "
               "its first link."),
    "R2-137": ("CONFIRMED", "Class row, measured rather than sampled - and the register's own "
               "note for this row says the class is STILL OPEN, which is now out of date. "
               "Re-measured 2026-08-28 with scripts/verification/okelse.py (self-tested against a "
               "known-fixed file and a synthetic silent handler): of 244 write controls, 230 "
               "surface a failure (94.3%) and 6 do not (2.5%), against the 219-of-307 the finding "
               "recorded. The 6 survivors were hand-read and filed as R2-752, which is the "
               "instance list this class row has never carried - two of them are the "
               "payment-request Request Approval and Mark as Paid buttons."),
    "R2-481": ("REGRESSED", "PARTIAL FIX. The finding named TWO configuration surfaces feeding "
               "nothing - the Holiday Calendar AND Weekly Off. Weekly Off is genuinely fixed: "
               "run_payroll calls _working_days_in_month(payload.payroll_month, "
               "company.weekly_off_days) at hr.py:738-739, and that helper (:634-647) walks the "
               "real calendar month excluding configured off-days, with a docstring citing "
               "R2-481. The Holiday Calendar is NOT: _working_days_in_month takes exactly two "
               "arguments and its body never queries Holiday, and run_payroll subtracts no "
               "holidays anywhere. The model is imported (:33) and the calendar has full CRUD "
               "(:1630-1690), but no payroll path reads it. This costs money in a specific "
               "direction: a declared holiday reduces days_present (nobody punches, and a holiday "
               "is not approved_leave_days, which counts only LeaveRequest rows) while "
               "days_in_month is unchanged, so the pro-rata ratio drops and a paid holiday is "
               "silently unpaid. Filed as R2-754. Also unresolved: run_payroll still honours a "
               "caller-supplied days_in_month when passed (:736), though it is now bounded ge=1 "
               "le=31 by R2-354 and no longer defaults to 26."),
    "R2-527": ("CONFIRMED", "Off-main row, fix present on main. employee_id is now mandatory - "
               "LeaveRequestCreate declares employee_id: uuid.UUID (hr.py:1053) with no default - "
               "under a comment restating the exact harm the finding measured: an optional id let "
               "one approved leave be counted against every employee sharing the name while the "
               "id-keyed employee lost name-matched rows entirely, because the two lookups were "
               "consumed either/or. The comment also records that legacy NULL-id rows are "
               "backfilled once by unambiguous name."),
    "R2-528": ("CONFIRMED", "Off-main row, fix present on main. The finding's defect was that "
               "leave status was an unvalidated str, so any casing other than exactly 'Approved' "
               "removed the leave from every balance while the record still read as approved. "
               "LeaveStatusUpdate now declares status: LeaveStatus (hr.py:1078-1079) - a "
               "constrained type rather than a free string - so a variant casing is rejected at "
               "the boundary instead of silently creating a leave that displays approved and "
               "counts nowhere."),
    "R2-529": ("CONFIRMED", "Off-main row, fix present on main. approve_timesheet now writes the "
               "approver - ts.approved_by = current_user.id at hr.py:601 - populating the column "
               "the finding noted existed on the model but was never set, so an approved "
               "timesheet carries who approved it."),
    "R2-561": ("CONFIRMED", "Off-main row, fixed by removing the disagreement rather than "
               "reconciling it. The finding's objection was that an entry carried three "
               "independent representations of the same time (hours, start/end, duration) and the "
               "server cross-validated none, taking duration from the client verbatim. duration "
               "is now always DERIVED server-side and any client-supplied value is discarded "
               "(hr.py:484-486, and the schema comment at :182-183 states the same), with end <= "
               "start rejected rather than persisted as a negative duration. Three "
               "representations can no longer disagree because only one is authoritative."),
    "R2-564": ("CONFIRMED", "Off-main row, fix present on main. The finding's defect was that a "
               "failed timesheet header left the handler continuing with a fabricated id, "
               "silently discarding the hours the user typed and showing neither error nor "
               "success. hr/page.tsx:639-645 now returns on failure after surfacing the server's "
               "detail, under a comment naming the change - 'no fabricated fallback id. Surface "
               "the server detail and keep the drawer (and the user's typed hours) intact'. The "
               "typed input is preserved rather than lost."),
    "R2-386": ("CONFIRMED", "Off-main row, fully fixed and VERIFIED IN THE DATABASE, which is the "
               "only check that settles this finding - its claim was that not a single composite "
               "UniqueConstraint exists anywhere, leaving three document-number guards as "
               "check-then-insert races. models.py now declares ELEVEN, and E0 2026-08-28 "
               "confirms all eleven are live in production (pg_constraint, contype u, "
               "array_length(conkey) > 1): bills(company_id, invoice_number), "
               "company_team(company_id, user_id), goods_receipt_notes(company_id, grn_number), "
               "library_cost_codes(company_id, code), material_indents(company_id, "
               "indent_number), ncrs(project_id, ncr_number), payments(company_id, "
               "reference_number), payroll_runs(company, project, month), "
               "purchase_orders(company_id, po_number), three_way_matches(po_id, grn_id), "
               "work_orders(company_id, wo_number). The model list and the database list match "
               "exactly, so every document-number race the finding named is now decided by "
               "Postgres. NOTE for R2-731's context: these constraints DID reach production, so "
               "whatever path applied them worked, even though the supabase/migrations runner "
               "gap that finding describes is real."),
    "R2-354": ("CONFIRMED", "Off-main row, both halves fixed. The finding's defect was a pro-rata "
               "ratio that was uncapped AND divided by a caller-supplied divisor, so a normal "
               "month could pay 115%. hr.py:669 now reads ratio = min(1.0, days_present / "
               "days_in_month), capped, under a docstring at :654 stating the reason - attendance "
               "above days_in_month can never push pay above full. The divisor is also bounded at "
               "the schema: days_in_month is Field(None, ge=1, le=31) at :230, so a caller cannot "
               "supply a divisor small enough to inflate the ratio or zero enough to divide by."),
    "R2-355": ("CONFIRMED", "Off-main row, fix present on main. The finding's defect was that "
               "payroll_month passed its regex (which accepts any two digits as a month) and then "
               "crashed the request. A field_validator now rejects an impossible month before any "
               "work happens: hr.py:236-245 _payroll_month_is_real_month raises "
               "'payroll_month must be a real month in YYYY-MM format, e.g. 2026-06', so "
               "2026-13 is a 422 rather than a 500."),
    "R2-343": ("CONFIRMED", "Off-main row, fix present on main. The Finance tab no longer labels "
               "every transaction 'Approved': finance.py:1247 sets status=(p.approval_flag or "
               "'pending') under a comment naming the harm - 'not a hardcoded Approved that "
               "misreports unreviewed money'. The finding's second clause - that nothing gates on "
               "the flag anyway - is also addressed elsewhere and verified separately: settlement "
               "now requires an approved bill (R2-346, finance.py:261) and goods receipt requires "
               "an approved PO (R2-239/R2-432)."),
    "R2-414": ("CONFIRMED", "Off-main row, fix present on main. The finding's objection was that "
               "a 0% pass rate asserts failure where there is simply no data. reports.py:140 now "
               "returns None rather than 0 when nothing was assessed - quality_tests_pass_rate = "
               "int(...) if quality_tests_assessed else None - so the absence of tests is "
               "reported as absence rather than as a total failure."),
    "R2-417": ("CONFIRMED", "Off-main row, same endpoint and same defect as R2-236, verified in "
               "the same live check. GET /finance/ledger returned 200 with 2838 bytes of real "
               "rows for project a1376092 on 2026-08-28, where both findings recorded a 500. The "
               "finding's second clause - that the failure was indistinguishable from being "
               "offline in the browser - is closed by the R2-194 exception handler "
               "(main.py:600-619), which attaches CORS headers to the 500 when the origin is "
               "whitelisted so a server error presents as a status code rather than a network "
               "failure."),
    "R2-318": ("CONFIRMED", "Off-main row, fix present on main. The finding's mechanism was that "
               "_rep_gstr2_purchase built its rows from TWO sources into one list - the expense "
               "bill and the payment settling it - so every settled expense was counted twice and "
               "the purchase return overstated. The builder now sources bills ONLY: a single "
               "query over Bill filtered to EXPENSE_INVOICE_TYPES and status != 'Cancelled', with "
               "the project filter applied when present. No Payment query contributes rows, so a "
               "settlement can no longer add a second line for money already represented by its "
               "invoice."),
    "R2-320": ("CONFIRMED", "Off-main row, fix present on main. The finding's defect was that "
               "money-in and money-out were mixed in one row, with 'Amount Paid' counting only "
               "receipts. _rep_project_wise_payment_summary now partitions explicitly before "
               "aggregating - receipts = [p for p in ps if p.payment_type == 'in'] and payouts = "
               "[p for p in ps if p.payment_type == 'out'] - so the two directions are summed "
               "separately rather than conflated."),
    "R2-321": ("CONFIRMED", "Off-main row, fixed by honest omission rather than by inventing "
               "data, which is the right call here. The finding said the builder ignores the "
               "project filter and can never populate an invoice number or amount. Both are now "
               "addressed openly: an explicit pid returns [] with a comment explaining WHY no "
               "line can belong to a project (quotation lines hang off CRMLead, which carries no "
               "project linkage), instead of silently returning the whole company; and the "
               "columns with no backing data are documented and omitted rather than emitted "
               "blank. OBSERVATION, not filed: that comment's premise 'nor does Bill reference "
               "quotations' is now STALE - Bill.quotation_id exists on the model (added by "
               "R2-360, ea6d6e0), so this report could be re-sourced from real invoices and gain "
               "the invoice number and amount it currently lacks. That is an improvement "
               "opportunity, not a defect: the report misstates nothing today."),
    "R2-322": ("CONFIRMED", "Off-main row, fixed by removal, with the reasoning recorded in "
               "code. The finding's defect was that every Party Ledger row attributed itself to "
               "the counterparty ('Creator Name': party_name). The column is now absent from the "
               "party-ledger row entirely, under a comment stating why: no ledger source (Bill, "
               "Payment, DebitNote, CreditNote, PayrollLineItem) carries a created-by column, so "
               "the true creator is unrecoverable and an honest empty beats a fabricated "
               "attribution. The one surviving 'Creator Name' in the file (:574) is on the "
               "payment-request report, where it is resolved from a real user."),
    "R2-323": ("CONFIRMED", "Off-main row, fix present on main. The running balance is no longer "
               "keyed on the material name alone: bal_key = (m.project_id, m.material_name, "
               "m.unit) at reports.py:993, so two projects holding the same material, or the same "
               "material in different units, no longer share one accumulator. The row also emits "
               "the project name, so the dimension the balance is keyed on is visible in the "
               "output."),
    "R2-324": ("CONFIRMED", "Off-main row, and this is the widened version of R2-312 - its claim "
               "was that the swallow is not sixteen builders but all twenty-four, because the "
               "outer handler catches whatever the inner ones miss. Verified as a class with a "
               "self-tested AST pass (validated against a synthetic silent swallow and a "
               "synthetic logged one): of 24 _rep_* handlers, ZERO swallow broadly without "
               "logging or a failure marker, and the outer dispatch converts a failed handler "
               "into an entry in the response's errors[] rather than empty rows. Both the inner "
               "and outer layers the finding named are closed."),
    "R2-325": ("CONFIRMED", "Off-main row, fix present on main. The finding's defect was that the "
               "Attendance & Salary report counted only an exact-match 'Present', so every "
               "off-site punch read as an absence and the report disagreed with the payroll run "
               "that paid for it. reports.py:501 now filters "
               "AttendanceLog.status.in_(['Present', 'Present (Off-Site)']), and the comment "
               "above it (:496) explicitly pins the agreement - hr.py run_payroll filters on the "
               "same two values - so the report and the payroll run count the same days."),
    "R2-220": ("REGRESSED", "THE DEFECT IS LIVE, PROVED 2026-08-28, and the fix is present, "
               "annotated and reasoned - it just normalises the wrong half of the value. "
               "Reproduced through the exact expression settings/page.tsx:967 sends, evaluated in "
               "the founder's own browser (Asia/Calcutta, getTimezoneOffset -330): a holiday "
               "entered as 2026-08-15 becomes 2026-08-14T18:30:00.000Z on the wire, POST "
               "/hr/holidays returns 201 storing 2026-08-14T00:00:00Z, and it reads back as 14 "
               "August. One day early, exactly as filed. hr.py:1661-1663 pins the value with "
               "_utc_midnight, whose comment states the goal correctly, but the helper takes "
               "dt.year/month/day OF THE VALUE IT RECEIVES - already shifted back across midnight "
               "by the browser - so it converts 14 Aug 18:30Z into 14 Aug 00:00Z. The time "
               "component is normalised and the date, which was the wrong part, is preserved. "
               "That is why it reads as fixed on inspection and why its gate passes: the pin "
               "asserts the stored time is midnight, which is true on the wrong day. Filed as "
               "R2-753 with the class - the same local-midnight expression appears at 9 sites and "
               "_utc_midnight is referenced at only 3, all in hr.py. Probe row deleted, 0 "
               "remaining confirmed in the database."),
    "R2-316": ("CONFIRMED", "Off-main row, closed by the same change as R2-344. The finding's "
               "claim was that payment_type accepted a third value, 'transfer', that no consumer "
               "handled - five surfaces giving five different wrong answers. finance.py:71-83 now "
               "validates payment_type as two-valued and rejects anything else with a message "
               "naming the correct route (the P2P transfer endpoint), annotated R2-316/R2-344. "
               "The unhandled third value cannot enter the system."),
    "R2-197": ("CONFIRMED", "Off-main row, fixed and moved server-side. The finding's defect was "
               "a frontend expression deciding ESI eligibility from basic salary alone "
               "(is_esi_applicable: parseFloat(empForm.basic) < 21000) when the statutory ceiling "
               "applies to GROSS wages. hr.py:299 now derives it on the server - "
               "_esi_applicable(basic_salary, hra, other_allowances) - and the helper sums all "
               "three components against ESI_GROSS_WAGE_CEILING. An employee over the ceiling on "
               "gross is no longer enrolled because their basic happens to sit under it, and the "
               "client can no longer assert the flag."),
    "R2-211": ("CONFIRMED", "Off-main row, fix present on main. The finding's defect was the "
               "transaction modal applying invoice semantics - GST %, Qty/Rate line items, "
               "Deductions, Retention - to money-receipt types, booking a 10,000 receipt as "
               "11,800. The GST field now exists at only two places in the modal "
               "(finance/page.tsx:2545 and :2664), both inside the Other Expense (:2370) and "
               "Equipment Expense (:2587) branches, which are genuine invoice-bearing "
               "transactions. The Payment In / Payment Out path does not render it, so a receipt "
               "cannot acquire tax it never had."),
    "R2-276": ("CONFIRMED", "Off-main row, all three surfaces the finding named now route through "
               "the shared resolver introduced for R2-131. Work order rendering: "
               "billing.py:294 and :428. Subcontractor scorecard: subcon_performance.py:140. "
               "Labour contractor: labour.py:29. Each previously produced its own different "
               "placeholder for ids that resolved correctly elsewhere; all three now call "
               "resolve_party_name, so a party either resolves everywhere or fails identically "
               "everywhere. NOTE: the invoice PDF is a fourth surface that does NOT use the "
               "shared resolver and inverts its precedence - filed separately as R2-748."),
    "R2-286": ("CONFIRMED", "Off-main row, both clauses fixed. (a) The advertised PDF URL is no "
               "longer dead: main.py:638 mounts /static on STATIC_DIR, and :27-29 anchors that "
               "directory to backend/static - the same location reports.py:210-212 writes the "
               "file to - under a comment naming the root cause ('so it never depends on the "
               "process CWD'). (b) The author can no longer approve their own report: "
               "reports.py:222-225 records generated_by at creation and :253 requires the "
               "approver to be someone else, both annotated R2-286(b). OBSERVATION, not filed: "
               "the PDF is written to the container filesystem, which on Render is ephemeral, so "
               "a report generated before a deploy will 404 after it - a durability concern "
               "distinct from this finding's CWD bug, and the subject of a separate "
               "bucket-storage recommendation elsewhere in the audit."),
    "R2-540": ("CONFIRMED", "Off-main row, PROVED LIVE. The finding said "
               "GET /hr/timesheets/company/{company_id} filters on Timesheet.company_id, a column "
               "that does not exist, so it 500s for every company always. The query now reaches "
               "company through a join: .join(Project, Timesheet.project_id == Project.id)"
               ".filter(Project.company_id == company_id) (hr.py:537-550). E3 2026-08-28 against "
               "AK Construction: 200 with 737 bytes of real timesheet entry rows. NOTE: "
               "confirming this row exposed my incorrect claim in R2-588 that this endpoint "
               "returns headers - it returns entries, and that verdict is corrected."),
    "R2-430": ("CONFIRMED", "Off-main row, PROVED LIVE on the finding's own dates. It reported "
               "500 whenever the day had attendance rows and 200 when it had none - the asymmetry "
               "that isolated the bug to row serialisation rather than the query. E3 2026-08-28 "
               "against AK Construction: /hr/attendance/company/{cid}/2026-07-27 (the date the "
               "finding used, rows present) returns 200 with 285 bytes of real rows, and "
               "2026-07-01 (no rows) returns 200 with an empty list. The 500 is gone in the case "
               "that produced it."),
    "R2-315": ("CONFIRMED", "Off-main row, fix present on main. The finding's mechanism was that "
               "BankAccount.balance is written once at creation and never again, so the Finance "
               "summary's bank figure ignored every recorded bank payment. The column is now "
               "MAINTAINED: finance.py:242 posts the delta when a non-cash payment is created, "
               "and :341-345 reverses exactly that posting when the payment is deleted, both "
               "annotated R2-100/R2-315 and both scoped to the payment's own company. Summing "
               "BankAccount.balance at :1256 therefore reflects recorded activity."),
    "R2-100": ("CONFIRMED", "Off-main row, closed by the same change as R2-315 - the paired bank "
               "posting on payment create (finance.py:242) and its reversal on delete (:341-345), "
               "which the code annotates R2-100/R2-315 together."),
    "R2-344": ("CONFIRMED", "Off-main row, fixed at the root rather than at the settlement query. "
               "The finding's mechanism was that a payment recorded as transfer fell into the "
               "else branch and settled the party's EXPENSE bills, marking vendor invoices Paid "
               "for money never paid to them. payment_type is now two-valued and validated at "
               "finance.py:71-83: anything other than in or out is rejected with a message naming "
               "the correct route (the P2P transfer endpoint), annotated R2-316/R2-344. A "
               "transfer can no longer reach the settlement branch at all."),
    "R2-348": ("CONFIRMED", "Off-main row, same defect as R2-239's over-receipt half and verified "
               "in the same read: procurement.py:908-916 computes remaining = ordered - "
               "received_so_far and rejects a line whose received_qty exceeds it, naming both "
               "quantities. Over-receipt can no longer inflate stock or flip the PO to received; "
               "the approval gate at :866-874 carries the R2-239/R2-348 annotation."),
    "R2-353": ("CONFIRMED", "Off-main row, fix present on main. run_payroll guards idempotency "
               "before doing any work: hr.py:748-765 queries for a finalized PayrollRun on the "
               "same (company_id, project_id, payroll_month) and raises 409 naming the existing "
               "run id and the remedy. The comment states the harm the finding measured - a "
               "re-run minting a second finalized run and double-counting every salary in the "
               "ledgers that sum PayrollLineItem, with no way to void either."),
    "R2-236": ("CONFIRMED", "Off-main row, all three clauses verified, the first one LIVE against "
               "the finding's own project id. (1) THE 500 IS GONE: "
               "GET /finance/ledger?project_id=a1376092-a642-456b-8f25-b97d8e78025d - the exact "
               "id the finding used - returned 200 with 2838 bytes of real ledger rows on "
               "2026-08-28; the second project (4ab9616c) also returned 200. The finding recorded "
               "a deterministic 500 on that same project. (2) CORS ON 500: main.py:600-619 "
               "installs an Exception handler that echoes the request origin when it is in the "
               "whitelist, so a 500 now reaches the browser as a status code rather than an "
               "opaque network error - the handler's own comment explains that "
               "ServerErrorMiddleware sits outside CORSMiddleware, which is why the bare 500 had "
               "no headers. (3) REACHES SENTRY: that handler returns a generic detail while "
               "Starlette still logs and re-raises, so the failure is reported rather than "
               "swallowed. Note the response body stays 'Internal server error' with no "
               "internals, which is R2-194's requirement."),
    "R2-313": ("CONFIRMED", "Off-main row, fix present on main. The single company-wide "
               "accumulator the finding quoted ('running = 0.0 ... ONE accumulator for the whole "
               "company') is gone: _build_party_ledger now keeps running_by_party, a dict keyed "
               "by a stable party identity (reports.py:661), computes each row's balance as that "
               "party's own prior balance plus debit minus credit (:760-761), and returns "
               "party_final mapping party identity to its closing balance (:780-782). So the "
               "Balance column is per-party and All Party Balances publishes each party's own "
               "closing figure rather than one shared running total."),
    "R2-380": ("CONFIRMED", "Off-main row, and the specific gap the finding named is closed. Its "
               "point was that negative_stock_lock guarded ONE of the two paths writing "
               "MaterialTransaction(type='used') - procurement was guarded, the DPR path was not. "
               "dpr.py now carries the same gate: it imports enforce_stock_availability (:12) and "
               "applies it per consumed material BEFORE any row is written (:106-115), under a "
               "comment stating the reason - 'The daily report consumes stock just like manual "
               "usage, so negative_stock_lock is enforced here too'. procurement.py:1173-1178 "
               "retains its own checks. Both consume paths are now guarded."),
    "R2-543": ("CONFIRMED", "Off-main row, fix present AND verified in the database, which "
               "matters here because a model-level constraint proves nothing if its migration "
               "never ran (the R2-731 problem). models.py:1271-1276 declares "
               "UniqueConstraint('company_id', 'reference_number'). E0 CONFIRMED IN PRODUCTION "
               "2026-08-28: pg_constraint for relation 'payments' returns "
               "uq_payments_company_id_reference_number UNIQUE (company_id, reference_number). "
               "The race the finding proved - six concurrent identical requests creating two "
               "payments with the same reference - is now decided by the database rather than by "
               "a read-then-write guard, so it cannot be lost."),
    "R2-342": ("CONFIRMED", "Off-main row, and all four clauses of the finding are addressed. It "
               "said the approve endpoint had 'no rule, no level, no state check, and no record "
               "of who did it'. Now: RULE - the payment branch calls find_matching_rule for "
               "PAYMENT_ENTRIES_FEATURE_TYPE on the payment amount and match_approver against "
               "rule.approvers; LEVEL - it computes next_level from levels_approved(db, "
               "'payment', id) + 1 and, when next_level < rule.levels, records the signature and "
               "returns 'Approval level N of M recorded; awaiting further sign-off' rather than "
               "approving; STATE - 409 on an already-approved payment or bill and 409 on a "
               "cancelled bill; RECORD - each decision is written with company, rule_id, "
               "entity_type, entity_id, level, action, user and matched_label. NOTE: the bill "
               "branch records at level=1 with rule_id=None, which is consistent - the "
               "multi-level feature is scoped to Payment Entries (the label admins configure), "
               "and bill approval has its own gated endpoint from R2-214."),
    "R2-222": ("CONFIRMED", "Off-main CLASS row, verified as a class rather than by sampling one "
               "site. The finding's mechanism was naive datetime.utcnow() subtracted from an "
               "aware DateTime(timezone=True) column, crashing five endpoints. Enumerated every "
               "surviving utcnow() in backend/app/routers - 29 of them - and read each in "
               "context: ALL are in positions where naivety cannot raise. They are column "
               "assignments (crm.py:934, equipment.py:211, quality.py:422/448, reports.py:220/264, "
               "statutory.py:201-218, production.py:347-348/471, safety.py:160, rfq.py:230, "
               "tally.py:793, vendor_performance.py:129), or derived scalars via .date() / "
               ".year / .strftime() / .isoformat() (analytics.py:295/568, dpr.py:208/314, "
               "hr.py:1012, reports.py:1425, tally.py:231/391/725, finance.py:1694). The only two "
               "that bind 'now' for comparison are safe: hr.py:1517 uses now.year only, and "
               "todos.py:59-62 explicitly normalizes - 'if t.due_date.tzinfo is not None: now = "
               "now.replace(tzinfo=timezone.utc)' - before comparing. No naive/aware arithmetic "
               "remains. OBSERVATION, not filed: writing a naive value into an aware column is "
               "still stylistically inconsistent, but Postgres interprets it as UTC and the read "
               "paths normalize, so it cannot raise."),
    "R2-210": ("CONFIRMED", "Off-main row, fix present on main. The punch handler now takes an "
               "aware clock - hr.py:346-347, 'now = datetime.now(timezone.utc)' under a comment "
               "citing R2-210/R2-262/R2-728 and stating the reason (stored punch values are aware "
               "on Postgres, so both operands must be the same flavor). hours_worked is written "
               "at :406 from that comparison, so the punch-out path that always 500'd completes "
               "and the column the finding said was 'never written for anybody' is populated."),
    "R2-262": ("CONFIRMED", "Off-main row, same defect and same fix as R2-210 - it was filed as "
               "the confirmation of R2-210 with a wider blast radius (the open record locking the "
               "worker out for the rest of the day). The aware clock at hr.py:346-347 closes the "
               "500, so punch-out completes and the record no longer stays open. This also "
               "retires the interaction R2-304 depended on: with hours_worked now writable, the "
               "analytics labour figures have real data rather than nulls to report."),
    "R2-219": ("CONFIRMED", "Off-main row, fix present on main. The approval endpoint no longer "
               "writes the fulfilment field: procurement.py:668 and :672 set po.approval_flag = "
               "'approved' and nothing in the approve path assigns po.status. A PO already at "
               "'received' therefore keeps that status when approved, so the finding's sequence - "
               "a fully-received PO reset to 'sent' with goods receipt re-opened - cannot recur. "
               "A duplicate-decision guard (:660) also rejects a second decision on the same PO."),
    "R2-239": ("CONFIRMED", "Off-main row, BOTH halves of the finding are closed, verified "
               "separately. Over-receipt: procurement.py:908-916 computes remaining = ordered - "
               "received_so_far and rejects when item.received_qty exceeds it, naming the "
               "requested and remaining quantities in the error - so booking 300 units against a "
               "100-unit PO is refused. Unapproved receipt: create_grn (:866-874) rejects with "
               "422 unless approval_flag is 'approved', the same gate verified under R2-432, "
               "annotated R2-239/R2-348."),
    "R2-033": ("CONFIRMED", "Off-main row and the only one of the 48 annotated rows with no test "
               "file of its own - but the defect is the same line as R2-201 / R2-352 / R2-431, "
               "all verified this round. hr.py:855-860 no longer pays default_days when "
               "att_count + approved_leave_days is zero: it assigns days_present = "
               "float(default_days) if effective_assume else 0.0, with the company setting "
               "defaulting OFF, and returns attendance_source 'assumed' so an assumed month is "
               "badged rather than presented as measured - which was this finding's specific "
               "objection. Gated by the R2-201/R2-352 suites."),
    "R2-052": ("CONFIRMED", "Off-main row, fix present on main. PaymentRequest."
               "party_company_user_id is now ForeignKey('company_team.id') on the model, not "
               "users.id, so a payment request can name a party that has no platform login - the "
               "external vendor case the finding said was impossible - and the stored reference "
               "is the same entity every other party lookup uses."),
    "R2-075": ("CONFIRMED", "Off-main row. The counts are UNCHANGED - 24 registered handlers "
               "against 82 frontend viewSlug entries, exactly the numbers the finding reported - "
               "but the defect it filed was not the count, it was that 'both the View and the "
               "Download path present that as a successful, empty result'. That is fixed: "
               "reports.py:1455-1463 now raises 404 'Report {slug} is not implemented.' for an "
               "unregistered slug, under a comment stating the principle - 'Fail loudly so an "
               "unimplemented report can never masquerade as an empty one'. OBSERVATION, not "
               "filed: the catalogue still advertises 82 reports of which 24 exist, so a user can "
               "still click 58 entries that 404. That is now honest rather than deceptive, which "
               "is what the finding asked for, but the catalogue remains oversized."),
    "R2-076": ("CONFIRMED", "Off-main row, fixed at BOTH layers the finding named. The outer "
               "swallow it quoted (try: rows = handler(...) except Exception: rows = []) is gone: "
               "reports.py:1464-1475 logs the traceback via logger.exception and returns a "
               "_REPORT_FAILED sentinel, which the caller converts into an entry in the response's "
               "errors[] rather than publishing an empty report as data. The finding also said "
               "'and the same pattern inside the individual handlers' - checked with a self-tested "
               "AST pass (validated against a synthetic silent swallow and a synthetic logged "
               "one): of 24 _rep_* handlers, ZERO swallow broadly without logging or a failure "
               "marker."),
    "R2-312": ("CONFIRMED", "Off-main row, same family and same fix as R2-076 - the finding's "
               "claim was that sixteen report handlers swallow every exception and return an "
               "empty list, so a Party Ledger for a company with nine invoices reads as no "
               "transactions. The AST pass over reports.py finds 0 of 24 handlers swallowing "
               "silently, and the dispatch surfaces a failed handler through errors[] instead of "
               "as empty rows. A crashing report is now distinguishable from an empty one, for "
               "the user and for monitoring."),
    "R2-560": ("CONFIRMED", "Off-main row, same family as R2-076/R2-312 and closed by the same "
               "change - the finding named the two party reports returning rows: [] behind a bare "
               "'except Exception: return []' on a company that had six parties and Rs 2.71 lakh "
               "of bills. No handler in reports.py now swallows without logging or marking "
               "failure (0 of 24, self-tested AST pass), and the dispatch reports a generation "
               "failure explicitly."),
    "R2-358": ("REGRESSED", "Off-main row. Clause (b) is LIVE and is the same defect confirmed "
               "under R2-049: the finding states 'Equipment.code is unique across every company "
               "in the database', and production pg_constraint still shows equipment_code_key "
               "UNIQUE (code) with no company_id, while equipment.py:129's duplicate guard has no "
               "company predicate. Clause (a) is also unchanged - finance.py:572 still reads "
               "'if eq and eq.hourly_rate:', a truthiness test on a Numeric defaulting to 0.0, so "
               "a machine created without a rate is skipped entirely. Recorded but NOT filed "
               "separately: the numeric outcome is identical either way (rate 0 contributes 0 "
               "cost), so (a) is a visibility gap rather than a wrong number - nothing signals "
               "that a machine has no rate configured. The actionable half is (b), already "
               "captured under R2-049."),
    "R2-347": ("CONFIRMED", "Off-main row, class fully fixed. Measured with an AST pass over "
               "backend/app/routers/*.py, self-tested first against a synthetic swallowed call "
               "and a synthetic bare call (both classified correctly). Result: 32 log_deletion "
               "call sites, ZERO inside a broad 'except Exception: pass'. The finding measured 30 "
               "of 30 swallowed. Checked the finding's own example site to see what replaced it: "
               "finance.py:315-316 now calls log_deletion unguarded, so a logging failure "
               "propagates and aborts the delete rather than letting the row vanish unrecorded - "
               "the correct direction for an audit trail."),
    "R2-406": ("CONFIRMED", "Off-main row, fix present on main. The Placeholder component "
               "(settings/page.tsx:2533-2541) now renders only the section label and 'This "
               "section is not available yet.' The internal build-plan text the finding quoted - "
               "'implemented in a later build round (per the Setting tab build order). Round 1 "
               "covers Company (Details, Branches, Business Profile)' - is gone from the file."),
    "R2-200": ("CONFIRMED", "Off-main row, both halves fixed. The cache name is no longer the "
               "hardcoded constant the finding quoted: sw.js:2 builds it as "
               "`siteflow-shell-${SITEFLOW_BUILD_ID}`, so every deploy produces a new name and "
               "the activate handler's filter (key !== CACHE_NAME) purges the previous one - the "
               "'cached forever' condition depended on the name never changing. The offline "
               "fallback is also no longer the login page: OFFLINE_URL is '/offline' (:3), a "
               "dedicated precached route (:7), served on navigation failure (:65-68)."),
    "R2-302": ("CONFIRMED", "Off-main row, fixed by removal. LocationCreate "
               "(projects.py:258-260) accepts only name and parent_id, create_location "
               "(:730-741) persists only those two, and the ProjectLocation model carries no "
               "latitude or longitude columns at all - so the impossible coordinates the finding "
               "submitted (999 / -999) can no longer be expressed. NOTE on the finding's stated "
               "stake: it argued this mattered because 'site coordinates drive attendance "
               "geofencing'. That is a different column - ProjectLocation is the tower/floor "
               "hierarchy, while the geofence reads Project.location - and the geofence's real "
               "problem is filed as R2-750."),
    "R2-592": ("CONFIRMED", "Off-main row, class fixed. Re-ran the finding's OWN command - "
               "the finding's regex for an invented numeric default over "
               "frontend/src/app - and it returns 0 where the finding measured 9. Calibrated "
               "before trusting the null: the same regex matches a planted sample "
               "('radius: t.attendance_radius_meters || 500'), so the zero is the codebase, not a "
               "broken pattern. The specific sites named - the quality screens' min_acceptable || "
               "0 / max || 100 and the two attendance_radius_meters || 500 mirrors - return "
               "nothing."),
    "R2-590": ("CONFIRMED", "Off-main row, class substantially fixed, residual filed as R2-752. "
               "Re-measured 2026-08-28 with scripts/verification/okelse.py (self-tested first "
               "against d/payment-approval/page.tsx, which the register records as fixed to "
               "surface server detail, and against a synthetic silent handler). Of 244 write "
               "controls - a fetch whose options carry POST/PUT/PATCH/DELETE - 230 surface a "
               "failure (94.3%). The finding measured 91 of 189 silent (48%); it is now 6 of 244 "
               "(2.5%). METHOD NOTE, because the number is bracketed not exact: a 1400-char "
               "search window after each fetch reported 17 silent (upper bound - misses an else "
               "further down the handler) and a 3500-char window reported 6 (lower bound - can "
               "catch an else belonging to a later handler). The 6 were then read by hand and all "
               "6 are genuine; the two false positives the narrow pass produced (finance p2p at "
               ":455 via alert, settings BI-key at :715 via setBiMsg) were excluded. Residual "
               "includes two money controls - payment-request Request Approval (:4018) and Mark "
               "as Paid (:4029), both 'if (res.ok) {...}' with no else and no catch. Note "
               "R2-137's register row calls this same class STILL OPEN, so the class is tracked "
               "without an instance list; R2-752 is that list."),
    "R2-593": ("REGRESSED", "THE DEFECT IS LIVE, recorded FIX_VERIFIED against an off-main "
               "commit. The finding's own test still returns the same answer: grep -rn "
               "'AttendanceLog(' over backend/app yields exactly ONE construction site, hr.py:361 "
               "inside the punch endpoint, and it is not the face endpoint. face_punch "
               "(face_recognition.py:68-74) writes a FaceRecognitionLog and returns it - that is "
               "the whole handler - so a face-recognition punch lands in a parallel table that "
               "payroll never reads (run_payroll counts AttendanceLog rows). Checked that it does "
               "not delegate rather than construct: the module imports only FaceRecognitionLog "
               "and StaffEmployee (:10) and calls nothing in hr.py. A face punch therefore never "
               "becomes attendance and never reaches pay. No new finding number: the defect is "
               "R2-593 and needs its STATUS corrected. Separately, verifying this row surfaced an "
               "unrelated authorization gap on the same endpoint - filed as R2-751."),
    "R2-534": ("REGRESSED", "THE DEFECT IS LIVE, and it is the same unfixed handler as R2-533 - "
               "the cashbook CSV importer, whose fix commit is off-main and whose content never "
               "re-landed. finance.py:1673 still reads db.query(User).filter(User.name == "
               "party_name).first() with NO company scope, exactly as filed: the global users "
               "table is searched by display name, first match wins, and only afterwards is a "
               "CompanyTeam row looked up for THAT user in this company. So a name collision with "
               "any user anywhere resolves to the wrong person, and when that person has no "
               "membership in the importing company the row is written with party_team_id None - "
               "unattributed - even though a legitimate member of the same name exists. No new "
               "finding number: the defect is R2-534."),
    "R2-550": ("CONFIRMED", "Off-main row, fix present on main. perform_p2p_transfer now compares "
               "the two ids before writing: after resolving both CompanyTeam rows within the "
               "company, finance.py raises 422 'Sender and receiver must be different parties' "
               "when sender_uuid == receiver_uuid. The finding's proved sequence - both ids "
               "e9db5738 returning 201 Success and writing a matched out/in pair for the same "
               "party - is no longer constructible."),
    "R2-317": ("REGRESSED", "THE DEFECT IS LIVE, recorded FIX_VERIFIED against an off-main "
               "commit, and in production the report is not merely lossy but EMPTY. "
               "_rep_bank_statement (reports.py:1273-1290) is unchanged in both respects the "
               "finding named: it still filters Payment.account_name.isnot(None), and it still "
               "buckets with by_account.setdefault(p.account_name, ...) on the free-text string. "
               "Measured in production 2026-08-28: of 7 payments, 7 have a null or empty "
               "account_name and 0 have a non-null account_id, with 0 distinct account names. "
               "The isnot(None) filter therefore matches nothing and the Bank Statement report "
               "returns no rows for any company - every recorded payment is dropped, which is "
               "the finding's clause 'drops every payment that has none' taken to its limit. "
               "Worse, the correct mechanism already exists and is ignored: Payment.account_id "
               "is a real ForeignKey to bank_accounts (models.py) and finance.py:191-201 "
               "VALIDATES it against a BankAccount row and rejects it for cash movements, yet "
               "reports.py references account_id zero times. The report keys on the unvalidated "
               "free-text column while an validated FK sits beside it. No new finding number: "
               "the defect is R2-317 and needs its STATUS corrected."),
    "R2-429": ("CONFIRMED", "Off-main row. Checked against the finding as filed rather than its "
               "headline, and the roster is not duplicating anything: 'ZZ QA Employee One' "
               "resolves in production to THREE distinct staff_employees rows with three "
               "distinct ids (measured 2026-08-28), so the screen rendering three lines is "
               "faithful to the data. The creation path now guards against adding more - "
               "d/hr/page.tsx:445 warns 'An employee named X already exists. Create another "
               "anyway?' before submitting. The three existing rows are audit debris from earlier "
               "rounds in the AK Construction test tenant, and belong on the launch cleanup list "
               "beside the three inert chat groups (see R2-470). OBSERVATION, not filed: the "
               "Office/Site tab split (payroll-attendance/page.tsx:920, :938-939) still defaults "
               "to 'office', which is what made the finding's author see one row out of five. "
               "That is a deliberate partition of the roster rather than a defect - both tabs are "
               "present and switchable - so it is recorded as a UX observation, not a finding."),
    "R2-475": ("REGRESSED", "THE DEFECT IS LIVE and is broader than filed. The branch the "
               "finding quoted is unchanged at hr.py:341-343 - when site_lat is None the code "
               "sets within_geofence = True under the comment 'No site coords configured -> allow "
               "punch without GPS enforcement', so the punch is stored location_verified=True "
               "with distance_from_site_m NULL. Measured in production 2026-08-28: of 7 projects, "
               "7 have a null or empty location and 0 carry any coordinate, so this is not an "
               "edge case - it is every project, on every punch. Root cause found while "
               "verifying this row and filed separately as R2-750: neither ProjectCreate nor "
               "ProjectUpdate (projects.py:206-235) carries a location field at all, so the "
               "console's project API cannot set coordinates on creation or afterwards, while it "
               "DOES expose attendance_radius_meters - a radius around a point there is no way to "
               "specify. The only writer is planning.py:868's fabricated '19.0760,72.8777' "
               "fallback on a second creation route no production project used. Consequence "
               "recorded against R2-474 as well: that fix is correct but inert."),
    "R2-345": ("CONFIRMED", "Off-main row, fix re-landed on main via e9dba8b (the same commit "
               "that closed R2-042, filed under R2-231). The finding's mechanism was that an "
               "omitted project_id skipped the project filter entirely, so FIFO settled the "
               "party's oldest bills company-wide and hopped across projects. The settlement "
               "candidate query (finance.py:259-269) now always constrains scope: the party "
               "filter applies when a party is supplied, otherwise Bill.company_id, and "
               "Bill.project_id is applied whenever proj_uuid is present, with the invoice-type "
               "direction (REVENUE for 'in', EXPENSE for 'out') applied unconditionally. The "
               "second half - the payment then being invisible on the finance screen - was "
               "closed by R2-328's company-scoped summary, verified under R2-544."),
    "R2-588": ("REGRESSED", "THE DEFECT IS LIVE, recorded FIX_VERIFIED against an off-main "
               "commit, and it is WORSE than first recorded - see the correction below. The "
               "Weekly Timesheet Approvals table is bound to a state array nothing populates. "
               "Verified exhaustively: an untruncated grep for setTimesheets across d/hr/page.tsx "
               "returns exactly TWO lines - the useState declaration (:166) and an optimistic "
               "prev.map inside handleTimesheetAction (:581). No fetch assigns it, so :581 maps "
               "over a permanently empty array and is a no-op. The nearby fetch is not the fix: "
               "fetchTimesheetLogs (:194-204) assigns setTimesheetLogs, a DIFFERENT state feeding "
               "the separate Daily Activity table, and the tab-gated effect at :435-440 calls that "
               "same wrong function. CORRECTION 2026-08-28 to this row's earlier note: I wrote "
               "that a suitable header list exists at /timesheets/company/{id} and is never "
               "called. That was WRONG. Enumerating all six timesheet endpoints (hr.py:432, :455, "
               ":515, :537, :570, :588) shows NO GET returns Timesheet headers - "
               "/timesheets/project/{id} is List[TimesheetEntryResponse] and "
               "/timesheets/company/{id} is list_company_timesheet_entries, also entries; "
               "TimesheetResponse is returned only by the POST create and the submit/approve "
               "PATCHes, one row at a time. No endpoint serves the draft/submitted/approved "
               "header shape the approvals table branches on, so the fix is a NEW backend "
               "endpoint plus wiring, not just wiring an existing fetch - a materially larger "
               "scope than first recorded. Caught while confirming R2-540 live."),
    "R2-043": ("CONFIRMED", "Off-main row, fix re-landed on main via R2-267. The binary "
               "classification the finding quoted (REVENUE -> Sales, everything else -> "
               "Purchase) is gone: tally.py:235-240 now tests is_settlement_invoice_type FIRST "
               "and maps money-in settlements to 'Receipt' and money-out to 'Payment', with "
               "Sales/Purchase reached only afterwards (:262, :271). The voucher-type Literal at "
               ":80 was widened to Sales/Purchase/Receipt/Payment/Journal to carry them. "
               "Receipts and transfers are therefore no longer written into the customer's Tally "
               "as Purchase vouchers."),
    "R2-565": ("CONFIRMED", "Off-main row, fix present on main, PROVED LIVE by reproducing the "
               "finding's own sequence end to end in ZZ R8 Throwaway (the authorized write "
               "tenant) 2026-08-28. Production held zero task_predecessors rows, so the broken "
               "state no longer existed in data and had to be reconstructed: created project "
               "'ZZ R3 CPM Probe' (200), task A (201), task B (201), GET /planning/tasks (200), "
               "POST /planning/tasks/{B}/predecessors {predecessor_id: A} -> 201 "
               "{'success': true}, then the call that returned 500 in the finding: GET "
               "/planning/tasks?project_id=... -> 200 with both tasks serialised. The module is "
               "not broken by adding a dependency. compute_critical_task_ids "
               "(planning.py:118-160) is a rewritten CPM backward pass with an lf_cache, an "
               "isolated-task branch and a dur default, and check_circular_dependency (:180) "
               "guards the cycle case that would otherwise recurse forever. CLEANUP VERIFIED at "
               "the database, not from the API response: the delete required an explicit "
               "confirm token naming the dependents (R2-300's guard, working), and a follow-up "
               "query showed a SECOND probe project left by an earlier attempt whose response "
               "was lost to a page reload - both were removed, final state 0 projects / 0 tasks "
               "/ 0 predecessors."),
    "R2-371": ("REGRESSED", "THE DEFECT IS LIVE, recorded FIX_VERIFIED against an off-main "
               "commit. The finding's point was that the Round 5 thesis blamed a missing wo_id "
               "on Bill and MISSED the material side - there is no po_id either. wo_id has since "
               "been added (models.py Bill, ForeignKey work_orders.id) and po_id has NOT. E0 "
               "CONFIRMED IN PRODUCTION 2026-08-28: information_schema.columns for table 'bills' "
               "returns match_id and wo_id and NO po_id column. So billed-versus-ordered remains "
               "uncomputable for materials and over-invoicing against a purchase order is "
               "structurally undetectable, exactly as filed. The finding allows one indirect path "
               "- Bill.match_id -> ThreeWayMatch.po_id - and production shows that path is empty "
               "in practice: of 16 bills, 7 are invoice_type 'purchase' and ZERO of them carry a "
               "match_id, while 3 purchase_orders and 3 three_way_matches exist. Not one purchase "
               "bill in the database can be related to a PO by any route. No new finding number: "
               "the defect is R2-371 and needs its STATUS corrected."),
    "R2-339": ("CONFIRMED", "Off-main row, fix present on main, and the finding's premise has "
               "also been overtaken. The headline defect - a client-facing report permanently "
               "stating 0% timeline completion - is fixed: reports.py:113-114 now derives "
               "tasks_completion_pct from int(avg_task_progress), the maintained per-task "
               "progress field, not from a status count. The finding's premise that nothing ever "
               "writes 'completed' is also no longer true - planning.py:521 and :790 both assign "
               "task.status = 'completed'. Verified the status vocabulary rather than assuming: "
               "task writers use lowercase not_started / in_progress / ongoing / completed, and "
               "the capitalized 'Ongoing' writes at planning.py:870 and projects.py:357 are "
               "Project rows, not Tasks. CAVEAT, recorded not filed: reports.py:111 counts "
               "tasks_completed with a bare t.status == 'completed' while analytics.py uses "
               "_task_is_completed (COMPLETED_TASK_STATUSES plus progress >= 100), so the report "
               "would undercount a task at 100% progress left in 'ongoing'. No live instance - "
               "all 3 production tasks are not_started - and only 'completed' is ever written, so "
               "this is an internal inconsistency rather than a defect."),
    "R2-432": ("CONFIRMED", "Off-main row, fix present on main. create_grn (procurement.py:835) "
               "now reads the approval flag the finding said it never consulted: :866-874 rejects "
               "a receipt with 422 unless (po.approval_flag or '').lower() == 'approved', under a "
               "comment citing R2-239/R2-348 and stating the principle - 'Receiving stock must "
               "never be the act that pushes an unapproved PO through its lifecycle'. The error "
               "names both approval_flag and status. A neighbouring CD-8/R2-341 guard also makes "
               "cancelled and closed POs terminal for receipt."),
    "R2-049": ("REGRESSED", "THE DEFECT IS LIVE, recorded FIX_VERIFIED against a commit that is "
               "not on origin/main. Both halves the finding named are unchanged. CODE: "
               "equipment.py:129 still reads db.query(Equipment).filter(Equipment.code == "
               "payload.code).first() with NO company_id predicate, inside add_equipment - the "
               "surrounding lines gained R2-556's company-existence 404 and the membership/"
               "permission checks, but the duplicate guard itself was never scoped. MODEL: "
               "models.py:1034 still declares code = Column(String(100), unique=True, "
               "nullable=False) on Equipment, a GLOBAL constraint. E0 CONFIRMED IN PRODUCTION "
               "2026-08-28: pg_constraint for relation 'equipment' returns "
               "'equipment_code_key u UNIQUE (code)' - unique on code alone, not (company_id, "
               "code). So one tenant registering 'EXC-01' permanently prevents every other tenant "
               "from using that code, and the 400 'Equipment code already exists' discloses that "
               "a foreign tenant holds it. This is a WRITE-path tenancy violation, which is why "
               "the 180 cross-tenant probes did not surface it - they were GET only, a limitation "
               "the handover states explicitly. No new finding number: the defect is R2-049 and "
               "needs its STATUS corrected. Fix is a scoped guard plus a migration swapping the "
               "constraint for UNIQUE (company_id, code), matching every other duplicate guard in "
               "the codebase (billing.py WO number and invoice number, procurement.py indent and "
               "PO), all of which are company-scoped."),
    "R2-201": ("CONFIRMED", "Off-main row, fix present on main - same site and same change as "
               "R2-352 and R2-431. The finding's line (days_present = full month when att_count + "
               "approved_leave_days == 0) is gone: hr.py:855-860 now branches explicitly and "
               "assigns days_present = float(default_days) if effective_assume else 0.0, where "
               "effective_assume defaults OFF (company setting "
               "assume_full_month_when_no_attendance defaults False). An employee with no "
               "attendance is therefore paid zero rather than a full month, and the response "
               "carries attendance_source 'assumed' so the case is visible rather than silent."),
    "R2-352": ("CONFIRMED", "Off-main row, duplicate of R2-201's defect at the same line, closed "
               "by the same change - see the R2-201 entry. hr.py:855-860, zero attendance yields "
               "days_present 0.0 unless the company explicitly opts in."),
    "R2-474": ("CONFIRMED", "Off-main row, fix present on main, closing both halves the finding "
               "named. (1) The client no longer asserts its own verification: the 'Simulate GPS "
               "lock (On-Site)' control and its isGpsSimulatedVerified state are gone from the "
               "attendance page entirely, and the punch reads real coordinates via "
               "navigator.geolocation.getCurrentPosition (attendance/page.tsx:415-420). (2) The "
               "server measures rather than accepts: hr.py:334-343 resolves site coordinates and "
               "the project's attendance_radius_meters, computes haversine_distance_m, and writes "
               "location_verified=within_geofence with status 'Present (Off-Site)' when outside; "
               "the request's own location_verified is ignored, and the table renders the server "
               "value (:783). AMENDED after verifying R2-475: this fix is CORRECT BUT INERT in "
               "production. All 7 projects have a null location (measured 2026-08-28), so "
               "site_lat is always None, the else branch sets within_geofence=True "
               "unconditionally, and every punch is still stored location_verified=True with a "
               "NULL distance. The client can no longer lie, but the server has nothing to "
               "measure against. Root cause filed as R2-750 (no location field on the project "
               "API). Same 'correct but inert' shape as the RLS rollout - do not report this as "
               "an active protection."),
    "R2-533": ("REGRESSED", "THE DEFECT IS LIVE, and the row is recorded FIX_VERIFIED (suite "
               "RC-038, commit 4b7add4, which is NOT an ancestor of origin/main). The finding's "
               "primary defect is quoted verbatim in the shipped tree. finance.py:1712, inside "
               "upload_payments (@cashbook_router.post('/upload'), :1602): "
               "reference_number=row.get('Payment Request ID') or f'CSV-V-{uuid.uuid4().hex[:6]"
               ".upper()}' - a FRESH RANDOM reference on every upload, so re-uploading one file "
               "books every payment a second time. Read the whole handler from :1602 to :1723 "
               "rather than the one line: there is no file hash, no batch key, no row-level "
               "dedupe, and no dry-run. The only change that landed here is R2-608's "
               "decode-error handling (:1616-1633). Note the single-payment endpoint DOES guard "
               "duplicates (:223-232 rejects a repeated reference_number per company, the "
               "DEFECT-07 fix) - the CSV path bypasses that guard precisely by minting a unique "
               "reference per row. The finding's silent-coercion clause also survives: an "
               "unparseable amount and a non-positive amount both 'continue' silently (:1666-"
               ":1671), an unmatched party name leaves party_team_id None (:1673-1681), an "
               "unmatched project name leaves project_id None (:1683-1691), and an unparseable "
               "date silently falls back to utcnow() (:1693-1700). No new finding number: the "
               "defect is R2-533 and needs its STATUS corrected."),
    "R2-356": ("CONFIRMED", "Off-main row, fix re-landed on main. Same defect and same site as "
               "R2-244 - naive datetime.utcnow() subtracted from a timezone-aware "
               "EquipmentDeployment column, 500ing GET /finance/pl for any project with an open "
               "deployment on equipment that has an hourly_rate. finance.py:568-585 now takes "
               "recorded hours when present and, for the still-deployed fallback, normalizes both "
               "operands to UTC before subtracting, under the R2-727 annotation. Verified as part "
               "of the same read as R2-244."),
    "R2-509": ("CONFIRMED", "Off-main row, fix re-landed via R2-726's bbb6d51 (on main). "
               "_net_balance (finance.py:890-894) computes advance_paid + to_receive - "
               "advance_received - to_pay, i.e. receivables ADD to the position, and the "
               "enterprise-rollup endpoint uses it for both the per-company row (:1103) and the "
               "consolidated total (:1122). Corroborated by live data captured earlier this "
               "session: /finance/parties for AK Construction sums to to_pay 802754 / to_receive "
               "196000 with SUM_balance -606754, which is 196000 - 802754 under the corrected "
               "sign; the finding's captured value was -1011144, i.e. -(815144 + 196000) with "
               "the receivable subtracted."),
    "R2-568": ("CONFIRMED", "Off-main row, fix present on main. deploy_equipment "
               "(equipment.py:171-177) now closes every open deployment for that machine before "
               "opening the new one - it selects EquipmentDeployment rows with end_date == None "
               "for the equipment_id and sets each end_date to the new deployment's start_date. "
               "The finding's proved scenario (three open deployments of one excavator across two "
               "projects, each billing separately) is no longer constructible: at most one "
               "deployment per machine can be open, so the per-project hourly billing cannot "
               "double-count a single physical asset."),
    "R2-327": ("REGRESSED", "PARTIAL FIX passing as FIX_VERIFIED. Read against the finding AS "
               "FILED, not its register summary. The headline defect IS fixed: subcontractor "
               "cost is no longer double-counted, because finance.py:543-548 now adds "
               "Bill.invoice_type != 'subcon' to the material bucket under an explicit R2-243 "
               "comment, so the cost heads no longer sum to 189% of true cost. But R2-327 named "
               "TWO further defects in the same response and BOTH survive verbatim. (1) "
               "'Plant & Machinery ... never looks at bills' - still true: equipment_actual at "
               ":593 is round(dep_cost + fuel_cost, 2), built only from EquipmentDeployment and "
               "FuelLog at :568-592, while equipment bills fall into material_actual. A company "
               "renting plant on invoice still reads Plant & Machinery 0 forever. (2) 'Overhead "
               "is hardcoded to 0.0 with no source at all' - still true, verbatim, at :626-631 "
               "(budget=0.0, actual=0.0, variance=0.0), while expense bills are absorbed into "
               "Material Cost. The total now reconciles but the PARTITION does not, and three of "
               "six heads misreport with a variance computed against a real budget on two of "
               "them. Filed as R2-749. The RC-022 pin covers the subcon double-count only, which "
               "is why the other two stayed green."),
    "R2-544": ("CONFIRMED", "Off-main row, fix re-landed on main under R2-328's annotation. The "
               "finding's mechanism was that the Finance summary selected payments by project "
               "while cash_balance was company-scoped, so a project-less payment moved the "
               "balance but appeared in no row and no In/Out total (IN (...) never matches NULL). "
               "get_company_transactions (finance.py:1178-1187) now queries "
               "Payment.company_id == company_id with NO project predicate, under a comment "
               "naming exactly this mechanism - 'Payment.project_id is nullable and SET NULL on "
               "project delete, so membership-scoping silently dropped every project-less "
               "payment from totals/rows while cash_balance (company-scoped) saw them'."),
    "R2-549": ("CONFIRMED", "Off-main row, closed by the same R2-328 change as R2-544 - same root "
               "cause, as the finding itself states ('Per R2-544, the Finance summary selects "
               "payments with Payment.project_id.in_(project_ids), and IN (...) never matches "
               "NULL'). perform_p2p_transfer still writes both legs with project_id=None, but "
               "both carry company_id=comp_uuid, and the summary is now company-scoped, so a "
               "party-to-party transfer appears in the ledger and moves In/Out. Verified the "
               "transfer's own writes rather than assuming: both Payment rows set company_id."),
    "R2-042": ("CONFIRMED", "Off-main row, fix re-landed by another route. The cited commit is "
               "not an ancestor of origin/main, and neither 'R2-042' nor a test for it appears "
               "anywhere in the live tree. The defect is nonetheless fixed: the finding's "
               "mechanism was that the UI payment POST omits the party so the backend FIFO "
               "settlement guard could never match, leaving every bill Unpaid with paid_amount 0. "
               "The UI still omits it - finance/page.tsx:536-545 sends company_id, project_id, "
               "payment_type, amount, payment_method, reference_number, description and "
               "payment_date, with no party_company_user_id - but e9dba8b (ON main, filed under "
               "R2-231) made that harmless by removing the requirement: finance.py:259-269 runs "
               "settlement scoped to the company always, the project when present, and "
               "REVENUE_INVOICE_TYPES for 'in' / EXPENSE_INVOICE_TYPES for 'out', applying the "
               "party filter only when one is supplied. Approval gating (R2-346) is preserved on "
               "both paths."),
    "R2-074": ("CONFIRMED", "Off-main row, fix re-landed by another route. The cited commit "
               "acee51f is not on origin/main and the id is unannotated in the live tree, but "
               "the defect is closed by the R2-170/R2-172 taxonomy work which IS on main: the "
               "three keys the finding named as ungrantable - attendance:approve, "
               "drawings:approve, reports:approve - are all now emitted because "
               "permissions.py:46-62 carries 16 modules in WORKFLOW_MODULES rather than the 6 "
               "the finding quoted. Pinned by backend/tests/coverage/"
               "test_r2_170_ungrantable_approve_keys.py, whose ORPHAN_KEYS tuple is exactly "
               "those three. Verified independently while confirming R2-172."),
    "R2-198": ("CONFIRMED", "Off-main row, fix present on main. Both halves check out. Frontend: "
               "the finding's cause was redirect wrappers reading company_id off a params object "
               "that is a Promise under Next 15, yielding /c/undefined/. Every wrapper now awaits "
               "it - 'await (params instanceof Promise ? params : Promise.resolve(params))' - and "
               "the coverage is complete: of 29 redirect wrappers under p/[project_id], 29 carry "
               "the await and 0 do not, matching the finding's own count of 29 routes exactly. "
               "Backend: the register's S33 sweep note (company-scoped finance routes are "
               "UUID-typed so FastAPI 422s the literal 'undefined') is consistent with the "
               "current signatures."),
    "R2-244": ("CONFIRMED", "Off-main row, fix re-landed under a DIFFERENT id's annotation - "
               "which is why the id-annotation triage scored it 0/0 and why it needed a hand "
               "read. finance.py:568-585 no longer subtracts a naive utcnow() from an aware "
               "column: hours come from dep.hours_used when recorded (R2-357), and the "
               "still-deployed fallback normalizes both operands to UTC first, under a comment "
               "citing R2-727 - i.e. the orphan-lineage sweep re-landed this fix on main. The "
               "TypeError that 500'd /finance/pl for any equipment with an hourly_rate and an "
               "open deployment cannot occur."),
    "R2-310": ("CONFIRMED", "Off-main row, fix present on main. The refetch loop is structurally "
               "gone in delete-logs/page.tsx: authHeaders is useMemo'd on [accessToken] (:65-68) "
               "so it is a stable reference rather than a fresh object each render, fetchLogs is "
               "useCallback'd on primitives plus that stable value (:70-96), and the effect is "
               "keyed to the callback (:99-101). The chain that made the effect re-fire every "
               "render - new object -> new callback -> effect -> setState -> render - is broken "
               "at its first link, which is also what makes R2-116's 'structurally impossible' "
               "closure note true."),
    "R2-599": ("REGRESSED", "THE DEFECT IS LIVE. The register marks this FIX_VERIFIED - the "
               "strongest status - against commit bef6c73 and suite RC-002. bef6c73 exists but "
               "'git merge-base --is-ancestor bef6c73 origin/main' is FALSE, and "
               "'git branch -a --contains bef6c73' returns exactly one branch: "
               "claude/siteflow-audit-round10-cont-f6961b, the orphan the rules forbid merging. "
               "The fix was never reproduced on main. Read live in the shipped tree, the finding "
               "reproduces verbatim: dpr.py:94 resolves the task with "
               "db.query(Task).filter(Task.id == task_uuid).first() - by id ALONE, no project or "
               "company predicate - and then MUTATES it at :97-100 (status 'not_started' -> "
               "'in_progress', db.add(task)). The project is validated at :71-76 and the task is "
               "not checked against it, so posting a DPR with another project's task_id still "
               "advances that foreign task. R2-599 appears in the known orphan list "
               "(scripts/verification/orphan_rows.txt:91), so it was flagged as orphan-lineage by "
               "R2-727's sweep, but being flagged is not being fixed - this is the first of those "
               "rows opened individually and its fix is confirmed absent. No new finding number: "
               "the defect is R2-599 itself and needs its STATUS corrected, not a duplicate."),
    "R2-140": ("CONFIRMED", "E1 PASS. The id-space contradiction is resolved by "
               "company_team_for (chat.py:17-25), the single documented resolver, and "
               "verify_group_membership (:27-41) now builds caller_ids = [current_user.id] plus "
               "the team row's id and filters ChatGroupMember.user_id.in_(caller_ids), so a "
               "membership row written in EITHER id space matches. The permanent 403 deadlock on "
               "send_message / list_messages / list_members / add_member / remove_member / "
               "update_member_role is gone."),
    "R2-468": ("CONFIRMED", "E1 PASS. create_group (chat.py:141-156) resolves the creator through "
               "the canonical company_team_for resolver, 403s when the caller has no team row, "
               "strips any client-supplied created_by, and stamps group.created_by = creator.id."),
    "R2-470": ("CONFIRMED", "E1 PASS with a quantified residual, recorded not filed. add_member "
               "(chat.py:293-309) counts existing members and, when zero, permits the recorded "
               "creator - resolved in BOTH id spaces - to seed the first member, applying the "
               "normal admin gate thereafter. The bootstrap deadlock is broken. Critically "
               "create_group now inserts the creator as an admin member in the same transaction "
               "(:154), so a zero-member group can no longer be produced through the API. "
               "RESIDUAL, matching the register's own 'legacy zero-member rows need ops cleanup' "
               "disclosure and now QUANTIFIED: production holds 3 chat_groups, ALL 3 have zero "
               "members AND created_by IS NULL, so the bootstrap's 'created_by in caller_ids' "
               "test can never pass for them; delete_group (:316-325) also routes through "
               "require_group_admin, so they cannot even be archived through the API. They are "
               "visible via list_groups (which gates on project access only) and permanently "
               "inert. NOT FILED because all three are audit debris in the AK Construction test "
               "tenant - 'ZZ QA Audit Chat B', 'ZZ R5 Chat 2', 'ZZ R10 Chat Probe', created by "
               "earlier audit rounds - not user data, and no real tenant exists pre-launch. "
               "Belongs on the launch cleanup list beside launch_cleanup.sql, as one UPDATE "
               "stamping created_by or a delete of the three rows."),
    "R2-326": ("CONFIRMED", "E1 PASS on every surface. grep for the bare branch "
               "'invoice_type == \"sale\"' across ALL of backend/app returns ZERO hits, so the "
               "one-member branch the finding quoted is gone everywhere and not merely in the "
               "site it was filed against. finance.py now references the canonical buckets "
               "(is_revenue_invoice_type / is_expense_invoice_type / REVENUE_INVOICE_TYPES / "
               "EXPENSE_INVOICE_TYPES) 20 times, so material_sale is booked as revenue rather "
               "than absorbed by an else."),
    "R2-157": ("CONFIRMED", "E1 PASS on all three claims in one endpoint. get_values "
               "(custom_fields.py:336-357) derives the tenant from the PARENT entity - it "
               "resolves entity_type through CUSTOM_FIELD_ENTITY_MODELS (422 on an unmapped "
               "type), loads the entity (404 when absent, which also kills the unchecked-empty-"
               "list existence probe), calls get_company_membership on entity.company_id, and "
               "filters the value rows by that same company_id so a stray foreign-company row "
               "cannot ride along in another tenant's response."),
    "R2-266": ("CONFIRMED", "E1 PASS. dpr.py:24-31 defines _csv_safe_cell prefixing a single "
               "quote to any string starting with the _CSV_FORMULA_PREFIXES tuple (:21) = "
               "('=', '+', '-', '@', tab, CR), and the DPR export applies it to all 8 emitted "
               "cells (:302-310). Note the sibling surface this pattern did NOT reach is "
               "bi_export.py - filed as R2-743 while verifying R2-407."),
    "R2-365": ("CONFIRMED", "E1 PASS on all three elements. DrawingRevision.superseded_at exists "
               "and is surfaced on the response models (:52, :154, :218, :275); approving a "
               "revision stamps superseded_at on every prior non-superseded revision of the same "
               "drawing and clears its own (:325-327); and revisions are ordered created_at "
               "DESC (:129), so the current revision is identifiable."),
    "R2-431": ("CONFIRMED", "E1 PASS. The zero-attendance payroll path no longer swallows: "
               "hr.py:839-860 makes the policy explicit, defaults "
               "assume_full_month_when_no_attendance OFF (no punch = zero pay, the conservative "
               "choice), ORs it with the per-run payload flag for backwards compatibility, and "
               "ALWAYS returns attendance_source as 'recorded' or 'assumed' so an assumed row is "
               "badged rather than silently paid. The register's 'founder to confirm default' "
               "note is a policy decision on the default value, not an open defect."),
    "R2-503": ("CONFIRMED", "E1 PASS on three of the finding's four bullets outright and the "
               "fourth in substance. assets.py:137-150 enforces the running identities the "
               "finding said were absent - accumulated must equal prior accumulated plus this "
               "period's amount, book_value must equal prior book_value minus it, the first "
               "entry's accumulated must equal its own amount, and book_value may not fall below "
               "the schedule's salvage_value. :160-178 adds a per-entry cap of one year under the "
               "DECLARED method (wdv: opening book value x depreciation_pct; slm: (cost - "
               "salvage) / useful_life_years, cost reconstructed as book_value + accumulated). "
               "The schedule row the finding said was 'read by nothing' is now read for both the "
               "salvage floor and the cap. CAVEAT, recorded not filed: the finding's 'twice in "
               "one period' clause is still literally true - there is no per-period uniqueness on "
               "entry_date - but the chain identities plus the salvage floor bound TOTAL "
               "depreciation to (cost - salvage) regardless of how many entries are posted, so "
               "the exposure is entry timing rather than over-depreciation."),
    "R2-113": ("CONFIRMED", "E1 PASS. Same commit as R2-169 (2f3e63f, D7). auth.py:175 and :194 "
               "resolve a NULL or dangling role_id to Viewer grants under the documented D7 "
               "fail-closed policy, and :216/:249 carry the same rule for the unconfigured "
               "non-partner case."),
    "R2-169": ("CONFIRMED", "E1 PASS. Same fix and same evidence as R2-113 - role_id NULL or "
               "dangling resolves to Viewer (auth.py:175, :194)."),
    "R2-138": ("CONFIRMED", "E1 PASS. auth.py:834-835 caps GET /auth/me at 120/minute, so the "
               "runaway-tab scenario the finding described gets bounded 429s instead of holding "
               "pool connections until exhaustion. Root cause and pool hardening are R2-116/"
               "R2-310 and R2-308 respectively, both separately verified."),
    "R2-308": ("CONFIRMED", "E1 PASS. database.py:15-19 builds the engine with pool_pre_ping=True, "
               "pool_size=10, max_overflow=20, pool_timeout=15 and pool_recycle=1800, matching "
               "the register note exactly; build_engine at :23 makes it testable and the live "
               "engine at :31 is constructed through it. pool_timeout 15 is the fail-fast the "
               "finding asked for (was the 30s default that produced the reported TimeoutErrors)."),
    "R2-511": ("CONFIRMED", "E1 + E3. auth.py:34 defines _auth_limit_key composing the "
               "proxy-aware client address with the identifier being authenticated, and it is "
               "wired to 8 routes (:332, :379, :511, :520, :565, :612, :636, :660) - the count "
               "the register claims. backend/Dockerfile:35 runs uvicorn with "
               "--forwarded-allow-ips='*'. E3 2026-08-28: checked the Render service settings "
               "rather than trusting the Dockerfile, because a dashboard override would make the "
               "gate meaningless - Dockerfile Path is 'backend/', Docker Build Context is "
               "'backend/', and the 'Docker Command' override field is EMPTY (it renders its "
               "description then Edit with no value, unlike Dockerfile Path which shows its "
               "value). The Dockerfile CMD is therefore what runs in production."),
    "R2-028": ("CONFIRMED", "E1 PASS. billing.py:14 carries 'from app import models' alongside "
               "the explicit symbol imports at :10-12, so the four qualified models.* references "
               "the finding flagged all resolve."),
    "R2-131": ("CONFIRMED", "E1 PASS on the claim as filed, with a residual filed as R2-748. "
               "app/party_names.py is the single shared resolver and FIVE surfaces use it - "
               "billing.py:294,428 (subcon), finance.py:1144,1280,1343 (ledger + payment "
               "requests), labour.py:29 (contractor), subcon_performance.py:140. All four "
               "surfaces named in the register note are covered; 'Unknown Party' and login-name "
               "storage are gone from them. NOTE ON METHOD: my first coverage grep was truncated "
               "by head -8 and appeared to show labour.py NOT using the resolver, which would "
               "have been a false finding - re-run untruncated it does (labour.py:14). RESIDUAL: "
               "the invoice PDF at billing.py:735-753 does not call the shared resolver and "
               "hand-rolls the OPPOSITE precedence (LibraryParty first, user second, versus the "
               "resolver's user first), so one party can print under two names. Latent - only 1 "
               "of 9 company_team rows has both ids set and its two names match. Filed R2-748."),
    "R2-080": ("CONFIRMED", "E1 + E3. main.py:713 defines GET /health and .github/workflows/"
               "keep_alive.yml pings it on a */10 cron. E3 2026-08-28: /health returns 200 "
               "{'status':'ok'}. The residual the register already discloses (Actions cron "
               "throttling needs an external pinger or a paid instance) is REAL and measured "
               "today: a cold request took 99.4s end to end and a concurrent /health queued "
               "behind it took 19.1s, while the same two calls against a warm instance took "
               "3.0s and 0.3s. That matches the founder's parked 'Render paid instance at first "
               "non-founder signup' item (measured cold start ~90s), so it is not filed as new."),
    "R2-081": ("CONFIRMED", "E1 PASS on every surface. The claim is that ALL total_payable "
               "aggregates filter expense types and Cancelled. Checked all 12 total_payable "
               "sites in analytics.py. The two fed by the UNGUARDED bills query at :163 both "
               "carry inline guards - :244 project_spend and :320 month_spend each test "
               "is_expense_invoice_type(...) and status != 'Cancelled'. Every other aggregate "
               "(:522, :662, :663, :699, :701, :703, :709) is downstream of the query at :623, "
               "which filters Bill.status != 'Cancelled' at the database. NOT A DEFECT, checked "
               "and dismissed: subcontractor_scorecard's bill_count (:417) counts Cancelled "
               "subcon bills, but it is a row count rather than a total_payable aggregate, so "
               "outside this finding's claim, and the cancelled-exclusion class is already filed "
               "as R2-723."),
    "R2-303": ("CONFIRMED", "E1 + E3. analytics.py:314-327 now filters each month to bills dated "
               "INSIDE it (month_start_d <= invoice_date <= month_end_d) before accumulating, so "
               "the += at :328 is a genuine accumulation rather than a re-addition of an "
               "already-cumulative figure; expense-type and Cancelled guards were added in the "
               "same expression. E3 PROVED LIVE 2026-08-28 against AK Construction: "
               "budget_burn_series returns Jul 2026 spend 802754 and Aug 2026 spend 802754 - "
               "FLAT across a month with no transactions, where the finding measured 1051144 "
               "doubling to 2102288. total_spend (802754) equals the final series point exactly, "
               "and independently equals the sum of to_pay across the party ledger (802754), so "
               "two subsystems agree on the number."),
    "R2-304": ("CONFIRMED", "E1 + E3. analytics.py:344-356 no longer fabricates 8.0 for a null "
               "hours_worked: a log with hours contributes its real value, a log without one "
               "increments logs_without_hours and contributes ZERO, and labour_days is None "
               "rather than 0 when there are no real hours. E3 PROVED LIVE 2026-08-28: "
               "labour_productivity returns total_hours 8, logs_without_hours 2, labour_days 1. "
               "The finding proved the defect by the disagreement between two of the product's "
               "own feeds - BI labour-productivity said 8.0 while analytics said 16.0 for the "
               "same records. Analytics now reports 8.0, matching the BI feed exactly, and "
               "discloses the two null-hours logs instead of inventing sixteen hours from them."),
    "R2-497": ("CONFIRMED", "Duplicate row of R2-303, same site and same atomic fix (the "
               "register records both against f87ba34). Verified by the same E1 read and the "
               "same live budget_burn_series result - see the R2-303 entry. Flat Jul/Aug series "
               "at 802754, no compounding."),
    "R2-399": ("CONFIRMED", "E1 + E3, with a residual filed as R2-747. E3 2026-08-28: pulled "
               "the real PDF for ZZ-QA-AUDIT-001 (the finding's own example bill) from production "
               "and extracted its text - the document is uncompressed so this is the rendered "
               "content, not a code inference. Six of the eight Rule 46 elements the finding "
               "tabulated as missing are present and correct: supplier GSTIN + address, recipient "
               "GSTIN, place of supply (27), the tax split, amount in words ('One Lakh Eighteen "
               "Thousand Rupees Only'), the reverse-charge declaration and the signature block. "
               "The split renders IGST 18000.00 with no CGST/SGST because supplier state 29 "
               "differs from place of supply 27 - D4 working correctly on the live document. "
               "RESIDUAL: the HSN/SAC column header prints but its cell is EMPTY, and the "
               "recipient address is absent. Filed as R2-747. NOTE: my first-pass greps for these "
               "elements returned 0 for four of them and were WRONG - the pattern used an escaped pipe under "
               "grep -E, which matches a literal pipe. Re-run correctly, they were present. The "
               "PDF extraction, not the grep, is the evidence here."),
    "R2-444": ("CONFIRMED", "E1 PASS. dpr.py:204-215 now computes material_received_today / "
               "material_used_today by grouping MaterialTransaction rows for the project by type, "
               "instead of reading fields that never existed on the DPR payload. The source is "
               "sound because DPR creation writes those very rows in the same request: "
               "dpr.py:161-170 inserts MaterialTransaction(type='used', source_ref_id=dpr.id) per "
               "consumed material alongside the WarehouseInventory update. The tile and the feed "
               "beneath it therefore read the same write, so 'No consumption logged' can no "
               "longer render above a DPR that logged consumption. CAVEAT, not filed: the tile "
               "keys on func.date(MaterialTransaction.created_at) == utcnow().date() - the "
               "ledger INSERT time - while the feed lists DPRs by the user-entered dpr_date, so "
               "a backdated DPR still counts toward today's tile. UTC 'today' is a codebase-wide "
               "convention (no IST handling anywhere in backend/app) rather than a defect of this "
               "row, and the direction is defensible (the stock movement did happen today), so "
               "this is recorded rather than filed."),
    "R2-271": ("CONFIRMED", "E1 PASS on the path as filed: _validate_bill_line_items "
               "(billing.py:919-968) rejects a revenue invoice with no lines, requires a "
               "description per line, and rejects any bill whose line amounts miss the subtotal "
               "by more than 0.01. There is no bill UPDATE surface - the only PATCH is "
               "/bills/{id}/match, which does not touch subtotal or items_json, and no other "
               "router assigns Bill.subtotal. E1 COVERAGE FAIL, filed separately as R2-745: the "
               "validator has exactly one call site (billing.py:1000, create_bill), and "
               "crm.py:928-949 convert_quotation_to_invoice is a second bill-creation surface "
               "that builds the Bill through the ORM and calls no validator - reopening this "
               "finding's own reconciliation gap whenever additional_charges or round_off is "
               "non-zero, and additionally dropping igst_amount from the tax total."),
    "R2-410": ("CONFIRMED", "E1 PASS on the claim as filed. The ledger list the finding printed "
               "is fixed: tally.py:307-322 (sale) and :327-342 (purchase) post revenue/expense "
               "at the tax-exclusive base, route GST to Output/Input CGST+SGST, and tally_xml.py:"
               "52-54 parents both under 'Duties & Taxes'; the party leg stays gross so the "
               "vouchers balance. Input credit now reaches a tax ledger instead of the P&L, "
               "which was the finding's core harm. RESIDUAL FILED as R2-744: the finding's own "
               "root-cause paragraph called this the third instance of a shared gap, and D4 "
               "(520fb87) closed that gap for reports.py, quotations and the invoice PDF but "
               "never swept tally.py - the split is still an unconditional 50/50, whole-file "
               "grep for igst/inter_state returns 0 in BOTH tally.py and tally_xml.py, and the "
               "comment at :304-305 justifies it by citing a reports._gst_split behaviour that "
               "no longer exists ('Never unconditional 50/50')."),
    "R2-418": ("CONFIRMED", "E1 PASS and the fix is structurally stronger than the finding "
               "asked for: f18ee2b renders each party row's two direction components "
               "(finance/page.tsx:1409 'Pay X / Receive Y'), and the To Pay / To Receive tiles "
               "are now computed as partySums over the SAME companyParties array the rows render "
               "from (:1273-1282, displayed :1322/:1329) rather than from the "
               "/finance/transactions summary the finding blamed - so the two figures reconcile "
               "by construction and the divergence measured is no longer expressible. E3 PASS "
               "2026-08-28 against AK Construction (d3724ec3-edac-4b5f-b296-fc6a013b7b5d) once "
               "the founder switched tenants: /finance/parties returns 7 parties whose component "
               "sums are to_pay 802754 and to_receive 196000, matching the rendered tiles "
               "Rs 8,02,754 and Rs 1,96,000 EXACTLY, and each row's net equals its own displayed "
               "components (upadhyayprateek574: 196000 - 100418 = 95582 as shown). The screen "
               "reconciles. NOTE: an earlier 403 on this endpoint was my own error - I expanded "
               "the handover's abbreviated 'd3724ec3-...7b5d' into a fabricated UUID instead of "
               "reading the real one off the URL. Verifying this row's E3 is what surfaced "
               "R2-746."),
    "R2-172": ("CONFIRMED", "E1 PASS on both surfaces: permissions.py:46-62 WORKFLOW_MODULES and "
               "rbac.ts:33-49 both carry the same 16 modules, covering all ten approve keys the "
               "finding named (crm/safety/quality/reports/drawings/planning/projects/equipment/"
               "attendance/production). MODULES lists are identical (18 entries, same order). "
               "E2 PASS: backend/tests/coverage/test_r2_172_preset_keys_representable.py pins "
               "three contracts - presets are a subset of ALL_PERMISSION_KEYS, the ten keys are "
               "grantable, and rbac.ts mirrors permissions.py; all three fail against the "
               "pre-aa17f72 tree. E0 PASS 2026-08-28: a probe over company_roles jsonb keys "
               "across all 24 production roles returns ZERO keys outside the canonical taxonomy. "
               "The probe was calibrated against a known-positive first (canon with crm:approve "
               "removed returned exactly the 4 expected Manager / Project partner rows), so the "
               "null result is the probe working rather than the probe broken. RESIDUAL, not "
               "filed: the as-filed fix had two conjuncts and only the root one landed - "
               "buildInitialDraft (RolePermissionsModal.tsx:29-35) still silently drops any "
               "stored key absent from ALL_PERMISSION_KEYS instead of merging it back or "
               "surfacing it read-only. Latent only: the backend rejects unknown keys on write "
               "and no such key exists in production, so it cannot fire today. The gate covers "
               "WORKFLOW_MODULES drift but not MODULES drift."),
    "R2-407": ("REGRESSED", "E1 FAIL, verified against the finding AS FILED rather than the "
               "register note. R2-407's closure claims the payslip CSV was 'the last raw-text "
               "exporter'. It was not. R2-185, the parent class finding, names FOUR backend call "
               "sites: labour.py (fixed b3d3a77), dpr.py (fixed beb5823), hr.py (fixed 74b64ce) "
               "and bi_export.py:85 'BI feed - every column, via csv.DictWriter'. bi_export.py "
               "carries zero neutralization: a whole-file grep for lstrip / startswith / escape "
               "/ sanitize / quote-prefix returns nothing, and all three feed routes (projects, "
               "budget-variance, labour-productivity) render through the same unguarded _to_csv "
               "at :86. E3 PROVED LIVE 2026-08-28 in ZZ R8 Throwaway. Filed as R2-743."),
    "R2-185": ("REGRESSED", "E1 FAIL. Same defect as the R2-407 entry above, on R2-185's own "
               "primary claim: the finding says 'One helper, four call sites' and enumerates "
               "them; three were fixed and bi_export.py:85 was not. Closed on the strength of "
               "the BOCW site alone (b3d3a77 'BOCW CSV export neutralizes formula cells'). "
               "Filed as R2-743."),
    "R2-730": ("CONFIRMED", "E0 2026-08-27: material_wastage_reported_by_fkey IS now present in "
               "production, so migration 20260816_000005 has been applied since this was filed. "
               "The finding is resolved against the live database. Note it is the ONLY late "
               "migration that ran - see R2-731's E0 result."),
    "R2-024": ("UNVERIFIED", "E1 PASS: _ensure_demo_company and _seed_demo_projects are gone from "
               "auth.py (grep = 0 hits outside backend/scripts/seed_demo_data.py, which is a "
               "deliberate manual script); OTP_DEMO_ALLOWLIST and OTP_DEMO_CODE both default to "
               "\"\" in config.py:44-45, so with no env set the demo login path is disabled. "
               "The 11 sentinel fallbacks are now guards of the D-V1 shape (chat/page.tsx:43 "
               "'if (!companyId || companyId === sentinel) bail'). E0 OUTSTANDING: D-V1 step 3 "
               "was to DELETE the demo company row and its 5 projects from production. Needs "
               "Supabase. E0 2026-08-27 ANSWERED: NOT done - Demo Construction Ltd, the demo user "
               "and 5 projects are all still live rows. Filed as R2-735."),
    "R2-025": ("UNVERIFIED", "E1 PASS: finance.py:890-894 now has a shared _net_balance helper "
               "returning advance_paid + to_receive - advance_received - to_pay, i.e. assets "
               "minus liabilities. The sign error is gone and all three call sites use the "
               "helper (951 per-party, 1103 per-project, 1122 totals), so the rollup cannot "
               "diverge from the per-row maths. On the finding's own numbers the card now reads "
               "+94,400 rather than -1,41,600. E3 PENDING: needs the Enterprise page live."),
    "R2-046": ("UNVERIFIED", "E1 PARTIAL: p/[project_id]/layout.tsx:28 gains MORE_TABS, an "
               "overflow menu rendered at :231, each entry mirroring that module's legacy "
               "redirect stub and appending ?project= where the company page is project-aware. "
               "It carries 27 entries. The finding named 28 unreachable routes. The missing one "
               "is bare /d/planning - see R2-734. The other 27 are covered."),
    "R2-047": ("UNVERIFIED", "E1 PARTIAL: all nine routes are now reachable - eight via the "
               "Sidebar 'More Modules' collapsible (Sidebar.tsx:245 moreNavItems: analytics, "
               "budget, custom-fields, depreciation, drawings, statutory, towers, wastage) and "
               "/d/home as a Project Hub primary-nav entry at Sidebar.tsx:102. The finding's "
               "'Also:' sub-claim is NOT addressed: login/page.tsx:133 and :138 still send every "
               "successful login to /c/{id}/reports. Filed as R2-733."),
    "R2-099": ("UNVERIFIED", "E1 PASS, and it is a real fix not a cosmetic one. The loader gate "
               "at finance/page.tsx:382 is now 'if (companyId) fetchData()' on [companyId, "
               "projectId]; only the project-scoped P&L call stays behind 'if (projectId)' "
               "(:302), which is correct. txnLoad drives a loading pulse (:1166), an error state "
               "with a working Retry that re-invokes fetchData (:1173-1176), and a truthful "
               "empty string (:1233). The all-zero-with-no-request state cannot recur. E3 "
               "PENDING: live load of the company Finance page."),
    "R2-105": ("UNVERIFIED", "E1 PASS: flushQueue (attendance/page.tsx:495) now POSTs each punch "
               "to /hr/attendance/punch (:512), counts failures, pushes them onto `remaining` "
               "and persists that back (:536, :541), and reports 'Synced N of M; K failed and "
               "remain queued' when anything failed (:545). The silent-destroy path is gone. "
               "CAVEAT worth carrying: R2-728 makes the punch endpoint 500 on Postgres for "
               "punch-OUT, so queued OUT punches will always fail - they are retained rather than "
               "destroyed, so this fix degrades honestly, but offline OUT sync cannot succeed "
               "in production until R2-728 is fixed. E3 PENDING."),
    "R2-112": ("UNVERIFIED", "E1 PASS: backend permissions.py:46 WORKFLOW_MODULES and frontend "
               "lib/rbac.ts:34 WORKFLOW_MODULES are now identical 16-element sets, both "
               "including attendance, drawings and reports - the three keys hr.py:503, "
               "drawings.py:237 and reports.py:201 demand. MATRIX_ROWS (rbac.ts:131-135) emits "
               "the approve row from that same set, so the UI cannot render an em dash for a key "
               "the backend enforces. E3 PENDING: Settings -> Roles & Access matrix live."),
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
    "R2-186": ("REGRESSED", "CORRECTS AN EARLIER VERDICT. This row was previously marked "
               "CONFIRMED on the strength of 'POST /auth/switch-company calls "
               "get_company_membership at auth.py:955 before re-minting the session, so a "
               "non-member cannot switch into a company.' That is true of the endpoint and says "
               "nothing about whether anything invokes it. Nothing does: grep -rn 'switch-company' "
               "over frontend/src returns ZERO hits. CompanySwitcher.tsx:39-47 is the whole switch "
               "implementation - it rewrites the URL segment, sets company_name and calls "
               "router.push, with no re-mint, no token replacement and no company_id update. The "
               "R2-186 fix therefore landed backend-only. Proved live 2026-08-28 in the founder's "
               "session: the UI rendered AK Construction (d3724ec3-edac) while the decoded JWT "
               "claim, GET /auth/me and GET /auth/me/permissions all resolved ZZ R8 Throwaway "
               "(1fa705a4), the latter returning role Owner for the wrong tenant. "
               "/auth/team/invite reads company_id from that same claim (auth.py:974) and takes no "
               "company id in path or payload, so a post-switch invite writes membership into the "
               "PREVIOUS company. Filed as R2-746. Lesson for this round: an endpoint verified in "
               "isolation is not a verified fix - check the caller."),
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
    "R2-106": ("CONFIRMED", "E1: the 'Simulate GPS lock' control is gone from frontend/src "
                            "entirely, and the server sets location_verified=within_geofence at "
                            "hr.py:314 rather than trusting the client. The request schema still "
                            "declares the field, but the handler overwrites it, so a client "
                            "cannot assert its own geofence result."),
    "R2-278": ("CONFIRMED", "E1, complete on BOTH schemas: the http(s) validator fires on create "
                            "(todos.py:82) and update (:110), and due_date is rejected when past "
                            "(:85-92). Its disclosed sibling (repeat_type/status unvalidated) "
                            "sits in R2-717."),
    "R2-340": ("CONFIRMED", "E1: a shared `_task_is_completed` helper reads Task.progress and is "
                            "used at the analytics consumers (:240, :267), with the reports and "
                            "DPR consumers averaging progress rather than bucketing by status."),
    "R2-491": ("CONFIRMED", "E1: member names resolve through the CompanyTeam.library_party_id "
                            "bridge to LibraryParty.name (projects.py:35, :400)."),
    "R2-457": ("CONFIRMED", "E1: no `/c/undefined` construction survives anywhere in "
                            "frontend/src, which is the reproduction path the evidence-close "
                            "claims is gone."),
    "R2-090": ("CONFIRMED", "E1: rides on the R2-050 fix, which I verified - both approval "
                            "handlers check res.ok before patching state, so the live-proven 403 "
                            "experiment (PO showing APPROVED after a refused request) is no "
                            "longer reachable."),
    "R2-092": ("CONFIRMED", "E1: rides on R2-008, verified - the fabricated Compare-RFQs "
                            "recommendation screen is gone and the drawer shows an honest empty "
                            "state."),
    "R2-093": ("CONFIRMED", "E1: rides on the R2-068 sweep, verified - `unsplash` returns zero "
                            "matches across frontend/src, so the fabricated indent photo control "
                            "with its tick confirmation is gone."),
    "R2-167": ("CONFIRMED", "E1: rides on R2-107, verified - the attendance date default is "
                            "`new Date().toISOString().split('T')[0]`, and no hardcoded UI date "
                            "defaults remain."),
    "R2-495": ("CONFIRMED", "E1: evidence-close riding on the M-D wave; the projectFleet filter "
                            "is present."),
    "R2-500": ("CONFIRMED", "E1: evidence-close riding on R2-023, verified - no PHASE build "
                            "label survives anywhere in frontend/src."),
    "R2-027": ("CONFIRMED", "E0 LIVE: face_recognition_logs.created_at exists in Supabase as "
                            "timestamp with time zone, so the Sentry-proven AttributeError 500 "
                            "cannot recur. (My first query said ABSENT - I had used the singular "
                            "table name. The table is face_recognition_logs.)"),
    "R2-086": ("CONFIRMED", "E0 LIVE: same column, same query - present. Rides on R2-027."),
    "R2-307": ("CONFIRMED", "E0 LIVE: same column - present. The commit-before-fail hazard "
                            "depended on the POST response validation failing, which it no "
                            "longer does."),
    "R2-217": ("CONFIRMED", "E0 LIVE: drawing_pins.resolved exists in Supabase as boolean, so "
                            "migration 20260816_000006 did land. Its disclosed sibling "
                            "(handleAddPin local-only on failure) sits in R2-717."),
    "R2-373": ("CONFIRMED", "E0 LIVE: material_indents.approved_by exists as uuid, so migration "
                            "20260816_000001 landed."),
    "R2-370": ("CONFIRMED", "E0 LIVE: bills.cancelled_at exists as timestamp with time zone, so "
                            "migration 20260816_000003 landed. This row also carries the R2-232 "
                            "content onto this lineage, which is why R2-232 verified cleanly."),
    "R2-196": ("CONFIRMED", "E0 LIVE: the revoked_tokens TABLE exists and users.tokens_revoked_at "
                            "exists as timestamp with time zone, so the token-revocation "
                            "migration landed."),
    "R2-102": ("CONFIRMED", "E1 + E0: the ONS- to SF- template change is a Python-side default "
                            "and it is applied at the shipped sites. Note for the record: the "
                            "voucher_number_template column has NO database default in "
                            "production, so the value depends entirely on the ORM supplying it - "
                            "correct today, but a non-ORM insert would leave it null."),
    "R2-206": ("NOT_IN_PROD", "E0 LIVE, and this one is a real miss. The row claims reported_by "
                              "was converted to a UUID FK by migration 20260816_000005. In "
                              "Supabase it is still `character varying`, there is NO foreign key "
                              "on it, and 2 of the 3 material_wastage rows hold non-UUID free "
                              "text. The boot sync adds columns but cannot change a column's "
                              "TYPE, so this migration never ran. Raised as R2-730."),
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
