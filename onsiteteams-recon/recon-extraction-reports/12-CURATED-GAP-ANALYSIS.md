# SiteFlow vs Onsite Teams Gap Analysis

## Executive Summary

Onsite Teams is a construction ERP built for Indian contractors and EPC firms, featuring integrated modules for project management, procurement, labor attendance (GPS/face), subcontractor billing with milestone control, and statutory compliance. SiteFlow has comparable core functionality but lacks several specialized features: MEP-specific quality checklists, chainage-wise progress tracking for infrastructure, production management with batching controls, and some statutory reporting (BOCW, PF/ESI). Onsite emphasizes WhatsApp-first workflows and Tally integration, while SiteFlow focuses on structured API-first architecture.

---

## Onsite Modules & Features (from PDFs)

### Core Modules
- **Project Management** - BOQ-linked planning, task scheduling, progress tracking, multi-tower support
- **Material Management** - Material requests, POs, GRNs, inventory tracking, vendor comparisons
- **Labor Management** - GPS attendance, face recognition, wage calculation, muster rolls, BOCW compliance
- **Subcontractor Management** - Work orders, milestone billing, retention tracking, quantity verification
- **Financial Management** - Budget vs actual, cost variance analysis, 50+ reports, WIP tracking
- **Client Invoicing** - RA bills from verified quantities, GST-compliant invoices, collection tracking
- **Equipment Management** - Asset tracking, fuel logs, maintenance schedules, hired equipment verification
- **Production Management** - Material batching, concrete mix recipes, output tracking
- **Quality Management** - Digital checklists, inspection reports, NCR (Non-Conformance Reports)
- **Design Management** - Drawing repository, version control, pin-based queries, approval workflows
- **CRM** - Lead capture, BOQ-linked quotations, margin visibility
- **Reporting** - 50+ pre-built reports, customizable filters, PDF/Excel export

### Business Logic Features
- **3-Way Matching** - PO ↔ GRN ↔ Invoice reconciliation with variance detection
- **Milestone-based Billing** - Subcontractor payments tied to verified progress
- **Budget-driven Procurement** - POs linked to project budgets before approval
- **Retention Tracking** - Automatic deduction handling for subcontractor bills
- **Statutory Compliance** - BOCW records, PF/ESI contributions, TDS calculations
- **Asset Depreciation** - Straight-line and reducing-balance methods
- **Material Production Batches** - Planned vs actual input/output comparison

---

## Onsite UI Elements (from OCR)

### Dashboard Screens
- **Company Dashboard** - Project Name, Project Status, Project Health filters (All v dropdown)
- **Team Schedule** - Attendance tracking view
- **Project Operational Summary** - Columns: Project Name, Client Name, Workorder Date
- **BOQ Workorder Report** - Columns: Project Name, Client Name, Workorder Date
- **BOQ Item Report** - Columns: Project Name, Workorder Name, Workorder No, Client Name, BOQ Date

### Payroll Screens (High Confidence)
- **PAYROLL DETAILS** with AMOUNT field (₹/month)
- **Add Salary Breakup** form
- **SHIFT TIMING** - Start Time - End Time fields
- **SHIFT HOL** - per shift, per hour rate fields
- **DESIGNATION** - dropdown selector
- **LEAVE TEMPLATE** - dropdown selector
- **Cost Code** field
- **Workforce Library** - "Add New Workforce" button, Search Party, SELECT PARTY + New Party

---

## Onsite API Surface (from HAR)

### Observed API Endpoints
- `/d/dashboard` - Company dashboard view
- `/d/payroll-attendance/people` - Payroll workforce management
- `/d/reports` - Reports section with equipment, BOQ filters
- `/d/home` - Company home page
- `/c/{company_id}/d/{module}` - Company-scoped module routing pattern

### Report Endpoints (Inferred)
- `/reports/equipment` - Equipment listing with EquipmentName, Equipment No, Created Date columns
- `/reports/boq-workorder` - Workorder summary
- `/reports/boq-item` - BOQ item details

---

## SiteFlow Existing Capability

### Models (Key Columns Extracted)

