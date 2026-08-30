# SiteFlow Workflow Truth Map (Verified by Code and Execution)

*Documented from authoritative codebase sources: `frontend/src/components/Sidebar.tsx`, `backend/app/routers/*.py`, and frontend UI page components. All workflows verified via direct HTTP execution in `docs/WORKFLOW_EXECUTION_LOG.md`.*

---

## 1. Overview & Project Hub

### 1.1 Dashboard & KPI Rollups
- **Preconditions**: Authenticated user with an active company selection (`company_id`).
- **Exact UI Path**: Sidebar group "Overview" (`frontend/src/components/Sidebar.tsx:60`) -> "Dashboard" (`frontend/src/components/Sidebar.tsx:67`) -> Page `frontend/src/app/c/[company_id]/dashboard/page.tsx:1`.
- **Backend Endpoints**:
  - `GET /apis/v3/analytics/company/{company_id}` (`backend/app/routers/analytics.py:128`)
  - `GET /apis/v3/projects/company/{company_id}/summary` (`backend/app/routers/projects.py:276`)
- **Required Fields**: None (read query parameterized by `company_id`).
- **Permissions**: `dashboard:view` (`frontend/src/components/Sidebar.tsx:69`).
- **Success State**: Financial totals (Revenue, Outstanding, Cashflow), active projects summary, and material alerts render on the dashboard view.

### 1.2 Standard Reports Hub
- **Preconditions**: User holds `reports:view` permission.
- **Exact UI Path**: Sidebar group "Overview" -> "Reports" (`frontend/src/components/Sidebar.tsx:90`) -> Page `frontend/src/app/c/[company_id]/reports/page.tsx:1` -> Select report category -> Click Report Title -> Click "Run Report".
- **Backend Endpoints**:
  - `GET /apis/v3/reports/catalog` (`backend/app/routers/reports.py:114`)
  - `GET /apis/v3/reports/data/{slug}` (`backend/app/routers/reports.py:168`)
- **Required Fields**: `slug` (report identifier), `company_id` query param. Optional: `project_id`, `date_from`, `date_to`.
- **Permissions**: `reports:view`.
- **Success State**: 82 standard SQL reports return columnar data grids with server-side aggregation and CSV export capabilities.

---

## 2. Projects & Planning

### 2.1 Project Creation & Setup
- **Preconditions**: User holds `projects:view` and `projects:manage` or Owner role.
- **Exact UI Path**: Sidebar group "Projects & Planning" (`frontend/src/components/Sidebar.tsx:99`) -> "Projects" (`frontend/src/components/Sidebar.tsx:105`) -> Page `frontend/src/app/c/[company_id]/projects/page.tsx:1` -> Click "+ New Project" button.
- **Backend Endpoints**:
  - `POST /apis/v3/projects/` (`backend/app/routers/projects.py:84`)
  - `GET /apis/v3/projects/company/{company_id}` (`backend/app/routers/projects.py:255`)
- **Required Fields**: `company_id`, `name`, `code`, `state` (GST place of supply), `location` (latitude,longitude coordinates).
- **Optional Fields**: `client_name`, `address`, `city`, `planned_start_date`, `planned_end_date`, `project_value`.
- **Permissions**: `projects:manage`.
- **Success State**: Record inserted in `projects` table with status `"Ongoing"`, appears in company projects dropdown and workspace context.

### 2.2 Task Scheduling & Gantt Chart
- **Preconditions**: Active project selected.
- **Exact UI Path**: Sidebar group "Projects & Planning" -> "Planning" (`frontend/src/components/Sidebar.tsx:113`) -> Page `frontend/src/app/c/[company_id]/d/planning/page.tsx:1` -> Click "+ Add Task" button.
- **Backend Endpoints**:
  - `POST /apis/v3/planning/tasks` (`backend/app/routers/planning.py:270`)
  - `GET /apis/v3/planning/tasks/tree/{project_id}` (`backend/app/routers/planning.py:214`)
  - `PATCH /apis/v3/planning/tasks/{task_id}` (`backend/app/routers/planning.py:330`)
