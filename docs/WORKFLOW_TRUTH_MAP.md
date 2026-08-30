# SiteFlow Application Workflow Truth Map

This document establishes the verified, application-wide ground truth for all end-user workflows across the 7 domain sidebar groups in SiteFlow. Every navigation path uses verbatim JSX UI labels in quotes, exact endpoints, required parameters, and downstream state transitions.

---

## 1. Planning & Progress Group

### 1.1 Project Creation & Setup
- **Preconditions**: User is signed in with `projects:manage` or `company:owner` role.
- **Verbatim Navigation**: Click `"Projects"` on sidebar -> Click `"+ New Project"` button.
- **Required Fields**:
  - `Project Name` (text, e.g. "Skyline Tower Phase 1")
  - `Project Code` (text, e.g. "SKY-01")
  - `Client Name` (text or selection)
  - `Location / City` (text)
  - `Planned Start Date` (date picker)
- **Optional Fields**: `Planned End Date`, `Estimated Project Value (INR)`, `Project Description`, `Tower / Structure Configuration`.
- **API Endpoint & Method**: `POST /apis/v3/projects/`
- **Permission Gate**: `projects:manage`
- **State Transition**: Creates `Project` row with status `Active`. Adds project to sidebar Pinned Projects list and makes it available in project switcher.
- **Success Criteria**: Toast notification `"Project created successfully"`, redirect or modal close with project listed in table.

### 1.2 Tasks, WBS & Gantt Scheduling
- **Preconditions**: Active project selected.
- **Verbatim Navigation**: Sidebar -> `"Planning & Progress"` -> `"Tasks & Gantt"`.
- **Required Fields**:
  - `Task Name` (text)
  - `Start Date` (date picker)
  - `Duration (Days)` or `End Date` (number / date)
- **Optional Fields**: `Predecessor / Dependencies` (multi-select), `Assigned To` (team member), `WBS Level / Group`, `Milestone Flag` (checkbox), `Planned Cost Code`.
- **API Endpoint & Method**: `POST /apis/v3/planning/tasks`
- **Permission Gate**: `planning:manage`
- **State Transition**: Creates `Task` record linked to `project_id`. Gantt timeline updates dynamically, calculating critical path.
- **Success Criteria**: Task bar appears on Gantt chart with matching date bounds and dependency link arrows.

### 1.3 Daily Progress Report (DPR)
- **Preconditions**: Active project exists with assigned site personnel.
- **Verbatim Navigation**: Sidebar -> `"Planning & Progress"` -> `"DPR & Site Progress"` -> Click `"+ New DPR"` or `"Log Daily Progress"`.
- **Required Fields**:
  - `Report Date` (date picker)
  - `Task Progress Items` (select task + enter `Executed Quantity` with `Unit`)
  - `Workers Deployed` (integer count)
  - `Weather Condition` (dropdown: Clear, Rain, Overcast, Extreme Heat)
- **Optional Fields**: `Site Photos` (file upload), `Materials Consumed` (material + quantity), `Issues / Obstacles` (text), `Notes` (text).
- **API Endpoint & Method**: `POST /apis/v3/dpr/`
- **Permission Gate**: `dpr:create`
- **State Transition**: Creates `DailyProgressReport` record. Increments cumulative task progress and updates dashboard activity charts.
- **Success Criteria**: DPR entry renders in chronological list, exports to PDF, and feeds the `dpr` standard report.

### 1.4 BOQ Import & Item Management
- **Preconditions**: Active project selected.
- **Verbatim Navigation**: Sidebar -> `"Planning & Progress"` -> `"BOQ & Cost Codes"` -> Click `"Import BOQ"` or `"+ Add BOQ Item"`.
- **Required Fields**:
  - `Item Description` (text)
  - `Unit of Measurement (UOM)` (dropdown: cum, sqft, MT, nos, etc.)
  - `Estimated Quantity` (numeric)
  - `Unit Rate (INR)` (numeric)
- **Optional Fields**: `Cost Code` (select LibraryCostCode), `Section / Group` (text), `Specification Notes` (text).
- **API Endpoint & Method**: `POST /apis/v3/boq/items` or `POST /apis/v3/boq/import` (Excel/CSV upload)
- **Permission Gate**: `boq:manage`
- **State Transition**: Populates `BOQItem` records for the project. Computes total BOQ value (`qty * rate`).
- **Success Criteria**: Grid populates with line items, total budget updates, and items become available for work orders and billing.

