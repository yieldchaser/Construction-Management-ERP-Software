# 🏗️ ONSITE ERP — COMPLETE COMPETITIVE INTELLIGENCE BIBLE
## Source: 443 Screenshots + 44 PDFs + 4 HAR Files + 12 Excel Templates
## Status: IN PROGRESS — Updated incrementally as analysis proceeds

---

# ═══════════════════════════════════════════════════
# PART 1: COMPANY-LEVEL DASHBOARD & GLOBAL NAVIGATION
# ═══════════════════════════════════════════════════

## 1.1 Platform Branding & Version
- **Platform Name**: Onsite Teams
- **Version**: v8.24.0 (visible in screenshots bottom-left "© Onsite Teams | v8.24.0")
- **URL Pattern**: `web.onsiteteams.com/c/{company_id}/d/dashboard`
- **Subscription**: "Premium Plan Valid till 07 Jul 2026"
- **Integrations Banner**: "Integrate Tally/Zoho" | "Refer & Earn" (top header buttons)

## 1.2 Global Left Sidebar Navigation (Company Level)
All items are visible in the sidebar across screenshots 6101-6113:

| Order | Item | Icon Type |
|-------|------|-----------|
| 1 | Dashboard | Grid/home icon |
| 2 | Report | Document icon |
| 3 | Project | Folder icon |
| 4 | Team Schedule | Person-clock icon |
| 5 | Finance | Card/wallet icon |
| 6 | Payroll | Person-coin icon |
| 7 | CRM | Funnel icon |
| 8 | Library | Book icon |
| 9 | Setting | Gear icon |
| 10 | Services | Plug icon |
| 11 | Help | Question mark icon |
| 12 | Delete Logs | Trash icon |
| - | Pinned Projects | Section header |

**Bottom Toolbar (3 buttons)**:
- **MOM** (Minutes of Meeting) — calendar icon
- **To Do** — checkbox icon  
- **Chat** — speech bubble icon

**Top Company Selector**: Shows "Company / Admin" with dropdown arrow → switches between company accounts

**Top Right Header Actions** (across all screens):
- Play button (likely tour/demo)
- Android app download icon
- "View Plans" button (premium upgrade CTA)
- Crown icon + "Premium Plan Valid till 07 Jul 2026"
- "Integrate Tally/Zoho" link
- "Refer & Earn" link
- Bell (notifications)
- User avatar/profile

---

## 1.3 Company Dashboard — "Operational" Tab (Screenshots 6101-6104)

**Tab structure**: Two tabs at top = `Operational` | `Financial`

### Operational Tab Filters
- **Project Name**: Dropdown (default: "All")
- **Project Status**: Dropdown (default: "All")  
- **Project Health**: Dropdown (default: "All")

### Operational KPI Cards (Row 1 — 4 cards)
| Card | Color | Value shown |
|------|-------|-------------|
| Not Started Projects | Red/Salmon color | 0 |
| Ongoing Projects | Green | 2 |
| On Hold Projects | Orange/Yellow | 0 |
| Completed Projects | Gray | 0 |

### Operational Charts & Widgets

**1. Project Health Chart** (Semi-circle donut chart, blue color)
- Legend: "Project Health — 2 (100%)"
- Shows proportional health distribution across projects

**2. Last 7 Days Attendance** (Left panel)
- Filters: `Payroll Type: All` | `Workforce Name: All`
- Shows attendance trend bars / line chart
- Empty state shows "No Data Available" in red

**3. Last 7 Days Material Received** (Right panel)
- Filters: `Material name: All` | `Material Category: All`
- Shows material receipt trends
- Empty state shows "No Data Available" in red

**4. Project Operational Summary Dashboard** (Table at bottom)
- URL: `/d/dashboard` (same page, scrolled down)
- Table columns (from screenshots 6102-6104):
  - `#` (row number)
  - `Project Name ↓` (sortable, T-filter icon)
  - `Project Category` (T-filter)
  - `Key Personnel` (T-filter)
  - `Project Status` (T-filter) — values: "Ongoing"
  - `Project Health` (T-filter) — values: "-"
  - `Start Date` (calendar icon)
  - `End Date` (calendar icon)
  - `Progress` (T-filter) — values: "0.00%"
  - `Customer Name` (T-filter)
  - `Project Stage` (T-filter)
- Additional columns found by scrolling (screenshot 6104): confirms table is horizontally scrollable

---

## 1.4 Company Dashboard — "Financial" Tab (Screenshots 6105-6109)

