# SiteFlow — Payroll Tab (company-level)

## Context
Next after Finance (done). Payroll is a top-level company nav item (Dashboard, Report, Project, Team Schedule, Finance, **Payroll**, CRM, Library, Setting...).

**Audit first.** Substantial backend already exists: `backend/app/models.py` has `PayrollRun`, `PayrollLineItem`, `LeaveRequest`, `Holiday`, `LibraryWorkforce`. `backend/app/routers/hr.py` already has `/employees`, `/attendance/punch`, `/attendance/{project_id}/{date}`, `/timesheets` (+ entries/submit/approve, project + company list), `/payroll/run`, `/payroll/{run_id}/payslips`, `/payroll/upload` (CSV), `/leaves/{company_id}` (+ approve). **But there is NO frontend page for Payroll at all** — no `frontend/src/app/c/[company_id]/d/payroll*` directory exists. This is a from-scratch frontend build wired to a lot of existing backend, not a full-stack build. Read `hr.py` fully first to know what's already callable before adding new endpoints.

URL pattern observed: `/d/payroll-attendance/people`, `/d/payroll-attendance/attendance`, etc — use `d/payroll-attendance` as the route base with sub-tab segments.

## A. Sub-tabs: People | Attendance | Team Leaves | My Leaves | Holidays

## B. People sub-tab
Toolbar: **Office Staff / Site Staff** toggle (pill buttons), Search Payroll, status dropdown ("Active"), **+ New Payroll** dropdown → "New Office Staff" / "Upload Payroll CSV" (backend `/payroll/upload` already exists for this — wire it, don't rebuild).

Table columns: for Office Staff — Party (name); for Site Staff — Party | **Associated Projects** (extra column, since site staff can work across multiple projects).

**Click a person → "Payroll Details" side drawer** (title = person's name):
- SALARY AMOUNT* (numeric, unit selector "per month")
- **"Add Salary Breakup"** link → opens Salary Breakup sub-modal (see section F)
- SHIFT TIMING (Start Time – End Time, expandable row)
- SHIFT HOURS* (numeric, unit "per shift")
- OVERTIME* (numeric, unit "per hour")
- DESIGNATION* — "Select Designation" (chevron, opens a picker — Designation looks like a small master-data entity, check if it exists anywhere in the repo already; if not, net-new simple lookup table, company-scoped, creatable)
- LEAVE TEMPLATE* — "Select Leave Template" (chevron — Leave Template is a policy entity: how many leave days of what type per year; check for existing model, likely net-new)
- COST CODE* — links to existing `library_cost_codes`

**Party picker for adding someone to Payroll**: "SELECT PARTY" side panel — search box + party list pulled from `library_parties` (shows type e.g. "Staff"), "+ New Party" quick-add. Reuse the Party entity, don't create a parallel "employee name" concept — link Payroll record to a `library_parties` row (or `StaffEmployee` if that's already the canonical link — check `hr.py`'s `StaffEmployee` model and reconcile which is the source of truth; don't create a third).

## C. Attendance sub-tab
Office Staff / Site Staff toggle, Active filter dropdown, date navigator (prev/next day arrows + day badge, month picker), summary counts top-right: **0 Present / 0 Absent / 0 Paid Leave / Week Off** (color-coded legend dots).
Table: Name | Attendance Status.
Wire to existing `/attendance/{project_id}/{date}` and `/attendance/punch` endpoints — this is company-wide across all projects/staff, so likely needs a company-scoped variant of the attendance list endpoint (check if one exists, add if not, following the same pattern as Team Schedule's company-wide Task rollup).

## D. Team Leaves sub-tab
"Team Leaves" heading, "Year: {year}" subtitle.
Table: Name | Leave Type | From | To | Days | Applied On | Status.
Empty state: "No leave applications for this year."
Wire to existing `/leaves/{company_id}` GET + `/leaves/approve/{leave_id}` PUT.

## E. My Leaves sub-tab
Shows the logged-in user's own leave balance/requests. Empty/unconfigured state observed: **"!! No leave template assigned for your account this year."** — meaning this tab is gated on the Leave Template being assigned to the user first (see Leave Template entity in section B). When a template IS assigned, this should show leave balance + apply-for-leave flow using the same `/leaves/{company_id}` POST endpoint, scoped to the current user.

## F. Holidays sub-tab
"Holiday Calendar" heading + subtitle "Create your own Holiday Calendar for your company."
"+ Add Holiday" button (top right).
Table: Holiday | Date | Day (day-of-week auto-derived from date, not stored separately).
**Add Holidays modal**: Holiday Name (text), Date (date picker) → Save. Toast "Holiday added successfully" on save.
Wire to existing `Holiday` model — check if `hr.py` has CRUD for it yet; if not, add (small, standard CRUD).

## G. Salary Breakup modal (opened from "Add Salary Breakup" in People drawer)
Header: "Salary Breakup" / "New Salary Breakup". Template dropdown ("select" — a salary-template picker, likely a reusable preset; check if worth modeling as its own small entity or just inline fields for v1 — recommend inline-only for v1, flag template-reuse as a follow-up, don't over-build).

Fields:
- **Monthly CTC*** — amount + frequency dropdown ("Monthly")
- **Day Off** — input + dropdown (weekly day-off selector)
- Section "Salary Components":
  - **Basic*** — numeric input (e.g. "8, 10 etc" placeholder — looks like a percentage) + dropdown "% of CTC" (calc-mode: % of CTC vs likely a flat-amount alternative) + computed "₹0" value (= Basic% × Monthly CTC)
  - "Allowances" section — "+ New Allowance" (creatable line items), "Fixed Allowance" computed total (₹)
  - **Gross Salary** — computed = Basic + Allowances
  - "Deductions" section — "+ New Deduction" (creatable line items)
  - **Net Amount (Per Month)** — computed = Gross Salary − Deductions

This cascade must be real, not stubbed: Basic (from % of CTC or flat) → + Allowances → Gross Salary → − Deductions → Net Amount. This directly feeds the payslip computation — check `hr.py`'s existing `_compute_payslip()` function (line 479) before building a parallel calculation; extend/reuse it if the shape is compatible, since payroll runs already depend on it.

## H. Workforce (Site Staff "Add Workforce" flow — reuses Library's Workforce Library, seen from Payroll context too)
"WORKFORCE LIBRARY" picker: Search Workforce, "Add New Workforce" button, "Select (N/M)" counter, "+ New Workforce" link.
**Add Workforce form**: WORKER TYPE* (e.g. "Mason", "Electrician" — free text or creatable dropdown) + pay-frequency toggle (Hourly/Daily), **SALARY PER SHIFT*** (numeric), **SHIFT HOURS** (numeric, default 8), COST CODE (link).
This reuses `LibraryWorkforce` (already exists in models.py) — extend if fields are missing, don't duplicate.

## Rules (unchanged)
- Audit `hr.py` + models fully before writing new endpoints — a lot already exists, this is mostly a frontend build.
- Reconcile `StaffEmployee` vs `library_parties` as the canonical "who is this payroll record for" — don't create a third identity concept.
- Designation and Leave Template are likely net-new small lookup entities — keep them simple (name + company_id, creatable), don't over-engineer.
- Salary Breakup cascade (Basic→Allowances→Gross→Deductions→Net) must be real and should reuse/extend `_compute_payslip()` in `hr.py`, not duplicate payroll math.
- No half-done pages, full file-touch disclosure every round.
- One sub-tab at a time: People (+ Salary Breakup + Workforce, since they're all reached from People) → Attendance → Team Leaves → My Leaves → Holidays. Stop after each, report back for verification.
