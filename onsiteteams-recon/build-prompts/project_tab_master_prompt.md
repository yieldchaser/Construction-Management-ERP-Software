# SiteFlow — Project Tab Parity Build Prompt (for coding agent)

## Context
You're building **SiteFlow**, a construction-ERP SaaS competing with **Onsite Teams**. Dashboard tab and Report tab are already done. This prompt covers the **Project tab** — both the top-level Project List (company home) and the full Project Detail workspace (all sub-modules inside an opened project).

This spec was reverse-engineered from 142 competitor screenshots. Existing repo already has partial scaffolding under `frontend/src/app/c/[company_id]/p/[project_id]/*` (finance, hr, labour, procurement, subcon, budgeting, budget, equipment, attendance, quality, safety, statutory, three-way, towers, wastage, planning, dpr, drawings, mom, custom-fields, face-recognition, depreciation, chat, crm, reports). **Audit what exists first** — reuse/extend where a module already covers the competitor feature, build net-new where a module (Party, Transaction, Task/Gantt, Material, BOQ, Files, To Do, Inspection) is missing or shallow. Backend: FastAPI routers exist for most domains (`backend/app/routers/*`) — extend, don't duplicate.

**Non-negotiable rule**: no half-done pages, no formula left unimplemented, no missing table column, no frontend built without backend wired (real DB reads/writes, not mock data), no computed value hardcoded to 0. Every number below marked "computed" must actually calculate from real data.

---

## A. Top-Level Project List (Company Home / Project tab landing)

Route: company home page listing all projects.

**KPI stat cards (top row)**, each clickable, each with info tooltip:
- Approval (Pending) — count of pending approvals across all projects
- Material (Pending) — count of pending material requests
- To Do (Pending) — count of pending to-dos assigned to user

**Toolbar**: "All" project-count filter dropdown, Stage filter dropdown, Category filter dropdown, Search Projects input, export/download icon, "+ New Project" button (role-gated — hidden for Viewer role).

**Table columns**: Name (avatar/initials + project name + city/location subtext), Progress (% complete + progress bar, computed from task rollups), In/Out (₹ cash in / ₹ cash out per project, computed from transactions), To Do (pending count badge), + (customizable/add column).

**Row actions**: pin/star icon (pins to sidebar "Pinned Projects"), 3-dot overflow menu (edit/delete/etc).

**Role-based visibility**: Admin sees all 3 KPI cards + create button + In/Out + To Do columns. Viewer role sees reduced table (no In/Out, no To Do columns), no create button, only To Do KPI card.

**Create Project flow** (2-step):
1. Project Details step: Project Name, Address, City → Continue
2. Add Team Member step → Finish
Right-side live preview panel shows a mock of the resulting project dashboard as user fills the form.

**Project Settings modal** (3 sub-tabs): Project Details, Members, Location Structure.
- *Project Details* fields: avatar/logo, Project Code, Project Name, Project Stage (dropdown), Project Category (dropdown), Start Date, End Date, Project Address (opens a full address sub-form: Address Heading, Google-Places-style address autocomplete, Address Line 1, City, State/Province, Zip, Country), Company Branch (dropdown of company addresses), Attendance Radius (meters — geofence radius for check-in validation), Project Value (currency), Project Orientation (text), Project Dimension (text), Scope of Work (textarea). Bottom: "Delete Project" (destructive) and "Save".
- *Members* sub-tab: search party, list of members with avatar, name, role (e.g. "Yash Desai (Super Admin)"), phone, role badge. Role-based action restriction (permission-denied toast for unauthorized actions).
- *Location Structure* sub-tab: hierarchical location/zone list (e.g. towers, floors, wings) — "+ Location" button, table of Location Name, "Add Location" modal (Name field). Used to tag tasks/materials/attendance to sub-locations within a project.

---

## B. Project Detail Workspace — Header Chrome (present on every sub-page)

- Project avatar + name with dropdown (project switcher)
- Status dropdown/badge: Ongoing / Completed / On Hold / Upcoming (verify exact enum against existing schema)
- Like/thumbs-up icon, invite-person icon, settings gear (→ opens Project Settings modal above), notifications bell, user avatar
- Sub-navigation tabs: **Dashboard | BOQ | Party | Transaction | To Do | Task | Attendance | Material | Subcon | Files | MOM** (Equipment and Inspection appear as additional tabs in some contexts — treat as full tab set; confirm none is feature-gated/hidden by plan)

