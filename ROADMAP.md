# SiteFlow — Construction Management ERP · Full Phase Roadmap

> **Stack**: FastAPI + SQLAlchemy (SQLite dev / Supabase Postgres prod) · Next.js 16 (Turbopack) · Glassmorphic dark UI (#0E0C15 base, #E8184C crimson)

---

## ✅ Completed Phases

| Phase | Feature | Commit | Key Deliverables |
|---|---|---|---|
| 1 | **Foundation** | `7841f73` | FastAPI + SQLite fallback, Next.js dark design system, login page, Supabase DDL, env vars |
| 2 | **BOQ & Gantt Scheduler** | `c4bc173` | Excel BOQ importer (openpyxl), WBS CPM forward-pass, circular-dependency DFS, Gantt workspace |
| 3 | **Help Center & Blog** | `8da0274` | 292 help articles migrated, dynamic [slug] routes, search |
| 4 & 5 | **Marketing + ERP Modules** | `3a2ccb6` | Pricing, Contact, Tally page; Attendance, Finance, DPR, CRM, Procurement sidebar modules |
| 6 | **Drawings & Versioning** | `ea73e00` | Zoomable blueprint canvas, pin markups, revision history, drawing CRUD APIs |
| 7 | **Material Procurement & Inventory** | `84188cf` | Indents → PO → GRN stateful triggers, WarehouseInventory ledger, transactions log |
| 8 | **Subcontractor Billing** | `e406d4d` | Work Orders, RA Bills, TDS/Retention deductions, Debit/Credit Notes, pre/post-tax math |
| 9 | **HR, Attendance & Payroll** | `1a002fb` | StaffEmployee salary structure, GPS Haversine geofence punch-in/out, weekly timesheets, PF/ESI/TDS payroll engine |
| 10 | **Quality Control & Inspections** | `3854e04` | IS-456 checklist creation, site inspection responses, NCR Kanban board, cube/slump lab tests |
| 11 | **Client Portal & Reports** | `3cd8c56` | Automated progress report compilation, pure Python PDF generator, approval flows, PDF viewer |
| 12 | **Equipment & Machinery Tracking** | `52c32b7` | Fleet registry (owned/hired), project deployments, fuel burn logs, maintenance schedules, 4-tab UI console |
| 13 | **Safety & Incident Management (HSE)** | `fa1c470` | OSHA incident board (severity-coded), LTIF rate calculation, toolbox talks tracker, PPE compliance donut gauge |
| 14 | **Advanced Analytics Dashboard** | `current` | Company-level analytics router, S-curve, burn-rate tracking, labour productivity index, material wastage metrics, subcontractor scorecard |
| 15 | **Mobile PWA & Push Foundations** | `current` | Installable PWA shell, service worker, manifest, mobile attendance punch queue, notification-ready controls, analytics shell integration |
| 16 | **Production Management** | `current` | Recipe library, batch execution, material consumption tracking, inventory pull-through, production summary dashboard |

---

## 🔵 Phase Horizon

No numbered Phase 17+ is defined in the repository context right now. The next work should be driven by parity gaps against the broader Onsite end goal rather than by an existing phase script.

### Product Goal Reference
The recon and marketing context describe the end goal as a complete construction ERP that connects site teams, project managers, procurement, finance, billing, and analytics in one platform to reduce cost leakages and improve execution across every project.

### Audit Findings
- `CRM / Sales Management` is still frontend-only; there is no backend router or persisted sales workflow.
- `DPR / Progress Tracking` is still largely static UI; there is no dedicated backend DPR model/router feeding daily progress records.
- `Finance & Controls / Project P&L` is still missing a dedicated backend finance router and company-level financial workflows beyond billing/report aggregation.
- `PWA push` is notification-ready on the frontend, but production-grade subscription persistence and outbound push delivery infrastructure are not yet present.

### Recommended Next Phase Candidates
- Phase 17: CRM / Sales Management backend parity
- Phase 18: Finance Controls, project P&L, and real execution-linked cashflow workflows
- Phase 19: DPR / Progress Tracking backend parity

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   SiteFlow Frontend                  │
│         Next.js 16 · Turbopack · App Router          │
│  Dark glassmorphic UI (#0E0C15 / #E8184C crimson)   │
└──────────────────────┬──────────────────────────────┘
                       │ REST /apis/v3
┌──────────────────────▼──────────────────────────────┐
│                  FastAPI Backend                      │
│  Routers: auth · calculators · budgeting · planning  │
│           drawings · procurement · billing · hr      │
│           quality · reports · equipment · safety     │
│           analytics                                  │
│           pwa shell / attendance offline queue       │
└──────────────────────┬──────────────────────────────┘
                       │ SQLAlchemy ORM
         ┌─────────────┴─────────────┐
         │ Dev: SQLite (auto-created) │
         │ Prod: Supabase Postgres    │
         │       + PostGIS geofence   │
         └───────────────────────────┘
```

## Running Locally

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

## Testing

Each phase has an isolated integration test using a fresh SQLite DB:

```bash
cd backend
python test_phase2.py    # BOQ + Gantt
python test_phase6.py    # Drawings
python test_phase7.py    # Procurement
python test_phase8.py    # Billing
python test_phase9.py    # HR & Payroll
python test_phase10.py   # Quality Control
python test_phase11.py   # Client Portal & Reports
python test_phase12.py   # Equipment & Machinery
python test_phase13.py   # Safety & HSE
python test_phase14.py   # Advanced Analytics Dashboard
```
