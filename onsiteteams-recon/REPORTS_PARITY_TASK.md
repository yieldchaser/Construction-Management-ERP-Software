# REPORTS PARITY TASK — AIRTIGHT IMPLEMENTATION GUIDE

## OVERVIEW

**Goal:** Make our Reports page and every individual report view match the reference app (Onsite Teams) precisely — same icons, same view/download affordances, same filters, same table columns.

## MANDATORY RULES — READ BEFORE ANYTHING ELSE

> **Zero ambiguity. Every rule below is non-negotiable.**

1. **Screenshot first, code second.** For every report with a view page — before writing a single line of code — open its reference screenshot from the `All Images Documented` folder. Confirm the URL bar matches the report slug. Then read: (a) every filter label + input type, (b) every column header left-to-right (open next screenshot if table scrolls right). Screenshot is the single source of truth. It overrides everything else in this document.
2. **Icons rule:** Reports with `👁️` only on reference → show `⬇️ + 👁️` on our list; build full view page whose interior matches reference exactly. Reports with `⬇️` only on reference → download modal only, no view page, no eye icon.
3. **Export dropdown on every view page** (confirmed from Payment Request Report screenshot): the export button opens a dropdown with exactly 4 options — `Export as CSV` | `Export as Excel` | `Export as PDF` | `Export as HTML`.
4. **Filters:** Implement exactly the filters shown in the screenshot — exact label text, exact input type (dropdown / date-picker / text). No more, no fewer.
5. **TypeScript:** After all pages are built, run `npx tsc --noEmit --skipLibCheck` inside `frontend/`. Must pass with zero errors. Then `git add -A && git commit`.

**Reference screenshots are at:**
```
C:\Users\Dell\Github\Construction-Management-ERP-Software\onsiteteams-recon\Extra HAR + Image Recon\All Images Documented\
```

**Primary files you will modify:**
- `frontend/src/app/c/[company_id]/reports/page.tsx` — the main reports list page
- `frontend/src/app/c/[company_id]/reports/<slug>/page.tsx` — individual inline view pages (create new ones)

---

## SECTION 1 — HOW THE REFERENCE APP WORKS (READ THIS FIRST)

### Icon Legend (from Screenshots 6110, 6111, 6112, 6113)

Every report row in the reference app shows one or two icons on its right side:

| Reference icon(s) | Our implementation |
|---|---|
| `👁️` only on reference | Show **BOTH** `⬇️` + `👁️` on our list. Build full view page (interior matches reference). The view page also has a download button. |
| `⬇️` only on reference | Show **`⬇️` only** on our list. No view page. Download modal only. |
| `⬇️ 👁️` on reference | Same — show both icons, view page + download inside it. |

> **CRITICAL RULE:** For the majority of reports that have only `👁️` on the reference — we add download capability on top. The interior of every view page must match the reference screenshots exactly (same filters, same columns, same layout). The agent must cross-reference the corresponding screenshot for EVERY report before building its view page — no guessing.

> **EXPORT DROPDOWN (from screenshot of Payment Request Report):** The export button inside every view page is NOT a single CSV download. It opens a dropdown with 4 options: `Export as CSV`, `Export as Excel`, `Export as PDF`, `Export as HTML`. Implement this exact dropdown on every view page.

---

## SECTION 2 — COMPLETE REPORT ICON MAP

Verified from screenshots 6110-6113. Do not deviate from this table.

### Sales (screenshot 6110)

| Report Name | Has View Page | Has Download |
|---|---|---|
| Company Sales Report | YES | YES |
| Item Wise Sales Report | YES | NO |
| Sales Deduction / Retention Report | YES | NO |
| CRM Lead Detail Report | YES | NO |
| Lead Status Funnel Report | YES | NO |
| Project Wise Sales Summary | YES | NO |

### Payments (screenshot 6110)

| Report Name | Has View Page | Has Download |
|---|---|---|
| Company Payments | YES | YES |
| Bank Statement | YES | NO |
| Project Wise Payment Summary | YES | NO |
| Project Payment Report | YES | NO |
| Payment Request Report | YES | NO |