---

## C. Dashboard tab (Operational / Financial toggle)

### Operational view
- Project Status widget: status pill + donut ring showing overall % complete + Project Value
- Planned vs Actual Dates widget: Start/End for both planned and actual
- MOM widget: latest minutes-of-meeting list, "view all" link
- Key Personnel widget
- Month-on-Month Progress chart: line/bar, Y = Cumulative Progress %, X = months
- Task Progress donut: Not Started / In Progress (with "Delayed" sub-count) / Completed
- Attendance Overview bar chart: grey bars = required workers per weekly schedule target vs actual, X = last 7 days
- Project Photos thumbnail grid
- Contractor Summary widget

### Financial view — 6 KPI tiles, each with "View Breakup" drill-in modal:
1. **Estimated Budget** → modal "Estimate Cost Code Budget": Total Budget (sum across cost codes), table (Cost Code Name, Budget Amount, Actual Expense), "+ Add Cost Code"
2. **Total BOQ Value** — shows "Estimated Margin: ₹X" = BOQ Value − estimated cost
3. **Total Sales Invoice** — shows "% of BOQ value" = Sales Invoice Total / BOQ Value
4. **Total Expense (Till Date)** — shows "% of Budget used" = Expense / Estimated Budget
5. **Work done value** — shows "% of BOQ value" = Work Done / BOQ Value
6. **Net Cash Position** → modal: Project Balance + Receivables (to be collected) − Payables (due to vendors) = Net Cash Position. Formula must be implemented exactly.

Additional Financial-view widgets:
- **Budget vs Expense by Cost Code**: "Over Budget (N)" / "Under Budget (N)" toggle pills, variance % per cost code, "View Breakup"
- **BOQ vs Work Done vs Invoiced**: 3-bar comparison (BOQ Value / Work done / Invoiced), alert banner when work-done > invoiced: "₹X of completed work has not been invoiced. Raise invoices now to improve cash position." + "Raise Invoice" CTA button (deep-links to Sales Invoice creation)
- **Expense Breakup** bar chart by category: Material Expense, Salary, Debit Note, Other Expense, Site Expense, Subcon Expense
- **Cashflow cumulative** chart
- **Payables vs Receivables** donut chart

---

## D. BOQ tab
Table columns: S.No., Client Name, Boq Title, Milestone (done/total), Physical Progress (%), BOQ Value, Billed Value.
"+ BOQ" → Create BOQ modal: BOQ Subject, Client Name (search-select, can create new party inline via Add Party sub-modal — see Party schema below).

## E. Party tab
Summary tiles: Advance Paid (₹, green), To Pay (₹, red) — both aggregated across all parties on the project.
Table: Party Details, Type, Balance (₹), Status. Filters: search, Filter button, Active/Inactive status dropdown.

**Party creation schema** (used everywhere a party is created — BOQ client, transaction counterparty, subcon, labour contractor, etc.):
- Party Name, Phone (country code selector + number), Email
- Party Type (single-select): Client, Staff, Investor, Worker; grouped under "Vendor": Labour Contractor, Material Supplier, Equipment Supplier, Other Vendor, Contractor
- Address (multiple addresses supported)
- Party ID (auto-generated e.g. "PID-1", editable)
- Date of Joining
- Aadhaar number + document upload
- PAN number + document upload
- Opening Balance step (immediately after creation): toggle "Party will pay" / "Party will receive" + Amount

## F. Transaction tab
Two sub-tabs: **Transactions** | **Payment Requests**.

Always-visible summary cards:
- **Project Balance** = In − Out (₹), with In/Out breakdown, info tooltips
- **Margin** = Sales − Expense (₹, can be negative), with Sales/Expense breakdown, info tooltips, "%" toggle button (view margin as percentage)

Table columns: Party Name, Project Name, Amount (+ type icon/tag per row — color-coded by transaction type: green=Payment In, red=Payment Out, blue=Sales Invoice, purple=Subcon Expense, orange/truck=Material Purchase, etc.)

**"+ Transaction" dropdown, full taxonomy — implement ALL of these as distinct transaction types with their own forms:**

