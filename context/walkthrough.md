# SiteFlow — Full Build Walkthrough (Phases 1–16)

> This document is the authoritative record of everything built so far. A new AI session should read this file and `implementation_plan.md` before continuing work on the next phase.

---

## Phase 1 — Foundation ✅ `7841f73`

### Backend
- `backend/app/database.py` — Dynamic SQLAlchemy engine: SQLite for local dev, Postgres for production. Pool config skipped for SQLite.
- `backend/app/models.py` — Base models: `Company`, `Project`, `User`. UUID/JSONB types swap to SQLite-safe equivalents at runtime.
- `backend/app/main.py` — FastAPI app with `/apis/v3` prefix. CORS enabled. All routers registered here.
- `backend/app/routers/auth.py` — OTP send/verify flow. Verify auto-creates Company + Project + User on first login.
- `backend/app/routers/calculators.py` — Concrete mix and steel weight calculators.
- `backend/test_api.py` — Integration test: health check, OTP, auto-onboarding, calculators.

### Frontend
- `frontend/src/app/globals.css` — Dark glassmorphic design system: `#0E0C15` canvas, `#E8184C` crimson, `#7C5CFF` indigo, Inter font, glass cards.
- `frontend/src/app/layout.tsx` — Root layout with Inter from Google Fonts.
- `frontend/src/app/page.tsx` — Landing page: 16-module sitemap grouped by construction stage.
- `frontend/src/app/login/page.tsx` — Phone + OTP login with countdown timer.
- `frontend/src/app/c/[company_id]/dashboard/page.tsx` — Main ERP dashboard with sidebar navigation, project switcher, geofence radar, steel calculator, cashflow waterfall chart, and Gantt timeline.

### Config
- `context/schema.sql` — Full Supabase Postgres DDL for copy-paste execution.
- `.env.example` — All required env vars documented.

---

## Phase 2 — BOQ & Gantt Scheduler ✅ `c4bc173`

### Backend
- `backend/app/models.py` — Added: `BOQItem`, `ProjectBudget`, `Task`, `TaskPredecessor`.
- `backend/app/routers/budgeting.py` — Excel BOQ importer via `openpyxl`. Unit-aware float rounding: 3dp for `kg`, 0dp for `nos/bags/bricks`, 2dp otherwise.
- `backend/app/routers/planning.py` — WBS task management. DFS circular-dependency guard. Forward-pass recursive schedule propagator (shifting predecessor shifts all successors).
- `backend/test_phase2.py` — Tests: Excel parse, float precision, task date chaining, circular block.

### Frontend
- `frontend/src/app/c/[company_id]/p/[project_id]/budgeting/boq/page.tsx` — Drag-and-drop BOQ upload, item preview, budget sum.
- `frontend/src/app/c/[company_id]/p/[project_id]/planning/gantt/page.tsx` — Add tasks, predecessor select, date editing with auto-shift.

---

## Phase 3 — Help Center & Blog ✅ `8da0274`

- 292 help articles migrated from original SiteFlow content.
- `frontend/src/app/help/page.tsx` — Searchable help center index.
- `frontend/src/app/help/[...slug]/page.tsx` — Dynamic article renderer.
- `frontend/src/app/blog/page.tsx` & `frontend/src/app/blog/[slug]/page.tsx` — Blog listing and post pages.
- `frontend/src/app/[slug]/page.tsx` — Generic marketing page renderer.

---

## Phases 4 & 5 — Marketing Pages + ERP Module Stubs ✅ `3a2ccb6`

### Marketing
- `/SiteFlow-pricing` — Tiered pricing page.
- `/contact` — Contact form page.
- `/integrations/tally` — Tally integration landing page.
- `/products` & `/products/[slug]` — Product feature pages.
- `/resources` & `/resources/[...slug]` — Resources hub.

### ERP Module Stubs (sidebar links wired in dashboard)
- `attendance/page.tsx` — Attendance console placeholder.
- `finance/page.tsx` — Finance module.
- `dpr/page.tsx` — Daily Progress Report.
- `crm/page.tsx` — CRM module.
- `procurement/page.tsx` — Procurement module.
- `billing/page.tsx` — Billing module.
- `hr/page.tsx` — HR module.

---

## Phase 6 — Drawings & Versioning ✅ `ea73e00`

