import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime, Integer, Boolean, Table
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