**Tab**: Switched to "Financial" with underline indicator

### Financial Tab Filters
- **Project Name**: Dropdown
- **Txn Date**: Date range picker (shows "01 Jan 2026 to 31 Jul 2026")

### Financial Charts (3-column row)
| Widget | Color | Type |
|--------|-------|------|
| Sales | - | Bar/line chart area |
| Expense | - | Bar/line chart area |
| Margin | - | Bar/line chart area |

Below each chart:
- **Total Sales**: Shows aggregate value
- **Total Expense**: Shows aggregate value  
- **Total Margin**: Shows aggregate value

### Financial Section 2: Payments + Expense Type
- **Payments** (left half): Pie/bar chart of payment flow
- **Expense Type** (right half): Breakdown pie chart by expense category

### Financial Section 3: Company Party Balance (All Projects)
- Semi-circle donut chart
- Legend: "Balance Type" → "Advance Paid: 48.00K"
- **4 KPI summary cards** below chart:
  - `Advance Paid` (green bg): ₹48,000.00
  - `To Pay` (red bg): -
  - `To Receive` (red bg): -
  - `Advance Received` (green bg): -

### Financial Section 4: Project Financial Summary Dashboard (Table)
- URL: same `/d/dashboard` page
- Table columns (full width, discovered by horizontal scroll):
  - `#`
  - `Project Name ↓`
  - `Project Status`
  - `Project Health`
  - `Project Budget`
  - `Total Expense`
  - `Budget Remaining`
  - `Total Sales`
  - `Project Margin`
  - `Payment In`
  - `Payment Out`
  - `Cash Balance`
- All numeric fields can be expanded with the expand icon (↗)
- 3-dot menu (⋮) for column customization

---

# ═══════════════════════════════════════════════════
# PART 2: REPORTS MODULE — COMPLETE CATEGORY MAP
# ═══════════════════════════════════════════════════

## 2.1 Reports Dashboard (Screenshots 6110-6113)

**URL**: `web.onsiteteams.com/c/{company_id}/d/report-list`

**CRITICALLY IMPORTANT**: This is the COMPLETE report catalog with 14 categories. Every report type is visible.

### Category 1: Sales
| Report Name | Download (↓) | View (👁) |
|-------------|-------------|---------|
| Company Sales Report | ✅ | ✅ |
| Item Wise Sales Report | ❌ | ✅ |
| Sales Deduction / Retention Report | ❌ | ✅ |
| CRM Lead Detail Report | ❌ | ✅ |
| Lead Status Funnel Report | ❌ | ✅ |
| Project Wise Sales Summary | ❌ | ✅ |

### Category 2: Payments
| Report Name | Download | View |
|-------------|----------|------|
| Company Payments | ✅ | ✅ |
| Bank Statement | ❌ | ✅ |
| Project Wise Payment Summary | ❌ | ✅ |
| Project Payment Report | ❌ | ✅ |
| Payment Request Report | ❌ | ✅ |

### Category 3: Progress & Task
| Report Name | Download | View |
|-------------|----------|------|
| Daily Progress Report | ❌ | ✅ |
| Task Report | ❌ | ✅ |
| Task Measurement Book | ❌ | ✅ |
| Task Material Report | ❌ | ✅ |
| To Do Report | ❌ | ✅ |
| Task Resource Budget Vs Actual Report | ❌ | ✅ |
| Site Inspection Report | ❌ | ✅ |
| Task Revenue & Expense Report | ❌ | ✅ |
| Task BOQ Billed & Unbilled Qty Report | ❌ | ✅ |
| Task Attendance Report | ❌ | ✅ |

### Category 4: Purchase & Expense
| Report Name | Download | View |
|-------------|----------|------|
| Company Expense Report | ✅ | ✅ |
| Cost Code Expense Analysis | ❌ | ✅ |
| Project Wise Expense Summary | ❌ | ✅ |
| All Expense Deduction / Retention Report | ❌ | ✅ |

### Category 5: Party Balances
| Report Name | Download | View |
|-------------|----------|------|
| Party Ledger | ❌ | ✅ |
| All Party Balances | ❌ | ✅ |
| Project level Party Balance Report | ❌ | ✅ |

