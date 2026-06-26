# 🌊 SiteFlow — Construction Management Platform

SiteFlow is a world-class, highly secure, and visually stunning Construction Management Platform designed for builders, contractors, architects, infrastructure firms, and interior design companies. 

By replacing scattered Excel sheets, manual paper registers, and WhatsApp threads with a single unified workspace, SiteFlow provides absolute visibility over budgets, progress tracking, procurement, labor attendance, and subcontractor billing.

---

## 🎨 Premium UI/UX & Design Philosophy
SiteFlow features a state-of-the-art **glassmorphic dark-mode canvas** optimized for long hours of office operations:
* **Background Canvas**: `#0E0C15` (Deep space slate-black)
* **Card Containers**: `#171520` with borders of `rgba(255, 255, 255, 0.06)` and `backdrop-filter: blur(12px)`
* **Active Highlight**: `#E8184C` (Hot pink / crimson for active indicators and CTAs)
* **Secondary Highlight**: `#7C5CFF` (Interactive purple for sub-elements and navigation tabs)
* **Typography**: Clean, editorial-style **Inter** font with tight letter spacing for high data readability.

---

## 🚀 System Architecture & Stack
SiteFlow is built as a highly scalable monorepo:
1. **Frontend**: Next.js 14+ (React, TypeScript, Tailwind CSS)
2. **Backend**: FastAPI (Python)
3. **Database**: Supabase (PostgreSQL + PostGIS for geofenced spatial indexing)
4. **Third-Party Integrations**: 
   * **Tally Prime Sync**: Via a lightweight desktop agent posting direct vouchers locally.
   * **Zoho Books**: Direct REST API ledger synchronization.

---

## 📁 Repository Directory Layout
* `context/`: System specifications, mathematical calculators, and database DDL rules.
  * [`implementation_plan.md`](file:///context/implementation_plan.md) — Master DDL schemas, module routes, and execution milestones.
  * [`recon_audit_assurance.md`](file:///context/recon_audit_assurance.md) — Sitemaps, audit checklists, and security protocols.
  * [`deep_recon_report.md`](file:///context/deep_recon_report.md) — Angular bundle mappings and reverse-engineered file patterns.
  * [`verify_calculators.py`](file:///context/verify_calculators.py) — Unit test suite validating all mathematical formulas.
  * [`niche_logic_summary.txt`](file:///context/niche_logic_summary.txt) — Comprehensive scan of competitor business scenarios (GST adjustments, retainage, etc.).
* `onsiteteams-recon/`: Raw competitor bundle resources (Angular source maps, HTML assets, sitemaps, and API schemas).
* `frontend/` *(Upcoming)*: Next.js frontend portal codebase.
* `backend/` *(Upcoming)*: FastAPI backend microservice.

---

## 🧮 14 Embedded Mathematical Calculators (IS 456:2000 Compliant)
SiteFlow implements and verifies all calculators as pure, deterministic functions:
1. **Steel Reinforcement**: Calculates stirrups, slab bar counts, and column lap weights using $W = \frac{D^2}{162.89}$ standard unit weight.
2. **Concrete Volume & nominal mix splits**: Cement, sand, and aggregate requirements for M7.5, M10, M15, M20, and M25 grades (M30+ blocks to engineered mix designs).
3. **Ready Mix Concrete (RMC)**: Calculates transit mixer load count ($6\text{ m}^3$ / $7\text{ m}^3$ sizes).
4. **House Estimator**: Structure, finishing, MEP, interior cost splits with floor multipliers ($+12\%$ per floor) and commercial project adjustments ($+10\%$).
5. **Brick & Mortar**: Calculates brick count, dry mortar volume factor ($1.33$), and cement/sand mix split ratios.
6. **Paint, Putty & Primer**: Total room area, standard window/door deductions, and coverage outputs based on economy, premium, and luxury grades.
7. **Tile & Flooring**: Calculates floor tile counts including grout joint widths ($2\text{mm}$ / $3\text{mm}$) and standard $10\%$ wastage.
8. **Plastering**: Dry volume plaster calculations ($12\text{mm}$, $15\text{mm}$, $20\text{mm}$ thickness) and mix split.
9. **Waterproofing**: Calculated volume requirement based on coat depth and specific surface area coverage.
10. **Sales Invoice Retentions & Deductions**: Enforces pre-tax and post-tax retention calculations, TDS (Section 194C/194J) deductions, and net payable calculations.
11. **Indian Payroll CTC Splits**: Calculates gross salary, Basic, HRA, PF Employee/Employer matches, and ad-hoc salary advance recoveries.
12. **Labor Attendance Shift Multipliers**: Supports $0.25$, $0.50$, $0.75$, $1.00$ shift multipliers and overtime hours.
13. **Split Rate Supply + Installation**: Split tax percentages (e.g. $18\%$ supply tax, $12\%$ installation labor tax) for fit-out projects.
14. **Milestone Claim Billing**: Fixed lumpsum vs. percentage-based claim estimations.

---

## 🔒 Multi-Tenant Data Security & Isolation
SiteFlow is built from the ground up for strict multi-tenant isolation:
* **Direct Company Linkage**: All transactional tables (`purchase_orders`, `material_indents`, `goods_receipt_notes`, `work_orders`, `equipment_registry`, `bills`) carry `company_id` columns with foreign keys referencing `companies(id) ON DELETE CASCADE`.
* **Company-Scoped Unique Keys**: Numbers like PO, GRN, and Indents are unique *only within the company context* (`UNIQUE(company_id, po_number)`), permitting standard sequence numbering (e.g. `PO-001`) to coexist across separate tenants.
* **Client Invoice Integrity**: Unique partial indices are enforced on outgoing client tax invoices to prevent duplicate numbers:
  ```sql
  CREATE UNIQUE INDEX unique_sale_invoice_number_per_company 
  ON bills (company_id, invoice_number) 
  WHERE invoice_type = 'sale';
  ```

---

## ⚡ Setup & Local Running Instructions
*(Follow these steps once monorepo modules are initialized)*

### 1. Environment Configurations
Copy the `.env.example` file to `.env` in the root folder and configure the connection parameters:
```bash
cp .env.example .env
```
Ensure the following variables are specified:
* `DATABASE_URL`: PostgreSQL connection string.
* `SUPABASE_URL`: Supabase project URL endpoint.
* `SUPABASE_ANON_KEY`: Supabase Client Anonymous API key.

### 2. Database Migrations
Deploy the PostgreSQL schema script directly to your Supabase SQL Editor:
```bash
# Run migrations using Supabase CLI
supabase db push
```

### 3. Start Development Servers
```bash
# Start frontend Next.js server
cd frontend
npm install
npm run dev

# Start backend FastAPI server
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```
