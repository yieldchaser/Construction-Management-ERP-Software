-- SiteFlow Core PostgreSQL Database Schema (Supabase DDL)
-- Enable PostGIS & UUID extensions
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
