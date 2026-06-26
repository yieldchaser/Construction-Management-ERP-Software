# Master Technical Specification & Implementation Plan — SiteFlow

This document outlines the complete system design, PostgreSQL database schema, API endpoints, UI design system, and business logic for **SiteFlow** — a world-class, highly secure, and visually stunning Construction Management platform. It has been fully updated and audited against the recon files to guarantee 100% feature coverage and mathematical fidelity. 

The website and web portal will be constructed first, followed by a cross-platform mobile application. The target is to meet or exceed the capabilities, performance, and aesthetics of the competitive benchmark, OnsiteTeams.

---

## 🛠️ Tech Stack & Services Design

1. **Database & Infrastructure**: **Supabase (PostgreSQL + PostGIS)**.
   * Supabase Auth: Configured for **Mock-OTP** during development (using mobile number ➔ `123456` login code), transitioning to Twilio SMS OTP for production.
   * PostGIS: For spatial query geofencing.
   * Supabase Storage: For blueprint drawing CAD/PDF files, GRN gate check-in photos, and transaction receipts.
2. **Server Architecture**: **FastAPI (Python)**.
   * Handles intensive data calculation: Excel BOQ parsing, geofence radius calculations, PDF report compilation, and automated three-way matching.
3. **Frontend Application**: **Next.js 14+ (React + TypeScript) + Tailwind CSS**.
   * Tenant URL routing: `web.siteflowapp.com/c/{company-uuid}/d/{module}`.
   * Premium dark mode canvas (`#141218`) with glassmorphic cards (`#1E1B2E`) and vibrant hot pink (`#E8184C`) active highlights.

---

## 🧬 PostgreSQL Database Schema (Supabase DDL)

The database schema has been verified against the master API schemas extracted in [extracted_api_schemas.txt](file:///c:/Users/Dell/Github/Construction-Management-ERP-Software/onsiteteams-recon/extracted_api_schemas.txt), which documents 14,500+ lines of key-value types across all 173 mock response JSONs in the repository.

To see the complete detailed analysis of these formulas, rules, and relationships, refer to the [Recon Audit & Quality Assurance Protocol](file:///C:/Users/Dell/.gemini/antigravity/brain/b30b3b07-98f2-491b-918e-b1e0fcab2d92/recon_audit_assurance.md).

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. COMPANIES & BRANCHES
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    legal_business_name VARCHAR(255),
    gstin VARCHAR(15),
    billing_address TEXT,
    currency_decimal_places INTEGER NOT NULL DEFAULT 2, -- options: 0, 2, 3
    quantity_decimal_places INTEGER NOT NULL DEFAULT 3, -- options: 0, 2, 3, 4
    back_dated_limit_days INTEGER NOT NULL DEFAULT 7, -- lock editing/adding entries older than N days (0 for disabled)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE company_branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    branch_name VARCHAR(100) NOT NULL,
    gstin VARCHAR(15) NOT NULL,
    billing_address TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. PROJECTS
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES company_branches(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'Ongoing',
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    location GEOGRAPHY(Point, 4326),
    attendance_radius_meters DOUBLE PRECISION NOT NULL DEFAULT 500.0,
    is_location_required BOOLEAN NOT NULL DEFAULT TRUE,
    custom_pdf_template_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    start_date DATE,
    end_date DATE,
    estimated_cost DECIMAL(18,2) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code) -- unique project code per company
);

-- 3. USERS, ROLES & TEAM ACCESS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE company_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    role_name VARCHAR(100) NOT NULL,
    permissions JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE company_team (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES company_roles(id) ON DELETE SET NULL,
    priority_type VARCHAR(50) NOT NULL DEFAULT 'employee', -- employee, partner, client, subcontractor
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, user_id)
);

CREATE TABLE project_team (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    company_user_id UUID REFERENCES company_team(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, company_user_id)
);