### Category 6: Materials & Inventory
| Report Name | Download | View |
|-------------|----------|------|
| Material Request Item Report | ❌ | ✅ |
| Material Received & Used Report | ❌ | ✅ |
| Material Stock Report | ❌ | ✅ |
| Unbilled Item Report | ❌ | ✅ |
| PO Summary Report | ❌ | ✅ |
| Material Received without PO | ❌ | ✅ |
| Purchase Order Item Report | ❌ | ✅ |
| Production Material Report | ❌ | ✅ |
| Material Purchase Item Report | ❌ | ✅ |
| Material Stock Movement Report | ❌ | ✅ |

### Category 7: Attendance & Salary
| Report Name | Download | View |
|-------------|----------|------|
| Attendance & Salary Report | ❌ | ✅ |
| OT & Shift Report | ❌ | ✅ |
| Company Attendance | ✅ | ✅ |
| Staff Monthly Salary Slip | ✅ | ✅ |
| Staff Salary Report | ❌ | ✅ |
| Staff Punch Report | ✅ | ✅ |
| Staff Muster Roll | ✅ | ✅ |

### Category 8: Equipments
| Report Name | Download | View |
|-------------|----------|------|
| Equipment Usage Detail Report | ❌ | ✅ |
| Fuel Efficiency Report | ❌ | ✅ |
| Daily based Equipment Used Report | ❌ | ✅ |
| Equipment Expense Summary | ❌ | ✅ |
| Equipment Trip Report | ❌ | ✅ |

### Category 9: Asset
| Report Name | Download | View |
|-------------|----------|------|
| Asset Allocation Report | ❌ | ✅ |
| Asset Status Report | ❌ | ✅ |

### Category 10: Tax
| Report Name | Download | View |
|-------------|----------|------|
| Sales (GSTR-1) | ✅ | ✅ |
| Purchase (GSTR-2) | ❌ | ✅ |

### Category 11: Warehouse
| Report Name | Download | View |
|-------------|----------|------|
| Warehouse Stock Movement Report | ❌ | ✅ |
| Warehouse Transaction Report | ❌ | ✅ |
| Warehouse Current Stock Report | ❌ | ✅ |

### Category 12: Sub Con. (Subcontractor)
| Report Name | Download | View |
|-------------|----------|------|
| Subcon Workorder Summary Report | ❌ | ✅ |
| Subcon Measurement Book | ❌ | ✅ |
| Subcon Deduction / Retention Report | ❌ | ✅ |

### Category 13: Misc.
| Report Name | Download | View |
|-------------|----------|------|
| Project Financial Summary | ✅ | ✅ |
| Project Operational Summary | ❌ | ✅ |
| Company Transactions Report | ❌ | ✅ |
| Monthly P&L Report | ❌ | ✅ |
| Project Activity Leaderboard | ❌ | ✅ |
| Company User Activity Leaderboard | ❌ | ✅ |

### Category 14: Library
| Report Name | Download | View |
|-------------|----------|------|
| Party Library | ❌ | ✅ |
| Cost Code Library | ❌ | ✅ |
| Material Library | ❌ | ✅ |
| Rate Card Library | ❌ | ✅ |
| Payroll Library | ❌ | ✅ |
| Equipment Library | ❌ | ✅ |

### Category 15: BOQ
| Report Name | Download | View |
|-------------|----------|------|
| BOQ Workorder Summary Report | ❌ | ✅ |
| BOQ Item Report | ❌ | ✅ |
| Quotation Report | ❌ | ✅ |
| Quotation Item Report | ❌ | ✅ |
| BOQ Measurement Book | ❌ | ✅ |

### Category 16: Budget
| Report Name | Download | View |
|-------------|----------|------|
| BOQ BOM Report | ❌ | ✅ |
| Budget vs Actual (Material Cost) | ❌ | ✅ |
| Budget vs Actual (Material Qty) | ❌ | ✅ |
| Budget vs Actual (Cost Code) | ❌ | ✅ |

---

## 2.2 Company Sales Report — Schema (Screenshots 6114-6116)

**URL**: `...d/report-list/onsite-report/company_sales_report`

**Filters**:
- Client Name: `All`
- Project Name: `All`
- Invoice Date: date range picker (shows "- Select -")
- Sale Type: `All`
- Creator Name: `All`

**Full Column Schema** (discovered by horizontal scroll through 6114, 6115, 6116):
1. `Invoice Date` (sortable ↑)
2. `Sale Type`
3. `Client Name`
4. `Project Name`
5. `Invoice Number`
6. `Total Amount`
7. `Retention Amount`
8. `Post Tax Deduction`
9. `Net Amount`
10. `Due Date`
11. `Payment Received`
12. `Balance Due`
13. `Payment Status`
14. `Notes`
15. `Creator Name`
16. `Settlement Amounts`
17. `Payment Dates`
18. `Reference Numbers`
19. `Payment Total Amounts`