| Model | Key Columns |
|-------|-------------|
| Company | name, gstin, billing_address, onboarding_segment, onboarding_categories |
| CompanyBranch | company_id, branch_name, gstin, billing_address |
| Project | name, code, status, address, city, state, location |
| User | name, mobile, email |
| CompanyRole | company_id, role_name, permissions |
| CompanyTeam | company_id, user_id, role_id, priority_type |
| BOQItem | project_id, section_name, item_name, unit, quantity, rate, supply_rate, installation_rate |
| ProjectBudget | project_id, material_budget, labour_budget, subcon_budget, equipment_budget |
| Task | project_id, parent_id, name, duration_days, start_date, end_date, status, priority |
| Drawing | project_id, name, category, created_by |
| DrawingRevision | drawing_id, version_code, file_url, approval_status |
| MaterialIndent | company_id, project_id, indent_number, status |
| PurchaseOrder | company_id, project_id, po_number, po_date, status, gross_amount |
| GRN | company_id, project_id, po_id, grn_number, received_date |
| WarehouseInventory | project_id, material_name, on_hand_qty, reserved_qty |
| WorkOrder | company_id, project_id, subcontractor_id, wo_number, estimated_work_amount |
| Bill | company_id, project_id, invoice_number, invoice_type, subtotal, gst_amount |
| StaffEmployee | company_id, name, designation, basic_salary, hra, pf/ esi percentages |
| AttendanceLog | employee_id, project_id, punch_in/out, lat/lng, is_within_geofence |
| Timesheet | employee_id, project_id, week_start/end, total_hours |
| PayrollRun | company_id, payroll_month, total_gross/net |
| QualityChecklist | company_id, title, category, is_code_reference |
| SiteInspection | project_id, checklist_id, inspection_date, status, pass/fail counts |
| Equipment | company_id, name, code, category, ownership_type, hourly_rate |
| SafetyIncident | project_id, incident_type, severity, lost_time_days |
| CRMLead | company_id, contact_name, phone_no, status, budget |
| Payment | company_id, project_id, payment_type (in/out), amount, payment_method |
| RFQ | company_id, project_id, rfq_number, status |
| BOCWRecord | company_id, project_id, month_year, workers_count, wages_paid |
| MusterRoll | company_id, project_id, date, labor_role, workers_present/absent |
| SubcontractorAttendance | project_id, subcontractor_id, labor_role, worker_count |
| ThreeWayMatch | company_id, po_id, grn_id, invoice_id, match_status, variance_amount |
| MaterialWastage | company_id, project_id, material_name, wastage_type, quantity, estimated_value |
| ChatGroup | company_id, project_id, name, group_type |
| FaceRecognitionLog | company_id, project_id, employee_id, face_verified, confidence_score |
| LibraryParty | company_id, name, party_type, aadhaar_number, pan_number |
| LibraryMaterial | company_id, name, unit, gst_rate, category, lead_time_days |
| LibraryCostCode | company_id, code, name |
| StatutoryReport | company_id, report_type (pf, esi, bocw, tds), return_period |

### Router Names
- `auth` - Authentication endpoints
- `finance` - Financial transactions
- `hr` - Human resources
- `production` - Production management
- `procurement` - Procurement workflows
- `library` - Master data libraries
- `statutory` - PF/ESI/BOCW compliance
- `billing` - Invoice generation
- `subcon_performance` - Subcontractor metrics
- `towers` - Multi-tower project tracking
- `budget` - Project budgeting
- `face_recognition` - Biometric attendance
- `labour` - Labor management
- `vendor_performance` - Vendor metrics
- `rfq` - Request for quotations
- `three_way` - 3-way matching
- `chat` - Chat groups & MOM
- `custom_fields` - Dynamic field engine
- `wastage` - Material wastage tracking
- `assets` - Equipment depreciation
- `reports` - Analytics & exports
- `safety` - HSE incident tracking
- `drawings` - Drawing management
- `dpr` - Daily progress reports
- `crm` - Lead management
- `planning` - Project scheduling
- `subcon_attendance` - Subcontractor attendance
- `equipment` - Machinery tracking
- `quality` - QC checklists
- `calculators` - IS-code calculators

