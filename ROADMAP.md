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

---

## 🔵 Upcoming Phases

### Phase 11 — Client Portal & PDF Progress Reports
**Goal**: Auto-generate branded PDF reports for clients, with milestone dashboards and financial summaries.

**Backend**: `ClientReport` model; PDF generation endpoint pulling from DPR + BOQ + Finance data

**Frontend**: Report gallery, PDF viewer, share-link generation

---

### Phase 12 — Equipment & Machinery Tracking
**Goal**: Track owned/hired machinery — cranes, excavators, mixers — with deployment, fuel logs, and maintenance schedules.

**Backend models**: `Equipment`, `EquipmentDeployment`, `FuelLog`, `MaintenanceSchedule`

**Frontend**: Fleet list card view, deployment Gantt, fuel burn chart, maintenance calendar

---

### Phase 13 — Safety & Incident Management (HSE)
**Goal**: OSHA-aligned incident logging, toolbox talks, PPE compliance checks, and LTI/LTIF statistics.

**Backend models**: `SafetyIncident`, `ToolboxTalk`, `PPECheck`

**Frontend**: Incident board, LTI vs LTIF trend chart, toolbox talks tracker, PPE compliance gauge

---

### Phase 14 — Advanced Analytics Dashboard
**Goal**: Cross-project executive KPI dashboard with financial and productivity intelligence.

**Features**:
- S-Curve: Planned vs Actual physical progress over time
- Budget burn-rate and variance chart
- Labour productivity index (m² per labour-day)
- Material wastage index
- Subcontractor performance scorecard

---

### Phase 15 — Mobile PWA & Push Notifications
**Goal**: Progressive Web App shell with offline capability and real-time push alerts.

**Features**:
- Service worker + `manifest.json` for installability
- Push notification via Web Push API (NCR alerts, approval reminders, attendance flagging)
- Offline timesheet entry with background sync on reconnect
- Mobile-first attendance punch view with live GPS map

---

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
│           quality · equipment · safety · analytics   │
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
python test_phase2.py   # BOQ + Gantt
python test_phase6.py   # Drawings
python test_phase7.py   # Procurement
python test_phase8.py   # Billing
python test_phase9.py   # HR & Payroll
```