### Progress & task (screenshot 6110)

| Report Name | Has View Page | Has Download |
|---|---|---|
| Daily Progress Report | YES (already exists at /dpr) | NO |
| Task Report | YES | NO |
| Task Measurement Book | YES | NO |
| Task Material Report | YES | NO |
| To Do Report | YES | NO |
| Task Resource Budget Vs Actual Report | YES | NO |
| Site Inspection Report | YES | NO |
| Task Revenue & Expense Report | YES | NO |
| Task BOQ Billed & Unbilled Qty Report | YES | NO |
| Task Attendance Report | YES | NO |

### Purchase & Expense (screenshot 6111)

| Report Name | Has View Page | Has Download |
|---|---|---|
| Company Expense Report | YES | YES |
| Cost Code Expense Analysis | YES | NO |
| Project Wise Expense Summary | YES | NO |
| All Expense Deduction / Retention Report | YES | NO |

### Party Balances (screenshot 6111)

| Report Name | Has View Page | Has Download |
|---|---|---|
| Party Ledger | YES | NO |
| All Party Balances | YES | NO |
| Project level Party Balance Report | YES | NO |

### Materials & Inventory (screenshot 6111)

| Report Name | Has View Page | Has Download |
|---|---|---|
| Material Request Item Report | YES | NO |
| Material Received & Used Report | YES | NO |
| Material Stock Report | YES | NO |
| Unbilled Item Report | YES | NO |
| PO Summary Report | YES | NO |
| Material Received without PO | YES | NO |
| Purchase Order Item Report | YES | NO |
| Production Material Report | YES | NO |
| Material Purchase Item Report | YES | NO |
| Material Stock Movement Report | YES | NO |

### Attendance & Salary (screenshot 6112)

| Report Name | Has View Page | Has Download |
|---|---|---|
| Attendance & Salary Report | YES | NO |
| OT & Shift Report | YES | NO |
| Company Attendance | NO | YES |
| Staff Monthly Salary Slip | NO | YES |
| Staff Salary Report | YES | NO |
| Staff Punch Report | NO | YES |
| Staff Muster Roll | NO | YES |

### Equipments (screenshot 6112)

| Report Name | Has View Page | Has Download |
|---|---|---|
| Equipment Usage Detail Report | YES | NO |
| Fuel Efficiency Report | YES | NO |
| Daily based Equipment Used Report | YES | NO |
| Equipment Expense Summary | YES | NO |
| Equipment Trip Report | YES | NO |

### Tax (screenshot 6112)

| Report Name | Has View Page | Has Download |
|---|---|---|
| Sales (GSTR-1) | YES | YES |
| Purchase (GSTR-2) | YES | NO |

### Warehouse (screenshot 6112)

| Report Name | Has View Page | Has Download |
|---|---|---|
| Warehouse Stock Movement Report | YES | NO |
| Warehouse Transaction Report | YES | NO |
| Warehouse Current Stock Report | YES | NO |

### Sub Con. (screenshot 6112)

| Report Name | Has View Page | Has Download |
|---|---|---|
| Subcon Workorder Summary Report | YES | NO |
| Subcon Measurement Book | YES | NO |
| Subcon Deduction / Retention Report | YES | NO |
| Subcon Material Issue Summary | YES | NO |

### Misc. (screenshot 6113)

| Report Name | Has View Page | Has Download |
|---|---|---|
| Project Financial Summary | YES | YES |
| Project Operational Summary | YES | NO |
| Company Transactions Report | YES | NO |
| Monthly P&L Report | YES | NO |
| Project Activity Leaderboard | YES | NO |
| Company User Activity Leaderboard | YES | NO |

### Library (screenshot 6113)

| Report Name | Has View Page | Has Download |
|---|---|---|
| Party Library | YES | NO |
| Cost Code Library | YES | NO |
| Material Library | YES | NO |
| Rate Card Library | YES | NO |
| Payroll Library | YES | NO |
| Equipment Library | YES | NO |

### BOQ (screenshot 6113)

