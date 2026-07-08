# SiteFlow vs Onsite Teams: ERP Reports & Navigation Comparison

This document provides a highly detailed, minute comparison between the navigation flow, module architecture, and reporting system of **SiteFlow (Ours)** and the competitor **Onsite Teams (Theirs)**. 

---

## 1. Architectural & Routing Comparison

The fundamental difference lies in how project and company contexts are propagated through the application:

| Feature | SiteFlow (Ours) | Onsite Teams (Theirs) |
| :--- | :--- | :--- |
| **URL Workspace Pattern** | Split route structure:<br>• Company-level: `/c/[company_id]/[module]` (e.g., `/reports`, `/dashboard`)<br>• Project-level: `/c/[company_id]/p/[project_id]/[module]` (e.g., `/finance`) | Unified route structure:<br>`https://web.onsiteteams.com/c/{company-uuid}/d/{module}` (all modules reside at the company level). |
| **Sidebar Layouts** | **Two separate sidebars**:<br>1. *Global Sidebar* (Interface A): Rendered on company-level pages (`/reports`, `/settings`).<br>2. *Sub-Module Sidebars* (Interface B): Rendered on project pages (`/finance`, `/dpr`) containing sub-tabs (Dashboard, Party, Accounts). | **One unified sidebar**:<br>A single persistent layout across the entire application. The sidebar items remain static regardless of which page is active. |
| **Project Context Scope** | Hardcoded via URL parameters `/p/[project_id]/`. Moving to another project changes the URL namespace and re-mounts the layouts. | Selected dynamically using a **project selector dropdown** in the header. The URL and sidebar layout remain unchanged. |
| **History Navigation Flow** | Back navigation via browser history can cause transitions between layout modes (e.g., going back from Project `/finance` to Company `/reports`), leading to layout shifts. | Browser history stays within the same unified company layout structure, updating only the internal page content. |

---

## 2. Main Reports Hub & Affordances

The main listing page aggregates the 82 reports under 16 categories. The buttons and icons indicate whether a report can be viewed natively, downloaded, or both:

| Affordance Type | SiteFlow (Ours) | Onsite Teams (Theirs) |
| :--- | :--- | :--- |
| **View Page (`👁️`) Only** | Built as a dynamic route `/reports/[slug]`. We display both the `👁️` (View) and `⬇️` (Download) buttons in the listing. | Displays `👁️` (View) icon only. The user must click into the report page to view/interact with the table. |
| **Download (`⬇️`) Only** | Opens a local download modal allowing parameters like month selection before exporting to CSV/Excel. | Displays `⬇️` (Download) icon directly in the listing. Clicking triggers an immediate excel file download. |
| **Export Action Options** | Inside the view page, the "Export" button opens a dropdown containing: `Export as CSV` \| `Export as Excel` \| `Export as PDF` \| `Export as HTML`. | Interactive spreadsheets have data export buttons (CSV, Excel) and print-friendly PDF views. |

---

## 3. Minute Column Schema Audits (Ours vs. Theirs)

There is a significant difference between the columns exported directly from our Reports Dashboard (`reports/page.tsx`) and the actual schemas documented from the competitor's screenshots (which are correctly configured in our dynamic viewer `reports/[slug]/page.tsx`).

### A. Company Sales Report
*   **Theirs (Onsite Teams - Verified via Screenshots 6114-6116)**:
    `['Invoice Date', 'Sale Type', 'Client Name', 'Project Name', 'Invoice Number', 'Total Amount', 'Retention Amount', 'Post Tax Deduction', 'Net Amount', 'Due Date', 'Payment Received', 'Balance Due', 'Payment Status', 'Notes', 'Creator Name', 'Settlement Amounts', 'Payment Dates', 'Reference Numbers', 'Payment Total Amounts']`
*   **Ours (Reports Dashboard Export - `page.tsx`)**:
    `['Invoice Date', 'Party Name', 'Invoice Number', 'Invoice Value', 'Total Deduction', 'Net Amount', 'Balance Due', 'Due Date', 'Creator', 'Project']` (Incomplete; missing Sale Type, Retention, Post Tax Deduction, and all Settlement columns).