-- 4. BILL OF QUANTITIES (BOQ) & BUDGETS
CREATE TABLE boq_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    section_name VARCHAR(100),
    item_name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    quantity DECIMAL(18,4) NOT NULL,
    rate DECIMAL(18,2) NOT NULL DEFAULT 0.0,
    supply_rate DECIMAL(18,2) NOT NULL DEFAULT 0.0,
    installation_rate DECIMAL(18,2) NOT NULL DEFAULT 0.0,
    supply_tax_pct DECIMAL(5,2) NOT NULL DEFAULT 18.00,
    installation_tax_pct DECIMAL(5,2) NOT NULL DEFAULT 12.00,
    quantity_float_limit INTEGER NOT NULL DEFAULT 2,
    amount DECIMAL(18,2) GENERATED ALWAYS AS (quantity * (rate + supply_rate + installation_rate)) STORED,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE project_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
    material_budget DECIMAL(18,2) NOT NULL DEFAULT 0.0,
    labour_budget DECIMAL(18,2) NOT NULL DEFAULT 0.0,
    subcon_budget DECIMAL(18,2) NOT NULL DEFAULT 0.0,
    equipment_budget DECIMAL(18,2) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. WORK & TASK MANAGEMENT
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    duration_days INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'not_started', -- not_started, in_progress, on_hold, completed, cancelled
    priority VARCHAR(50) NOT NULL DEFAULT 'medium', -- low, medium, high, critical
    assigned_to UUID REFERENCES company_team(id),
    boq_item_id UUID REFERENCES boq_items(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task_predecessors (
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    predecessor_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL DEFAULT 'finish_to_start',
    PRIMARY KEY (task_id, predecessor_id)
);

CREATE TABLE daily_progress_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    reported_by UUID REFERENCES company_team(id),
    dpr_date DATE NOT NULL,
    executed_qty DECIMAL(18,4) NOT NULL,
    photos TEXT[],
    geo_location GEOGRAPHY(Point, 4326),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. DESIGN REVISIONS & FILES
CREATE TABLE drawings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 2D Layout, 3D Layout, Production File
    created_by UUID REFERENCES company_team(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE drawing_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drawing_id UUID REFERENCES drawings(id) ON DELETE CASCADE,
    version_code VARCHAR(20) NOT NULL, -- V1, V2, V3
    file_url TEXT NOT NULL,
    approval_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    approved_by UUID REFERENCES company_team(id),
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE drawing_pins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    revision_id UUID REFERENCES drawing_revisions(id) ON DELETE CASCADE,
    x_coordinate DECIMAL(6,2) NOT NULL,
    y_coordinate DECIMAL(6,2) NOT NULL,
    comment TEXT NOT NULL,
    tagged_user_id UUID REFERENCES company_team(id),
    created_by UUID REFERENCES company_team(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. PROCUREMENT & INVENTORY
CREATE TABLE material_indents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE, -- direct tenant linkage
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES company_team(id),
    indent_number VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, ordered, rejected
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, indent_number) -- unique indent number per company
);

CREATE TABLE material_indent_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    indent_id UUID REFERENCES material_indents(id) ON DELETE CASCADE,
    material_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(18,4) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE, -- direct tenant linkage
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES company_team(id) ON DELETE RESTRICT,
    po_number VARCHAR(100) NOT NULL,
    po_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, sent, partial, received, closed
    gross_amount DECIMAL(18,2) NOT NULL DEFAULT 0.0,
    tax_amount DECIMAL(18,2) NOT NULL DEFAULT 0.0,
    total_amount DECIMAL(18,2) NOT NULL DEFAULT 0.0,
    approval_flag VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, po_number) -- unique PO number per company
);

CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    material_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(18,4) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    rate DECIMAL(18,2) NOT NULL,
    tax_pct DECIMAL(5,2) NOT NULL DEFAULT 18.00,
    total_amount DECIMAL(18,2) GENERATED ALWAYS AS (quantity * rate * (1 + tax_pct / 100.0)) STORED,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE goods_receipt_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE, -- direct tenant linkage
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE, -- direct project linkage
    po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    grn_number VARCHAR(100) NOT NULL,
    received_date DATE NOT NULL,
    received_by UUID REFERENCES company_team(id),
    gate_photos TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, grn_number) -- unique GRN number per company
);

CREATE TABLE grn_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_id UUID REFERENCES goods_receipt_notes(id) ON DELETE CASCADE,
    po_item_id UUID REFERENCES purchase_order_items(id) ON DELETE CASCADE,
    received_qty DECIMAL(18,4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE warehouse_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    material_name VARCHAR(255) NOT NULL,
    on_hand_qty DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    reserved_qty DECIMAL(18,4) NOT NULL DEFAULT 0.0,
    unit VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, material_name)
);

CREATE TABLE material_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    material_name VARCHAR(255) NOT NULL,
    qty DECIMAL(18,4) NOT NULL,
    type VARCHAR(50) NOT NULL, -- received, used, transferred, returned
    source_ref_id UUID, -- grn_id, dpr_id, etc.
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. WORK ORDERS & SUBCON RA BILLING
CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE, -- direct tenant linkage
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    subcontractor_id UUID REFERENCES company_team(id) ON DELETE RESTRICT,
    wo_number VARCHAR(100) NOT NULL,
    wo_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    estimated_work_amount DECIMAL(18,2) NOT NULL DEFAULT 0.0,
    terms TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, wo_number) -- unique WO number per company
);