- **Required Fields**: `project_id`, `name`, `duration_days`, `start_date`.
- **Optional Fields**: `parent_id` (WBS hierarchy), `priority` (`"low"`, `"medium"`, `"high"`, `"critical"`), `assigned_to` (UUID), `progress` (0-100 float).
- **Permissions**: `planning:edit`.
- **Success State**: Task node inserted in schedule tree, Gantt bar rendered on timeline with CPM float calculations.

### 2.3 Drawing Registry & Revisions
- **Preconditions**: Active project selected.
- **Exact UI Path**: Sidebar group "Projects & Planning" -> "Drawings" (`frontend/src/components/Sidebar.tsx:121`) -> Page `frontend/src/app/c/[company_id]/d/drawings/page.tsx:1` -> Click "Upload Drawing".
- **Backend Endpoints**:
  - `POST /apis/v3/drawings` (`backend/app/routers/drawings.py:174`)
  - `POST /apis/v3/drawings/{drawing_id}/revisions` (`backend/app/routers/drawings.py:227`)
  - `POST /apis/v3/drawings/revisions/{revision_id}/approve` (`backend/app/routers/drawings.py:282`)
- **Required Fields**: `project_id`, `drawing_number`, `title`, `discipline` (Architectural, Structural, MEP).
- **Permissions**: `drawings:edit`.
- **Success State**: PDF uploaded and stored in Supabase Storage/blob, revision history tracked with approval stamps.

---

## 3. Site Operations

### 3.1 Daily Progress Reports (DPR)
- **Preconditions**: Active project selected; entry date within company back-dating window.
- **Exact UI Path**: Sidebar group "Site Operations" (`frontend/src/components/Sidebar.tsx:145`) -> "DPR (Daily Progress)" (`frontend/src/components/Sidebar.tsx:151`) -> Page `frontend/src/app/c/[company_id]/d/dpr/page.tsx:1` -> Click "+ New DPR".
- **Backend Endpoints**:
  - `POST /apis/v3/dpr` (`backend/app/routers/dpr.py:60`)
  - `GET /apis/v3/dpr/today/{project_id}` (`backend/app/routers/dpr.py:126`)
- **Required Fields**: `project_id`, `dpr_date`, `executed_qty`.
- **Optional Fields**: `task_id`, `weather`, `workers_deployed`, `materials_consumed` (`[{material_name, quantity, unit}]`), `photos`, `notes`, `issues`.
- **Permissions**: `planning:edit`.
- **Success State**: DPR record created with status `"Draft"`, physical execution quantity recorded, materials automatically deducted if inventory sync is active.

### 3.2 Quality Inspections & Checklists
- **Preconditions**: Quality Checklist Template exists in company setup.
- **Exact UI Path**: Sidebar group "Site Operations" -> "Quality & NCR" (`frontend/src/components/Sidebar.tsx:159`) -> Page `frontend/src/app/c/[company_id]/d/quality/page.tsx:1` -> Click "+ New Inspection".
- **Backend Endpoints**:
  - `POST /apis/v3/quality/inspections` (`backend/app/routers/quality.py:249`)
  - `GET /apis/v3/quality/inspections/{project_id}` (`backend/app/routers/quality.py:271`)
  - `PATCH /apis/v3/quality/inspections/{insp_id}/respond` (`backend/app/routers/quality.py:310`)
- **Required Fields**: `company_id`, `project_id`, `checklist_id`, `title`, `inspection_date`.
- **Permissions**: `quality:edit`.
- **Success State**: Inspection logged; NCR raised if items fail tolerance checks.

