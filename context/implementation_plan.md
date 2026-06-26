# Phase 12 — Equipment & Machinery Tracking

## Goal
Enable site managers to track owned and hired fleet assets (cranes, excavators, mixers, trucks), log project deployments, monitor fuel logs and burn rates, and track maintenance and routine servicing schedules.

## Proposed Changes

### Backend

#### [MODIFY] [models.py](file:///c:/Users/Dell/Github/Construction-Management-ERP-Software/backend/app/models.py)
Add database models for Equipment Tracking.
```python
class Equipment(Base):
    """Assets/Machinery fleet owned or hired by the company."""
    __tablename__ = "equipment"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    code = Column(String(100), unique=True, nullable=False)
    category = Column(String(100), nullable=False)        # Excavator, Crane, Mixer, Generator, etc.
    ownership_type = Column(String(50), nullable=False)     # Owned, Hired
    status = Column(String(50), default="available", nullable=False) # available, deployed, maintenance, inactive
    hourly_rate = Column(Numeric(12, 2), default=0.0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

class EquipmentDeployment(Base):
    """Deployment history of a machinery asset to a specific construction project."""
    __tablename__ = "equipment_deployments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    equipment_id = Column(UUID(as_uuid=True), ForeignKey("equipment.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=True)
    remarks = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

class FuelLog(Base):
    """Fuel refilling logs for heavy machinery to compute burn rates."""
    __tablename__ = "equipment_fuel_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    equipment_id = Column(UUID(as_uuid=True), ForeignKey("equipment.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    logged_date = Column(DateTime(timezone=True), nullable=False)
    liters = Column(Numeric(10, 2), nullable=False)
    cost_per_liter = Column(Numeric(10, 2), nullable=False)
    total_cost = Column(Numeric(14, 2), nullable=False)
    odometer_hours = Column(Numeric(12, 2), nullable=True)  # odometer reading or engine hours run
    remarks = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

class MaintenanceSchedule(Base):
    """Routine service and repair logs for heavy fleet machinery."""
    __tablename__ = "equipment_maintenance_schedules"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    equipment_id = Column(UUID(as_uuid=True), ForeignKey("equipment.id", ondelete="CASCADE"), nullable=False)
    service_type = Column(String(100), nullable=False)      # Routine Oil Change, Brake Overhaul, etc.
    scheduled_date = Column(DateTime(timezone=True), nullable=False)
    completed_date = Column(DateTime(timezone=True), nullable=True)
    cost = Column(Numeric(14, 2), default=0.0, nullable=False)
    status = Column(String(50), default="scheduled", nullable=False) # scheduled, completed, overdue
    remarks = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
```

#### [NEW] [equipment.py](file:///c:/Users/Dell/Github/Construction-Management-ERP-Software/backend/app/routers/equipment.py)
Create router endpoints for Equipment:
- `POST /equipment` — Add machinery item
- `GET /equipment/{company_id}` — List machinery fleet
- `POST /equipment/{equipment_id}/deploy` — Deploy equipment to project (automatically sets status to `deployed`)
- `GET /equipment/deployments/{project_id}` — List deployments at project
- `POST /equipment/{equipment_id}/fuel` — Log fuel consumption
- `GET /equipment/fuel-logs/{project_id}` — Get fuel logs for project
- `POST /equipment/{equipment_id}/maintenance` — Log/schedule maintenance
- `GET /equipment/maintenance-schedules/{equipment_id}` — Get service history for asset

#### [MODIFY] [main.py](file:///c:/Users/Dell/Github/Construction-Management-ERP-Software/backend/app/main.py)
- Register `equipment` router under `/apis/v3`.

---

### Frontend

#### [NEW] [page.tsx](file:///c:/Users/Dell/Github/Construction-Management-ERP-Software/frontend/src/app/c/[company_id]/p/[project_id]/equipment/page.tsx)
Build a 4-tab Fleet workspace:
- **Tab 1: Fleet Cards**: Shows a grid of all machinery (crane, loader, generator), category tags, hourly rates, and status badges. Includes "Add Equipment" modal.
- **Tab 2: Deployments**: Tracks deployment history to the project. Includes "Deploy Machinery" form.
- **Tab 3: Fuel logs**: Logs fuel refilling, liters, burn rate computations, and total spend.
- **Tab 4: Maintenance**: Logs scheduled routine checkups, service statuses, and costs.

#### [MODIFY] [page.tsx](file:///c:/Users/Dell/Github/Construction-Management-ERP-Software/frontend/src/app/c/[company_id]/dashboard/page.tsx)
- Add "Asset Management" sidebar category with "Equipment Tracking" link.

---

## Verification Plan

### Automated Tests
- Create `backend/test_phase12.py` to:
  1. Add an owned crane and hired excavator.
  2. Deploy the crane to the project (asserts status changes to `deployed`).
  3. Log a 50-liter fuel refill.
  4. Schedule routine maintenance.
  5. Assert that calculations, status transitions, and data queries work correctly.

- Run the tests with `python backend/test_phase12.py`.
- Run frontend compilation build check with `npm run build` via command prompt.