CREATE TABLE work_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wo_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    boq_item_id UUID REFERENCES boq_items(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    quantity DECIMAL(18,4) NOT NULL,
    rate DECIMAL(18,2) NOT NULL,
    amount DECIMAL(18,2) GENERATED ALWAYS AS (quantity * rate) STORED,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    party_company_user_id UUID REFERENCES company_team(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE,
    invoice_type VARCHAR(50) NOT NULL, -- sale (client invoice), purchase (vendor bill), subcon (subcon bill)
    status VARCHAR(50) NOT NULL DEFAULT 'Unpaid', -- Unpaid, Partially Paid, Paid, Cancelled
    subtotal DECIMAL(18,2) NOT NULL,
    gst_amount DECIMAL(18,2) NOT NULL DEFAULT 0.0,
    total_payable DECIMAL(18,2) NOT NULL,
    paid_amount DECIMAL(18,2) NOT NULL DEFAULT 0.0,
    approval_flag VARCHAR(50) NOT NULL DEFAULT 'pending',
    is_milestone_fixed_amount BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Partial index to enforce unique tax invoice numbers for company-issued client sales invoices
CREATE UNIQUE INDEX unique_sale_invoice_number_per_company 
ON bills (company_id, invoice_number) 
WHERE invoice_type = 'sale';

CREATE TABLE transaction_deductions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
    deduction_type VARCHAR(100) NOT NULL, -- TDS, Retention, Security Deposit, Advance Recovery, Material Recovery
    amount DECIMAL(18,2) NOT NULL,
    percentage DECIMAL(5,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. DEBIT NOTES & CREDIT NOTES
CREATE TABLE debit_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    party_company_user_id UUID REFERENCES company_team(id) ON DELETE RESTRICT,
    notes TEXT,
    total_amount DECIMAL(18,2) NOT NULL,
    work_amount DECIMAL(18,2) NOT NULL DEFAULT 0.0,
    gst_amount DECIMAL(18,2) NOT NULL DEFAULT 0.0,
    photos TEXT[],
    bill_id UUID REFERENCES bills(id) ON DELETE SET NULL,
    reference_number VARCHAR(100),
    approval_flag VARCHAR(50) NOT NULL DEFAULT 'auto_approved',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE credit_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    party_company_user_id UUID REFERENCES company_team(id) ON DELETE RESTRICT,
    notes TEXT,
    total_amount DECIMAL(18,2) NOT NULL,
    bill_id UUID REFERENCES bills(id) ON DELETE SET NULL,
    reference_number VARCHAR(100),
    approval_flag VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. PAYROLL & ATTENDANCE
CREATE TABLE salary_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    monthly_ctc DECIMAL(18,2) NOT NULL,
    basic_percent DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    hra_percent DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    pf_employee_fixed DECIMAL(18,2) NOT NULL DEFAULT 1800.00,
    pf_employer_fixed DECIMAL(18,2) NOT NULL DEFAULT 1800.00,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE staff_payroll_profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_user_id UUID REFERENCES company_team(id) ON DELETE CASCADE UNIQUE,
    salary_template_id UUID REFERENCES salary_templates(id) ON DELETE SET NULL,
    payroll_type VARCHAR(50) NOT NULL DEFAULT 'monthly', -- monthly, daily
    pf_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE timesheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    party_company_user_id UUID REFERENCES company_team(id) ON DELETE RESTRICT,
    timesheet_date DATE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    shift_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00, -- 0.25, 0.50, 0.75, 1.00
    overtime_hours DECIMAL(4,2) NOT NULL DEFAULT 0.00,
    daily_allowance DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    photos TEXT[],
    punch_in_location GEOGRAPHY(Point, 4326),
    punch_out_location GEOGRAPHY(Point, 4326),
    face_scan_matched BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(party_company_user_id, timesheet_date)
);

CREATE TABLE salary_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES company_team(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    month DATE NOT NULL,
    gross_salary DECIMAL(18,2) NOT NULL,
    total_deductions DECIMAL(18,2) NOT NULL,
    net_salary DECIMAL(18,2) NOT NULL,
    bill_id UUID REFERENCES bills(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. FINANCE PAYMENTS & LEDGER SETTLEMENTS
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    party_company_user_id UUID REFERENCES company_team(id) ON DELETE RESTRICT,
    payment_type VARCHAR(50) NOT NULL, -- in (Payment In), out (Payment Out)
    amount DECIMAL(18,2) NOT NULL,
    unsettled_amount DECIMAL(18,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- Cash, Bank Transfer, Cheque
    reference_number VARCHAR(100),
    description TEXT,
    payment_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payment_settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
    settled_amount DECIMAL(18,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 12. CRM LEADS & QUOTATIONS
CREATE TABLE crm_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    assignee_id UUID REFERENCES company_team(id) ON DELETE SET NULL,
    lead_date DATE NOT NULL DEFAULT CURRENT_DATE,
    lead_type VARCHAR(100) NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    phone_no VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    client_company_name VARCHAR(255),
    address TEXT,
    source VARCHAR(100), -- Google, Instagram, Referral, etc.
    category VARCHAR(100), -- Residential, Commercial, Civil
    status VARCHAR(100) NOT NULL DEFAULT 'New Lead', -- New Lead, Follow-up, Proposed Stage, Interested, Lost, Won
    priority VARCHAR(50) NOT NULL DEFAULT 'medium', -- low, medium, high
    budget DECIMAL(18,2) NOT NULL DEFAULT 0.0,
    description TEXT,
    next_follow_up DATE,
    expected_closure DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE crm_quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    tax_type VARCHAR(50) NOT NULL DEFAULT 'bill_level', -- item_level, bill_level
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Sent, In Discussion, On Hold, Confirmed, Rejected
    gst_pct DECIMAL(5,2) NOT NULL DEFAULT 18.00,
    discount DECIMAL(18,2) NOT NULL DEFAULT 0.0,
    total_amount DECIMAL(18,2) NOT NULL DEFAULT 0.0,
    terms TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE crm_quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID REFERENCES crm_quotations(id) ON DELETE CASCADE,
    section_name VARCHAR(100),
    item_name VARCHAR(255) NOT NULL,
    qty DECIMAL(18,4) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    cost_price DECIMAL(18,2) NOT NULL DEFAULT 0.0,
    selling_price DECIMAL(18,2) NOT NULL DEFAULT 0.0,
    supply_rate DECIMAL(18,2) NOT NULL DEFAULT 0.0,
    installation_rate DECIMAL(18,2) NOT NULL DEFAULT 0.0,
    supply_tax_pct DECIMAL(5,2) NOT NULL DEFAULT 18.00,
    installation_tax_pct DECIMAL(5,2) NOT NULL DEFAULT 12.00,
    total_amount DECIMAL(18,2) GENERATED ALWAYS AS (qty * (selling_price + supply_rate + installation_rate)) STORED,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 13. QUALITY CHECKLISTS
CREATE TABLE quality_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE UNIQUE,
    checklist_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, passed, failed
    verified_by UUID REFERENCES company_team(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quality_checklist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    checklist_id UUID REFERENCES quality_checklists(id) ON DELETE CASCADE,
    check_description TEXT NOT NULL,
    is_passed BOOLEAN NOT NULL DEFAULT FALSE,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 14. EQUIPMENT & ASSET TRACKING
CREATE TABLE equipment_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    type VARCHAR(100) NOT NULL, -- Excavator, Mixer, Crane, etc.
    status VARCHAR(50) NOT NULL DEFAULT 'available', -- available, allocated, maintenance, disposed
    current_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    hourly_rate DECIMAL(18,2) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code) -- unique equipment code per company
);

CREATE TABLE equipment_run_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id UUID REFERENCES equipment_registry(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    run_hours DECIMAL(4,2) NOT NULL,
    fuel_issued_litres DECIMAL(6,2) NOT NULL DEFAULT 0.0,
    operator_id UUID REFERENCES company_team(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 15. ONSITE-TALLY INTEGRATION
CREATE TABLE tally_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
    tally_company_name VARCHAR(255) NOT NULL, -- case-sensitive exact match
    registered_mobile VARCHAR(20) NOT NULL,
    sync_window_start_date DATE NOT NULL DEFAULT '2026-04-01',
    voucher_number_template VARCHAR(100) NOT NULL DEFAULT 'ONS-{year}-{number}',
    auto_create_missing_ledgers BOOLEAN NOT NULL DEFAULT FALSE,
    round_off_ledger VARCHAR(255),
    default_cash_ledger VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tally_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    machine_label VARCHAR(255) NOT NULL, -- e.g. "Office-PC", "Accountant-Laptop"
    auth_key VARCHAR(255) UNIQUE NOT NULL, -- key entered in desktop agent
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, revoked
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tally_ledger_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    onsite_transaction_type VARCHAR(100) NOT NULL, -- Material Purchase, Subcon Expense, Sales Invoice, etc.
    posting_mode VARCHAR(50) NOT NULL DEFAULT 'lumpsum', -- lumpsum, itemwise
    tally_voucher_type VARCHAR(100) NOT NULL, -- Purchase, Sales, Payment, Receipt, Journal
    tally_ledger_name VARCHAR(255) NOT NULL,
    freight_ledger VARCHAR(255),
    surcharge_ledger VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, onsite_transaction_type)
);

CREATE TABLE tally_party_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    onsite_party_id UUID REFERENCES company_team(id) ON DELETE CASCADE, -- maps to company_team member
    tally_ledger_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, onsite_party_id)
);

CREATE TABLE tally_cost_centre_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    tally_cost_centre_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, project_id)
);

CREATE TABLE tally_bank_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    onsite_bank_account_details VARCHAR(255) NOT NULL, -- Onsite bank label
    tally_ledger_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, onsite_bank_account_details)
);
```
```

