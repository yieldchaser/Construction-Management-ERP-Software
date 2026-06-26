import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime, Integer, Boolean, Table, Numeric
from sqlalchemy.sql import func
from app.database import Base, engine

# Database-agnostic fallback for SQLite testing
if engine.url.drivername.startswith("sqlite"):
    from sqlalchemy import JSON, UUID
    JSONB = JSON
else:
    from sqlalchemy.dialects.postgresql import UUID, JSONB

class Company(Base):
    __tablename__ = "companies"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    legal_business_name = Column(String(255))
    gstin = Column(String(15))
    billing_address = Column(String)
    currency_decimal_places = Column(Integer, default=2, nullable=False)
    quantity_decimal_places = Column(Integer, default=3, nullable=False)
    back_dated_limit_days = Column(Integer, default=7, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

class CompanyBranch(Base):
    __tablename__ = "company_branches"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"))
    branch_name = Column(String(100), nullable=False)
    gstin = Column(String(15), nullable=False)
    billing_address = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

class Project(Base):
    __tablename__ = "projects"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"))
    branch_id = Column(UUID(as_uuid=True), ForeignKey("company_branches.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=True)
    status = Column(String(50), default="Ongoing", nullable=False)
    address = Column(String)
    city = Column(String(100))
    state = Column(String(100))
    # Note: geography point will be handled via raw SQL or custom type if PostGIS is queried, mapping as String for basic schema
    location = Column(String, nullable=True) 
    attendance_radius_meters = Column(Integer, default=500, nullable=False)
    is_location_required = Column(Boolean, default=True, nullable=False)
    custom_pdf_template_enabled = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    mobile = Column(String(20), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

class CompanyRole(Base):
    __tablename__ = "company_roles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"))
    role_name = Column(String(100), nullable=False)
    permissions = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

class CompanyTeam(Base):
    __tablename__ = "company_team"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    role_id = Column(UUID(as_uuid=True), ForeignKey("company_roles.id", ondelete="SET NULL"), nullable=True)
    priority_type = Column(String(50), default="employee", nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

class BOQItem(Base):
    __tablename__ = "boq_items"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    section_name = Column(String(100), nullable=True)
    item_name = Column(String(255), nullable=False)
    unit = Column(String(50), nullable=False)
    quantity = Column(Numeric(18, 4), nullable=False)
    rate = Column(Numeric(18, 2), default=0.0, nullable=False)
    supply_rate = Column(Numeric(18, 2), default=0.0, nullable=False)
    installation_rate = Column(Numeric(18, 2), default=0.0, nullable=False)
    supply_tax_pct = Column(Numeric(5, 2), default=18.00, nullable=False)
    installation_tax_pct = Column(Numeric(5, 2), default=12.00, nullable=False)
    quantity_float_limit = Column(Integer, default=2, nullable=False)
    amount = Column(Numeric(18, 2), nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

class ProjectBudget(Base):
    __tablename__ = "project_budgets"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), unique=True, nullable=False)
    material_budget = Column(Numeric(18, 2), default=0.0, nullable=False)
    labour_budget = Column(Numeric(18, 2), default=0.0, nullable=False)
    subcon_budget = Column(Numeric(18, 2), default=0.0, nullable=False)
    equipment_budget = Column(Numeric(18, 2), default=0.0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

class Task(Base):
    __tablename__ = "tasks"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(255), nullable=False)
    duration_days = Column(Integer, nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(50), default="not_started", nullable=False)
    priority = Column(String(50), default="medium", nullable=False)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("company_team.id"), nullable=True)
    boq_item_id = Column(UUID(as_uuid=True), ForeignKey("boq_items.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

class TaskPredecessor(Base):
    __tablename__ = "task_predecessors"
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True)
    predecessor_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True)
    type = Column(String(50), default="finish_to_start", nullable=False)

class Drawing(Base):
    __tablename__ = "drawings"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False) # e.g. "2D Layout", "3D Layout", "Production File"
    created_by = Column(UUID(as_uuid=True), ForeignKey("company_team.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

class DrawingRevision(Base):
    __tablename__ = "drawing_revisions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    drawing_id = Column(UUID(as_uuid=True), ForeignKey("drawings.id", ondelete="CASCADE"), nullable=False)
    version_code = Column(String(20), nullable=False) # e.g. "V1", "V2", "V3"
    file_url = Column(String, nullable=False)
    approval_status = Column(String(50), default="pending", nullable=False) # e.g. "pending", "approved", "rejected"
    approved_by = Column(UUID(as_uuid=True), ForeignKey("company_team.id"), nullable=True)
    comments = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

class DrawingPin(Base):
    __tablename__ = "drawing_pins"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    revision_id = Column(UUID(as_uuid=True), ForeignKey("drawing_revisions.id", ondelete="CASCADE"), nullable=False)
    x_coordinate = Column(Numeric(6, 2), nullable=False)
    y_coordinate = Column(Numeric(6, 2), nullable=False)
    comment = Column(String, nullable=False)
    tagged_user_id = Column(UUID(as_uuid=True), ForeignKey("company_team.id"), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("company_team.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

class MaterialIndent(Base):
    __tablename__ = "material_indents"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    requested_by = Column(UUID(as_uuid=True), ForeignKey("company_team.id"), nullable=True)
    indent_number = Column(String(100), nullable=False)
    status = Column(String(50), default="pending", nullable=False) # pending, approved, ordered, rejected
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

class MaterialIndentItem(Base):
    __tablename__ = "material_indent_items"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    indent_id = Column(UUID(as_uuid=True), ForeignKey("material_indents.id", ondelete="CASCADE"), nullable=False)
    material_name = Column(String(255), nullable=False)
    quantity = Column(Numeric(18, 4), nullable=False)
    unit = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("company_team.id"), nullable=True)
    po_number = Column(String(100), nullable=False)
    po_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(50), default="draft", nullable=False) # draft, sent, partial, received, closed
    gross_amount = Column(Numeric(18, 2), default=0.0, nullable=False)
    tax_amount = Column(Numeric(18, 2), default=0.0, nullable=False)
    total_amount = Column(Numeric(18, 2), default=0.0, nullable=False)
    approval_flag = Column(String(50), default="pending", nullable=False) # pending, approved, rejected
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    po_id = Column(UUID(as_uuid=True), ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False)
    material_name = Column(String(255), nullable=False)
    quantity = Column(Numeric(18, 4), nullable=False)
    unit = Column(String(50), nullable=False)
    rate = Column(Numeric(18, 2), nullable=False)
    tax_pct = Column(Numeric(5, 2), default=18.00, nullable=False)
    total_amount = Column(Numeric(18, 2), nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

class GoodsReceiptNote(Base):
    __tablename__ = "goods_receipt_notes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    po_id = Column(UUID(as_uuid=True), ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False)
    grn_number = Column(String(100), nullable=False)
    received_date = Column(DateTime(timezone=True), nullable=False)
    received_by = Column(UUID(as_uuid=True), ForeignKey("company_team.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

class GRNItem(Base):
    __tablename__ = "grn_items"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    grn_id = Column(UUID(as_uuid=True), ForeignKey("goods_receipt_notes.id", ondelete="CASCADE"), nullable=False)
    po_item_id = Column(UUID(as_uuid=True), ForeignKey("purchase_order_items.id", ondelete="CASCADE"), nullable=False)
    received_qty = Column(Numeric(18, 4), nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

class WarehouseInventory(Base):
    __tablename__ = "warehouse_inventory"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    material_name = Column(String(255), nullable=False)
    on_hand_qty = Column(Numeric(18, 4), default=0.0, nullable=False)
    reserved_qty = Column(Numeric(18, 4), default=0.0, nullable=False)
    unit = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

class MaterialTransaction(Base):
    __tablename__ = "material_transactions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    material_name = Column(String(255), nullable=False)
    qty = Column(Numeric(18, 4), nullable=False)
    type = Column(String(50), nullable=False) # received, used, transferred, returned
    source_ref_id = Column(UUID(as_uuid=True), nullable=True) # grn_id, dpr_id, etc.
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

class WorkOrder(Base):
    __tablename__ = "work_orders"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    subcontractor_id = Column(UUID(as_uuid=True), ForeignKey("company_team.id"), nullable=False)
    wo_number = Column(String(100), nullable=False)
    wo_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(50), default="active", nullable=False)
    estimated_work_amount = Column(Numeric(18, 2), default=0.0, nullable=False)
    terms = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

class WorkOrderItem(Base):
    __tablename__ = "work_order_items"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wo_id = Column(UUID(as_uuid=True), ForeignKey("work_orders.id", ondelete="CASCADE"), nullable=False)
    boq_item_id = Column(UUID(as_uuid=True), ForeignKey("boq_items.id", ondelete="SET NULL"), nullable=True)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    quantity = Column(Numeric(18, 4), nullable=False)
    rate = Column(Numeric(18, 2), nullable=False)
    amount = Column(Numeric(18, 2), nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

class Bill(Base):
    __tablename__ = "bills"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    party_company_user_id = Column(UUID(as_uuid=True), ForeignKey("company_team.id"), nullable=False)
    invoice_number = Column(String(100), nullable=False)
    invoice_date = Column(DateTime(timezone=True), nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)
    invoice_type = Column(String(50), nullable=False) # sale, purchase, subcon
    status = Column(String(50), default="Unpaid", nullable=False) # Unpaid, Partially Paid, Paid, Cancelled
    subtotal = Column(Numeric(18, 2), nullable=False)
    gst_amount = Column(Numeric(18, 2), default=0.0, nullable=False)
    total_payable = Column(Numeric(18, 2), nullable=False)
    paid_amount = Column(Numeric(18, 2), default=0.0, nullable=False)
    approval_flag = Column(String(50), default="pending", nullable=False)
    is_milestone_fixed_amount = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

class TransactionDeduction(Base):
    __tablename__ = "transaction_deductions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bill_id = Column(UUID(as_uuid=True), ForeignKey("bills.id", ondelete="CASCADE"), nullable=False)
    deduction_type = Column(String(100), nullable=False) # TDS, Retention, Security Deposit, Advance Recovery, Material Recovery
    amount = Column(Numeric(18, 2), nullable=False)
    percentage = Column(Numeric(5, 2), nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

class DebitNote(Base):
    __tablename__ = "debit_notes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    party_company_user_id = Column(UUID(as_uuid=True), ForeignKey("company_team.id"), nullable=False)
    notes = Column(String, nullable=True)
    total_amount = Column(Numeric(18, 2), nullable=False)
    work_amount = Column(Numeric(18, 2), default=0.0, nullable=False)
    gst_amount = Column(Numeric(18, 2), default=0.0, nullable=False)
    bill_id = Column(UUID(as_uuid=True), ForeignKey("bills.id", ondelete="SET NULL"), nullable=True)
    reference_number = Column(String(100), nullable=True)
    approval_flag = Column(String(50), default="auto_approved", nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

class CreditNote(Base):
    __tablename__ = "credit_notes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    party_company_user_id = Column(UUID(as_uuid=True), ForeignKey("company_team.id"), nullable=False)
    notes = Column(String, nullable=True)
    total_amount = Column(Numeric(18, 2), nullable=False)
    bill_id = Column(UUID(as_uuid=True), ForeignKey("bills.id", ondelete="SET NULL"), nullable=True)
    reference_number = Column(String(100), nullable=True)
    approval_flag = Column(String(50), default="pending", nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

# ─────────────────────────────────────────────────────────────────────────────
# Phase 9 — Staff Timesheets, Geofenced Attendance & Payroll
# ─────────────────────────────────────────────────────────────────────────────

class StaffEmployee(Base):
    """Master record for each staff member employed under a company/project."""
    __tablename__ = "staff_employees"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(255), nullable=False)
    employee_code = Column(String(50), nullable=True)
    designation = Column(String(100), nullable=True)
    department = Column(String(100), nullable=True)
    mobile = Column(String(20), nullable=True)
    basic_salary = Column(Numeric(14, 2), default=0.0, nullable=False)
    hra = Column(Numeric(14, 2), default=0.0, nullable=False)
    other_allowances = Column(Numeric(14, 2), default=0.0, nullable=False)
    pf_employee_pct = Column(Numeric(5, 2), default=12.0, nullable=False)
    pf_employer_pct = Column(Numeric(5, 2), default=12.0, nullable=False)
    esi_employee_pct = Column(Numeric(5, 2), default=0.75, nullable=False)
    esi_employer_pct = Column(Numeric(5, 2), default=3.25, nullable=False)
    tds_monthly = Column(Numeric(14, 2), default=0.0, nullable=False)
    is_esi_applicable = Column(Boolean, default=True, nullable=False)
    status = Column(String(50), default="active", nullable=False)
    date_of_joining = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)


class AttendanceLog(Base):
    """GPS-stamped punch-in/out record per employee per day."""
    __tablename__ = "attendance_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("staff_employees.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    attendance_date = Column(DateTime(timezone=True), nullable=False)
    punch_in = Column(DateTime(timezone=True), nullable=True)
    punch_out = Column(DateTime(timezone=True), nullable=True)
    lat_in = Column(Numeric(10, 7), nullable=True)
    lng_in = Column(Numeric(10, 7), nullable=True)
    lat_out = Column(Numeric(10, 7), nullable=True)
    lng_out = Column(Numeric(10, 7), nullable=True)
    distance_from_site_m = Column(Numeric(10, 2), nullable=True)
    is_within_geofence = Column(Boolean, default=False, nullable=False)
    status = Column(String(50), default="Present", nullable=False)
    hours_worked = Column(Numeric(5, 2), nullable=True)
    overtime_hours = Column(Numeric(5, 2), default=0.0, nullable=False)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)


class Timesheet(Base):
    """Weekly timesheet header for one employee."""
    __tablename__ = "timesheets"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("staff_employees.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    week_start = Column(DateTime(timezone=True), nullable=False)
    week_end = Column(DateTime(timezone=True), nullable=False)
    total_hours = Column(Numeric(6, 2), default=0.0, nullable=False)
    status = Column(String(50), default="draft", nullable=False)
    approved_by = Column(UUID(as_uuid=True), nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)


class TimesheetEntry(Base):
    """One line in a timesheet: date + task + hours logged."""
    __tablename__ = "timesheet_entries"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timesheet_id = Column(UUID(as_uuid=True), ForeignKey("timesheets.id", ondelete="CASCADE"), nullable=False)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    entry_date = Column(DateTime(timezone=True), nullable=False)
    hours = Column(Numeric(5, 2), nullable=False)
    activity_description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)


class PayrollRun(Base):
    """Monthly payroll run header for one company+month."""
    __tablename__ = "payroll_runs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    payroll_month = Column(String(7), nullable=False)
    run_date = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    status = Column(String(50), default="draft", nullable=False)
    total_gross = Column(Numeric(18, 2), default=0.0, nullable=False)
    total_deductions = Column(Numeric(18, 2), default=0.0, nullable=False)
    total_net = Column(Numeric(18, 2), default=0.0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)


class PayrollLineItem(Base):
    """One employee's computed payslip within a PayrollRun."""
    __tablename__ = "payroll_line_items"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payroll_run_id = Column(UUID(as_uuid=True), ForeignKey("payroll_runs.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("staff_employees.id", ondelete="CASCADE"), nullable=False)
    days_present = Column(Numeric(5, 1), default=0.0, nullable=False)
    days_in_month = Column(Integer, default=26, nullable=False)
    gross_salary = Column(Numeric(14, 2), default=0.0, nullable=False)
    basic = Column(Numeric(14, 2), default=0.0, nullable=False)
    hra = Column(Numeric(14, 2), default=0.0, nullable=False)
    other_allowances = Column(Numeric(14, 2), default=0.0, nullable=False)
    overtime_amount = Column(Numeric(14, 2), default=0.0, nullable=False)
    pf_employee = Column(Numeric(14, 2), default=0.0, nullable=False)
    pf_employer = Column(Numeric(14, 2), default=0.0, nullable=False)
    esi_employee = Column(Numeric(14, 2), default=0.0, nullable=False)
    esi_employer = Column(Numeric(14, 2), default=0.0, nullable=False)
    tds = Column(Numeric(14, 2), default=0.0, nullable=False)
    advance_recovery = Column(Numeric(14, 2), default=0.0, nullable=False)
    other_deductions = Column(Numeric(14, 2), default=0.0, nullable=False)
    total_deductions = Column(Numeric(14, 2), default=0.0, nullable=False)
    net_payable = Column(Numeric(14, 2), default=0.0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