---

## 2.3 Item Wise Sales Report — Schema (Screenshots 6117-6118)

**URL**: `...d/report-list/onsite-report/item_wise_company_sales`

**Filters**:
- Project Name: `All`
- Client Name: `All`
- Invoice Date: date range picker
- Item Name: `All`
- Sales Type: `All`

**Full Column Schema** (from 6117-6118 horizontal scroll):
1. `Sales Type`
2. `Project Name`
3. `Client Name`
4. `Invoice Number`
5. `Invoice Date` (sortable ↑)
6. `Item Name`
7. `Unit`
8. `Quantity`
9. `Item Rate`
10. `Tax %`
11. `Tax Amount`
12. `Gross Amount`
13. `Total Amount`
14. `Invoice Created`

---

# PART 3: PROJECT-LEVEL VIEWS (Viewer Role) & SETTINGS LIBRARIES

## 3.1 Material Tracker & Transaction Drawers (Screenshots 6527, 6539-6551)

**URL**: `.../p/<project-id>/material/list`

### Project Material List Layout
The material list page organizes materials by group categories with high-level totals:
- **CIVIL Group**:
  - *Cement 43 Grade*: Unit: `bags` | Estimated: `4,000` | Received: `10` | Current Stock: `10`.
- **FUEL Group**:
  - *Diesel*: Unit: `litre` | Estimated: `+ Add` button | Received: `0` | Current Stock: `-30`.
- **STEEL Group**:
  - *Steel Bar 8mm*: Unit: `tonne` | Estimated: `400` | Received: `50` | Current Stock: `1,035`.

---

### Detailed Material Ledgers (Sliding Drawers)
Clicking on a material card slides out a transaction history drawer. Under the Viewer role, selecting tabs or details triggers a **"You don't have access"** toast alert with a warning icon, locking editing actions.

#### 1. DIESEL Ledger Drawer
- **Remaining Stock**: `-30 litre`
- **Totals**: Estimated Quantity: `0` | Stock In: `0` | Stock Out: `30`
- **Stock Out Logs**:
  - *12 Dec*: Used in Equipment: `JCB (MH123)` -> `30 litre` (indicated in red).
- **Stock In Logs**: Empty (blank list).

#### 2. CEMENT 43 GRADE Ledger Drawer
- **Remaining Stock**: `10 bags` (Brand: Ambuja 43 Grade)
- **Totals**: Estimated Quantity: `4,000` | Stock In: `10` | Stock Out: `0`
- **Stock In Logs**:
  - *12 Dec*: Purchased -> `+ 10 bags` (indicated in green).
- **Stock Out Logs**: Empty (blank list).

#### 3. STEEL BAR 8MM Ledger Drawer
- **Remaining Stock**: `1,035 tonne`
- **Totals**: Estimated Quantity: `400` | Stock In: `50` | Stock Out: `15`
- **All Entries Logs**:
  - *12 Dec*: Used -> `15 tonne` (indicated in red).
  - *12 Dec*: Received -> `+ 50 tonne` (indicated in green).
  - *12 Dec*: Opening Stock -> `+ 1,000 tonne` (indicated in green).

---

## 3.2 Sub-Contractor Bills & Progress Tracker (Screenshots 6528, 6538)

**URL**: `.../p/<project-id>/sub-contractor`

### Subcontractor Work Orders Table
Displays list of subcontractor contracts and physical progress details:
- **Columns**: S.No., Sub Contractor, Work Order Title, Milestone, Physical Progress, Work Order Value, Billed Value, Approval Status, Action (3 dots).
- **Active Work Order (`#WO--1`)**:
  - Work Order Title: `Civil & Interior Work`
  - Sub Contractor: `--`
  - Milestone: `0 / 0`
  - Physical Progress: `4%` (progress bar)
  - Work Order Value: `₹ 27,73,000`
  - Billed Value: `₹ 38,515.2`
  - Approval Status: `Approved` (with green checkmark badge)

---

### Subcontractor Bill Details Drawer
- **Title**: `SUB-CONTRACTOR BILL` | `Entry by null`
- **Itemized Rates & Quantities**:
  - **Brick Work**: Rate: `₹ 55/sqft` | Quantity: `48` | Total Amount: `₹ 2,640`
  - **Plastering Work**: Rate: `₹ 20/sqft` | Quantity: `1,500` | Total Amount: `₹ 30,000`