| Report Name | Has View Page | Has Download |
|---|---|---|
| BOQ Workorder Summary Report | YES | NO |
| BOQ Item Report | YES | NO |
| Quotation Report | YES | NO |
| Quotation Item Report | YES | NO |
| BOQ Measurement Book | YES | NO |

### Budget (screenshot 6113)

| Report Name | Has View Page | Has Download |
|---|---|---|
| BOQ BOM Report | YES | NO |
| Budget vs Actual (Material Cost) | YES | NO |
| Budget vs Actual (Material Qty) | YES | NO |
| Budget vs Actual (Cost Code) | YES | NO |

### Asset (screenshot 6112)

| Report Name | Has View Page | Has Download |
|---|---|---|
| Asset Allocation Report | YES | NO |
| Asset Status Report | YES | NO |

---

## SECTION 3 — WHAT THE INLINE VIEW PAGE LOOKS LIKE (UI PATTERN)

Reference: screenshot 6114 (Company Sales Report view page), screenshot 6141 (DPR view page).

ALL inline view pages follow this identical layout:

```
[Report Title]                       [Refresh] [Filter] [Sort] [More] [Export/Download] [Search Data input]
[Filter 1 label]  [Filter 2 label]  [Filter 3 label] ...  (all dropdowns/date inputs, left-aligned)

[Purple/indigo gradient header row with column names]
[Data rows]
[If empty: "No Data" in red centered text]
```

