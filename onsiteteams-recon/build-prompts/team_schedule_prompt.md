# SiteFlow — Team Schedule Tab (company-level, not project-scoped)

## Context
Next tab after Project Tab (now complete). Team Schedule is a **top-level company nav item** (sidebar: Dashboard, Report, Project, **Team Schedule**, Finance, Payroll, CRM, Library, Setting, ...) — NOT inside the project detail chrome. It aggregates data **across all projects** in the company.

Existing repo has a partial/placeholder `frontend/src/app/c/[company_id]/d/team-action/page.tsx` (595 lines) — read it first, it may already cover some of this.

## A. Schedule sub-tab — "Team Gantt View"

Cross-project Gantt aggregating tasks from every project into one company-wide timeline.

**Toolbar:**
- View granularity dropdown: Day / Week / Month / Year (default Month)
- From–To date range picker
- Filter by assignee dropdown: All assignees / Unassigned / (named team members)
- All statuses dropdown: All statuses / Not Started / Ongoing / Completed
- Filter by project dropdown: All projects / (named projects)
- Export dropdown: Export to PDF / Export to Excel / Export to MSP (MS Project format)

**Table/Gantt:**
- Columns: S.No, Task name (grouped, expandable — group rows like "Concreting Work", "MASONRY WORK" mirror the per-project Task tab's grouping)
- Gantt bars plotted across month/week columns (timeline header shows year + month labels, e.g. "2025 / Nov Dec / 2026 / Jan Feb")
- "Unassigned" group at top — tasks with no assignee, shown as a distinct colored bar
- Group bars show aggregate progress % (reuse the same weighted-progress-rollup logic already built for the per-project Task tab)
- Bar colors: yellow/gold = Unassigned, green = assigned/in-progress (with % label inside bar)

**Data source:** this is a read-only rollup view over the existing `Task` table (already has `progress`, `start_date`, `end_date`, `assigned_to`, `parent_id` for grouping from the Project Tab build) — just remove the project_id filter and pull across the whole company, add project_id as a column/grouping dimension if useful. Do NOT duplicate the Task model or invent a parallel schedule entity — reuse it.

## B. Timesheet sub-tab

**List view:**
- Toolbar: Party filter, Date Filter, search box, "+ New Timesheet" button (top right)
- Table columns: Date, Party, Start & End Time, Duration (auto-computed, e.g. "2 Hr 3 Min"), Project
- Empty state: "No Timesheet Available. Add New Timesheet." with illustration

**"+ New Timesheet" form (side panel):**
- Date picker (defaults today)
- Party Name — search-select, pulls from **all party types** (seen in dropdown: "Party" type=Material Supplier, "Yash Desai" type=Client, "Yash Desai" type=Staff — i.e. searches across the full Party Type taxonomy, not just staff/employees), with inline "+ Create Party" option
- Remarks (textarea)
- Upload Files
- Note: Start/End time fields must exist somewhere in this form (the list shows "7:40 PM - 9:43 PM" — check if it's a follow-up step or fields below the fold not captured in the screenshot)
- Project (shown as a column in the list, so the form must have a project link somewhere too — likely a field not visible in the captured crop)

## Backend schema decision — READ THIS BEFORE BUILDING

The existing `Timesheet` model (`backend/app/models.py:494`) is **weekly-header + entries**: `employee_id` (FK to `staff_employees`), `week_start`/`week_end`, `status` (draft/submitted/approved), tied 1:many to `TimesheetEntry` (task_id, hours, start_time, end_time, duration). This is an HR/payroll timesheet — different shape from what's needed here.

The recon spec's Timesheet is **one row per time-log entry**: Party (any party type, not just employees) + single Date + Start/End time + Duration + Project + Remarks + files. No week grouping, no submit/approve workflow, no task linkage — much simpler.

**Do not force-fit these two.** Options, pick the one that avoids duplicating logic while not breaking the existing HR/Payroll timesheet flow (check where `Timesheet`/`TimesheetEntry` are used elsewhere — payroll routers likely depend on the weekly-header shape):
- (a) New lightweight entity (e.g. `TeamScheduleTimesheet`) for this simple party-linked time log, separate from HR's weekly `Timesheet` — cleanest, no risk to payroll, some duplication of concept but different enough shape that forcing one model would hurt both.
- (b) Extend existing `Timesheet`/`TimesheetEntry` to optionally support a party_id + skip the week/submit-approve fields when used from this tab — riskier, touches payroll-critical model.

Recommend (a) given how different the shapes are (party taxonomy vs employee-only, single entry vs week+entries), but flag your reasoning and any risk before deciding unilaterally — same as the Party bridge decision earlier.

## Rules (unchanged, still apply)
- No half-done pages, no fabricated formulas, no missing columns.
- Reuse existing Task data for the Gantt (don't duplicate).
- Full file-touch disclosure, every round.
- One sub-tab at a time if needed — Schedule first (reuses existing Task infra, should be fast), then Timesheet (needs the schema decision above first).
- Stop after each, report back for verification.