### 3.3 Safety Incidents & Work Permits
- **Preconditions**: Active project selected.
- **Exact UI Path**: Sidebar group "Site Operations" -> "Safety" (`frontend/src/components/Sidebar.tsx:167`) -> Page `frontend/src/app/c/[company_id]/d/safety/page.tsx:1` -> Click "+ Report Incident".
- **Backend Endpoints**:
  - `POST /apis/v3/safety/incidents` (`backend/app/routers/safety.py:73`)
  - `GET /apis/v3/safety/incidents/{project_id}` (`backend/app/routers/safety.py:105`)
  - `PATCH /apis/v3/safety/incidents/{incident_id}/close` (`backend/app/routers/safety.py:144`)
- **Required Fields**: `company_id`, `project_id`, `title`, `incident_type`, `severity`, `description`, `reported_by`, `reported_at`, `incident_date`.
- **Optional Fields**: `location`, `root_cause`, `corrective_action`.
- **Permissions**: `safety:edit`.
- **Success State**: Incident logged in status `"Open"`, notification sent to safety officer, closed via `PATCH /close`.

---

## 4. Procurement & Materials

### 4.1 Vendor Registration (Library)
- **Preconditions**: Company workspace active.
- **Exact UI Path**: Sidebar group "Setup & Config" (`frontend/src/components/Sidebar.tsx:348`) -> "Library" (`frontend/src/components/Sidebar.tsx:354`) -> Click "Vendors & Parties" tab -> Click "+ Add Party".
- **Backend Endpoints**:
  - `POST /apis/v3/library/parties` (`backend/app/routers/library.py:105`)
  - `GET /apis/v3/library/parties/{company_id}` (`backend/app/routers/library.py:88`)
- **Required Fields**: `company_id`, `name`, `party_type` (`"Vendor"`, `"Subcontractor"`, `"Client"`).
- **Optional Fields**: `phone`, `email`, `gstin`, `pan`, `city`, `state`, `address`.
- **Permissions**: `library:edit`.
- **Success State**: Party record registered in master library, available in PO and Bill vendor pickers.

### 4.2 Material Indent (Requisition)
- **Preconditions**: Project active.
- **Exact UI Path**: Sidebar group "Procurement & Materials" (`frontend/src/components/Sidebar.tsx:223`) -> "Procurement" (`frontend/src/components/Sidebar.tsx:229`) -> "Indents" tab -> Click "+ New Indent".
- **Backend Endpoints**:
  - `POST /apis/v3/procurement/indents` (`backend/app/routers/procurement.py:337`)
  - `POST /apis/v3/procurement/indents/{indent_id}/approve` (`backend/app/routers/procurement.py:387`)
- **Required Fields**: `company_id`, `project_id`, `indent_number`, `items` (`[{material_name, quantity, unit}]`).
- **Permissions**: `procurement:edit`.
- **Success State**: Indent created with status `"Draft"`, advances to `"Approved"` upon manager sign-off.

### 4.3 Purchase Order (PO)
- **Preconditions**: Vendor must exist in Library; project active.
- **Exact UI Path**: Sidebar group "Procurement & Materials" -> "Procurement" -> "Purchase Orders" tab -> Click "+ Purchase Order".
- **Backend Endpoints**:
  - `POST /apis/v3/procurement/pos` (`backend/app/routers/procurement.py:520`)
  - `POST /apis/v3/procurement/pos/{po_id}/approve` (`backend/app/routers/procurement.py:653`)
  - `GET /apis/v3/procurement/pos/{po_id}/pdf` (`backend/app/routers/procurement.py:1283`)
- **Required Fields**: `company_id`, `project_id`, `vendor_id`, `po_number`, `po_date`, `items` (`[{material_name, quantity, rate, unit}]`).
- **Optional Fields**: `gst_rate`, `delivery_address`, `payment_terms`, `notes`.
- **Permissions**: `procurement:edit`.
- **Success State**: PO created in `"Draft"`/`"Pending"`, approved via `POST /approve` to unlock Goods Receipt.