*Payment group:*
- Payment In (Cash / Bank Transfer / Cheque radio — Cheque adds Bank Account + Due Date fields, Bank Transfer adds Bank Account field, Cash adds nothing extra), Cost Code, Reference No., "More Details" expandable, file upload
- Payment Out (same schema as Payment In)
- Debit Note (auto-numbered "DN-1", date, party, line items via "+ New Item", Tag Expense, Reference No., Notes, upload)
- Credit Note (mirror of Debit Note, tags "Sales" instead of "Expense" — money in vs out)
- Party to Party Payment (Payment From / Payment To search fields, Amount, Description with category picker: Customer, Designer, Equipment, Food and Travel, Fuel, Labour, Material, Others, Salary, Sub Contractor, Transport, Cost Code, Reference No.)

*Sales group:*
- Sales Invoice: Item Level Tax toggle, Client, Date, auto invoice no ("INV-1"), Select BOQ Items (pulls from BOQ billing activities) or "+ Add Item", Item Subtotal, Tax %, Additional Charges (removable rows), Discount, **Total = Subtotal + Tax + Additional Charges − Discount**, Deduction, Retention (both separate sub-collections with their own item lists and running Total), **Net Amount = Total − Deduction − Retention (± Round Off)**, Round Off checkbox, Bill To/Ship To address block (Bill From/Bill To/Ship From/Ship To, each independently selectable, "Same as X" checkboxes to copy), file upload
- Material Sales: same computed-totals pattern as Sales Invoice, but items pulled from a **Materials Inventory catalog picker** (not free-text), same Bill To/Ship To block

*Expense group:*
- Material Purchase: Purchase Invoice Date, Party, "+ Add Materials" (from Material Inventory/Library picker, with "+ New Material" and "+ Import from Library"), Sub Total, Additional Charges (%), Discount, Total Amount, Deduction, **Net Amount** (Round Off), Paid Amount, **Balance Due = Net Amount − Paid Amount** (read-only), Cost Code, Purchase Invoice No., Bill To/Ship To, Note, Upload Files, **Scan Bill (OCR upload)**
- Material Return: auto invoice no "MRET-1", date, party, "+ Add Materials", Sub Total, Discount, Additional Charges, GST, Total Amount, Reference, Note, upload
- Material Transfer: Transfer Out No (editable), date, From (readonly = current project), To (dropdown — select destination project, inter-project transfer), "+ Add Material", Additional Charges (named line items), Total Amount, Reference No., **E-Way Bill No.**, Vehicle No., Note, upload
- Sub Con Bill (Work Order billing) — see Subcon tab below for Work Order entity; billing draws against WO Items
- Other Expense: auto ID "OE-1", Party, checkbox "Add Quantity and Unit Rate", Tag Task (search project tasks), Tag Equipment (search equipment stock), Sub Total, Discount, Additional Charges, GST checkbox+%+computed Amount, Cost Code, **Total Amount = Sub Total + GST − Discount**, Deduction, **Net Amount = Total − Deduction** (Round Off), Paid Amount, **Balance Due = Net Amount − Paid Amount**, Vendor Bill Number, Bill To/Ship To, Note, upload
- Equipment Expense: auto ID "EE-1", Party, Date Range (start-end), "+ Add Equipment", Sub Total, Discount, GST checkbox+%, **Total Amount**, Deduction, **Net Amount** (Round Off), Paid Amount, **Balance Due**, Reference No., Cost Code, Bill To/Ship To, Note, upload

*My Account group:*
- I Paid: Site Expense / Party Payment radio toggle (Party Payment reveals Party Name + Reference No. fields), Date, Amount, Cost Code, More Details, upload
- I Received: Payment From (party search), Date, Amount, Description, Cost Code, Reference No., More Details, upload

**Shared sub-entities used across transaction forms — build once, reuse everywhere:**
- **Add Item** (generic line item): Item Name, Estimate/Invoice Qty + Unit (huge fixed unit master list — see Appendix), Rate Per Unit, GST % (dropdown, default 18), Cost Code, HSN/SAC, Description, Item Code (Sales Invoice variant only)
- **Deduction**: named sub-collection, each entry = Item Name (+ amount), rolls up to parent's "Total Deduction"
- **Retention**: same pattern as Deduction, "Total Retention"
- **Cost Code**: searchable, creatable ("+ New Cost Code"), supports sub-cost-codes (checkbox "Make this a sub-cost code" — hierarchical)
- **Additional Details / Bill-Ship addressing**: Bill From, Bill To, Ship From, Ship To — 4 independently selectable addresses with "Same as Bill From/Bill To" checkboxes
- **Payment Request** (separate sub-tab): auto Request No. ("PR-1"), Date, Party, Request Type (dropdown: Advance against PO, Advance against Subcon Work Order, Advance against BOQ, Advance against Material Purchase, Advance against Subcon Expense, Advance against Other Expense, Advance for Labour, Petty Cash, Other), Amount, Due Date, Notes, upload