### Backend
- `backend/app/models.py` — Added: `Drawing`, `DrawingRevision`, `DrawingMarkup`.
- `backend/app/routers/drawings.py` — CRUD for drawings, revision uploads, markup pin coordinates.
- `backend/test_phase6.py` — Tests: create drawing, upload revision, add markup pin, query revisions.

### Frontend
- `frontend/src/app/c/[company_id]/p/[project_id]/drawings/page.tsx` — Zoomable SVG blueprint canvas with pan/zoom, markup pin placement, revision history panel, drawing CRUD modals.

---

## Phase 7 — Material Procurement & Inventory ✅ `84188cf`

### Backend
- `backend/app/models.py` — Added: `MaterialIndent`, `PurchaseOrder`, `GRN`, `GRNItem`, `WarehouseInventory`, `InventoryTransaction`.
- `backend/app/routers/procurement.py` — Full Indent → PO → GRN workflow. GRN approval triggers `WarehouseInventory` update and logs an `InventoryTransaction`. Issue material deducts stock.
- `backend/test_phase7.py` — Tests: full Indent→PO→GRN approval chain, inventory balance, issue deduction.

### Frontend
- `frontend/src/app/c/[company_id]/p/[project_id]/procurement/page.tsx` — 4-tab workspace: Indents, Purchase Orders, GRN, Inventory ledger with live stock balance.

---

## Phase 8 — Subcontractor Billing ✅ `e406d4d`

### Backend
- `backend/app/models.py` — Added: `Subcontractor`, `WorkOrder`, `RABill`, `RABillItem`, `BillDeduction`, `DebitNote`, `CreditNote`.
- `backend/app/routers/billing.py` — Work order creation, RA Bill submission with item-level quantities, TDS + Retention deductions computed server-side, Debit/Credit notes, bill approval workflow.
- Pre/post-tax math: `gross_amount - tds - retention = net_payable`.
- `backend/test_phase8.py` — Tests: work order, RA bill with deductions, debit note, credit note, approval.

### Frontend
- `frontend/src/app/c/[company_id]/p/[project_id]/billing/page.tsx` — 4-tab: Subcontractors, Work Orders, RA Bills (with deductions breakdown), Debit/Credit Notes.

---

## Phase 9 — HR, Attendance & Payroll ✅ `1a002fb`

### Backend
- `backend/app/models.py` — Added: `StaffEmployee`, `AttendancePunch`, `WeeklyTimesheet`, `PayrollRun`.
- `backend/app/routers/hr.py` — Staff CRUD, GPS Haversine punch-in/out with geofence radius check, weekly timesheet aggregation, payroll run with PF (12%), ESI (3.25%), TDS (10%) deductions.
- `backend/test_phase9.py` — Tests: employee create, punch-in within geofence, punch-out, timesheet, payroll.

### Frontend
- `frontend/src/app/c/[company_id]/p/[project_id]/hr/page.tsx` — 4-tab: Staff roster, Attendance punches (with GPS map), Timesheets, Payroll runs.

---

## Phase 10 — Quality Control & Inspections ✅ `3854e04`

### Backend
- `backend/app/models.py` — Added: `QualityChecklist`, `ChecklistItem`, `SiteInspection`, `InspectionResponse`, `NonConformanceReport`, `LabTest`.
- `backend/app/routers/quality.py` — Checklist CRUD, inspection creation with item responses, NCR raise/close workflow, lab test logging (cube/slump).
- `backend/test_phase10.py` — Tests: checklist creation, inspection with responses, NCR lifecycle, lab test.

### Frontend
- `frontend/src/app/c/[company_id]/p/[project_id]/quality/page.tsx` — 4-tab: Checklists (IS-456 presets), Active Inspections, NCR Kanban board (Open/In Progress/Closed), Lab Tests.

---

## Phase 11 — Client Portal & PDF Progress Reports ✅ `3cd8c56`

### Backend
- `backend/app/models.py` — Added: `ClientReport`.
- `backend/app/routers/reports.py` — Report compilation (aggregates BOQ, tasks, billing, quality data per project), PDF generation endpoint, approval workflow (draft → submitted → approved).
- `backend/app/utils/pdf_generator.py` — Pure Python PDF 1.4 byte-stream generator (no external lib). Renders multi-section progress reports with headers, tables, and footers. Saves to `/static/reports/`.
- `backend/app/main.py` — Mounts `/static` directory for PDF serving.
- `backend/test_phase11.py` — Tests: report creation, PDF generation (file exists check), approval flow.