### 4.4 Goods Receipt Note (GRN)
- **Preconditions**: Purchase order must exist and hold `"Approved"` status.
- **Exact UI Path**: Sidebar group "Procurement & Materials" -> "Procurement" -> "GRN" tab -> Click "+ Receive Goods".
- **Backend Endpoints**:
  - `POST /apis/v3/procurement/grns` (`backend/app/routers/procurement.py:849`)
  - `GET /apis/v3/procurement/grns` (`backend/app/routers/procurement.py:821`)
- **Required Fields**: `company_id`, `project_id`, `po_id`, `grn_number`, `received_date`, `items` (`[{po_item_id, received_qty, accepted_qty}]`).
- **Optional Fields**: `delivery_challan_number`, `vehicle_number`, `remarks`.
- **Permissions**: `procurement:edit`.
- **Success State**: GRN posted with status `"Completed"`, warehouse inventory updated, 3-way match linked.

### 4.5 Three-Way Match Engine
- **Preconditions**: Approved PO, received GRN, and vendor bill recorded.
- **Exact UI Path**: Sidebar group "Procurement & Materials" -> "Three-Way Match" (`frontend/src/components/Sidebar.tsx:237`) -> Page `frontend/src/app/c/[company_id]/d/three-way/page.tsx:1`.
- **Backend Endpoints**:
  - `GET /apis/v3/three-way/summary/{company_id}` (`backend/app/routers/three_way.py:44`)
  - `GET /apis/v3/three-way/match` (`backend/app/routers/three_way.py:65`)
  - `PATCH /apis/v3/billing/bills/{bill_id}/match` (`backend/app/routers/billing.py:1456`)
- **Required Fields**: `bill_id`, `po_id`, `grn_id`.
- **Permissions**: `procurement:view`, `finance:edit`.
- **Success State**: Variance tolerances evaluated for quantity and price; status updated to `"Matched"` or `"Discrepancy"`.

---

## 5. Finance & Billing

### 5.1 Vendor & Subcontractor RA Bills
- **Preconditions**: Subcontractor/Vendor party registered; project active.
- **Exact UI Path**: Sidebar group "Finance & Billing" (`frontend/src/components/Sidebar.tsx:270`) -> "Billing & Invoices" (`frontend/src/components/Sidebar.tsx:283`) -> "Subcontractor RA Bills" tab -> Click "+ Create RA Bill".
- **Backend Endpoints**:
  - `POST /apis/v3/billing/bills` (`backend/app/routers/billing.py:1128`)
  - `POST /apis/v3/billing/bills/{bill_id}/approve` (`backend/app/routers/billing.py:714`)
  - `GET /apis/v3/billing/bills/{bill_id}/pdf` (`backend/app/routers/billing.py:865`)
- **Required Fields**: `company_id`, `project_id`, `party_company_user_id`, `invoice_number`, `invoice_date`, `invoice_type` (`"subcon"`), `subtotal`.
- **Optional Fields**: `gst_pct`, `deductions` (`[{deduction_type: "TDS"|"Retention", amount, percentage}]`), `pre_tax_deductions`.
- **Permissions**: `billing:edit`.
- **Success State**: Bill created in `"Pending"` status with statutory TDS and Retention calculated, advances to `"Approved"`.

### 5.2 Payments & Cashbook Vouchers
- **Preconditions**: Company Bank / Cash Account registered.
- **Exact UI Path**: Sidebar group "Finance & Billing" -> "Finance" (`frontend/src/components/Sidebar.tsx:276`) -> "Payments" tab -> Click "+ New Payment".
- **Backend Endpoints**:
  - `POST /apis/v3/finance/payments` (`backend/app/routers/finance.py:155`)
  - `POST /apis/v3/finance/accounts/{company_id}` (`backend/app/routers/finance.py:810`)
  - `POST /apis/v3/finance/cashbook/p2p` (`backend/app/routers/finance.py:1675`)