**Material master data** (Material Library, used by Material Purchase/Sales/Return item pickers):
- Material Name, Unit of Measurement (+ Alternate UOM support), GST %, Category (hierarchical, creatable via "+ New Material Category"), Unit Cost (without tax), Lead Time (days), HSN/SAC, Item Code, Specifications

**Work Order entity** (separate from Subcon Work Order list, linked from Transaction "+Transaction" flow): grouped by party, auto ID "WO-#N", Date, Party, Work Order Title, Terms and Conditions (expandable), Attach Media, then item list ("Work Order Items" — "+ New Item").

---

## G. To Do tab
Table: Item Name, Due Date, Assigned, Project (or Task, in project-scoped context), Type, Action. Filters: status (Pending/etc), Type, search, advanced Filter button. "+ New To Do" form: Title, Due Date, Repeat To Do (recurrence), Type, Project Name link, Task Name link (links to specific project task), URL, Assignee (multi), Upload Files.

## H. Task tab (Gantt/scheduling)
Toolbar: view-type toggle, All Status filter, Assignee filter, Tag filter, **Create Baseline** button, From/To date range, hierarchy/tree view icon, download, **Replan** button (recompute schedule), "+ Task" split button.

Table (hierarchical, expand/collapse groups): S No., Task Name (parent groups roll up child progress %), Status (Not Started/Ongoing/Start/Completed — badge colors), **Progress** (actual/estimated qty with unit + progress bar), **Delay** (days behind schedule, red highlight, computed = today − planned end when incomplete), Assigned To, Duration, **Schedule** (planned Start–End dates), **Actual** (actual Start–End, "- - -" if not logged), **Forecast End** (predicted completion date computed from progress rate; shows "Insufficient data" when no actuals exist), Dependencies (predecessor/successor linking icon, for critical-path), Tag, + custom column. Per-row comment/chat icon.

"+ Task" form: Task Name, Duration (Days), Start Date, End Date, Est Quantity, Unit, Tag (creatable), Assign To (multi), Upload Files.

**Implement the Forecast End formula properly** — this is a real scheduling calc (e.g. linear extrapolation from progress-rate-to-date), not a cosmetic label. If genuinely no actuals logged, show "Insufficient data" — don't fake a number.

## I. Attendance tab
Sub-tabs (chips): All / Site Staff / Labour Contractor. Date nav (prev/next day arrows, month picker). Aggregate counts: Present, Absent, Paid Leave, Week Off (color-coded legend dots).

- Site Staff: "+ Add Site Staff" → links to "Select Site Staff Payroll" (search existing staff, or "+ New Site Staff Payroll")
- Labour Contractor: "+ New Labour Contractor" → "Add Workforce" (Worker Type e.g. Mason/Electrician, payroll frequency, Salary Per Shift, Shift Hours default 8, Cost Code) → "Workforce Library" (search/select existing workforce, multi-select counter "N/M") → "Add Worker" (party-linked, Party Name + "Add Workforce")

## J. Material tab
Two sub-tabs: **Material List** (grouped by category — e.g. CIVIL, FUEL, STEEL — each group row shows Unit, Estimated, Received, **Current Stock = Received − Consumed**, can go negative if over-consumed — implement as real running balance, not a static field) and **Recent Entries** (Date, Material, Description, Vendor, Status, Amount, Quantity). "+ Create"/"Add Received" → Material Received form: GRN No (auto), Date, Party Name, "+ Add Material" (multi), "+ Add Delivery Challan", "+ Add Vehicle Number", "+ Add Note", Upload Media.

## K. Subcon tab
Table: S.No., Sub Contractor, Work Order Title, **Milestone (completed/total)**, **Physical Progress %**, Work Order Value, Billed Value (computed — sums linked Sub Con Bill transactions against this WO), Approval Status (Approved/Pending badge). "+ Sub Con Work Order" → auto ID "#WO--N", Date, Party, Work Order Title, Terms and Conditions, Attach Media.