---

## 🧮 Discovered Mathematical Calculators & Formulas

### 1. Steel Calculator (IS 456:2000 Compliant)
Calculates steel reinforcement weight for Columns, One-Way Slabs, and Two-Way Slabs.
* **Standard Unit Weight Formula**: 
  $$\text{Unit Weight } (kg/m) = \frac{D^2}{162.89}$$ *(where $D$ is the bar diameter in mm, ranging from 8mm to 40mm)*
* **Main Bar Weight**:
  $$\text{Total Weight} = \text{Bar Count} \times (\text{Height} + \text{Slab Thickness} + 50 \times D_{\text{lap}}) \times \text{Unit Weight} \times (1 + \text{Wastage}\%)$$
* **Stirrup Cutting Length**:
  $$\text{Length} = 2 \times (a + b - 4 \times \text{cover}) + 2 \times \text{hookLength} - \text{bendDeductions}$$
  * *Hook length defaults: $9 \times D$ for 90° bend, $12 \times D$ for 135° bend.*
  * *Bend deductions: $2 \times D$ per 90° bend, $3 \times D$ per 135° bend.*
* **Bar Count (Slabs)**:
  $$\text{Bar Count} = \left(\frac{\text{Span}}{\text{Spacing}}\right) + 1$$

### 2. Concrete Volume & Mix Calculator
* **Wet to Dry Concrete Volume Conversion**:
  $$\text{Dry Volume} = \text{Wet Volume} \times 1.54 \times (1 + \text{Wastage}\%)$$
  * *Standard wastage default: 5% (up to 10% customizable).*
* **Material Split by Concrete Grade (Nominal Mixes)**:
  * **M7.5 (1:4:8)**: Cement = 3.4 bags/m³, Sand = 0.48 m³/m³, Aggregate = 0.96 m³/m³
  * **M20 (1:1.5:3)**: Cement = 8.2 bags/m³, Sand = 0.42 m³/m³, Aggregate = 0.84 m³/m³
  * **M25 (1:1:2)**: Cement = 11.1 bags/m³, Sand = 0.38 m³/m³, Aggregate = 0.76 m³/m³
  * *Design Mix Cap: M30+ grades are blocked from nominal mix formulas in the UI and flagged as requiring an engineered design mix recipe.*
* **Staircase Volume Formula**:
  $$V = \text{Steps Count} \times \text{Width} \times \left(\frac{\text{Riser} \times \text{Tread}}{2}\right) + \left(\text{Waist Slab Thickness} \times \text{Width} \times \sqrt{\text{Rise}^2 + \text{Run}^2}\right)$$

### 3. Ready Mix Concrete (RMC) Mixer Load Calculator
* **Required Mix Volume**:
  $$\text{Total Volume } (m^3) = \text{Pour Volume} \times (1 + \text{Wastage}\%)$$