- **Required Fields**: `company_id`, `party_id`, `payment_type` (`"in"` or `"out"`), `amount`, `payment_method`, `payment_date`.
- **Optional Fields**: `project_id`, `account_id`, `reference_number`, `notes`.
- **Permissions**: `finance:edit`.
- **Success State**: Ledger transaction posted, bank balance adjusted, party outstanding updated.

### 5.3 Cost Code & Budget Control
- **Preconditions**: Active company.
- **Exact UI Path**: Sidebar group "Procurement & Materials" -> "Cost Codes" (`frontend/src/components/Sidebar.tsx:261`) -> Click "+ Add Cost Code".
- **Backend Endpoints**:
  - `POST /apis/v3/library/cost-codes` (`backend/app/routers/library.py:351`)
  - `GET /apis/v3/library/cost-codes/{company_id}` (`backend/app/routers/library.py:347`)
  - `POST /apis/v3/budgeting/allocation` (`backend/app/routers/budgeting.py:279`)
- **Required Fields**: `company_id`, `code`, `name`.
- **Optional Fields**: `budget_amount`, `description`.
- **Permissions**: `finance:edit`.
- **Success State**: Standard cost code master created for real-time cost tracking against estimates.

---

## 6. Workforce & HR

### 6.1 Employee Directory & Onboarding
- **Preconditions**: Active company.
- **Exact UI Path**: Sidebar group "Finance & Billing" -> "HR & Staff" (`frontend/src/components/Sidebar.tsx:300`) -> Click "+ Add Employee".
- **Backend Endpoints**:
  - `POST /apis/v3/hr/employees` (`backend/app/routers/hr.py:334`)
  - `GET /apis/v3/hr/company/employees/{company_id}` (`backend/app/routers/hr.py:1389`)
- **Required Fields**: `company_id`, `name`, `designation`, `salary`.
- **Optional Fields**: `project_id`, `phone`, `email`, `uan`, `pan`, `joining_date`.
- **Permissions**: `payroll:edit`.
- **Success State**: Staff employee record created in active roster with automatic payroll ledger account.

### 6.2 Attendance & Geofenced Punch
- **Preconditions**: Employee registered; site GPS radius configured on project.
- **Exact UI Path**: Sidebar group "Site Operations" -> "Attendance" (`frontend/src/components/Sidebar.tsx:183`) -> Page `frontend/src/app/c/[company_id]/d/attendance/page.tsx:1`.
- **Backend Endpoints**:
  - `POST /apis/v3/hr/attendance/punch` (`backend/app/routers/hr.py:359`)
  - `POST /apis/v3/face/punch` (`backend/app/routers/face_recognition.py:69`)
- **Required Fields**: `company_id`, `project_id`, `staff_id`, `punch_type` (`"IN"` or `"OUT"`), `punch_time`.
- **Optional Fields**: `latitude`, `longitude`, `face_confidence`.
- **Permissions**: `attendance:edit`.
- **Success State**: Attendance record logged with geofence distance verification and biometric match score.

---

## 7. Plant & Equipment

### 7.1 Equipment Asset Management & Deployment
- **Preconditions**: Active company.
- **Exact UI Path**: Sidebar group "Site Operations" -> "Equipment" (`frontend/src/components/Sidebar.tsx:199`) -> Click "+ Add Equipment".
- **Backend Endpoints**:
  - `POST /apis/v3/equipment` (`backend/app/routers/equipment.py:122`)
  - `POST /apis/v3/equipment/{equipment_id}/deploy` (`backend/app/routers/equipment.py:170`)
  - `PATCH /apis/v3/equipment/deployments/{deployment_id}/return` (`backend/app/routers/equipment.py:221`)
  - `POST /apis/v3/equipment/{equipment_id}/fuel` (`backend/app/routers/equipment.py:241`)