### 1.5 Drawings & Revision Control
- **Preconditions**: Active project selected.
- **Verbatim Navigation**: Sidebar -> `"Planning & Progress"` -> `"Drawings & Revisions"` -> Click `"+ Upload Drawing"`.
- **Required Fields**:
  - `Drawing Title` (text)
  - `Drawing Number / Code` (text)
  - `Discipline / Category` (dropdown: Architectural, Structural, MEP, Civil)
  - `Drawing File` (PDF / image upload)
- **Optional Fields**: `Revision Version` (default "Rev 0"), `Revision Notes` (text), `Pin Annotations` (point coordinates).
- **API Endpoint & Method**: `POST /apis/v3/drawings/upload`
- **Permission Gate**: `drawings:manage`
- **State Transition**: Stores drawing asset and creates initial `DrawingRevision` record with `approval_status="pending"`.
- **Success Criteria**: Drawing renders in pan/zoom viewer with revision history sidebar and annotation support.

---

## 2. Procurement & Materials Group

### 2.1 Material Indent / Requisition
- **Preconditions**: Project exists, materials catalog available.
- **Verbatim Navigation**: Sidebar -> `"Procurement & Materials"` -> `"Indents & Requisitions"` -> Click `"+ Create Indent"`.
- **Required Fields**:
  - `Project` (dropdown)
  - `Required By Date` (date picker)
  - Line Items: `Material Name`, `Required Quantity`, `Unit`
- **Optional Fields**: `Priority` (High, Medium, Low), `Specifications / Make`, `Justification Notes`.
- **API Endpoint & Method**: `POST /apis/v3/procurement/indents`
- **Permission Gate**: `procurement:create`
- **State Transition**: Creates `MaterialIndent` and `MaterialIndentItem` records in `status="pending"`.
- **Success Criteria**: Indent appears in pending approvals queue and becomes eligible for PO conversion.

### 2.2 Purchase Order (PO) Issuance
- **Preconditions**: Approved indent or direct purchase requirement; active vendor in Library.
- **Verbatim Navigation**: Sidebar -> `"Procurement & Materials"` -> `"Purchase Orders"` -> Click `"+ New Purchase Order"`.
- **Required Fields**:
  - `Vendor` (select LibraryParty)
  - `Project` (select Project)
  - `PO Date` (date picker)
  - Line Items: `Material`, `Quantity`, `Rate (INR)`, `GST %`
- **Optional Fields**: `Indent Linkage`, `Delivery Address`, `Payment Terms`, `Freight / Packaging Charges`, `Notes`.
- **API Endpoint & Method**: `POST /apis/v3/procurement/orders`
- **Permission Gate**: `procurement:orders:manage`
- **State Transition**: Creates `PurchaseOrder` in `status="approved"`. Increments committed costs in budget ledger.
- **Success Criteria**: PO receives unique number (e.g. `PO-2026-001`), renders downloadable PDF, and creates pending delivery tracker.

### 2.3 Goods Receipt Note (GRN) & Delivery Verification
- **Preconditions**: Issued Purchase Order.
- **Verbatim Navigation**: Sidebar -> `"Procurement & Materials"` -> `"GRN & Deliveries"` -> Click `"+ Record GRN"`.
- **Required Fields**:
  - `Purchase Order` (select PO)
  - `Received Date` (date picker)
  - `Delivery Challan / Invoice No.` (text)
  - Line Items: `Received Quantity`
- **Optional Fields**: `Accepted Quantity`, `Rejected Quantity`, `Rejection Reason`, `Weighbridge Slip Photo`, `Gate Entry Number`.
- **API Endpoint & Method**: `POST /apis/v3/procurement/grn`
- **Permission Gate**: `procurement:grn:manage`
- **State Transition**: Creates `GoodsReceiptNote` and `GRNItem` rows. Increases warehouse inventory stock for project.
- **Success Criteria**: GRN marked received; PO fulfilled quantity increments; item becomes eligible for Three-Way Match.

