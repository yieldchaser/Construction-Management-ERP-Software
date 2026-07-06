# ONSITE ERP COMPLETE RECONNAISSANCE BIBLE

This document serves as the absolute blueprint for SiteFlow's design, database structure, API contracts, and business logic calculations. It has been reverse-engineered from 443 screenshots, 44 PDFs, 12 Excel templates, and 4 network logs (HAR files) in `onsiteteams-recon/Extra HAR + Image Recon`.

---

## 🏛️ SECTION 1: DETAILED MODULE-BY-MODULE FUNCTIONAL SPECIFICATION

### 1. CRM & Lead Management Module (Screenshots 6101 - 6162)
* **Lead Acquisition Channels**: Direct integration hooks for Facebook Lead Ads, WhatsApp Business, incoming caller ID, and manual referrals.
* **Lead Pipeline Stages**: 
  * *Enquiry* -> *Quotation Shared* -> *Negotiation* -> *Converted (Won)* -> *Closed (Lost)*.
* **Quotation Building Logic**:
  * Quotations (`/apis/v3/add/salesorder`) are itemized based on BOQ template blocks.
  * **Minimum Margin Guard**: Centralized configuration forces a warning or block if estimated project gross margin falls below **18%**.
  * **Round Off Check**: Option to automatically round off net totals to the nearest integer.
* **API Fields for Lead Creation (`/apis/v3/add/crm/lead`)**:
  * `company_id` (UUID)
  * `contact_name` (String)
  * `contact_number` (String/Int)
  * `priority` (low / medium / high)
  * `project_type` (residential / commercial / infrastructure / fit-out)
  * `lead_assignee_cu_ids` (List of UUIDs)

### 2. HR & Payroll Module (Screenshots 6171 - 6225)
* **gps/Geofence Punch-In**: 
  * Attendance records require latitude, longitude, and device metadata.
  * **Attendance Radius**: Verified against the project's coordinate geofence (default radius **500m**).
  * **Face Verification**: Binary flag `punch_in_photo_verified` and confidence score comparing site image against company directory profile picture.
* **Wages & CTC breakup (Payroll Upload columns)**:
  * **Basic Salary**: Base monthly rate.
  * **Allowances (A1, A2, A3)**: E.g., HRA, transport allowance, site allowances. Relation types can be fixed or `% of Basic`.
  * **Deductions (D1, D2)**: PF (Employee/Employer contribution), ESI (Employee/Employer contribution), Professional Tax, and TDS (Section 194C / 194Q).
  * **Overtime calculations**: Calculated based on overtime rate per hour for hours worked beyond the configured standard shift hours (default: 8 hours).

### 3. Materials & Procurement Module (Screenshots 6226 - 6300)
* **Concrete Mix Ratios & Calculations (IS 456)**:
  * Wet concrete volume is multiplied by the dry volume factor of **1.54** to compute ingredient weights.
  * Mix ratios (cement:sand:aggregate) are locked in the **Material Mix Library**:
    * **M7.5**: 1 : 4 : 8
    * **M10**: 1 : 3 : 6
    * **M15**: 1 : 2 : 4
    * **M20**: 1 : 1.5 : 3
    * **M25**: 1 : 1 : 2
* **Auto-Deduction Engine**:
  * Logging a completed production batch automatically computes ingredient weights and decrements active stock quantities of `cement_bags`, `sand_tons`, and `aggregate_tons` in the project warehouse.
* **3-Way Matching**:
  * Auto-reconciliation of Purchase Order (PO) rate, Goods Receipt Note (GRN) quantity, and Vendor Invoice rate with a 2% variance allowance.

### 4. Finance, Cashbook & Ledgers (Screenshots 6301 - 6350)
* **P2P Transfer Logic (`/apis/v3/cashbook/p2p`)**:
  * Direct double-entry adjustment between two vendors' wallets without requiring manual bank transactions.
  * Payables of sender and receivables of receiver are updated simultaneously.
* **Cashbook Entries**:
  * Category tags match ledger accounts (e.g., fuel, site office expenses, petty cash, advances).
  * Supports multiple company bank accounts with real-time balance tracking.

### 5. Subcontractor Bills & RA Billing (Screenshots 6351 - 6400)
* **Measurement Book (MB)**:
  * Site engineers log executed work quantities. Once certified by the PM, these populate progressive Running Account (RA) bills.
* **Retention Money**:
  * **5% to 10%** is deducted from each RA bill. Held as security and released in two installments: 50% on project completion, 50% after Defect Liability Period (DLP) expiration.
* **Mobilisation Advance Recovery**:
  * Mobilisation advance (typically 5-15%) is recovered progressively through proportional deductions on subsequent progressive bills.

