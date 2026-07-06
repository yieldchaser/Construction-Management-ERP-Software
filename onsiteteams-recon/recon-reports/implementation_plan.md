# Implementation Plan — Functional Parity & API Alignment with Onsite ERP

This plan details the implementation of the functional updates required to bring SiteFlow into complete alignment with the competitor's API contracts, civil engineering math formulas, and report structures extracted from the HAR files, PDFs, and Excel templates.

## User Review Required

> [!IMPORTANT]
> - **Auto-Stock Deduction in Production**: On-site concrete batching and mixing will now automatically deduct dry component stock (sand, cement, aggregate) from the inventory when a batch is logged as completed.
> - **Bulk Upload Templates**: We will add endpoints and frontend buttons for uploading CSV/Excel payment registries and payroll data matching their exact column structures.
> - **P2P Wallet Transfers**: We are introducing direct Party-to-Party ledger entries inside the Finance Cashbook.

---

## Proposed Changes

### Backend Service (FastAPI)

#### [MODIFY] [models.py](file:///c:/Users/Dell/Github/Construction-Management-ERP-Software/backend/app/models.py)
* Add a `photo_verified` and `location_verified` boolean flag to the Timesheet and Attendance records.
* Add an `approval_pipeline_template_id` string relationship to the payment transactions to support multi-level check gates.

#### [MODIFY] [production.py](file:///c:/Users/Dell/Github/Construction-Management-ERP-Software/backend/app/routers/production.py)
* Update the `complete_batch` endpoint to query the recipe's ingredients and automatically deduct the corresponding quantities from the project's inventory stock.

#### [MODIFY] [finance.py](file:///c:/Users/Dell/Github/Construction-Management-ERP-Software/backend/app/routers/finance.py)
* Implement `/apis/v3/cashbook/p2p` POST endpoint accepting `sender_company_user_id`, `receiver_company_user_id`, `amount`, and `payment_date`. This registers a debit in the sender's cashbook and a credit in the receiver's cashbook simultaneously.

#### [MODIFY] [hr.py](file:///c:/Users/Dell/Github/Construction-Management-ERP-Software/backend/app/routers/hr.py)
* Add a `/payroll/upload` POST endpoint that parses CSV files matching `Payroll-Upload-Template.csv` column indexes, auto-provisioning employee allowances and base salary schedules.

---

### Frontend Workspace (Next.js)

#### [MODIFY] [production page](file:///c:/Users/Dell/Github/Construction-Management-ERP-Software/frontend/src/app/c/[company_id]/p/[project_id]/production/page.tsx)
* Add a status indicator showing stock status warning badges ("Stock Low - Reorder Suggested") on the batch list screen when ingredients are below target output.

#### [MODIFY] [finance page](file:///c:/Users/Dell/Github/Construction-Management-ERP-Software/frontend/src/app/c/[company_id]/p/[project_id]/finance/page.tsx)
* Add a "Party to Party Transfer" form modal option inside the transactions list supporting double searchable party selector fields.

---

## Verification Plan

### Automated Tests
* Run `pytest` on the backend directory to check auth and billing calculations.
* Run `npm run build` on the frontend directory to verify compilation.

### Manual Verification
* Upload `Payroll-Upload-Template.csv` inside the HR payroll page to check mapping.
* Perform a P2P transfer and check if both party balances reflect the updates immediately.