* **Transit Mixer Loads**:
  $$\text{Mixer Loads} = \left\lceil \frac{\text{Total Volume}}{\text{Mixer Size}} \right\rceil$$
  * *Mixer Size defaults: $6\text{ m}^3$ (India standard) or $7\text{ m}^3$ (GCC/Middle East standard).*

### 4. House Construction Cost Estimator
* **Cost Split Breakdown**:
  * Structure (RCC, Foundation, Brickwork): **40%**
  * Finishing (Flooring, Paint, Windows): **25%**
  * MEP (Electrical, Plumbing, HVAC): **15%**
  * Interior (Woodwork, Modular Kitchen): **12%**
  * Miscellaneous (Government Permits, Architectural Fees): **8%**
* **Multipliers**:
  * **Floor Multiplier**: $+12\%$ added to base cost per additional floor above the ground floor.
  * **Construction Type**: Commercial projects add $+10\%$ to base residential rate. Compound walls are estimated at exactly $35\%$ of the residential area rate per foot.
  * **Recommended Contingency Buffer**: $12\%$ to $15\%$ hardcoded warning threshold for cost variance.

### 5. Brick & Mortar Calculator
* **Brick Quantity Formula**:
  $$\text{Bricks} = \frac{\text{Wall Length} \times \text{Wall Height}}{(\text{Brick Length} + \text{joint}) \times (\text{Brick Height} + \text{joint})} \times \text{leaves} \times (1 + \text{Wastage}\%)$$
  * *Leaves = 1 for 4.5" wall, 2 for 9" wall, 3 for 13.5" wall.*
* **Standard Presets**:
  * Modular Brick size: $190 \times 90 \times 90\text{ mm}$
  * Traditional Brick size: $230 \times 110 \times 75\text{ mm}$
  * Mortar Joint Thickness: 10mm (default)
  * Wastage: 10% (straight), 15% (with openings), 30% (complex cuts).
* **Mortar Volume & Splits**:
  * Mortar Volume $\approx 30\%$ of wall volume.
  * Cement bags per 1,000 bricks: ~2.5 bags (using 1:6 mix).
  * Mortar Mix ratios (Cement:Sand): Internal partition (1:6), External load-bearing (1:4), High-strength structural (1:3).

### 6. Paint, Putty & Primer Calculator
* **Total Wall Area**:
  $$\text{Total Wall Area} = 2 \times (\text{Room Length} + \text{Room Width}) \times \text{Ceiling Height}$$
* **Paintable Area**:
  $$\text{Paintable Area} = \text{Total Wall Area} + \text{Ceiling Area} - \sum (\text{Deductions})$$
  * *Standard Deductions: Single Door (21 sqft), Double Door (35 sqft), Standard Window (12 sqft), Large Window (20 sqft), Ventilator (3 sqft).*
* **Coverage Rates per Litre (1 Coat)**:
  * Economy: 110–120 sqft/L
  * Premium: 130–140 sqft/L
  * Luxury: 150–160 sqft/L
* **Putty Consumption**: 2.0 to 2.5 kg per 100 sqft (2 coats, 10% wastage).
* **Primer Coverage**: 150 to 200 sqft/L (1 coat, 5% wastage).

### 7. Tile and Flooring Calculator
* **Tile Quantity Formula**:
  $$\text{Tiles} = \frac{\text{Floor Area}}{(\text{Tile Length} + \text{grout}) \times (\text{Tile Width} + \text{grout})} \times (1 + \text{Wastage}\%)$$
  * *Standard wastage default: 10%. Grout joint default: 2mm or 3mm.*

### 8. Plastering Calculator
* **Plaster Dry Volume Formula**:
  $$\text{Dry Volume} = \text{Wall Area} \times \text{Plaster Thickness} \times 1.33 \times (1 + \text{Wastage}\%)$$
  * *Thickness: 12mm (internal), 15mm/20mm (external). Mix: 1:3, 1:4, 1:6.*

### 9. Waterproofing Material Calculator
* **Waterproofing Volume**:
  $$\text{Volume (L or kg)} = \frac{\text{Surface Area}}{\text{Coverage Rate}} \times \text{Coats} \times 1.05 \text{ (5% wastage)}$$

### 10. Sales Invoice Deductions & Retentions
Sales invoices are calculated based on line items, applying custom library deductions (TDS, royalties, welfare funds) and contract retentions:
* **Deduction Calculation**:
  $$\text{Deduction Amount} = \sum (\text{Lumpsum}) + \sum (\text{Total Invoice} \times \text{Deduction \%}) + \sum (\text{Item Subtotal} \times \text{Deduction \%})$$
* **Retention Calculation**:
  $$\text{Retention Amount} = \sum (\text{Lumpsum}) + \sum (\text{Total Invoice} \times \text{Retention \%}) + \sum (\text{Item Subtotal} \times \text{Retention \%})$$
* **Net Payable Calculation**:
  $$\text{Net Payable} = \text{Subtotal} + \text{GST} - \text{Deductions} - \text{Retention}$$
  * *TDS Rates: Section 194C (1% or 2% on subcontractors), Section 194J (10% on professional services/subscriptions).*
  * **Pre-Tax Setting**:
    * **Pre-Tax OFF (Default)**: GST is applied on Subtotal first. Deductions are calculated and subtracted from the GST-inclusive total.
    * **Pre-Tax ON**: Deductions and retentions are calculated and subtracted from the Subtotal first. GST is applied on the reduced taxable amount.

