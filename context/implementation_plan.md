# SiteFlow — Master Session Context & Phase 13 Implementation Plan

> **For new AI sessions**: Read `context/walkthrough.md` first for the full history of Phases 1–12. This file contains the current status and the next phase plan.

---

## Current Project Status

| Item | Detail |
|---|---|
| Last completed phase | **Phase 12 — Equipment & Machinery Tracking** (`52c32b7`) |
| Branch | `main` |
| Build status | ✅ `npm run build` passes — 28 routes compiled |
| Test status | ✅ `test_phase12.py` passes |
| Next phase | **Phase 13 — Safety & Incident Management (HSE)** |

---

## Completed Phases Summary

| Phase | Feature | Commit |
|---|---|---|
| 1 | Foundation (FastAPI + Next.js dark UI) | `7841f73` |
| 2 | BOQ & Gantt Scheduler | `c4bc173` |
| 3 | Help Center & Blog | `8da0274` |
| 4 & 5 | Marketing + ERP Module Stubs | `3a2ccb6` |
| 6 | Drawings & Versioning | `ea73e00` |
| 7 | Material Procurement & Inventory | `84188cf` |
| 8 | Subcontractor Billing | `e406d4d` |
| 9 | HR, Attendance & Payroll | `1a002fb` |
| 10 | Quality Control & Inspections | `3854e04` |
| 11 | Client Portal & PDF Reports | `3cd8c56` |
| 12 | Equipment & Machinery Tracking | `52c32b7` |

---

## Phase 13 — Safety & Incident Management (HSE)

### Goal
Build an OSHA-aligned safety management console covering incident reporting, toolbox talks, PPE compliance tracking, and LTI/LTIF statistics dashboard.

### Backend

#### [MODIFY] `backend/app/models.py`
Add three new models:

```python
class SafetyIncident(Base):
    """OSHA-aligned incident records per project."""
    __tablename__ = "safety_incidents"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    incident_type = Column(String(100), nullable=False)      # Near Miss, First Aid, LTI, Fatal
    severity = Column(String(50), nullable=False)            # Low, Medium, High, Critical
    description = Column(String, nullable=False)
    location = Column(String(255), nullable=True)
    injured_person = Column(String(255), nullable=True)
    lost_time_days = Column(Integer, default=0, nullable=False)
    status = Column(String(50), default="open", nullable=False)  # open, under_investigation, closed
    root_cause = Column(String, nullable=True)
    corrective_action = Column(String, nullable=True)
    reported_by = Column(String(255), nullable=False)
    reported_at = Column(DateTime(timezone=True), nullable=False)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

class ToolboxTalk(Base):
    """Safety toolbox talks conducted on site."""
    __tablename__ = "toolbox_talks"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    topic = Column(String(255), nullable=False)
    conducted_by = Column(String(255), nullable=False)
    conducted_at = Column(DateTime(timezone=True), nullable=False)
    attendee_count = Column(Integer, default=0, nullable=False)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

class PPECheck(Base):
    """PPE compliance audit records for site workers."""
    __tablename__ = "ppe_checks"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    checked_by = Column(String(255), nullable=False)
    check_date = Column(DateTime(timezone=True), nullable=False)
    total_workers = Column(Integer, default=0, nullable=False)
    compliant_workers = Column(Integer, default=0, nullable=False)
    non_compliant_items = Column(JSON, default=list, nullable=False)  # ["No helmet", "No vest"]
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
```

#### [NEW] `backend/app/routers/safety.py`
Endpoints:
- `POST /safety/incidents` — Log a new incident
- `GET /safety/incidents/{project_id}` — List all incidents for a project
- `PATCH /safety/incidents/{incident_id}/close` — Close incident with root cause + corrective action
- `GET /safety/stats/{project_id}` — Return LTI count, total lost days, LTIF (Lost Time Injury Frequency = LTI × 200,000 / total_manhours), and incident type breakdown
- `POST /safety/toolbox-talks` — Log a toolbox talk
- `GET /safety/toolbox-talks/{project_id}` — List talks for a project
- `POST /safety/ppe-checks` — Log a PPE compliance check
- `GET /safety/ppe-checks/{project_id}` — List PPE checks with compliance %

#### [MODIFY] `backend/app/main.py`
Register `safety` router: `app.include_router(safety.router, prefix="/apis/v3")`

#### [NEW] `backend/test_phase13.py`
Tests:
1. Create a project and log a Near Miss incident
2. Log a Fatal incident (LTI = 1, lost_time_days = 5)
3. Fetch safety stats and assert LTIF calculation
4. Close incident with root cause
5. Log a toolbox talk with 25 attendees
6. Log PPE check (30 workers, 27 compliant)
7. Assert compliance % = 90%