### 2.4 Three-Way Matching & Variance Detection
- **Preconditions**: Purchase Order, Goods Receipt Note, and Vendor Bill entered in system.
- **Verbatim Navigation**: Sidebar -> `"Procurement & Materials"` -> `"Three-Way Match"`.
- **Required Action**: Select matching PO, GRN, and Bill trio to evaluate quantity and price tolerance.
- **API Endpoint & Method**: `GET /apis/v3/procurement/three-way-match/{company_id}`
- **Permission Gate**: `procurement:view`
- **State Transition**: System computes ordered vs received vs billed quantities and unit rates.
- **Success Criteria**: Discrepancies highlighted in red/amber tolerance badges; approved match clears bill for payment scheduling.

### 2.5 Warehouse Inventory & Inter-Site Material Transfer
- **Preconditions**: Materials stocked in project warehouse.
- **Verbatim Navigation**: Sidebar -> `"Procurement & Materials"` -> `"Inventory & Warehouse"` -> Click `"Transfer Material"`.
- **Required Fields**:
  - `Source Project / Warehouse` (dropdown)
  - `Destination Project / Warehouse` (dropdown)
  - `Material Name` (select material)
  - `Transfer Quantity` (numeric, must be <= available stock)
  - `Transfer Date` (date picker)
- **Optional Fields**: `Vehicle / Transport Details`, `Driver Mobile`, `Transfer Notes`.
- **API Endpoint & Method**: `POST /apis/v3/materials/transfer`
- **Permission Gate**: `materials:manage`
- **State Transition**: Decrements source inventory, creates in-transit transfer log, and credits destination upon receipt confirmation.
- **Success Criteria**: Inventory cards reflect new balance immediately across both sites.

---

## 3. Financial Control Group

### 3.1 Customer Billing & Sale Invoices
- **Preconditions**: Active project with client party or CRM quotation.
- **Verbatim Navigation**: Sidebar -> `"Financial Control"` -> `"Customer Billing & Invoices"` -> Click `"+ New Sale Invoice"`.
- **Required Fields**:
  - `Project` (dropdown)
  - `Client / Party` (select party)
  - `Invoice Number` (text)
  - `Invoice Date` (date picker)
  - Line Items: `Description`, `Amount w/o Tax`, `GST %` (5, 12, 18, 28)
- **Optional Fields**: `Due Date`, `Payment Milestones`, `Retention %`, `TDS Deductible`, `ZATCA E-Invoice QR Flag`.
- **API Endpoint & Method**: `POST /apis/v3/finance/bills` with `invoice_type="client"` or `"sale"`
- **Permission Gate**: `finance:bills:manage`
- **State Transition**: Generates accounts receivable entry, posts GST liability, and updates project billed revenue.
- **Success Criteria**: Invoice appears in receivables aging table with PDF export and payment tracking.

### 3.2 Vendor Bills & Payables Processing
- **Preconditions**: Verified GRN or service execution from subcontractor/vendor.
- **Verbatim Navigation**: Sidebar -> `"Financial Control"` -> `"Vendor Bills & Payables"` -> Click `"+ Add Vendor Bill"`.
- **Required Fields**:
  - `Vendor Party` (select vendor)
  - `Project` (dropdown)
  - `Vendor Invoice No.` (text)
  - `Invoice Date` (date picker)
  - `Subtotal Amount` (numeric)
  - `GST Amount` (numeric)
- **Optional Fields**: `Linked PO No.`, `Linked GRN No.`, `TDS Section` (194C, 194J, 194Q), `TDS Amount`, `Retention Amount`.
- **API Endpoint & Method**: `POST /apis/v3/finance/bills` with `invoice_type="material"` or `"subcon"` or `"expense"`
- **Permission Gate**: `finance:bills:manage`
- **State Transition**: Adds record to `bills` table with `status="Pending"`. Creates payable ledger entry.
- **Success Criteria**: Bill appears in unpaid bills list and routes to payment approval queue.

### 3.3 Payments, Vouchers & Bank Reconciliation
- **Preconditions**: Bank Account configured in company finance settings.
- **Verbatim Navigation**: Sidebar -> `"Financial Control"` -> `"Payments & Bank Accounts"` -> Click `"+ Record Payment"`.
- **Required Fields**:
  - `Payment Type` (dropdown: Payment Out, Payment In)
  - `Party Name` (select party)
  - `Amount (INR)` (numeric)
  - `Payment Method` (dropdown: Bank Transfer, Cheque, Cash, UPI)
  - `Payment Date` (date picker)