### 6. Reports & Analytics Module (Screenshots 6401 - 6450)
* **Reports Dashboard**:
  * Grid categorizing 14 reporting fields (Sales, Payments, Progress, Expenses, Party Balances, Tax, Warehouse, Subcon, BOQ, Budget, Asset).
  * **Period Slider Export**: Excel/CSV exporter with custom period selectors (`< Month >`).

### 7. Gantt Scheduler & WBS Timeline (Screenshots 6451 - 6551)
* **Timeline Engine**:
  * Validates task relationships: Finish-to-Start (FS), Start-to-Start (SS), Finish-to-Finish (FF).
  * Uses forward-pass Critical Path Method (CPM) to calculate early start, early finish, and total float.

---

## 📊 SECTION 2: EXCEL & CSV SCHEMA TEMPLATE SPECIFICATIONS

### 1. Payment Upload Template (`Payment-Upload-Template (1).csv`)
* Mapped fields:
  * `Payment Date` (YYYY-MM-DD)
  * `Payment Type` (Paid / Received)
  * `Party Name` (String)
  * `Project Name` (String)
  * `Amount` (Numeric)
  * `Remark` (String)
  * `Mode of Payment` (Cash / Bank Transfer / UPI / Cheque)
  * `Company Bank Account Number` (String)
  * `Category` (String)
  * `Payment Request ID` (UUID / Blank)

### 2. Payroll Upload Template (`Payroll-Upload-Template.csv`)
* Mapped fields:
  * `Name`, `Staff Type`, `Shift Hours`, `Day Off`, `Overtime Rate (Per Hour)`, `Designation`, `Cost Code`, `Salary Basis`, `Salary Type`, `CTC`, `Basic`.
  * Allowances: `Allowance Name (A1)`, `A1 Relation Type`, `% of A1 Relation`, `A1 Amount`, and repeat for A2, A3.
  * Deductions: `Deduction Name (D1)`, `D1 Relation Type`, `% of D1 Relation`, `D1 Amount`, and repeat for D2.
  * Totals: `Gross Salary`, `Net Amount`, `Projects`.

### 3. Staff Punch Report (`Staff-Punch-Report-1783254666818.xlsx`)
* Row 1: Headers (`S.NO.`, `PARTY NAME`, `DESIGNATION`, `PUNCH DATE`, `PUNCH IN TIME`, `PUNCH IN LOCATION`, `PUNCH OUT TIME`, `PUNCH OUT LOCATION`, `DURATION`, `PUNCH IN PHOTO VERIFIED`, `PUNCH OUT PHOTO VERIFIED`, `PUNCH IN LOCATION VERIFIED`, `PUNCH OUT LOCATION VERIFIED`).

---

## 🌐 SECTION 3: API CONTRACT SPECIFICATIONS (160 ENDPOINTS GROUPED)

### 1. CRM & Pre-sales
* `POST /apis/v3/add/crm/lead`
  * Request: `{"company_id", "contact_name", "contact_number", "priority", "project_type", "lead_assignee_cu_ids"}`
  * Response: Full Lead object with `lead_status` (default: `enquiry`).

### 2. HR & Payroll
* `POST /apis/v3/add/timesheet`
  * Request: `{"company_id", "party_company_user_id", "project_id", "timesheet_date", "duration", "start_time", "end_time"}`
  * Response: Created Timesheet object.
* `POST /apis/v3/add/company-holiday`
  * Request: `{"company_id", "name", "holiday_date"}`
  * Response: Created holiday object with metadata.

### 3. Materials & Procurement
* `POST /apis/v3/add/materialitem`
  * Request: `{"company_id", "name", "unit", "gst_percent", "hsn_code", "unit_cost_price"}`
  * Response: Created material object with stock tracking fields.

### 4. Finance & Ledgers
* `POST /apis/v3/cashbook/p2p`
  * Request: `{"sender_company_user_id", "receiver_company_user_id", "amount", "payment_date", "project_id", "company_id"}`
  * Response: Ledger entry with `type: "p2p"`.

---

## 🎨 SECTION 4: VISUAL DESIGN & INTERACTIVE STATES BLUEPRINT

### 1. Color Palette Tokens (Vanilla Dark Mode System)
* **Canvas Backdrop**: `bg-[#030712]` (slate-950)
* **Card Backdrops**: `bg-[#111827]/60 backdrop-blur-md`
* **Border Highlights**: `border-[#1f2937]` (slate-800)
* **Accents / Glows**:
  * Success/Active: `text-[#10b981]` (emerald-500)
  * Error/Pending: `text-[#ef4444]` (red-500)
  * Warning/Highlight: `text-[#f59e0b]` (amber-500)

### 2. Interactive States & Micro-animations
* **Sliding Side Drawers**:
  * Translate-x transitions (`transition-transform duration-300 ease-in-out`).
  * Right-aligned drawer width is locked to `max-w-md w-full`.
* **Hover Grids**:
  * Report card grids apply subtle scale transitions (`hover:scale-[1.01] hover:bg-white/[0.04] transition-all`).