---

### Frontend

#### [NEW] `frontend/src/app/c/[company_id]/p/[project_id]/safety/page.tsx`
4-tab console:

**Tab 1 — Incident Board**
- Color-coded severity cards (red = Fatal/Critical, orange = High/LTI, yellow = Medium, green = Near Miss/Low)
- Incident type badge, reported date, location, injured person name
- "Close Incident" action modal with root cause + corrective action fields
- "Report Incident" modal with full incident form

**Tab 2 — LTIF & Stats**
- KPI cards: Total Incidents, LTI Count, Total Lost Days, LTIF Rate
- Incident type breakdown (pie/donut chart using SVG)
- Monthly incident trend (simple SVG line chart)

**Tab 3 — Toolbox Talks**
- Table of talks: topic, conducted by, date, attendee count
- "Add Toolbox Talk" modal
- Running total of talks conducted this month

**Tab 4 — PPE Compliance**
- Donut gauge showing overall compliance % (compliant / total workers)
- Last 5 checks table with date, checker, and % score
- "Record PPE Check" modal with multi-select non-compliant item checklist

#### [MODIFY] `frontend/src/app/c/[company_id]/dashboard/page.tsx`
Add a "Safety" sidebar section with a "HSE / Incidents" link pointing to `/c/[company_id]/p/[project_id]/safety`.

---

## Verification Plan

### Automated Tests
```bash
cd backend
python test_phase13.py
```

### Build Check
```bash
cd frontend
npm run build
```
Verify `/c/[company_id]/p/[project_id]/safety` appears in the route list.

### Manual Verification
- Report an incident, verify card appears on incident board
- Close incident, verify status badge changes to "Closed"
- Add toolbox talk, verify attendee count appears
- Log PPE check, verify compliance % updates in donut gauge

---

## Phase 14 Preview — Advanced Analytics Dashboard

**Goal**: Cross-project executive KPI dashboard.

**Features**:
- S-Curve: Planned vs Actual physical progress (tasks complete % over time)
- Budget burn-rate and variance chart
- Labour productivity index (m² per labour-day from DPR data)
- Material wastage index (ordered vs consumed from procurement)
- Subcontractor performance scorecard (RA Bill on-time %, NCR count)

---

## Phase 15 Preview — Mobile PWA & Push Notifications

**Goal**: Installable PWA with offline capability.

**Features**:
- `manifest.json` + service worker for installability
- Web Push API for NCR alerts, approval reminders, attendance flagging
- Offline timesheet entry with background sync
- Mobile-first GPS punch-in view

---

## Architecture Quick Reference

```
frontend/src/app/
├── page.tsx                          # Landing
├── login/page.tsx                    # Auth
├── c/[company_id]/
│   ├── dashboard/page.tsx            # Main ERP shell + sidebar
│   └── p/[project_id]/
│       ├── budgeting/boq/page.tsx    # Phase 2
│       ├── planning/gantt/page.tsx   # Phase 2
│       ├── drawings/page.tsx         # Phase 6
│       ├── procurement/page.tsx      # Phase 7
│       ├── billing/page.tsx          # Phase 8
│       ├── hr/page.tsx               # Phase 9
│       ├── attendance/page.tsx       # Phase 9
│       ├── finance/page.tsx          # Phase 5
│       ├── dpr/page.tsx              # Phase 5
│       ├── crm/page.tsx              # Phase 5
│       ├── quality/page.tsx          # Phase 10
│       ├── reports/page.tsx          # Phase 11
│       ├── equipment/page.tsx        # Phase 12
│       └── safety/page.tsx           # Phase 13 (NEXT)

backend/app/
├── main.py                           # Router registration, static mount
├── database.py                       # SQLite/Postgres dynamic engine
├── models.py                         # All ORM models (grows each phase)
├── routers/
│   ├── auth.py, calculators.py       # Phase 1
│   ├── budgeting.py, planning.py     # Phase 2
│   ├── drawings.py                   # Phase 6
│   ├── procurement.py                # Phase 7
│   ├── billing.py                    # Phase 8
│   ├── hr.py                         # Phase 9
│   ├── quality.py                    # Phase 10
│   ├── reports.py                    # Phase 11
│   ├── equipment.py                  # Phase 12
│   └── safety.py                     # Phase 13 (NEXT)
└── utils/
    └── pdf_generator.py              # Phase 11 — pure Python PDF
```
