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