- **Optional Fields**: `Bank Account` (dropdown), `Reference / UTR Number`, `Bill Settlement Allocations`, `Cost Code`.
- **API Endpoint & Method**: `POST /apis/v3/finance/payments`
- **Permission Gate**: `finance:payments:manage`
- **State Transition**: Creates `Payment` row and `PaymentSettlement` linkages. Updates bank balance and party balance.
- **Success Criteria**: Party ledger balance decreases, bank transaction ledger records entry, and bill status transitions to `Paid` or `Partially Paid`.

### 3.4 Budgets, Cost Centers & Variance Analysis
- **Preconditions**: Library Cost Codes defined at company level.
- **Verbatim Navigation**: Sidebar -> `"Financial Control"` -> `"Budgets & Cost Centers"`.
- **Required Action**: Set budget amounts per cost code for the selected project.
- **API Endpoint & Method**: `POST /apis/v3/budget/`
- **Permission Gate**: `budget:manage`
- **State Transition**: Computes actual costs from bills and payments against budget thresholds.
- **Success Criteria**: Visual variance meters display overrun warnings (amber/red) when expenses exceed 90% and 100% of allocation.

---

## 4. Workforce & Safety Group

### 4.1 Employee Directory & Onboarding
- **Preconditions**: Company team manager permissions.
- **Verbatim Navigation**: Sidebar -> `"Workforce & Safety"` -> `"Staff & Employees"` -> Click `"+ Add Employee"`.
- **Required Fields**:
  - `Full Name` (text)
  - `Employee Code` (text, e.g. "EMP-042")
  - `Designation` (text, e.g. "Site Engineer")
  - `Department` (dropdown: Engineering, Operations, Safety, Accounts, HR)
  - `Basic Salary (Monthly)` (numeric)
- **Optional Fields**: `HRA`, `Other Allowances`, `TDS Monthly`, `Bank Account Number`, `IFSC Code`, `Assigned Project`.
- **API Endpoint & Method**: `POST /apis/v3/hr/employees`
- **Permission Gate**: `hr:employees:manage`
- **State Transition**: Creates `StaffEmployee` record linked to company and optional project.
- **Success Criteria**: Employee appears in active roster, becomes available for attendance punching and monthly payroll.

### 4.2 Attendance, Geofencing & Face Verification
- **Preconditions**: Active staff or labour workforce on site.
- **Verbatim Navigation**: Sidebar -> `"Workforce & Safety"` -> `"Attendance & Muster Roll"` -> Click `"Mark Attendance"` or `"Face Punch"`.
- **Required Fields**:
  - `Employee / Worker` (select employee)
  - `Date` (date picker)
  - `Status` (Present, Half Day, Absent, On Leave)
- **Optional Fields**: `Punch In Time`, `Punch Out Time`, `GPS Latitude / Longitude` (validated against project geofence radius), `Face Camera Verification`.
- **API Endpoint & Method**: `POST /apis/v3/attendance/punch` or `POST /apis/v3/attendance/face-punch`
- **Permission Gate**: `attendance:create`
- **State Transition**: Creates `AttendanceLog` with `is_within_geofence` flag and calculates hours worked.
- **Success Criteria**: Site daily attendance register updates; hours flow into muster roll and payroll run.

### 4.3 Monthly Payroll Processing & Payslip Export
- **Preconditions**: Completed attendance logs for the target calendar month.
- **Verbatim Navigation**: Sidebar -> `"Workforce & Safety"` -> `"Payroll & Salary Advances"` -> Click `"Run Payroll"`.
- **Required Fields**:
  - `Payroll Month` (picker: YYYY-MM)
- **Optional Fields**: `Bonus / Incentives`, `Manual Deductions`, `Advance Salary Adjustments`.
- **API Endpoint & Method**: `POST /apis/v3/payroll/run`
- **Permission Gate**: `payroll:manage`
- **State Transition**: Aggregates present days, overtime, PF/ESI, and TDS to compute gross and net salaries in `PayrollLineItem` records.
- **Success Criteria**: Payroll run summary generates with status `Approved`, downloadable bank transfer CSV, and individual PDF payslips.