### Rules for the action toolbar (top-right):
1. Refresh button — circular arrow icon
2. Filter button — text + icon
3. Sort button — text + icon
4. More button — only on some pages, check screenshot
5. Export button — **opens a dropdown with exactly 4 options**: `Export as CSV` | `Export as Excel` | `Export as PDF` | `Export as HTML`. Present on ALL view pages (we add it even if reference doesn't show it).
6. Search Data — text input with magnifying glass icon

### MANDATORY: Custom filter inspection for EVERY report

> **Before writing a single line of code for any view page, the agent MUST:**
> 1. Open the screenshot(s) whose URL bar shows that report's slug (e.g. `/onsite-report/task_attendance_report`).
> 2. Count and name every filter shown in the filter bar — exact label text, exact input type (dropdown/date-picker/text). Example from screenshot 6161: Task Attendance Report has exactly 5 filters: `Project Name` (dropdown), `Attendance Date` (date-picker), `Main Task Name` (dropdown), `Group Task Name` (dropdown), `Task Name` (dropdown).
> 3. Implement EXACTLY those filters with EXACTLY those labels — no more, no fewer.
> 4. If a filter's label or type differs from what is in Section 6, the screenshot wins. The screenshot is the source of truth.
> 5. If a filter value list is unknown, use: All, Option A, Option B as placeholders but keep the correct label.

### Rules for table:
- Purple/indigo gradient `<thead>` row: `bg-gradient-to-r from-[#6366f1] to-[#7c3aed] text-white`
- Subsequent body rows: `border-t border-border-custom hover:bg-elevated`
- Empty state: red centered text `No Data`
- First column always `#` (row index)

---

## SECTION 4 — STEP-BY-STEP IMPLEMENTATION

### STEP 1: Update `ReportItem` interface in `page.tsx`

Current (WRONG):
```ts
interface ReportItem {
  name: string;
  type: "excel" | "pdf" | "view";
  downloadable: boolean;
  endpoint?: string;
  fields?: string[];
}
```

Replace with:
```ts
interface ReportItem {
  name: string;
  hasView: boolean;      // true = eye icon linking to view page
  hasDownload: boolean;  // true = download icon opening modal
  viewSlug?: string;     // URL segment, e.g. "company-sales"
}
```

### STEP 2: Update ALL entries in `categories` array

Use the Section 2 table to set `hasView` and `hasDownload` correctly for each report.
Use the slug list below for `viewSlug`.

**Slug list** (use exactly these strings):

```
company-sales
item-wise-sales              (page already exists)
sales-deduction-retention
crm-lead-detail
lead-status-funnel
project-wise-sales-summary
company-payments
bank-statement
project-wise-payment-summary
project-payment
payment-request
dpr                          (page already exists)
task-report
task-measurement-book
task-material
todo-report
task-resource-budget-vs-actual
site-inspection
task-revenue-expense
task-boq-billed-unbilled
task-attendance
company-expense
cost-code-expense-analysis
project-wise-expense-summary
all-expense-deduction-retention
party-ledger
all-party-balances
project-level-party-balance
material-request-item
material-received-used
material-stock
unbilled-item
po-summary
material-received-without-po
purchase-order-item
production-material
material-purchase-item
material-stock-movement
attendance-salary
ot-shift
staff-salary
gstr1-sales
gstr2-purchase
warehouse-stock-movement
warehouse-transaction
warehouse-current-stock
subcon-workorder-summary
subcon-measurement-book
subcon-deduction-retention
subcon-material-issue
project-financial-summary
project-operational-summary
company-transactions
monthly-pl
project-activity-leaderboard
company-user-activity-leaderboard
party-library
cost-code-library
material-library
rate-card-library
payroll-library
equipment-library
boq-workorder-summary
boq-item
quotation
quotation-item
boq-measurement-book
boq-bom
budget-vs-actual-material-cost
budget-vs-actual-material-qty
budget-vs-actual-cost-code
asset-allocation
asset-status
```

### STEP 3: Update report row rendering in `page.tsx` JSX

Replace the current single `onClick` row div with this dual-icon pattern:

```tsx
{filteredReports.map((report) => (
  <div
    key={report.name}
    className="group flex items-center justify-between p-2 rounded-lg hover:bg-elevated transition-all"
  >
    <span className="text-xs text-muted group-hover:text-foreground transition-colors truncate max-w-[70%]">
      {report.name}
    </span>
    <div className="flex items-center gap-2 shrink-0">
      {/* Download icon — only if hasDownload */}
      {report.hasDownload && (
        <button
          onClick={() => { setSelectedReport(report); setShowModal(true); }}
          className="text-muted hover:text-[#FF8A00] transition-colors text-sm"
          title="Download Report"
        >
          ⬇️
        </button>
      )}
      {/* Eye/View icon — only if hasView */}
      {report.hasView && report.viewSlug && (
        <Link
          href={`/c/${companyId}/reports/${report.viewSlug}`}
          className="text-muted hover:text-primary transition-colors text-sm"
          title="View Report"
        >
          👁️
        </Link>
      )}
    </div>
  </div>
))}
```

### STEP 4: Fix `handleReportClick`

This function should only open the download modal. Remove any routing logic:

```ts
const handleReportClick = (report: ReportItem) => {
  setSelectedReport(report);
  setShowModal(true);
};
```

The function is now only called from the download button, never from the view icon.

### STEP 5: Remove old `type` field references

Search the entire `page.tsx` for `type: "excel"`, `type: "pdf"`, `type: "view"`, `report.type`, and remove/replace all of them.

### STEP 6: Create new view pages

For every report with `hasView: true` that does NOT already have a page file, create:
`frontend/src/app/c/[company_id]/reports/<viewSlug>/page.tsx`

Already existing (do NOT recreate):
- `/reports/dpr/page.tsx`
- `/reports/item-wise-sales/page.tsx`

All others need to be created. Use the skeleton in Section 5.

---

## SECTION 5 — VIEW PAGE COMPONENT SKELETON

```tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";

export default function REPORTNAME_PAGE() {
  const params = useParams();
  const companyId = params?.company_id as string || "e0000000-0000-0000-0000-000000000000";

  // One state var per filter
  const [filter1, setFilter1] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  // At least 2-3 realistic mock data rows matching all columns
  const mockData = [
    { col1: "Value 1a", col2: "Value 2a", ... },
    { col1: "Value 1b", col2: "Value 2b", ... },
  ];

  // Apply filters
  const filtered = mockData.filter(row => {
    const matchesFilter1 = filter1 === "All" || row.relevantField.includes(filter1);
    const matchesSearch = searchQuery === "" || JSON.stringify(row).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter1 && matchesSearch;
  });

  // Download function (only for reports with hasDownload=true)
  const handleExport = () => {
    const headers = ["#", "Col1", "Col2", ...];
    const rows = filtered.map((row, i) => [String(i+1), row.col1, row.col2, ...]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "report.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showToast("Exported successfully!");
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar onShowToast={showToast} />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <PageHeader title="REPORT TITLE" />

        {/* Action/Filter Bar */}
        <div className="bg-sidebar border-b border-border-custom px-6 py-4 flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
          {/* LEFT: filter dropdowns */}
          <div className="flex flex-wrap items-end gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted uppercase font-bold">Filter Label:</span>
              <select
                value={filter1}
                onChange={e => setFilter1(e.target.value)}
                className="bg-card border border-border-custom rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
              >
                <option value="All">All</option>
                <option value="Option1">Option 1</option>
              </select>
            </div>
          </div>

          {/* RIGHT: action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button className="text-muted hover:text-foreground text-xs border border-border-custom rounded-lg px-3 py-1.5 transition-all">🔄</button>
            <button className="text-muted hover:text-foreground text-xs border border-border-custom rounded-lg px-3 py-1.5 transition-all">Filter</button>
            <button className="text-muted hover:text-foreground text-xs border border-border-custom rounded-lg px-3 py-1.5 transition-all">Sort</button>
            {/* Only include if hasDownload === true for this report */}
            <button onClick={handleExport} className="text-muted hover:text-primary text-xs border border-border-custom rounded-lg px-3 py-1.5 transition-all" title="Download">⬆️</button>
            <div className="relative">
              <input
                type="text"
                placeholder="Search Data"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-card border border-border-custom rounded-lg pl-7 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary w-40"
              />
              <span className="absolute left-2 top-2 text-muted text-xs">🔍</span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <div className="overflow-x-auto rounded-xl border border-border-custom">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-[#6366f1] to-[#7c3aed] text-white">
                  <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">#</th>
                  <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Column 1</th>
                  <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Column 2</th>
                  {/* ... all columns */}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={N} className="text-center py-16 text-[#ef4444] font-semibold text-sm">
                      No Data
                    </td>
                  </tr>
                ) : (
                  filtered.map((row, i) => (
                    <tr key={i} className="border-t border-border-custom hover:bg-elevated transition-colors">
                      <td className="px-3 py-2 text-muted">{i + 1}</td>
                      <td className="px-3 py-2 text-foreground whitespace-nowrap">{row.col1}</td>
                      <td className="px-3 py-2 text-muted">{row.col2}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Back nav */}
        <div className="px-6 py-2 border-t border-border-custom shrink-0">
          <Link href={`/c/${companyId}/reports`} className="text-xs text-muted hover:text-primary transition-colors">
            ← Back to Reports
          </Link>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 bg-card border border-success/30 rounded-lg px-4 py-3 text-xs text-success shadow-lg flex items-center gap-2 z-50">
            <span>⚡</span>
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}
      </main>
    </div>
  );
}
```

---

## SECTION 6 — EXACT COLUMNS AND FILTERS PER REPORT

### How to find columns for any report

1. Open PowerShell, list screenshots: `Get-ChildItem "C:\Users\Dell\Github\...\All Images Documented\" | Select-Object Name`
2. Open screenshots one by one starting from 6114.
3. Look at the **URL bar** in the screenshot — it tells you the report name (e.g. `/onsite-report/company_sales_report`).
4. Read the **purple header row** left to right for column names.
5. If there is a **right-scroll arrow** at the table edge, open the NEXT screenshot number to see more columns.
6. Column names must match **EXACTLY** (capitalization, spaces, punctuation).

### Confirmed columns from prior sessions (do not re-verify):

**Company Expense Report** (`company-expense`) — filters: Project Name, Txn Date, Party Name, Txn Type, Cost Code
```
# | Txn Date | Txn Type | Project Name | Description | Party Name | Txn Status | Base Amount | Tax Amount | Bill Discount | Additional Charges | Total Amount | Net Amount | Paid Amount | Unpaid Amount | Due Date | Settlement By | Payment Mode | Cost Code | Sub Cost Code | Notes/Remarks | Reference No. | Creator Name | Approval Status | Created Date
```

**Attendance & Salary Report** (`attendance-salary`) — filters: Project Name, Month, Payroll Type, Workforce Name
```
# | Employee Name | Designation | Project Name | Payroll Type | Days Present | Days Absent | OT Hours | Total Shift | Basic | HRA | Allowances | Gross Salary | Deductions | Net Salary
```

**Payroll Library** (`payroll-library`) — screenshots 6277-6278 — no filters shown
```
# | Name | Designation | Type | Payroll Type | CTC | Gross Salary | Net Salary | Shift Hours | Salary Breakup | Created Date
```

**Equipment Library** (`equipment-library`) — screenshots 6279-6284 — no filters shown
```
# | Equipment Name | Make/Brand | Equipment No | Model No. | Measurement Type | Unit | Created Date | Ownership Type | Exp Mileage | Purchase Amount | Insurance Policy Num | Insurance Provider Name | Insurance Start Date | Insurance Expiry Date | Service Due Date | Last Service Date | Permit Ref. No | Permit Start Date | Permit Expiry Date | Tax No. | Tax Start Date | Tax Expiry Date | Registration No. | Registration Start Date | Registration Expiry Date
```

**Task Resource Budget Vs Actual Report** (`task-resource-budget-vs-actual`)
```
# | Project Name | Main Task Name | Group Task Name | Task Name | Resource Type | Resource Name | Budget Qty | Actual Qty | Qty Variance | Budget Amount | Actual Amount | Amount Variance | Budget Rate | Actual Rate
```

**Task Revenue & Expense Report** (`task-revenue-expense`)
```
# | Project Name | Main Task Name | Group Task Name | Task Name | Task Progress Unit | Revenue per task | Expense per task
```

**Quotation Report** (`quotation`)
```
# | Quotation Number | Project Name | Client Name | Quotation Date | Estimated Amount | Status | Created Date
```

**BOQ Measurement Book** (`boq-measurement-book`)
```
# | BOQ Name | Item Name | Material Name | Unit | Unit Price | Quantity | Total Cost Price | Creation Date
```

**BOQ Item Report** (`boq-item`)
```
# | Project Name | BOQ Name | Workorder No | Client Name | WO Start Date | Item Name | Unit | Est. Qty | Billed Qty | Remaining Qty
```

**BOQ Workorder Summary Report** (`boq-workorder-summary`)
```
# | Project Name | Client Name | Workorder Name | Workorder No. | WO Start Date | WO Amount | Work Done Amount | Invoice Amount | % Complete
```

**Subcon Workorder Summary Report** (`subcon-workorder-summary`)
```
# | Project Name | Subcontractor Name | Workorder Name | Workorder No. | Estimated Amount | Work Done Amount | Invoice Amount | % Complete
```

**Payment Request Report** (`payment-request`)
```
# | Payment Request No | Project Name | Party Name | Amount | Payment Date | Due Date | Creator Name | Request Type | Order/Bill No | Approval Status | Payment Status | Remark | Account Name
```

**Project Wise Payment Summary** (`project-wise-payment-summary`)
```
# | Project Name | Salary | Net Purchase | Other Expense | Site Expense | Subcon Expense | Total Sales Invoice | Total Expense | Total Out | Total IN | Balance | Margin | Net Transfer
```

**Party Ledger** (`party-ledger`)
```
# | Party Name | Party Type | Project Name | Creator Name | Description | Cost Code | Transaction Type | Date | Debit | Credit | Balance
```

**All Party Balances** (`all-party-balances`)
```
# | Party Name | Party Type | Debit | Direction | Advance In | Advance Out
```

**Item Wise Sales Report** (`item-wise-sales`) — ALREADY EXISTS, but verify these columns:
```
# | Sale Type | Project Name | Client Name | Invoice Number | Invoice Date | Item Name | Unit | Quantity | Item Rate | Tax % | Tax Amount | Gross Amount | Total Amount | Invoice Created
```

**Sales Deduction / Retention Report** (`sales-deduction-retention`)
```
# | Name | Amount | Project Name | Party Name | Invoice Number | Creator Name | Type | Entry Creation Date | Due Date
```

**OT & Shift Report** (`ot-shift`)
```
# | Project Name | Party Name | Employee Name | Date | Normal Shifts | Actual Shifts | OT Hours
```

**Subcon Measurement Book** (`subcon-measurement-book`)
```
# | WO No | WO Name | Section | Description | Date | Unit | Length | Width | Height | No. | Depth | Factor | Measurement Qty | Total Qty
```

**Subcon Deduction / Retention Report** (`subcon-deduction-retention`)
```
# | Amount | Project Name | Party Name | Invoice No | Creator Name | Type | Date
```

**Subcon Material Issue Summary** (`subcon-material-issue`)
```
# | Project Name | Subcontractor Name | Material Name | Qty | Rate | Amount
```

**Project Operational Summary** (`project-operational-summary`)
```
# | Project Name | Project Category | Key Personnel | Project Status | Project Health | Start Date | End Date | Progress
```

**Material Request Item Report** (`material-request-item`)
```
# | Date | Request No | Project Name | Material Name | Grade/Spec | Unit | Requested Qty | Approved Qty | Remaining Qty | PO Reference | Requested By | Status | Approved By | Remarks
```

**All Expense Deduction / Retention Report** (`all-expense-deduction-retention`)
```
# | Date | Type | Item Name | Amount | Bill No | Expense Type | Project Name | Party Name | Creator Name | Due Date
```

**Company Payments** (`company-payments`)
```
# | Txn Date | Project Name | Paid By | Party Name | Amount | TDS Amount | Net Amount | Payment Type | Notes | Direction | Payment Mode | Account Name | Cost Code | Sub Cost Code | Expense Type | Created Date | Reference No
```

**GSTR-1 Sales** (`gstr1-sales`)
```
# | GSTIN | Client Name | Place of Supply | Invoice Number | Invoice Value | Invoice Date | Taxable Value | Tax Rate | CGST | SGST | IGST | Total Tax
```

**Asset Allocation Report** (`asset-allocation`), **Asset Status Report** (`asset-status`) — read columns from screenshots.

**For all remaining reports not listed here:** Read columns from the screenshot whose URL bar shows that report's slug. The screenshot range is 6114–6551.

---

## SECTION 7 — SETTINGS & OTHER TABS PARITY

After completing the reports section, apply the same icon/column audit to all other sidebar sections:

- **Library** (Party, Material, Equipment, Rate Card, Payroll) — verify all table columns and filter options
- **Finance** — verify sub-tabs, columns
- **Settings** — verify all sub-sections, columns, form fields

Screenshots 6300–6551 cover these sections. For each:
1. Look at URL bar to identify the section.
2. List any columns, filters, or UI elements our app is missing.
3. Add them.

---

## SECTION 8 — VERIFICATION CHECKLIST

After all changes:

- [ ] Every report in the list shows the correct icon(s) per Section 2.
- [ ] Clicking the eye icon navigates to the correct `/c/{company_id}/reports/<slug>` route.
- [ ] The view page loads with filter bar, purple table header, and data rows.
- [ ] View-only reports (no hasDownload) have NO download modal and no download icon on the list.
- [ ] Download-only reports have NO view page link and NO eye icon on the list.
- [ ] Dual reports show both icons; the download icon on the list page opens the download modal.
- [ ] All table column headers exactly match the reference screenshots.
- [ ] `npx tsc --noEmit --skipLibCheck` inside `frontend/` passes with ZERO errors.
- [ ] `git add -A && git commit -m "feat(reports): full view/download parity with Onsite Teams reference"` succeeds.

---

## SECTION 9 — ALREADY DONE (DO NOT REDO)

These were completed in prior sessions — do not redo:

1. `exportSchemas` column arrays in `page.tsx` — all headers verified from screenshots.
2. `mockRows` data in `triggerDownload()` — all reports have realistic sample rows.
3. DPR view page at `/dpr/page.tsx` — built and working.
4. Item Wise Sales view page at `/item-wise-sales/page.tsx` — built and working.

**Your job starts from Step 1 in Section 4: update the `ReportItem` interface and `categories`, then create the remaining ~60 view pages.**