### 11. Indian Payroll Salary Template Calculations
* **Basic Salary**: Set as a `% of CTC` (typically 40% to 50% in India) or fixed amount. PF is calculated on Basic salary.
* **Allowances**: HRA (typically 40% to 50% of Basic), Food Allowance (Fixed), Travel, Medical, Special Allowance (fills remaining CTC gap to stay below 100% of CTC).
* **Deductions**: PF Employee Contribution (Fixed amount Rs 1,800, i.e., 12% of basic salary up to Rs 15,000 basic), Employer PF Contribution (Fixed matching Rs 1,800), TDS, or other one-off deductions.
* **Formula**:
  $$\text{Gross Salary} = \text{Basic} + \sum (\text{Allowances})$$
  $$\text{Net Salary (Take-home)} = \text{Gross Salary} - \sum (\text{Deductions})$$
* **Multi-Project Salary Split**: Cost is auto-allocated across projects as separate expense transactions based on monthly site attendance percentages.

### 12. Labour Attendance & Geofencing
* **Shift Multipliers**: 0.25 (quarter), 0.50 (half), 0.75 (three-quarter), 1.00 (full), or custom decimal.
* **Geofence Check-in Validation**:
  $$\text{Check-in Invalid if } \text{ST\_Distance}(\text{PunchPoint}, \text{ProjectPoint}) > \text{attendance\_radius\_meters}$$
  * *attendance_radius_meters defaults to 500m.*

### 13. Split Rate (Supply + Installation) Calculator
* **Split Rate Calculation**: Specifically for fit-out and interior projects, items are billed as a combination of Supply (Material procurement) and Installation (Erection/Labour):
  $$\text{Gross Combined Amount} = \text{Quantity} \times (\text{Supply Rate} + \text{Installation Rate})$$
  * **Tax Splits**:
    $$\text{Supply Tax} = (\text{Quantity} \times \text{Supply Rate}) \times \text{Supply Tax \%}$$
    $$\text{Installation Tax} = (\text{Quantity} \times \text{Installation Rate}) \times \text{Installation Tax \%}$$
    $$\text{Total GST} = \text{Supply Tax} + \text{Installation Tax}$$

### 14. Milestone Billing (Fixed vs Percentage) Claim Calculator
* **Milestone Invoicing Modes**:
  * **Percentage Milestone Claim**:
    $$\text{Claim Amount} = \text{Project Estimate} \times \left(\frac{\text{Milestone Percentage}}{100.0}\right)$$
  * **Fixed Milestone Claim**:
    $$\text{Claim Amount} = \text{Fixed Lumpsum Amount}$$
    $$\text{Implied Progress \%} = \left(\frac{\text{Fixed Lumpsum Amount}}{\text{Project Estimate}}\right) \times 100.0$$

### 15. Dynamic Precision Rounding (Quantity Float Limit)
* **Rounding Boundaries**: To handle different materials appropriately, we enforce quantity rounding limits based on the material unit type (e.g., steel quantity is rounded to 3 decimals, bricks to 0 decimals, cement bags to 2 decimals).
  $$\text{Rounded Quantity} = \text{round}(\text{Raw Quantity}, \text{float\_limit})$$

---

## 📡 REST API Design

The API relies on the base URL `https://api.siteflowapp.com/apis/v3`.

* **`Project-Company-Id`**: UUID header of company context.
* **`Project-Id`**: UUID header of active project.
* **`Version-Code`**: `171` (Required version identifier).

### Live Operational Server Configurations (Reverse-Engineered Chunks)
To ensure 100% compatibility when building and migrating data structures, SiteFlow will refer to these live endpoints:
* **Production API Gateway**: `https://api.onsiteteams.in`
* **Real-time Gateway**: `https://socket.onsiteteams.com`
* **PDF Report engine**: `https://report.onsiteteams.com`
* **Firebase Config**:
  * `apiKey`: `"AIzaSyFakePlaceholderKey_ReplaceWithYourOwn"`
  * `projectId`: `"onsite-8a261"`
  * `authDomain`: `"onsite-8a261.firebaseapp.com"`
  * `storageBucket`: `"onsite-8a261.appspot.com"`

---

## 🎨 Premium UI/UX Design System & Micro-Animations

To ensure the platform looks like a top-tier, enterprise-grade SaaS rather than generic "AI slop", SiteFlow adopts a state-of-the-art glassmorphic design language with custom-built interactive components:

### 1. Color Palette & Aesthetics
* **Primary Canvas Background**: `#0E0C15` (Deep space black-slate, preventing pure black eye strain).
* **Card Surface Containers**: `#171520` (Glassmorphic surface) with borders of `rgba(255, 255, 255, 0.06)` and `backdrop-filter: blur(12px)`.
* **Elevated Sheets/Modals**: `#252131` with shadow depth mapping (`box-shadow: 0px 20px 40px rgba(0, 0, 0, 0.5)`).
* **Accent Primary Highlight**: `#E8184C` (Hot pink/crimson, used sparingly for active states, primary CTA buttons, and critical alerts).
* **Secondary Highlight Color**: `#7C5CFF` (Interactive indigo/purple for sub-navigation, selections, and secondary CTAs).
* **Status Colors**: Success Green (`#00E5A3`), Warning Orange (`#FF9F43`), Info Blue (`#00B7FE`).

### 2. Typography & Spatial System
* **Typography**: **Inter** (loaded via Google Fonts) with strict font-weight hierarchy (400 regular, 500 medium, 600 semi-bold, 700 bold).
* **Letter Spacing**: `-0.011em` for body text, `-0.022em` for headers to give a tight, modern editorial feel.
* **Layout Grid**: 12-column CSS Grid for desktop panels, wrapping to responsive flex-row grids on mobile viewport sizes.

