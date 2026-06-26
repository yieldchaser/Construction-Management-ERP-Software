# Implementation Plan — Phase 2: Project Onboarding & BOQ Import

This plan details the design and implementation of Phase 2: building the Excel-based Bill of Quantities (BOQ) parser, setting up budget allocations, and creating the project scheduling/planning interfaces.

---

## 🛠️ Technical Strategy & Design

1. **Excel Parser Library**: Use **`openpyxl`** in FastAPI. It is lightweight, handles `.xlsx` files natively, and parses column headers (e.g. "Description", "Unit", "Qty", "Rate") with low memory usage.
2. **Database Schema Additions**:
   * Add `BOQItem` and `ProjectBudget` models.
   * Add `Task` and `TaskPredecessor` models.
   * Expose automatic SQLite / PostgreSQL dynamic compile overrides in `models.py`.
3. **Budget Parsing & Matching Logic**:
   * Parse rows. Map column headers dynamically to support flexible customer templates (case-insensitive checks for 'item name', 'qty', 'unit', 'rate').
   * Validate that values are numeric; apply quantity rounding limits.
   * Create associated `ProjectBudget` summation automatically.
4. **Task Scheduling & Planning Logic**:
   * Build APIs to list, create, update, and delete tasks.
   * Implement automated end-date computation based on duration and start date.
   * Check for circular dependencies when adding/modifying predecessors (e.g. Task A -> Task B -> Task A).

---

## Proposed Changes

### Backend Component

#### [MODIFY] [requirements.txt](file:///c:/Users/Dell/Github/Construction-Management-ERP-Software/backend/requirements.txt)
* Append `openpyxl>=3.1.2` for reading uploaded spreadsheet files.

#### [MODIFY] [models.py](file:///c:/Users/Dell/Github/Construction-Management-ERP-Software/backend/app/models.py)
* Add `BOQItem` schema.
* Add `ProjectBudget` schema.
* Add `Task` schema.
* Add `TaskPredecessor` link table schema.

#### [NEW] [budgeting.py](file:///c:/Users/Dell/Github/Construction-Management-ERP-Software/backend/app/routers/budgeting.py)
* Expose `POST /apis/v3/budgeting/boq/import` for file uploads.
* Expose `GET /apis/v3/budgeting/boq` to list items.
* Expose `POST /apis/v3/budgeting/allocation` to set budget parameters.

#### [NEW] [planning.py](file:///c:/Users/Dell/Github/Construction-Management-ERP-Software/backend/app/routers/planning.py)
* Expose `GET /apis/v3/planning/tasks` to fetch project WBS (Work Breakdown Structure).
* Expose `POST /apis/v3/planning/tasks` to create new tasks.
* Expose `PUT /apis/v3/planning/tasks/{task_id}` to reschedule.
* Expose `POST /apis/v3/planning/tasks/{task_id}/predecessors` to set dependencies.

#### [MODIFY] [main.py](file:///c:/Users/Dell/Github/Construction-Management-ERP-Software/backend/app/main.py)
* Register `budgeting` and `planning` routers.

---

### Frontend Component

#### [NEW] [budgeting/boq/page.tsx](file:///c:/Users/Dell/Github/Construction-Management-ERP-Software/frontend/src/app/c/%5Bcompany_id%5D/p/%5Bproject_id%5D/budgeting/boq/page.tsx)
* Upload panel supporting drag-and-drop of `.xlsx` files.
* Spreadsheet preview table showing parsed rows, errors, and mappings.
* Commit button writing to database.

#### [NEW] [planning/gantt/page.tsx](file:///c:/Users/Dell/Github/Construction-Management-ERP-Software/frontend/src/app/c/%5Bcompany_id%5D/p/%5Bproject_id%5D/planning/gantt/page.tsx)
* Full-scale interactive Gantt scheduler.
* Add/Edit Task slide-over panels.
* Predecessor assignment form.

---

## Verification Plan

### Automated Tests
* Write `backend/test_phase2.py` to:
  * Generate a dummy Excel BOQ file using `openpyxl`.
  * Upload the file to `/apis/v3/budgeting/boq/import` and assert success.
  * Fetch BOQ list and verify calculations (`amount = qty * rate`).
  * Create a task sequence (Task A -> Task B) and verify start/end calculations.
  * Try creating a circular dependency and assert validation failure (status `400`).

### Manual Verification
* Run frontend in dev mode and test the drag-and-drop BOQ upload screen.
* Drag task sliders in the Gantt interface to verify visual scheduling shifts.