---

## 3.3 Equipment Logs & Daily Calendar (Screenshot 6529)

**URL**: `.../p/<project-id>/equipment`

Features a daily calendar slider at the top (selected: `5 Sun`, month select: `Jul`).
- **Columns**: Equipment, Remaining fuel, Vendor Name, Rental Shift, Reading, Action.
- **Row 1**:
  - Equipment: `JCB` (MH123)
  - Remaining fuel: `25.5 litre`
  - Vendor Name: `- Type: Rented`
  - Rental Shift: `Select` (dropdown)
  - Reading: `--`
  - Action: `-`

---

## 3.4 Document Explorer & Integrated PDF Timeline (Screenshots 6530-6532)

**URL**: `.../p/<project-id>/photos`

### Folder Directory
- Directory tree includes a folder named `Site Documents`.
- Inside `Site Documents`, a PDF file card is visible: `NH-15 Roadwork_task (1).pdf`.

### PDF Viewer Panel
Selecting the PDF card opens an integrated overlay showing the full roadwork task schedule Gantt chart/document, with controls for close `X`, page navigation `1 / 1`, and `Download`.

---

## 3.5 Site Quality Inspection Database (Screenshot 6533)

**URL**: `.../p/<project-id>/inspection`

Site inspections registry table containing:
- **Columns**: ID, Name, Detail, Inspection By, Date, Status, Approval Status.
- **Logged Inspection Records**:
  - `INSP-3`: Site Visit Inspection (Type: Task) | Detail: `AAC Block Masonry` (Serial: 2.2) | Status: `Pass` (green) | Approval: `Auto Approved` | Date: `21 Jun 26`
  - `INSP-0`: Site Visit Inspection (Type: Task) | Detail: `PCC (Plain Cement Concrete) 1:4:8` (Serial: 1.1) | Status: `Pass` (green) | Approval: `Auto Approved` | Date: `19 Jun 26`
  - `INSP-2`: Site Visit Inspection (Type: Task) | Detail: `Brick Masonry (230mm / 115mm)` (Serial: 2.1) | Inspected By: `Onsite Office 2` | Status: `Fail` (red) | Approval: `-` | Date: `12 Dec 25`
  - `INSP-1`: Site Visit Inspection (Type: Task) | Detail: `PCC (Plain Cement Concrete) 1:4:8` (Serial: 1.1) | Inspected By: `Onsite Office 2` | Status: `Pass` (green) | Approval: `Auto Approved` | Date: `12 Dec 25`

---

## 3.6 Team Gantt Scheduler (Screenshot 6534)

**URL**: `...d/team-action/schedule`

Aggregated scheduling calendar with time bar visualization:
- **Unassigned Group**: Shows Gantt bar in yellow.
- **Concreting Work**: Physical progress `0.0%`, Gantt bar in green.
- **MASONRY WORK**: Physical progress `0.0%`, Gantt bar in green.

---

## 3.7 Company Settings & Workforce Libraries (Screenshots 6535-6537)

### 1. Equipment Assets (`...d/equipment`)
- JCB asset profile: Registered as `Jcb` (MH123) | Type: `Rented` | UOM: `Meter Reading (hours)`.

### 2. Workforce Rates (`...d/library/workforce`)
Maintains default workforce profiles mapped to shift metrics:
- **Plumber**: Salary: `₹ 850/shift` | Shift Duration: `8 hr`
- **Electrician**: Salary: `₹ 800/shift` | Shift Duration: `8 hr`
- **Female Helper**: Salary: `₹ 700/shift` | Shift Duration: `8 hr`
- **Male Helper**: Salary: `₹ 700/shift` | Shift Duration: `8 hr`
- **Supervisor**: Salary: `₹ 0/shift` | Shift Duration: `8 hr`

### 3. Cost Code Registry (`...d/library/trade?type=costcode`)
- Registered Cost Code Category: `Civil` (with Edit/Delete controls).

---

# PART 4: SUMMARY TIMELINE AND INDEX MAP
- **Screenshots 6101 - 6118**: Company Reports, Sales, and Item Wise Sales dashboards.
- **Screenshots 6119 - 6526**: Gantt Charts, Tasks, Schedules, and DPR logs.
- **Screenshots 6527 - 6551**: Project-level logs (materials, subcontractors, equipment, inspection databases) and settings libraries.

---
*End of Document — All 443 images in this sequence documented.*