### Frontend
- `frontend/src/app/c/[company_id]/p/[project_id]/reports/page.tsx` — Report list with status badges, generate PDF button, inline PDF viewer (`<iframe>`), approval actions.

---

## Phase 12 — Equipment & Machinery Tracking ✅ `52c32b7`

### Backend
- `backend/app/models.py` — Added: `Equipment`, `EquipmentDeployment`, `FuelLog`, `MaintenanceSchedule`.
- `backend/app/routers/equipment.py` — Fleet CRUD, project deployment (status auto-changes to `deployed`), fuel log with total cost computation, maintenance schedule CRUD.
- `backend/app/main.py` — Registered `equipment` router.
- `backend/test_phase12.py` — Tests: add crane + excavator, deploy to project, fuel log, maintenance schedule.

### Frontend
- `frontend/src/app/c/[company_id]/p/[project_id]/equipment/page.tsx` — 4-tab console: Fleet Cards (category tags, status badges, hourly rate), Deployments (project history), Fuel Logs (burn rate table), Maintenance (service schedule + cost).
- `frontend/src/app/c/[company_id]/dashboard/page.tsx` — Added "Asset Management" sidebar section with "Equipment Tracking" link.

---

## Phase 13 — Safety & Incident Management (HSE) ✅ `fa1c470`

### Backend
- `backend/app/models.py` — Added: `SafetyIncident`, `ToolboxTalk`, `PPECheck`.
- `backend/app/routers/safety.py` — Incident CRUD (Near Miss/First Aid/LTI/Fatal), incident close with root cause, LTIF stats endpoint (LTIF = LTI × 200,000 / manhours), toolbox talk logging, PPE compliance checks with % computation and validation.
- `backend/app/main.py` — Registered `safety` router.
- `backend/test_phase13.py` — Tests: Near Miss log, LTI log, list incidents, close incident, LTIF=2.0, toolbox talk (25 attendees), PPE check (90%), validation (compliant > total → 400).

### Frontend
- `frontend/src/app/c/[company_id]/p/[project_id]/safety/page.tsx` — 4-tab HSE console:
  - **Tab 1 (Incident Board)**: Severity-color-coded cards (red/orange/yellow/green), type badges, close incident modal with root cause form.
  - **Tab 2 (LTIF & Stats)**: 6 KPI cards, incident type and severity breakdown mini-bar charts, LTIF formula info box.
  - **Tab 3 (Toolbox Talks)**: Attendee-count cards, log talk modal.
  - **Tab 4 (PPE Compliance)**: SVG donut gauge (overall average %), per-check progress bars, non-compliant item tags, record check modal.
- `frontend/src/app/c/[company_id]/dashboard/page.tsx` — Added "Safety" sidebar section with "HSE / Incidents" link.

---

## Phase 14 — Advanced Analytics Dashboard ✅ `current`

### Backend
- `backend/app/routers/analytics.py` — New company-level analytics router aggregating across budgets, tasks, billing, attendance, procurement, material usage, and NCRs.
- `backend/app/main.py` — Registered `analytics` router.
- `backend/test_phase14.py` — Integration test covering S-curve, burn-rate, labour productivity, material wastage, and subcontractor scorecard calculations.

### Frontend
- `frontend/src/app/c/[company_id]/analytics/page.tsx` — Executive KPI dashboard with S-curve visualization, burn chart, project scoreboard, labour intelligence, material leakage panel, and subcontractor scorecard.
- `frontend/src/app/c/[company_id]/dashboard/page.tsx` — Added "Executive Intelligence" sidebar section with Analytics Dashboard link.

---

## Phase 15 — Mobile PWA & Push Foundations ✅ `current`

### Frontend
- `frontend/public/manifest.json` — Installable PWA manifest.
- `frontend/public/sw.js` — Service worker for shell caching, offline navigation fallback, and notification handling.
- `frontend/src/components/pwa/PwaBootstrap.tsx` — Automatic service worker registration from the app shell.
- `frontend/src/components/pwa/PwaControls.tsx` — Install prompt and notification-permission controls.
- `frontend/src/app/layout.tsx` — Added PWA metadata, viewport theme color, and global bootstrap hook.
- `frontend/src/app/c/[company_id]/p/[project_id]/attendance/page.tsx` — Added mobile-friendly offline punch queue with local persistence and sync-ready workflow.

### Notes
- This phase establishes the installable shell, offline attendance capture path, and notification-ready client foundation.
- Production-grade push subscription persistence and backend delivery are still future parity work.