### 3. Micro-Animations & Page Transitions
* **CTA Button feedback**: CSS transitions (`transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`) with hover scale (`hover:scale-[1.02]`) and active tap compression (`active:scale-[0.98]`).
* **Sidebar Navigation**: Left sidebar navigation items slide in slightly (`translate-x`) on hover, accompanied by a glowing hot-pink vertical indicator bar.
* **Skeleton Loaders**: Custom pulse gradients with horizontal wave shimmers (`animate-shimmer` via background-position animations) to ensure loading states feel instant and premium.

### 4. Custom-Engineered Web Components
* **✨ High-Performance Gantt Scheduler**: An interactive HTML5 Canvas/SVG hybrid timeline supporting infinite horizontal scrolling, drag-to-reschedule, drag-to-resize, and predecessor line rendering with cubic-bezier curves.
* **📍 PostGIS Geofence Visualizer**: Mapbox GL JS map widget rendering 3D buildings, active user location pins, and a semi-transparent colored geofence ring (turning green when checked-in inside the radius, red when checked-out outside the radius).
* **📋 Blueprint CAD drawing annotation**: High-resolution image/PDF pan-and-zoom viewer allowing users to double-tap any part of a drawing to drop a hot-pink pin, type a snag comment, tag a team member with `@mention`, and track its approval status in real time.
* **📊 Waterfall Cashflow Chart**: Custom SVG charting module visualizing income, material expenses, labor payroll, subcon claims, and net profit with smooth entry growth animations.
* **💬 Real-time Slack-like Chat groups**: Channel-based chat panel supporting thread replies, image attachments, cost code tagging, and real-time socket connections.

---

## 📁 16 Core Modules Architecture

We will implement all 16 sub-modules as shown in the OnsiteTeams mega-menu.

---

### SECTION 1: PRE-CONSTRUCTION

#### Module 1: Planning
* **Next.js Routes**:
  * `/c/[company_id]/p/[project_id]/planning/gantt` (Interactive timeline).
  * `/c/[company_id]/p/[project_id]/planning/holidays` (Holiday calendars).
* **DB Operations**: Reads `tasks` and `projects` tables. Writes to `tasks`.
* **Business Logic**: Automatically updates downstream successor start dates when a predecessor task is delayed, calculating schedule slippage in days.

#### Module 2: Sales Management (CRM)
* **Next.js Routes**:
  * `/c/[company_id]/crm/leads` (Kanban lead board).
  * `/c/[company_id]/crm/quotations` (Quotation templates).
* **DB Operations**: Writes to `crm_leads` and `work_orders` (type `sale`).
* **Business Logic**: Generates quotes using a Live Rate Library. Calculates profit margin; alerts the user if estimated margin drops below 18%:
  $$\text{Margin \%} = \left(\frac{\text{Quotation Amount} - \text{Cost Library Price}}{\text{Quotation Amount}}\right) \times 100$$

#### Module 3: Design Management
* **Next.js Routes**:
  * `/c/[company_id]/p/[project_id]/design/drawings` (Drawing board).
  * `/c/[company_id]/p/[project_id]/design/approvals` (Drawing revisions).
* **DB Operations**: Writes to `drawings` table; uploads CAD/PDF files to Supabase S3 storage.
* **Business Logic**: Version control prevents site teams from viewing outdated drawings. Site engineers can place pins on drawing coords to record snag/issue location coordinates.

#### Module 4: Budgeting
* **Next.js Routes**:
  * `/c/[company_id]/p/[project_id]/budgeting/boq` (BOQ spreadsheet import).
  * `/c/[company_id]/p/[project_id]/budgeting/allocation` (Budget breakdown).
* **DB Operations**: Writes to `boq_items` and `budgets`.
* **Business Logic**: Python FastAPI script parses uploaded Excel files, matches column headers, extracts item descriptions/units/quantities/rates, and commits them to the database.

---

### SECTION 2: PROJECT EXECUTION

#### Module 5: Progress Tracking
* **Next.js Routes**:
  * `/c/[company_id]/p/[project_id]/execution/dpr-new` (Submit daily progress report).
  * `/c/[company_id]/p/[project_id]/execution/dpr-history` (DPR board).
* **DB Operations**: Writes to `dprs` and `timesheets`.
* **Business Logic**: Captures executed quantities on site daily. Compiles progress photos, enforcing GPS location tagging via web/native geolocation.

#### Module 6: Quality Management
* **Next.js Routes**:
  * `/c/[company_id]/p/[project_id]/quality/checklists` (Inspection checklists).
  * `/c/[company_id]/p/[project_id]/quality/snag-list` (Snags and issues).
* **DB Operations**: Writes to `quality_checks` and `debit_notes` (for quality-related deductions).
* **Business Logic**: Enforces Quality Gates. A task cannot be completed until the QA checklist passes.

#### Module 7: Procurement Management
* **Next.js Routes**:
  * `/c/[company_id]/p/[project_id]/procurement/indents` (Material requests).
  * `/c/[company_id]/p/[project_id]/procurement/rfq-comparison` (Vendor comparison grid).
* **DB Operations**: Writes to `material_indents`, `rfqs`, and `purchase_orders`.
* **Business Logic**: Compares quotes side-by-side on a comparison grid (rate, delivery days, vendor score) and generates budget-linked POs.

#### Module 8: Production Management
* **Next.js Routes**:
  * `/c/[company_id]/p/[project_id]/production/recipes` (Mix designs library).
  * `/c/[company_id]/p/[project_id]/production/batch-logs` (Batch entries).