---

## Gap Analysis: What Onsite Has That SiteFlow DOES NOT

### Missing Modules
- **Production Management** - SiteFlow has `production` router but no batching/recipes UI; Onsite has full concrete mix batching with input/output tracking
- **Design Management** - SiteFlow has `drawings` router but missing pin-based query feature; Onsite supports drawing annotations directly on PDFs
- **Client Portal** - No read-only client access portal for progress reports in SiteFlow

### Missing Export/Report Formats
- **GSTR-1 Report** - Onsite has dedicated GST reporting with columns: Party GSTIN, Invoice Number, Invoice Value, Taxable Amt, CGST/SGST/IGST Amt
- **Staff Muster Roll Export** - Columns: Party Code, Employee Name, Designation, Phone No., Bank Account No., Work Days, PL, WO, Payable Days, OT(Hours)
- **Staff Punch Report** - Columns: PARTY NAME, DESIGNATION, PUNCH DATE, PUNCH IN/OUT TIME, LOCATION VERIFIED, PHOTO VERIFIED
- **Attendance Sheet by Date** - Matrix format with daily columns (01-Jul-26 through 05-Jul-26) for worker tracking

### Missing Workflows
- **Subcontractor Retention Automation** - SiteFlow tracks manually; Onsite auto-deducts retention from bills
- **BOCW Cess Reporting** - SiteFlow has BOCWRecord model but no statutory filing workflow; Onsite includes BOCW in statutory reports
- **RFQ-to-PO Comparison Screen** - Onsite shows vendor rates/timeline side-by-side; SiteFlow has separate RFQ and PO screens
- **Material Production Variance Alerts** - Onsite flags batching variances; SiteFlow lacks this control

### Missing UI Features
- **Chainage Progress Tracking** - For infrastructure projects (Km 0+000 — 4+200 format); SiteFlow tracks basic progress only
- **Multi-level Approval Visual Indicators** - Onsite shows approval pending status prominently; SiteFlow has basic approval_flag
- **Refer & Earn Integration** - Onsite has built-in referral program; not in SiteFlow

---

## Gap Analysis: What SiteFlow Has That Onsite Might NOT

### Advanced Models
- **Asset Depreciation Schedules** - Both straight-line and reducing-balance; Onsite unclear if implemented
- **ThreeWayMatch Model** - Explicit variance tracking; Onsite may have implicit matching
- **Custom Fields Engine** - Dynamic field system per entity type; Onsite uses fixed schemas
- **FaceRecognitionLog** - Biometric audit trail; Onsite mentions face recognition but logging details unclear
- **SubcontractorPerformance Table** - Detailed scoring (on-time %, billing accuracy, quality score)
- **VendorPerformance Table** - Delivery accuracy, quality issues tracking
- **TaskTodo & TaskComment** - Granular sub-task management with activity feed
- **PaymentSettlement** - Explicit payment-to-bill mapping; Onsite may handle implicitly

### Router Coverage
- **towers** - Multi-tower building project management
- **budgeting** - Advanced budget workflows
- **subcon_attendance** - Dedicated subcon worker tracking

---

## Recommendation Priority List

### Tier 1 (Critical - 4-8 weeks)
1. **Production Management Batching** - Add production recipes/recipes materials tables, batch tracking UI
2. **GSTR-1 Export** - Implement GST reporting format with tax breakdowns
3. **Muster Roll Export** - Add staff attendance export with statutory columns
4. **RFQ Comparison View** - Vendor rate/timeline side-by-side screen

### Tier 2 (Important - 8-12 weeks)
5. **Drawing Pin Queries** - Annotation feature for design reviews
6. **Subcontractor Retention Workflow** - Auto-deduction on bill approval
7. **BOCW Cess Filing Integration** - Monthly return generation
8. **Chainage Progress View** - Infrastructure project tracking mode

### Tier 3 (Enhancement - 12+ weeks)
9. **Client Portal** - Read-only project progress access
10. **Material Production Variance Alerts** - Threshold-based notifications
11. **Refer & Earn Module** - Referral tracking and payouts
12. **PPE Compliance Audit** - Regular safety check logging