---

## Phase 16 — Production Management ✅ `current`

### Backend
- `backend/app/models.py` — Added `ProductionRecipe`, `ProductionRecipeMaterial`, `ProductionBatch`, and `ProductionBatchMaterial`.
- `backend/app/routers/production.py` — Recipe creation, batch logging, material consumption posting, inventory deduction, and production summary endpoints.
- `backend/app/main.py` — Registered the production router.
- `backend/test_phase16.py` — Integration test covering recipe creation, batch logging, inventory deduction, and summary aggregation.

### Frontend
- `frontend/src/app/c/[company_id]/p/[project_id]/production/page.tsx` — Production command surface with summary cards, batch table, recipe cards, and inventory watch panel.
- `frontend/src/app/c/[company_id]/dashboard/page.tsx` — Added a Production Management nav link in the project execution area.

### Notes
- The module ties material consumption back into the existing ledger so analytics and production read the same source of truth.

---

## Phase 17 — Full ERP Gap Completion ✅ `current`

We addressed all remaining feature gaps between the SiteFlow prototype and the competitor recon spec (Onsite.so) in a single integrated development cycle, removing artificial phase barriers.

### Backend
- `backend/app/models.py` — Added tables for `DailyProgressReport`, `CRMLead`, `CRMQuotation`, `CRMQuotationItem`, `Payment`, `PaymentSettlement`, `TallyConnection`, `TallyAgent`, `TallyLedgerMapping`, `TallyPartyMapping`, `TallyCostCentreMapping`, and `TallyBankMapping`.
- `backend/app/routers/dpr.py` — Implemented Daily Progress Report logging. Posting a progress entry automatically changes the linked Task status to `in_progress` and statefully deducts consumed materials from the project's `WarehouseInventory` ledger, creating `MaterialTransaction` rows of type `used`.
- `backend/app/routers/crm.py` — Added lead creation, pipeline status updates, and a multi-mode Quotation creator supporting standard item pricing, discount applications, and split rates (supply + installation rates and supply + installation tax rules).
- `backend/app/routers/finance.py` — Added ledger transaction listings, payment recordings, FIFO outstanding bill auto-settlement, and budget-vs-actual project P&L calculations.
- `backend/app/routers/tally.py` — Added connection profiling, agent machine registration, mappings, and voucher push syncing.
- `backend/test_gaps.py` — Complete integration test verifying end-to-end DPR, CRM, Finance, and Tally sync calculations and flows.

### Frontend
- `frontend/src/app/c/[company_id]/p/[project_id]/dpr/page.tsx` — Rewrote stub page to fetch tasks from planning, submit daily progress logs, check material logs, and show aggregated daily summaries.
- `frontend/src/app/c/[company_id]/p/[project_id]/crm/page.tsx` — Dynamic leads tracking, Kanban board status updating, and modal lead creation.
- `frontend/src/app/c/[company_id]/p/[project_id]/finance/page.tsx` — Persistent cashflow waterfalls, transaction journals, project P&Ls, and a Tally sync console that shows active logs and synced counts.

---

## Key Architectural Notes for New Sessions

| Topic | Detail |
|---|---|
| API base URL | `http://localhost:8000/apis/v3` (dev) |
| Backend port | 8000 (dev), 8017 (Phase 16 test), 8018 (Gaps test) |
| Frontend | Next.js App Router, all pages under `frontend/src/app/` |
| DB (dev) | SQLite, auto-created by SQLAlchemy `create_all()` |
| DB (prod) | Supabase Postgres — connection string in `.env` |
| Test pattern | Each phase has `backend/test_phaseN.py` — seeds DB via `seed_db()`, boots uvicorn with retry loop, runs full CRUD, tears down |
| UUID in SQLite | Always convert string IDs to `uuid.UUID(id_str)` before filtering or inserting in routers |
| Sidebar nav | All sidebar links live in `dashboard/page.tsx` — add new phase links there |
| UUID handling | `backend/app/models.py` patches `UUID`→`String` and `JSONB`→`JSON` for SQLite at import time |
| PDF generation | `backend/app/utils/pdf_generator.py` — pure Python, no reportlab, saves to `backend/static/reports/` |
| Design tokens | `#0E0C15` bg, `#171520` card, `#E8184C` crimson, `#7C5CFF` indigo, `rgba(255,255,255,0.05)` glass |