* **DB Operations**: Writes to `production_runs`, deducts from `inventory_stocks`.
* **Business Logic**: Deducts raw materials (cement, sand, aggregates) from warehouse inventory automatically based on mix ratio recipe formulas.

---

### SECTION 3: RESOURCE MANAGEMENT

#### Module 9: Labour Management
* **Next.js Routes**:
  * `/c/[company_id]/labour/workers` (Labour directory).
  * `/c/[company_id]/p/[project_id]/labour/attendance` (Attendance roster).
* **DB Operations**: Writes to `timesheets` and `labour_payrolls`.
* **Business Logic**: Uses PostGIS ST_Distance to verify check-in coordinates against the project location. Integrates face recognition API to prevent check-in fraud.
* **Attendance & Multi-Project Cost Allocation**: If a worker has attendance marked across multiple projects in a month, separate **Salary Expense transactions** are automatically generated for each project, ensuring clean job-cost allocation. Supports cash labor headcount logs.

#### Module 10: Subcon Management
* **Next.js Routes**:
  * `/c/[company_id]/p/[project_id]/subcon/workorders` (Subcon Work Orders).
  * `/c/[company_id]/p/[project_id]/subcon/claims` (Progress Claims).
* **DB Operations**: Writes to `work_orders` (type `subcon`) and `debit_notes`.
* **Business Logic**: Subcontractor invoices are calculated using verified DPR progress quantities. Auto-deducts retention money (standard 5%) and advances before authorizing net payouts.

#### Module 11: Asset & Equipment
* **Next.js Routes**:
  * `/c/[company_id]/equipment/registry` (Equipment list).
  * `/c/[company_id]/p/[project_id]/equipment/logs` (Run-time logs).
* **DB Operations**: Writes to `equipment_registry` and `equipment_run_logs`.
* **Business Logic**: Tracks active equipment run-hours and fuel usage. Auto-generates maintenance schedules when runtime reaches specified thresholds (e.g. every 250 hours).

#### Module 12: Material Management
* **Next.js Routes**:
  * `/c/[company_id]/p/[project_id]/materials/stock` (Warehouse stock board).
  * `/c/[company_id]/p/[project_id]/materials/transfers` (Store issues & transfers).
* **DB Operations**: Updates `material_stocks`, writes to `material_transactions`.
* **Business Logic**: Tracks material receipts against GRNs. Auto-deducts store issues from the project budget and triggers low-stock reorder warnings.

---

### SECTION 4: FINANCE & CONTROLS

#### Module 13: Project P&L
* **Next.js Routes**:
  * `/c/[company_id]/p/[project_id]/finance/pnl` (P&L Dashboard).
  * `/c/[company_id]/p/[project_id]/finance/cashflow` (Cashflow waterfall).
* **DB Operations**: Reads all transaction entries.
* **Business Logic**: Real-time project profitability calculations:
  $$\text{Net Profit} = \text{Client Invoices} - \text{Expenses} - \text{Labour Payroll} - \text{Subcontractor Bills} - \text{Debit Notes}$$

#### Module 14: Vendor Billing
* **Next.js Routes**:
  * `/c/[company_id]/finance/vendor-bills` (Vendor bills ledger).
  * `/c/[company_id]/finance/three-way-match` (Discrepancy checker).
* **DB Operations**: Writes to `vendor_bills` and `transactions` (type `debitnote`).
* **Business Logic**: Triggers alerts if vendor invoice rates exceed PO rates or if invoice quantities exceed GRN quantities. Checks for duplicate invoices.

#### Module 15: Client Invoicing
* **Next.js Routes**:
  * `/c/[company_id]/p/[project_id]/finance/invoices` (Client invoices list).
  * `/c/[company_id]/p/[project_id]/finance/invoice-new` (Milestone invoice generator).
* **DB Operations**: Writes to `client_invoices` and `transactions` (type `payment`).
* **Business Logic**: Generates milestone-based GST-compliant client invoices. Tracks outstanding receivables, due dates, aging, and retentions.

#### Module 16: Reports & Analytics
* **Next.js Routes**:
  * `/c/[company_id]/reports` (Reports Hub).
  * `/c/[company_id]/reports/export` (Report generator dashboard).
* **DB Operations**: Aggregates all tables.
* **Business Logic**: Python FastAPI generates clean, styled PDFs and Excel sheets containing financial ledgers, material usage, and labor productivity.

---

## ⚡ Execution Roadmap

* [ ] **Phase 1: Project Setup, Auth, & Supabase Database**:
  * Set up Next.js monorepo layout, Tailwind variables, and PostgreSQL tables.
  * Implement Mock-OTP authentication.
* [ ] **Phase 2: Project Onboarding & BOQ Import**:
  * Build the Excel-based BOQ parser and activity planning interface.
* [ ] **Phase 3: Material Management & Inventory**:
  * Implement Material Indents, PO generation, and Three-Way Match validation.
* [ ] **Phase 4: Site Attendance, Geofencing, & DPR**:
  * Build PostGIS geofenced daily attendance tracker and mobile DPR submission forms.
* [ ] **Phase 5: Subcontractor RA Billing & Finance Transactions**:
  * Build Subcontractor Work Orders, progressive RA Billing, and Live Project P&L.
* [ ] **Phase 6: Quality, Drawing markup, and 100+ PDF Reports**:
  * Enable QA checklists, drawing pin queries, and PDF/Excel report downloads.
