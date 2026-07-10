# SiteFlow — Setting Tab (company-level) — biggest remaining tab, 9 sections

## Context
Next after CRM (signed off). This is the largest remaining tab — 9 sub-sections, several with their own sub-tabs. **Audit first, hard** — a lot already exists: `backend/app/routers/settings.py` has `/company`, `/branches`, `/approval-rules`, `/holidays` CRUD. Models: `CompanyBranch`, `CompanyRole`, `ApprovalRule` (feature_type/min_amount/max_amount/levels/approvers), `CustomField`/`CustomFieldValue` (generic, entity_type/field_type/options — already flexible). Frontend: `frontend/src/app/c/[company_id]/settings/page.tsx` already exists at 728 lines. Read everything first, map against spec below, extend gaps only. This will take several rounds — go section by section, stop after each, report back.

Left sub-nav (9 sections, in order): **Company | Roles & Access | Payroll | Holiday & Weekoff | Workflow Controls | Document & Fields | Multi Level Approval | Integrations | Subscription**

## 1. Company (3 sub-tabs: Company Details | Branches | Business Profile)
- **Company Details**: Company Name, Phone Number, Company Primary Address (text), Save. Upload widgets: Logo, Signature, Stamp, Watermark (4 separate upload slots — check if these exist as file fields anywhere, likely net-new, reuse Files tab's BLOB storage pattern).
- **Branches**: 3 stat cards (Total Branches / Primary Branch name+city / Other Branches count), "+ New Branch" button, branch cards (avatar, name, "Primary" badge, address, "Primary Address" chip, 3-dot menu). New Branch form: Branch Name, GST, "Project Geo Location" (Google Address textarea), Address Details (Address Line 1, City, State/Province, Zip, Country dropdown default India). Wire to existing `CompanyBranch`/`/branches` endpoints — check field parity, extend if GST/geo-location missing.
- **Business Profile**: 3 selector cards — "Avg. Business / Year" (1cr-10cr / 10cr-20cr / 20cr-50cr / 50cr-100cr, single-select), "Company Size" (1-20 / 20-50 / 50-100 / 100-200, single-select), "Construction Type" (dropdown + removable chips, multi-select, e.g. "Developer", "Residential Real Estate"). Save button. Likely net-new fields on company/settings model.

## 2. Roles & Access (2 sub-tabs: Team & Access | Roles)
- **Team & Access**: "You have used N out of M team member slots" + info icon (plan-based seat limit), "+ Add Member" button, search, table: Name | Role | Access | Action. Wire to existing `CompanyTeam`/`CompanyRole`.
- **Roles**: table Name | Description, canned role list observed: Admin, Client, Accountant, Sub Contractor, Associate HR, Project partner, Site Engineer, Manager, Supervisor, Viewer. **No permission-matrix grid was visible in recon** — roles appear to be flat named labels (possibly with fixed built-in permission sets, not user-configurable per-permission toggles). Don't invent a permission matrix that wasn't observed — build the flat Name/Description list + seed these 10 default `CompanyRole` rows per company, and flag if you find evidence elsewhere in the app (e.g. referenced by an existing permission-check function) that a real matrix should exist.

## 3. Payroll (settings, 3 sub-tabs: Leave Policy | Holiday Calendar | Salary Template)
Note: distinct from the Payroll *tab* already built (People/Attendance/etc) — this is company-wide policy templates that feed it.
- **Leave Policy**: list + "+ Create New", empty state "No leave policy templates found". Create form: Template Name, "Leave Type Quotas" + "+ Add New Type" (repeatable leave-type + day-count rows). This is likely the same concept as `LeaveTemplate` already built for the Payroll tab (casual/sick/earned leave days) — **reuse `LeaveTemplate`, don't create a parallel entity**; if the UI here needs more flexible "add any leave type" instead of the fixed casual/sick/earned columns, extend `LeaveTemplate` to support a JSON list of {type, days} instead of 3 fixed columns — but only if needed, check first.
- **Holiday Calendar**: same as Payroll tab's Holidays sub-tab (Holiday Calendar heading, +Add Holiday, table Holiday|Date|Day) — this is likely the exact same `Holiday` model/UI, just also reachable from Settings. Reuse, don't duplicate.
- **Salary Template**: list (Template Name | Description | Status) + "+ Create New". Create form is the **exact same Salary Breakup cascade** already built for the Payroll tab's "Add Salary Breakup" (Template Name, Description, Monthly CTC + frequency, Day Off, Basic %-of-CTC computed, Allowances computed Fixed Allowance, Gross Salary computed, Deductions, Net Amount computed). This is a **reusable, named, saveable version** of that same cascade — check if the Payroll tab's salary breakup was built as inline-only (per your Round 1 recommendation) or as a template; if inline-only, this is where the "Template" concept actually belongs — build it here as the canonical reusable template, and have the Payroll tab's "Add Salary Breakup" offer these saved templates via the "Template" dropdown it already has (which was left as a stub "select" per the original build). Reuse the calculation logic, don't duplicate it.

## 4. Holiday & Weekoff
Single page, not the same as Payroll's Holiday Calendar (this is broader — weekly off + holidays together, described as feeding Tasks/Payroll/Forecasts/date-pickers globally).
- "Weekly off days" card: 7 day-toggle circles (Su-Sa), green="Working" red="Weekoff", company-default (projects can override — check if a per-project override already exists, e.g. project settings, otherwise flag as follow-up, don't over-build).
- "Public holidays" card: same Holiday Calendar UI as above (year dropdown, add date+name, month-grouped list) — **this and Payroll's Holiday Calendar and the Payroll tab's Holidays sub-tab may all be the same underlying `Holiday` data, surfaced in 3 places**. Confirm and reuse one model/endpoint everywhere, don't triplicate.

## 5. Workflow Controls (4 sub-tabs: Entry Controls | Progress Controls | Finance Controls | Material Controls)
All are simple toggle-based restriction settings, company-scoped. Likely needs one new small settings table (key-value or explicit columns) since these don't map to `ApprovalRule`.
- **Entry Controls**: "Restrict creating entries older than (N) days" (number + toggle), "Restrict editing entries older than (N) days" (number + toggle).
- **Progress Controls**: "Restrict progress more than estimation" (single toggle) — ties into Project Tab's Task progress field, should actually enforce (reject progress updates beyond 100% or beyond estimate) if turned on — check feasibility, flag if deferring enforcement to a later pass.
- **Finance Controls**: "Pre-Tax Deduction/Retention" toggle (apply deduction/retention before tax, changes the Net Amount formula order in Transaction/Quotation calculations — this is a real behavioral switch, not just a stored flag, flag the complexity of actually wiring this into every calc that uses Deduction/Retention).
- **Material Controls**: 6 toggles — Restrict Material Usage, Restrict Subcontractor Material Issue, Restrict Material Transfer, Restrict Production Material, Material Request Restriction, Material Purchase Order Restriction — plus "Restrict BOM Material" toggle, plus "GRN Numbering" radio (Project Level / Company Level).

For all of Workflow Controls: build the settings storage + toggle UI as the priority (that's the bulk of the spec). Actually enforcing each toggle against every relevant action across the whole app is a large secondary effort — build the storage/UI now, flag enforcement as follow-up work per-toggle rather than silently skipping or silently claiming it's enforced.

## 6. Document & Fields (4 sub-tabs: PDF Template | Terms & Conditions | Number Format | Custom Fields)
- **PDF Template**: 2 radio cards — "Choose your Own PDF Template" (Default/Custom), "Document Company Name Display" (Company Name/Branch Name).
- **Terms & Conditions**: 5 independently-editable textareas, one per document type — Invoice Terms, Quotation Terms, Subcon Terms, BOQ Terms, Purchase Order Terms. Each has prefilled boilerplate (reuse the boilerplate already seen in Project Tab's Sales Invoice/Subcon Work Order/CRM Quotation Terms fields — this Settings page should be the **source of the default text** those forms pre-fill with, not a disconnected duplicate).
- **Number Format**: Currency Decimal Places (default 2), Quantity Decimal Places (default 3) — company-wide formatting config. Check if `fmtINR`/similar formatting helpers already respect a configurable decimal count; if hardcoded, this setting won't do anything yet — flag.
- **Custom Fields**: already has a real backend (`CustomField`/`CustomFieldValue`, generic entity_type). Build the UI: document-type selector dropdown, "+ New Custom Field", table (Field Name | Data Type | Set Default | Default Value).

## 7. Multi Level Approval
Left panel: list of ~15 categories (Asset Transfer, Design Version, Equipment Expense, GRN Material, Inspection Form Response, Leave Application, Material Issue, Material Purchase, Material Transfer, Material Used, Other Expense, Payment Entries, Payment Request, Purchase Order, RFQ). Right panel per category: either **flat** (single approver chain, "Add Approvers & Levels for X", Publish button) or **amount-range** (categories like Equipment Expense get a "+ New Approval Rule" button instead, supporting multiple parallel min/max-amount-scoped rule blocks, each with its own approver chain + independent Publish state).

Existing `ApprovalRule` model already has `feature_type`/`min_amount`/`max_amount`/`levels`/`approvers` (comma-separated) — this maps well to the amount-range pattern. For flat categories, just use one `ApprovalRule` row with `min_amount=0, max_amount=None`. Approvers field is currently a comma-separated string — the recon shows per-level approver chips (removable, one role/person per level) — check if `levels` + comma-separated `approvers` can represent "Level 1: Admin, Level 2: X" or if it needs restructuring to a proper ordered list; extend minimally if needed rather than a full rewrite.

## 8. Integrations (Google Sheets tab observed — likely more tabs exist, only 1 captured)
- Toggle "Enable Google Sheets Integration"
- "Authorized Phones" section: Country Code + Phone Number + Label, "Add Phone" button, list.
- "Activity Log" section: fetch attempt log (granted/denied/errored) — empty in recon, table columns not visible.
This is a narrow, specific integration — low priority relative to everything else. Build the toggle + phone whitelist storage/UI; the actual Google Sheets API-side integration (add-on that calls in) is out of scope for a UI parity pass — flag clearly that only the authorization/storage layer is being built, not a working Google Sheets add-on.

## 9. Subscription
Mostly display-only: 4 stat columns (Current Plan, Start Date, End Date, Renewal Date), "Need Help? Contact Support" banner. Low complexity — likely just reads from existing company/subscription fields if any exist, or stub with static "Free Plan" data until real billing exists (SiteFlow doesn't have real billing yet per earlier conversation about Vercel/Render/Supabase free tier for first 100 users) — don't build fake Stripe/payment UI, just the display card.

## Build order (stop after each, report back)
1. Company (Details/Branches/Business Profile)
2. Roles & Access (flat, no invented matrix)
3. Payroll settings + Holiday & Weekoff (reconcile the 3x Holiday duplication first)
4. Workflow Controls (storage/UI only, flag enforcement gaps per-toggle)
5. Document & Fields (wire Custom Fields to existing backend, connect T&C defaults to where they're consumed elsewhere)
6. Multi Level Approval (extend ApprovalRule minimally)
7. Integrations (Google Sheets auth layer only) + Subscription (display only) — batch these two, both small

## Rules (unchanged)
- Audit existing settings.py/models/728-line page fully before each section.
- No half-done pages, no fabricated enforcement (a toggle that's stored but does nothing must be flagged, not silently presented as working).
- Reconcile duplication across the 3 places Holiday data might live before building any of them.
- Full file-touch disclosure, accurate reporting (say what you actually found, not assumptions) — every round.