## L. Files tab
Folder-based document library. "+ Create Folder", folder grid cards, click into folder → file grid cards (PDF/image icons), 3-dot menu per file/folder, PDF preview modal with pagination (`1/N` nav) and download.

## M. MOM tab (Minutes of Meeting)
Table: Name, Attendee, Notes. Filters: search, Date Filter, Attendee filter. "+ New MOM".

## N. Equipment tab
Date nav (day selector), Search. Table: Equipment (name+code), Remaining Fuel, Vendor Name (+ Rented/Owned type), Rental Shift (dropdown), Reading, Action menu. "+ Add Equipment".

## O. Inspection tab
Filters: search, Inspected By, Status. Table: ID, Name, Detail (type + linked entity, e.g. "Site Visit Inspection (Type: Task) — AAC Block Masonry, Serial Number: 2.2"), Inspection By, Date, **Status** (Pass=green/Fail=red badge), **Approval Status** (Auto Approved when Pass, else manual). "+ New Inspection". Ties into Task tab via task serial number reference.

---

## Appendix — Unit of Measurement master list (must support ALL, dropdown, not free text)
%, Barrel, Brass, Bundle, CKM, Coil, Day/Days, Dozen, Item, KL, KLD, KW, Length, Linear Meter, Litre, Loads, Lot, MLD, Mm, Month/Monthly, Pkt, RFT, RMT, Stage, TR, Trips, Watt, Yard, acre, bags, box, brass, bucket, cft, cm, cum, drum, each, ft, hectare, hours, in, kg, kilolitre, km, lb, lumpsum, manday, meter, metric tonne, ml, nos, numbers, pair, pcs, per day, points, quintal, roll, set, sheet, shift, sqft, sqm, sqmm, tonne, unit, yd

## Appendix — Party Type taxonomy
Client, Staff, Investor, Worker, and under "Vendor": Labour Contractor, Material Supplier, Equipment Supplier, Other Vendor, Contractor

## Appendix — Expense/Payment Category taxonomy (Party-to-Party Payment)
Customer, Designer, Equipment, Food and Travel, Fuel, Labour, Material, Others, Salary, Sub Contractor, Transport

## Appendix — Formulas (must be real, backend-computed, not stubbed)
- Project Progress % = weighted rollup of task progress
- Project Balance = Payment In − Payment Out (per project)
- Margin = Sales − Expense (per project, can be negative)
- Net Cash Position = Project Balance + Receivables − Payables
- % of BOQ value = (Sales Invoice Total or Work Done) / BOQ Value
- % of Budget used = Total Expense / Estimated Budget
- Budget variance by cost code = Actual Expense − Budget Amount (flag Over/Under)
- Unbilled revenue = Work Done Value − Invoiced Value (drives "Raise Invoice" alert)
- Task Delay = today − planned end date, only while incomplete
- Task Forecast End = extrapolated completion date from progress rate; "Insufficient data" if no actuals
- Material Current Stock = Received − Consumed (can be negative)
- Subcon Physical Progress % and Milestone ratio = completed/total
- Line-item Total = Subtotal + Tax/GST + Additional Charges − Discount
- Net Amount = Total − Deduction − Retention (± Round Off)
- Balance Due = Net Amount − Paid Amount

---

## Deliverable expectations
1. Audit existing `p/[project_id]/*` routes and `backend/app/routers/*` — map each item above to existing code (extend) or confirm net-new (build).
2. Every table above needs its exact column set — no missing headers, no placeholder columns.
3. Every formula in the Appendix must be a real backend calculation wired to actual DB tables (Supabase), verified against non-zero test data — not hardcoded 0/blank.
4. Every form must actually persist to backend and reflect immediately in the relevant table/summary card (no dead-end forms).
5. Do not skip "small" sub-entities (Deduction, Retention, Cost Code, Bill/Ship addressing, Party opening balance) — competitor treats these as first-class, reused across many forms; build them once as shared components/endpoints.
6. Role-based visibility (Admin vs Viewer) must be respected on the Project List page (KPI cards, create button, table columns).
7. When done, report back which modules were extended vs net-new, and any spec item you could not fully match (with reason) so it can be verified.