### 4.4 Quality Inspections & Checklists
- **Preconditions**: Active project selected.
- **Verbatim Navigation**: Sidebar -> `"Workforce & Safety"` -> `"Quality Inspections & NCRs"` -> Click `"+ New Inspection"`.
- **Required Fields**:
  - `Checklist Template` (select quality checklist)
  - `Project` (dropdown)
  - `Inspection Date` (date picker)
  - Checklist Items: mark `Pass` or `Fail` per checkpoint
- **Optional Fields**: `Non-Conformance Report (NCR) Description`, `Photo Evidence`, `Corrective Action Target Date`, `Inspector Remarks`.
- **API Endpoint & Method**: `POST /apis/v3/quality/inspections`
- **Permission Gate**: `quality:manage`
- **State Transition**: Saves `SiteInspection`. If failed items exist, opens an active NCR tracking issue.
- **Success Criteria**: Inspection logged in registry with pass/fail score badge; unclosed NCRs appear on project risk dashboard.

### 4.5 Safety Audits, Incidents & Permits to Work
- **Preconditions**: Active construction site.
- **Verbatim Navigation**: Sidebar -> `"Workforce & Safety"` -> `"Safety Audits & Incidents"` -> Click `"+ Report Incident"` or `"+ Issue Permit"`.
- **Required Fields**:
  - `Incident Title` (text)
  - `Severity` (dropdown: Near Miss, Minor, Major, Critical)
  - `Incident Date & Time` (datetime picker)
  - `Location on Site` (text)
- **Optional Fields**: `Witnesses`, `Injured Personnel Details`, `Root Cause Analysis`, `Corrective Action Plan`.
- **API Endpoint & Method**: `POST /apis/v3/safety/incidents`
- **Permission Gate**: `safety:manage`
- **State Transition**: Creates safety incident record and alerts safety officer.
- **Success Criteria**: Incident enters safety tracking workflow and updates safe man-hours statistics.

---

## 5. Plant & Equipment Group

### 5.1 Equipment Asset Registration
- **Preconditions**: User has equipment management permissions.
- **Verbatim Navigation**: Sidebar -> `"Plant & Equipment"` -> `"Equipment Inventory"` -> Click `"+ Add Equipment"`.
- **Required Fields**:
  - `Equipment Name` (text, e.g. "JCB 3DX Excavator")
  - `Asset Code / Registration No.` (text, e.g. "EQ-EXC-01")
  - `Ownership Type` (dropdown: Owned, Rented, Leased)
  - `Category` (dropdown: Heavy Machinery, Lifting, Earthmoving, Power, Concrete)
- **Optional Fields**: `Hourly / Daily Rental Rate`, `Purchase Price`, `Depreciation Method & Rate`, `Insurance Expiry Date`.
- **API Endpoint & Method**: `POST /apis/v3/equipment/`
- **Permission Gate**: `equipment:manage`
- **State Transition**: Creates `Equipment` asset in `status="available"`.
- **Success Criteria**: Asset appears in equipment registry card grid with utilization tracking.

### 5.2 Site Deployment & Log Sheets
- **Preconditions**: Available equipment asset in inventory.
- **Verbatim Navigation**: Sidebar -> `"Plant & Equipment"` -> `"Deployments & Log Sheets"` -> Click `"Deploy Equipment"`.
- **Required Fields**:
  - `Equipment` (select asset)
  - `Project` (select destination project)
  - `Deployment Start Date` (date picker)
- **Optional Fields**: `Operator Assigned`, `Initial Meter / Odometer Reading`, `Expected Release Date`.
- **API Endpoint & Method**: `POST /apis/v3/equipment/{id}/deploy`
- **Permission Gate**: `equipment:manage`
- **State Transition**: Updates equipment `status="deployed"` and creates `EquipmentDeployment` record.
- **Success Criteria**: Asset marked active on project site; daily running hours can now be logged.