*   **Ours (Dynamic View Page - `[slug]/page.tsx`)**:
    Matches the competitor's 19-column layout exactly.

### B. Company Payments Report
*   **Theirs (Onsite Teams - Verified via Screenshots 6128-6130)**:
    `['Project Name', 'Creator Name', 'Party Name', 'Amount', 'Unsettled Amount', 'Net Amount', 'Settlement Type', 'Remark', 'Payment Type', 'Payment Mode', 'Account Name', 'Cost Code', 'Sub Cost Code', 'Category', 'Created Date', 'Reference No.']`
*   **Ours (Reports Dashboard Export - `page.tsx`)**:
    `['Date', 'Project', 'Sender', 'Receiver', 'Amount', 'Creator', 'Category', 'Trade', 'Payment Mode', 'Description']` (Mismatch; incorrect labels such as Sender/Receiver/Trade instead of Party/Settlement/Cost Code).
*   **Ours (Dynamic View Page - `[slug]/page.tsx`)**:
    Matches the competitor's 16-column layout exactly.

### C. Company Expense Report
*   **Theirs (Onsite Teams - Verified via Screenshots 6171-6174)**:
    `['Txn Type', 'Project Name', 'Description', 'Party Name', 'Txn Status', 'Base Amount', 'Tax Amount', 'Bill Discount', 'Additional Charges', 'Total Amount', 'Net Amount', 'Paid Amount', 'Unpaid Amount', 'Due Date', 'Settlement By', 'Payment Mode', 'Cost Code', 'Sub Cost Code', 'Notes/Remarks', 'Reference No.', 'Creator Name', 'Approval Status', 'Created Date']`
*   **Ours (Reports Dashboard Export - `page.tsx`)**:
    `['S.NO.', 'Expense Date', 'Expense Type', 'Project Name', 'Party Name', 'Notes', 'Cost Code', 'Expense Status', 'Total Amount', 'Net Amount', 'Paid Amount', 'Unpaid Amount', 'Due Date', 'Approval Status']` (Mismatch; missing charges breakdown, payment modes, and sub-cost codes).
*   **Ours (Dynamic View Page - `[slug]/page.tsx`)**:
    Matches the competitor's 23-column layout exactly.

---

## 4. Specific Download-Only Reports (No View Page)

The competitor lists four reports under **Attendance & Salary** that are direct downloads only (no view page):

1.  **Company Attendance**:
    *   *Theirs*: Direct Excel sheet download. No details screen.
    *   *Ours (Dashboard)*: Simulates a table structure `['Labor / Subcontractor', 'Workforce Type', 'Project Name', '01-Jul-26', ...]` when clicked, rather than a direct excel generation.
2.  **Staff Monthly Salary Slip**:
    *   *Theirs*: Direct Excel/PDF download.
    *   *Ours (Dashboard)*: Simulates a table structure `['Employee Code', 'Employee Name', 'Designation', ...]` when clicked.
3.  **Staff Punch Report**:
    *   *Theirs*: Direct Excel download.
    *   *Ours (Dashboard)*: Simulates a table structure `['S.NO.', 'PARTY NAME', 'DESIGNATION', ...]` when clicked.
4.  **Staff Muster Roll**:
    *   *Theirs*: Direct Excel download.
    *   *Ours (Dashboard)*: Simulates a table structure `['S.NO.', 'Party Code', 'Employee Name', ...]` when clicked.

---

## 5. UI/UX Filter Patterns

| Element | SiteFlow (Ours) | Onsite Teams (Theirs) |
| :--- | :--- | :--- |
| **Filter Alignments** | Filters are left-aligned below the header. Selecting options automatically fetches and filters mock rows. | Left-aligned filter fields with dropdown selections. A `+ Show more filters` option exposes secondary filters on wide reports (e.g. Company Payments). |
| **Empty States** | Renders a styled alert or a table containing zero rows. | Renders the text `No Data` in a centered, red-colored font inside the table viewport. |
| **Action Items** | Action buttons like Refresh, Filter, Sort are fixed in the top right. | Action buttons are dynamically responsive, and Excel templates are explicitly provided for bulk uploads (e.g., `Payment Upload Template`, `Payroll Upload Template`). |