- **Required Fields**: `company_id`, `name`, `code`, `category`, `ownership_type` (`"Owned"` or `"Hired"`).
- **Permissions**: `equipment:edit`.
- **Success State**: Equipment asset registered, deployed to project site with ongoing fuel and log sheets.

### 7.2 Production Batches & Concrete Recipes
- **Preconditions**: Plant / Project selected.
- **Exact UI Path**: Sidebar group "Site Operations" -> "Production" (`frontend/src/components/Sidebar.tsx:207`) -> Click "+ New Recipe".
- **Backend Endpoints**:
  - `POST /apis/v3/production/recipes` (`backend/app/routers/production.py:265`)
  - `POST /apis/v3/production/batches` (`backend/app/routers/production.py:318`)
  - `PATCH /apis/v3/production/batches/{batch_id}/complete` (`backend/app/routers/production.py:454`)
- **Required Fields**: `company_id`, `project_id`, `recipe_code`, `product_name`, `mix_type`, `unit`, `materials` (`[{material_name, planned_qty, unit}]`).
- **Permissions**: `production:edit`.
- **Success State**: Batch recipe registered, batch scheduled, and auto-consumption triggered on batch completion.

---

## 8. Sales & CRM

### 8.1 Lead Tracking & Sales Pipeline
- **Preconditions**: Active company.
- **Exact UI Path**: Sidebar group "Sales & CRM" (`frontend/src/components/Sidebar.tsx:334`) -> "CRM & Leads" (`frontend/src/components/Sidebar.tsx:340`) -> Click "+ New Lead".
- **Backend Endpoints**:
  - `POST /apis/v3/crm/leads` (`backend/app/routers/crm.py:316`)
  - `GET /apis/v3/crm/leads` (`backend/app/routers/crm.py:361`)
  - `PUT /apis/v3/crm/leads/{lead_id}` (`backend/app/routers/crm.py:366`)
- **Required Fields**: `company_id`, `title`, `lead_type`, `contact_name`, `phone_no`.
- **Optional Fields**: `client_name`, `status`, `estimated_value`, `source`, `notes`.
- **Permissions**: `crm:edit`.
- **Success State**: Lead card created on sales pipeline Kanban board.

### 8.2 Client Quotations & Cost Estimations
- **Preconditions**: Lead record created.
- **Exact UI Path**: Sidebar group "Sales & CRM" -> "CRM & Leads" -> Select Lead -> Click "Quotations" tab -> Click "+ Create Quotation".
- **Backend Endpoints**:
  - `POST /apis/v3/crm/leads/{lead_id}/quotations` (`backend/app/routers/crm.py:554`)
  - `POST /apis/v3/crm/quotations/{quotation_id}/convert-to-invoice` (`backend/app/routers/crm.py:883`)
- **Required Fields**: `company_id`, `lead_id`, `quotation_number`, `subject`, `total_amount`, `items` (`[{item_name, qty, rate, unit, amount}]`).
- **Optional Fields**: `gst_pct`, `discount`, `terms`.
- **Permissions**: `crm:edit`.
- **Success State**: Detailed estimate generated, PDF exportable, convertible to Client Sales Invoice.

---

## 9. Setup & Integrations

### 9.1 Rate Card Library
- **Preconditions**: Active company.
- **Exact UI Path**: Sidebar group "Setup & Config" (`frontend/src/components/Sidebar.tsx:348`) -> "Library" (`frontend/src/components/Sidebar.tsx:354`) -> "Rate Cards" tab -> Click "+ Add Rate".
- **Backend Endpoints**:
  - `POST /apis/v3/library/rates` (`backend/app/routers/library.py:543`)
  - `GET /apis/v3/library/rates/{company_id}` (`backend/app/routers/library.py:539`)
- **Required Fields**: `company_id`, `name`, `item_code`, `unit`, `cost_rate`, `selling_rate`.
- **Permissions**: `library:edit`.
- **Success State**: Standard unit price item saved for instantaneous reuse across BOQs and Quotations.