### 5.3 Fuel Consumption & Efficiency Tracking
- **Preconditions**: Equipment actively deployed on project.
- **Verbatim Navigation**: Sidebar -> `"Plant & Equipment"` -> `"Fuel Logs & Efficiency"` -> Click `"+ Log Fuel"`.
- **Required Fields**:
  - `Equipment` (select deployed asset)
  - `Project` (dropdown)
  - `Fuel Liters` (numeric)
  - `Cost per Liter (INR)` (numeric)
  - `Log Date` (date picker)
- **Optional Fields**: `Meter / Hour Reading`, `Fuel Vendor / Dispenser`, `Receipt Attachment`.
- **API Endpoint & Method**: `POST /apis/v3/equipment/fuel`
- **Permission Gate**: `equipment:manage`
- **State Transition**: Creates `FuelLog` record. Calculates running cost per hour and fuel efficiency metric.
- **Success Criteria**: Fuel cost books into project equipment expense ledger and updates machine efficiency graph.

---

## 6. CRM & Business Development Group

### 6.1 Lead Capture & Pipeline Stage Management
- **Preconditions**: CRM module access.
- **Verbatim Navigation**: Sidebar -> `"CRM & Business Development"` -> `"Leads & Pipeline"` -> Click `"+ New Lead"`.
- **Required Fields**:
  - `Lead / Client Name` (text)
  - `Contact Person` (text)
  - `Phone Number` (text)
  - `Lead Stage / Status` (dropdown: New Lead, Follow-Up, Proposal Stage, Converted, Won, Lost)
- **Optional Fields**: `Email`, `Client Company`, `Estimated Budget`, `Source` (Referral, Web, Direct), `Address / City`.
- **API Endpoint & Method**: `POST /apis/v3/crm/leads`
- **Permission Gate**: `crm:leads:manage`
- **State Transition**: Creates `CRMLead` record in pipeline kanban / list view.
- **Success Criteria**: Lead card appears in stage column; reminders and follow-up activities can be attached.

### 6.2 Quotations & Cost Estimation
- **Preconditions**: Existing CRM Lead in pipeline.
- **Verbatim Navigation**: Sidebar -> `"CRM & Business Development"` -> `"Quotations & Estimates"` -> Click `"+ Create Quotation"`.
- **Required Fields**:
  - `Lead` (select lead)
  - `Quotation Subject / Title` (text)
  - Line Items: `Item Name`, `Quantity`, `Unit`, `Cost Price (INR)`, `Sales Unit Price (INR)`
- **Optional Fields**: `Quotation Number`, `Tax %`, `Discount (INR)`, `Payment Terms`, `Validity Period`.
- **API Endpoint & Method**: `POST /apis/v3/crm/quotations`
- **Permission Gate**: `crm:quotations:manage`
- **State Transition**: Creates `CRMQuotation` and `CRMQuotationItem` rows in `status="sent"`.
- **Success Criteria**: Generates branded client estimation PDF and becomes eligible for conversion into a Sale Invoice upon winning.

---

## 7. Reports & Analytics Group

### 7.1 Running Standard Reports
- **Preconditions**: Signed-in user with `reports:view` permission.
- **Verbatim Navigation**: Sidebar -> `"Reports & Analytics"` -> `"Operational Reports"` or `"Financial Reports"` -> Click report card (e.g. `"cost-code-expense-analysis"`).
- **Required Action**: Select project or date filters in the top spreadsheet toolbar.
- **API Endpoint & Method**: `GET /apis/v3/reports/data/{slug}?company_id={companyId}&project_id={projectId}`
- **Permission Gate**: `reports:view`
- **State Transition**: Fetches real-time database aggregations for the 82 standard reports.
- **Success Criteria**: Spreadsheet table renders rows matching `REPORT_METADATA.columns` with dynamic totals, search filtering, and multi-format export (CSV, PDF, HTML).

### 7.2 Construction Calculators & Material Converters
- **Preconditions**: Signed-in company user.
- **Verbatim Navigation**: Sidebar -> `"Reports & Analytics"` -> `"Calculators & Unit Converters"`.
- **Available Calculators**: Concrete Mix, Brickwork & Mortar, Plastering, Steel Weight, Flooring & Tiles, House Construction Cost Estimator.
- **Required Action**: Enter physical dimensions (length, width, height, thickness) and design specifications.
- **Output**: Instant client-side breakdown of required cement bags, sand volume, coarse aggregate, and estimated INR cost.
