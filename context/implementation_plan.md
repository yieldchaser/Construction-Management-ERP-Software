# SiteFlow — Master Session Context & Phase Horizon Audit

> For new AI sessions: read `context/walkthrough.md` first for the full build history through Phase 16. This file is the current status snapshot plus the forward-looking audit.

---

## Current Project Status

| Item | Detail |
|---|---|
| Last completed phase | **Phase 16 — Production Management** (`current`) |
| Branch | `main` |
| Build status | `npm run build` passes — analytics, production, and PWA shell routes compile cleanly |
| Test status | `test_phase13.py`, `test_phase14.py`, and `test_phase16.py` pass |
| Next numbered phase | **Not defined in repo context** |

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
| 13 | Safety & Incident Management (HSE) | `fa1c470` |
| 14 | Advanced Analytics Dashboard | `current` |
| 15 | Mobile PWA & Push Foundations | `current` |
| 16 | Production Management | `current` |

---

## Phase 14 — Advanced Analytics Dashboard

### Goal
Build a cross-project executive KPI dashboard using actual repo data rather than static mock metrics.

### Delivered
- New backend analytics router at `backend/app/routers/analytics.py`
- Company-level KPI aggregation across budgets, tasks, billing, attendance, procurement, material usage, and NCR data
- Frontend analytics route at `frontend/src/app/c/[company_id]/analytics/page.tsx`
- Dashboard shell link from `frontend/src/app/c/[company_id]/dashboard/page.tsx`
- Integration test `backend/test_phase14.py`

### Verified KPIs
- S-curve planned vs actual progress
- Budget burn-rate and variance
- Labour productivity index
- Material wastage index
- Subcontractor performance scorecard

---

## Phase 15 — Mobile PWA & Push Foundations

### Goal
Establish an installable PWA shell with offline-friendly field workflow foundations.

### Delivered
- `frontend/public/manifest.json`
- `frontend/public/sw.js`
- `frontend/src/components/pwa/PwaBootstrap.tsx`
- `frontend/src/components/pwa/PwaControls.tsx`
- PWA metadata/bootstrap in `frontend/src/app/layout.tsx`
- Offline punch queue and sync-ready mobile flow in `frontend/src/app/c/[company_id]/p/[project_id]/attendance/page.tsx`

### Scope Notes
- Installability and service worker shell are in place.
- Notification permission flow and client-side notification handling are in place.
- Full backend-driven web push delivery is not implemented yet.

---

## Phase 16 — Production Management

### Goal
Add a dedicated execution-cost-control module that ties recipe standards, batch execution, material consumption, and inventory pull-through together.

### Delivered
- `backend/app/models.py` — Added production recipe, batch, and batch-material tables.
- `backend/app/routers/production.py` — New router for recipe creation, batch logging, inventory deduction, and production summary payloads.
- `backend/app/main.py` — Registered the production router.
- `backend/test_phase16.py` — Integration test covering recipe creation, batch logging, inventory deduction, and summary aggregation.
- `frontend/src/app/c/[company_id]/p/[project_id]/production/page.tsx` — New project-level production management screen with summary cards, batch table, recipe cards, and inventory watch panel.
- `frontend/src/app/c/[company_id]/dashboard/page.tsx` — Added Production Management link in the execution navigation.

### Scope Notes
- The module currently focuses on construction batch workflows, not generic manufacturing ERP.
- Material consumption is persisted through the existing material transaction ledger so analytics can read the same source of truth.

---

## End Goal Reference

The recon/context material consistently describes the target product as a **complete construction ERP** that connects:
- site execution
- procurement and materials
- labour and payroll
- subcontractor/vendor billing
- finance and project P&L
- reporting and analytics

The intended outcome is a system that reduces cost leakages, replaces disconnected spreadsheets/WhatsApp workflows, and gives real-time execution-linked control across projects.

---

## Phase Horizon Audit

Because no `Phase 17` or higher exists in the repo context, future work should be driven by this parity audit instead of by an absent phase script.

### Strongly Implemented
- BOQ, planning, and task dependencies
- Procurement and inventory
- Subcontractor billing
- HR, attendance, and payroll backend
- Quality, NCRs, and lab tests
- Client reports
- Equipment tracking
- Safety / HSE
- Executive analytics
- Production management

### Partial / Stubbed / Missing
- `CRM / Sales Management`
  Frontend exists, but no backend router or persisted workflow supports it.
- `DPR / Progress Tracking`
  UI exists, but there is no dedicated backend DPR model/router powering daily progress entries, photos, or execution-linked records.
- `Finance & Controls / Project P&L`
  Finance remains a thin frontend stub; the repo lacks a dedicated finance router and deeper project cashflow / control workflows.
- `Real push delivery`
  PWA shell exists, but there is no backend subscription persistence or outbound notification pipeline.
- `Tally / Zoho operational sync`
  Marketing/integration content exists, but production-grade backend sync workflows are not implemented in this repo.

### Best Candidate for Next Numbered Phase
- DPR / Progress Tracking
  Reason: it is the next execution layer that can feed the newly added production and analytics workflows with daily site progress.

---

## Suggested Numbering If Phases Resume

| Candidate Phase | Focus |
|---|---|
| 17 | DPR / Progress Tracking backend parity |
| 18 | CRM / Sales Management backend parity |
| 19 | Finance Controls / Project P&L |
| 20 | Real push delivery + subscription backend |

---

## Verification Commands

```bash
cd backend
python test_phase13.py
python test_phase14.py
python test_phase16.py

cd ../frontend
npm run build
```

---

## Architecture Quick Reference

```text
frontend/src/app/
├── c/[company_id]/dashboard/page.tsx
├── c/[company_id]/analytics/page.tsx
└── c/[company_id]/p/[project_id]/
    ├── attendance/page.tsx
    ├── billing/page.tsx
    ├── budgeting/boq/page.tsx
    ├── crm/page.tsx
    ├── dpr/page.tsx
    ├── drawings/page.tsx
    ├── equipment/page.tsx
    ├── finance/page.tsx
    ├── hr/page.tsx
    ├── planning/gantt/page.tsx
    ├── procurement/page.tsx
    ├── quality/page.tsx
    ├── reports/page.tsx
    └── safety/page.tsx

backend/app/
├── main.py
├── models.py
└── routers/
    ├── analytics.py
    ├── auth.py
    ├── billing.py
    ├── budgeting.py
    ├── calculators.py
    ├── drawings.py
    ├── equipment.py
    ├── hr.py
    ├── planning.py
    ├── procurement.py
    ├── quality.py
    ├── reports.py
    └── safety.py
```
