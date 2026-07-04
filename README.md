<p align="center">
  <img width="100%" alt="SiteFlow Banner" src="siteflow_banner.png" />
</p>

<p align="center">
  <a href="https://github.com/yieldchaser/Construction-Management-ERP-Software/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT License" /></a>
  <a href="https://construction-management-erp-softwar-ten.vercel.app"><img src="https://img.shields.io/badge/Live_Site-Vercel-success?style=flat-square&logo=vercel" alt="Live Site" /></a>
  <a href="https://construction-erp-backend-73vm.onrender.com"><img src="https://img.shields.io/badge/Live_API-Render-009688?style=flat-square&logo=fastapi&logoColor=white" alt="Live API" /></a>
  <img src="https://img.shields.io/badge/Next.js-15_App_Router-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Works_Contracts-Indian_Tax_Presets-E8184C?style=flat-square" alt="Indian Tax Presets" />
  <img src="https://img.shields.io/badge/IS_456:2000-Concrete_Math-7C5CFF?style=flat-square" alt="IS 456 Concrete Math" />
  <img src="https://img.shields.io/badge/IS_1786-Steel_Weight-blue?style=flat-square" alt="IS 1786 Steel Weight" />
  <img src="https://img.shields.io/badge/Haversine-Geofenced_Attendance-orange?style=flat-square" alt="Geofenced Attendance" />
  <img src="https://img.shields.io/badge/CPWD_Standards-Plaster_&_Brick-059669?style=flat-square" alt="CPWD Standards" />
</p>

<p align="center"><em>SiteFlow is the premium, enterprise-grade Construction Management ERP designed specifically for developers, builders, contractors, and project management consultancies.</em></p>

---

## Overview

SiteFlow is an outcome-driven, high-fidelity ERP workspace tailored to the Indian construction industry. By consolidating scattered Excel sheets, manual site registers, and geofenced field operations into a single real-time glassmorphic canvas, SiteFlow delivers absolute control over engineering BOQ spreadsheets, subcontractor RA billing math, CPWD-compliant material estimation, purchase order workflows, and executive schedule timelines. It integrates directly with Tally Prime and Zoho Books ledger cards to automate back-office reconciliation.

---

## Key Features

### Core Platform
- **📊 Dual-Mode Company Dashboard**: Operational and Financial tabs with live KPI cards, SVG trend charts, expense distribution, and project-level summary tables.
- **🔀 25-Type Chart Switcher**: Every dashboard chart supports instant switching between Bar, Pie, Donut, Line, Smooth Line, Area, Scatter, Heatmap, Table, and more.
- **🚀 Guided Onboarding Wizard**: 2-step stepper modal for project creation — collects project details and assigns team members before go-live.
- **🏢 Multi-Branch Settings**: Company profile, branch management, approval workflow rules, and geofence enforcement toggles.
- **🔒 Multi-Tenant Data Isolation**: Row-level security, company-scoped unique keys, and strict data division between tenants.

### Field Operations
- **📍 Geofenced Mobile PWA Attendance**: GPS punch-in/out with Haversine validation, offline local storage backup, and multi-language support (English, Hinglish, Hindi, Tamil).
- **⏱️ Daily Activity & Timesheet Logger**: Start/stop time tracking, reactive duration calculations, WBS task links, remarks, and file attachments.
- **📋 CRM & Quotations**: Lead management, kanban-style pipeline, client contact registry, and full quotation lifecycle (Draft → Sent → Accepted/Rejected).
- **📅 WBS Gantt Timelines**: Forward-pass Critical Path Method (CPM) scheduler with early/late starts, finishes, total float, and circular dependency protection.
- **📐 Drawings & RFI**: Version-controlled blueprint registry with revision locking, pin-based RFI/Clash/Observation overlay, and approval workflows.
- **📱 Progressive Web App**: Installable shell with offline queue for punches and sync log.

### Finance & Compliance
- **🧮 Subcontractor RA Billing**: Real-time invoice calculators with pre-tax/post-tax deduction priorities, automatic Indian GST and TDS presets (Section 194C, 194Q), and debit/credit note ledgers.
- **💰 Finance & Cashbook**: Payment recording, ledger entries, P&L statements, bank account management, and payment request workflows.
- **📋 Statutory Reports**: PF, ESI, BOCW, TDS, Professional Tax, and Income Tax monthly return filing with contribution tracking and acknowledgment numbers.
- **🧾 Purchase-to-Pay**: Material indents, multi-item purchase orders, goods receipt notes (GRN), inventory tracking, and approval gates.
- **📉 Asset Depreciation**: Straight-line, reducing balance, and written-down-value depreciation schedules with monthly ledger entries.
- **🔗 3-Way Matching**: Automated PO-GRN-Invoice reconciliation with variance detection and approve/reject workflow.
- **♻️ Material Wastage**: Scrap, offcut, damage, expiry, and theft tracking with value estimation, reason logging, and photo attachments.
- **💬 Site Chat & MOM**: Project-level group chat with text, media, voice notes, and Minutes of Meeting (MOM) entries.
- **🧩 Custom Fields Engine**: Dynamic field definitions for projects, tasks, bills, invoices, leads, and vendors.

### HR & Payroll
- **🧑‍💼 Employee Directory**: Site staff and office staff management with designation, department, and mobile tracking.
- **📅 Leave Management**: Leave request, approval/rejection workflows, and leave type configuration.
- **🧾 Payroll Runs**: Monthly payroll processing with Basic, HRA, Allowances, PF (employee + employer), ESI, and TDS calculations.
- **😊 Face Recognition Attendance**: Face verification audit trail with confidence scores, geofence validation, and image logging.

### Quality & Safety
- **✅ Quality Inspections**: IS-code checklist library, site inspections, non-conformance reports (NCR), and material lab test logs.
- **🦺 Safety Management**: Site hazard reporting, PPE audit checklists, and toolbox talk logs.

### Analytics & Reporting
- **📈 Executive Analytics**: Interactive S-curve progress charts and budget burn charts with hover tooltips.
- **📑 Client Progress Reports**: Auto-generated progress reports with approval workflow and PDF download.
- **📊 Production Tracking**: Task-level work quantities, recipe management, batch logging, and inventory alerts.

### Integrations
- **🔗 Tally Prime**: Direct XML sync gateway for voucher push and pull.
- **☁️ Zoho Books**: Client-side REST API configuration for ledger synchronization.
- **📦 Planned Integrations**: WhatsApp Business, Google Drive, QuickBooks.

---

## 🧮 Indian Construction Engineering & Tax Engine

SiteFlow embeds standardized civil engineering codes, CPWD specifications, and Indian statutory tax rules within its calculation core.

### Concrete Mix & Material Estimation (IS 456:2000)
To convert wet concrete volume into raw material quantities, SiteFlow applies a dry volume conversion factor of **1.54** to account for void ratios and mixing shrinkage:

$$\text{Dry Volume} = \text{Wet Volume} \times 1.54$$

Quantification breaks down cement, sand, and coarse aggregates using CPWD-compliant mix ratios:
* **M5 (1:5:10)** | **M7.5 (1:4:8)** | **M10 (1:3:6)** | **M15 (1:2:4)** | **M20 (1:1.5:3)** | **M25 (1:1:2)**

$$\text{Cement (bags)} = \frac{\text{Dry Volume} \times \text{Cement Ratio}}{\text{Sum of Mix Ratios} \times 0.0347 \text{ m}^3\text{/bag}}$$
$$\text{Sand Volume } (m^3) = \frac{\text{Dry Volume} \times \text{Sand Ratio}}{\text{Sum of Mix Ratios}}$$
$$\text{Coarse Aggregate Volume } (m^3) = \frac{\text{Dry Volume} \times \text{Coarse Aggregate Ratio}}{\text{Sum of Mix Ratios}}$$

### TMT Rebar Weight Calculations (IS 1786)
Reinforcement steel rebar weight is calculated using standard nominal diameters according to the Indian Standard unit weight formula:

$$w = \frac{d^2}{162.2} \text{ kg/m}$$

*Where $d$ is the rebar diameter in millimeters.*

Total reinforcement requirements (incorporating lap length and waste multipliers) are calculated as:

$$W_{\text{total}} = \sum \left( L_i \times N_i \times \frac{d_i^2}{162.2} \right) \times (1 + \text{Wastage Pct})$$

### Subcontractor Billing Tax Deduction Engine
SiteFlow computes subcontractor Running Account (RA) bills according to two distinct prioritization structures depending on contract terms:

```mermaid
flowchart TD
    Start[Subcontractor Submits Bill] --> Input[Input Base Subtotal]
    Choice{Pre-Tax Deductions?}
    Input --> Choice
    
    Choice -- Yes (Pre-Tax) --> PreTDS[Deduct TDS 1% / 2%]
    PreTDS --> PreRet[Deduct Retention %]
    PreRet --> PreAdv[Recover Advances / Material Notes]
    PreAdv --> PreTaxable[Calculate Taxable Base]
    PreTaxable --> PreGST[Apply GST 18% / 12% / 5%]
    PreGST --> NetPayablePre[Calculate Net Payable]
    
    Choice -- No (Post-Tax / Default) --> PostGST[Apply GST on Subtotal]
    PostGST --> PostGross[Gross Post-GST Value]
    PostGross --> PostTDS[Deduct TDS on Base Subtotal]
    PostGross --> PostRet[Deduct Retention on Gross Value]
    PostTDS & PostRet --> PostAdv[Recover Advances / Material Notes]
    PostAdv --> NetPayablePost[Calculate Net Payable]

    classDef action fill:#7C5CFF,stroke:#333,color:#fff;
    classDef choice fill:#E8184C,stroke:#333,color:#fff;
    classDef output fill:#059669,stroke:#333,color:#fff;
    
    class Start,Input,PreTDS,PreRet,PreAdv,PreTaxable,PreGST,PostGST,PostGross,PostTDS,PostRet,PostAdv action;
    class Choice choice;
    class NetPayablePre,NetPayablePost output;
```

#### Pre-Tax Deductions (TDS & Retention on Base)
TDS and security retentions are subtracted *before* applying GST (applicable when subcontractor materials are offset):
1. **TDS Withholding**: $\text{TDS} = S \times \text{TDS Pct}$ (e.g. Section 194C 1% or 2%).
2. **Retention Money**: $\text{Retention} = S \times \text{Retention Pct}$.
3. **Net Taxable Base**: $TB = S - \text{TDS} - \text{Retention} - A$ (where $A$ is the advance recovery).
4. **GST Amount**: $\text{GST} = TB \times \text{GST Pct}$ (Works Contract 18%).
5. **Net Payable**: $\text{Net Payable} = TB + \text{GST}$.

#### Post-Tax Deductions (Standard Works Contract)
GST is applied directly to the base subtotal, and deductions are subtracted from the gross total:
1. **GST Amount**: $\text{GST} = S \times \text{GST Pct}$.
2. **Gross Bill Total**: $G = S + \text{GST}$.
3. **TDS Withholding**: $\text{TDS} = S \times \text{TDS Pct}$.
4. **Retention Money**: $\text{Retention} = G \times \text{Retention Pct}$.
5. **Net Payable**: $\text{Net Payable} = G - \text{TDS} - \text{Retention} - A$.

### Planning & Scheduling Critical Path Method (CPM)
Task timelines calculate network floats to isolate schedule risks:
* **Early Finish (EF):** $\text{EF} = \text{Early Start (ES)} + \text{Duration}$
* **Late Start (LS):** $\text{LS} = \text{Late Finish (LF)} - \text{Duration}$
* **Total Float (TF):** $\text{TF} = \text{LF} - \text{EF} = \text{LS} - \text{ES}$

*Tasks with $\text{Total Float} = 0$ represent the Critical Path; any delay to these tasks directly impacts the project completion date.*

### Brick & Block Masonry Quantity Estimator (CPWD)
* **Modular brick size**: $190 \times 90 \times 90\text{ mm}$ (Nominal size with mortar: $200 \times 100 \times 100\text{ mm}$).
* **Standard brick constant**: $500\text{ bricks per } m^3$ of masonry wall.
* **Dry Mortar volume factor**: $1.33$ (shrinkage & joint waste multiplier).
* **Mortar wet volume fraction**: Typically $30\%$ of total wall masonry volume.

$$\text{Total Brick Count } (N) = \text{Wall Length} \times \text{Wall Height} \times \text{Wall Thickness} \times 500$$
$$V_{\text{dry}} = (\text{Wall Length} \times \text{Wall Height} \times \text{Wall Thickness}) \times 0.30 \times 1.33$$
$$\text{Cement (bags)} = \frac{V_{\text{dry}} \times \text{Cement Ratio}}{\text{Sum of Mix Ratios} \times 0.0347}$$
$$\text{Sand Volume } (m^3) = \frac{V_{\text{dry}} \times \text{Sand Ratio}}{\text{Sum of Mix Ratios}}$$

### Paint & Wall Coverage Quantification
$$\text{Paint Volume (liters)} = \frac{\text{Wall Surface Area} \times \text{Number of Coats}}{\text{Single Coat Coverage Rate} \times \text{Absorption Factor}}$$

### Geofenced Site Labor Shift & Attendance Payroll Math
* **Haversine Distance**: $d \le R_{\text{geofence}}$ is verified.
* **Shift Multipliers**: Standard shift fractions ($0.25, 0.50, 0.75, 1.00, 1.25$ shifts).

$$\text{Daily Labor Compensation} = (\text{Daily Wage} \times \text{Shift Multiplier}) + (\text{Overtime Hours} \times \text{Hourly OT Rate}) + \text{Allowances} - \text{Deductions}$$

### Heavy Equipment Fuel Consumption & Utilization Math
$$R_{\text{fuel}} = \frac{\text{Fuel Consumed (liters)}}{\text{Final Run Hours} - \text{Initial Run Hours}}$$
$$\text{Utilization Pct} = \frac{\text{Working Hours}}{\text{Total Available Shift Hours}} \times 100$$

### Compressive Cube Strength Compliance (IS 516 / IS 456)
$$f_c = \frac{\text{Peak Failure Load (N)}}{\text{Cube Area } (150 \times 150 \text{ mm}^2)} = \frac{P}{22500}$$
* **7-Day Compliance Check**: Compressive strength $f_c \ge 0.65 \times f_{ck}$.
* **28-Day Compliance Check**: Compressive strength $f_c \ge 1.00 \times f_{ck}$.

---

## 🎨 Premium UI/UX & Design Philosophy

SiteFlow features a state-of-the-art **glassmorphic canvas** with full support for light and dark modes:
* **Dark Theme Specs**:
  - **Background Canvas**: `#0E0C15` (Deep space slate-black)
  - **Card Containers**: `#171520` with borders of `rgba(255, 255, 255, 0.06)` and `backdrop-filter: blur(12px)`
  - **Active Highlights**: `#E8184C` (Hot pink / crimson for active indicators and CTAs)
  - **Secondary Highlights**: `#7C5CFF` (Interactive purple for sub-elements and navigation tabs)
* **Light Theme Specs**:
  - **Background Canvas**: `#F8F9FD` (Off-white porcelain slate)
  - **Card Containers**: `#FFFFFF` with borders of `rgba(15, 23, 42, 0.08)`
  - **Sidebar Navigation**: `#F1F4FA` (Light gray-blue)
* **Styled WebKit Scrollbars**: Replaces raw browser sliders with a custom `6px` rounded scrollbar thumb. The thumb automatically transitions between semi-transparent white (`rgba(255, 255, 255, 0.1)`) and slate (`rgba(15, 23, 42, 0.12)`) based on active themes to guarantee high visual elegance.
* **Typography**: Clean, editorial-style **Inter** font with tight letter spacing for high data readability.

---

## 📂 Project Directory Structure

* [context/](file:///C:/Users/Dell/Github/Construction-Management-ERP-Software/context/) — Session context, roadmap history, audits, calculators, and reverse-engineering notes.
* [onsiteteams-recon/](file:///C:/Users/Dell/Github/Construction-Management-ERP-Software/onsiteteams-recon/) — Raw competitor bundle resources, HTML assets, sitemaps, and API schemas.
* [frontend/](file:///C:/Users/Dell/Github/Construction-Management-ERP-Software/frontend/) — Next.js app-router frontend, including dashboard, project modules, analytics, and PWA shell assets.
* [backend/](file:///C:/Users/Dell/Github/Construction-Management-ERP-Software/backend/) — FastAPI backend with routers for auth, calculators, planning, procurement, billing, HR, quality, reports, equipment, safety, analytics, production, assets, three-way matching, wastage, chat, custom fields, statutory, and face recognition.

---

## 📋 Module Reference

### 1. Company Dashboard (`/c/[company_id]/dashboard`)
- **Operational Tab**: Project health breakdown, 7-day attendance sparkline, 7-day GRN sparkline, project operational summary table. All charts support 25-type switching.
- **Financial Tab**: KPI cards (advances, payables, receivables), SVG revenue/expense/margin trends, expense distribution, project financial summary, and engineering calculators.

### 2. Executive Analytics (`/c/[company_id]/analytics`)
- Interactive S-curve progress chart with glassmorphic tooltips.
- Budget burn chart with cumulative spend visualization.
- Project scoreboard with budget vs. actual comparison.

### 3. Project Modules (`/c/[company_id]/p/[project_id]/`)
- **Attendance & Payroll (`/attendance`)**: GPS geofenced punch-in/out, Haversine validation, offline backup, multi-language support, shift multipliers, overtime calculations.
- **Subcontractor Billing (`/billing`)**: Real-time RA bill calculator, pre-tax/post-tax deduction modes, Indian GST/TDS presets, debit/credit notes ledger, work order amendment version control, tower-wise P&L breakdown.
- **Towers & Phases (`/towers`)**: Multi-tower/project-phase management with individual budgets, status tracking, and consolidated P&L per tower/phase for developer clients.
- **Subcontractor Performance (`/subcon/scorecards`)**: Performance scorecards with on-time delivery %, billing accuracy %, quality score, and cross-subcontractor comparative analysis.
- **CRM (`/crm`)**: Lead pipeline, client registry, quotation creation and lifecycle management.
- **Planning & Gantt (`/planning/gantt`)**: Interactive WBS timeline, CPM scheduling, task float calculations.
- **DPR (`/dpr`)**: Daily progress reports, delay tracking, photo attachments.
- **Drawings (`/drawings`)**: Version-controlled blueprints, revision history, RFI/Clash/Observation pin overlay, approval workflows.
- **Equipment (`/equipment`)**: Fuel logs, run hours, deployment tracking.
- **Finance (`/finance`)**: Payment recording, ledger, P&L, bank accounts, payment requests, Tally sync.
- **HR (`/hr`)**: Employee directory, leave management, monthly payroll, timesheets, face recognition attendance.
- **Procurement (`/procurement`)**: Material indents, purchase orders, GRNs, inventory, unbilled material tracking, duplicate PO detection, vendor performance database, RFQ multi-vendor comparison with side-by-side rate/timeline view.
- **Production (`/production`)**: Work quantity tracking, recipe management, batch logging, inventory alerts.
- **Quality (`/quality`)**: IS-code checklists, inspections, NCRs, lab test logs.
- **Reports (`/reports`)**: Progress report generation, approval workflow, PDF download.
- **Safety (`/safety`)**: Hazard reporting, PPE audits, toolbox talks.
- **Asset Depreciation (`/depreciation`)**: Multiple depreciation methods, monthly ledger entries.
- **3-Way Matching (`/three-way`)**: PO-GRN-Invoice reconciliation, variance detection, approval workflow.
- **Material Wastage (`/wastage`)**: Scrap tracking, value estimation, status progression.
- **Chat & MOM (`/chat`)**: Project chat groups, text/media/voice notes, Minutes of Meeting.
- **Custom Fields (`/custom-fields`)**: Dynamic field definitions across entities.
- **Statutory Reports (`/statutory`)**: PF, ESI, BOCW, TDS compliance filing.
- **Face Recognition (`/face-recognition`)**: Face verification audit trail with confidence scores.
- **Labour (`/labour`)**: Contractor reliability scoring, BOCW compliance export, digital muster roll.
- **Budget (`/budget`)**: Committed cost tracking showing POs raised, work orders issued, and actual invoices side-by-side with budgeted amounts. Multi-tower/phase budget breakdown with consolidated P&L.

### 4. Company Settings (`/c/[company_id]/settings`)
- **General Settings**: Company profile, contact info, GSTIN validation, currency and quantity decimal precision.
- **Branch Management**: Multi-branch configuration with individual addresses and contacts.
- **Restrictions & Controls**: Employee self-edit, geofence enforcement, back-dated entry limits, negative stock lock, BOM/PO restrictions.
- **Approval Workflows**: Configurable approval rules for POs, material requests, expenses, RA bills, client invoices, debit/credit notes, and timesheets.

### 5. Onboarding Wizard
- 2-step guided stepper for first-time project creation.
- **Step 1**: Project details (name, code, city, address, geofence radius).
- **Step 2**: Team member assignment before project goes live.

### 6. Integrations Hub (`/integrations`)
- Interactive search and category filtering (Accounting, Communication, Storage, Analytics, Field & Site).
- Active configuration panel for **Tally ERP**.
- Request forms for planned integrations: WhatsApp Business, Zoho Books, QuickBooks, Google Drive.

---

## 🏗 System Architecture & Data Flow

SiteFlow maps jobsite inputs (materials, attendance, progress photos) directly to core calculation engines and accounting records:

```mermaid
graph TD
    subgraph Jobsite ["Jobsite (Mobile PWA)"]
        A1[GPS Geofenced Punch-in] --> B1[Local DB Backup / Sync]
        A2[Daily Progress Photos] --> B1
        A3[Material Receipts / GRN] --> B1
    end

    subgraph CoreEngine ["SiteFlow Core Engine (Backend FastAPI)"]
        B1 -- REST API HTTPS --> C1[API Router Gateway]
        C1 --> C2[Math Engine / IS 456]
        C1 --> C3[Deduction & Tax Engine]
        C1 --> C4[PostGIS Geofence Validator]
        C1 --> C5[Analytics & Financial Engine]
    end

    subgraph DataStore ["Data Store (Supabase PostgreSQL)"]
        C2 --> D1[(Company & Project Tables)]
        C3 --> D1
        C4 --> D2[(Geofenced Coordinates)]
        C5 --> D3[(Bills & Financial Records)]
    end

    subgraph ERP ["ERP Integration & Analytics"]
        D1 --> E1[Tally Prime Desktop Sync]
        D1 --> E2[Zoho Books Sync]
        D3 --> E3[Executive Analytics Dashboard]
        D3 --> E4[Financial KPI Dashboard]
    end

    classDef site fill:#E8184C,stroke:#333,stroke-width:2px,color:#fff;
    classDef core fill:#7C5CFF,stroke:#333,stroke-width:2px,color:#fff;
    classDef db fill:#171520,stroke:#555,stroke-width:2px,color:#fff;
    classDef integrations fill:#0B0910,stroke:#E8184C,stroke-width:1px,color:#ededed;
    
    class A1,A2,A3,B1 site;
    class C1,C2,C3,C4,C5 core;
    class D1,D2,D3 db;
    class E1,E2,E3,E4 integrations;
```

---

## 🔒 Multi-Tenant Data Security & Isolation

SiteFlow is built from the ground up for strict multi-tenant isolation:
* **Direct Company Linkage**: All transactional tables carry `company_id` columns with foreign keys referencing `companies(id) ON DELETE CASCADE`.
* **Company-Scoped Unique Keys**: Numbers like PO, GRN, and Indents are unique *only within the company context* (`UNIQUE(company_id, po_number)`), permitting standard sequence numbering (e.g. `PO-001`) to coexist across separate tenants.
* **Client Invoice Integrity**: Unique partial indices are enforced on outgoing client tax invoices to prevent duplicate numbers:
  ```sql
  CREATE UNIQUE INDEX unique_sale_invoice_number_per_company 
  ON bills (company_id, invoice_number) 
  WHERE invoice_type = 'sale';
  ```

---

## 🚀 Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS |
| **Backend** | FastAPI (Python 3.12), SQLAlchemy 2.0, Pydantic v2 |
| **Database** | Supabase PostgreSQL (production), SQLite (local dev) |
| **Deployment** | Vercel (frontend), Render (backend) |
| **PWA** | Service Worker, offline queue, geolocation API |
| **Charts** | Pure SVG (no external charting library) |
| **Authentication** | JWT-based with company-scoped tokens |

---

## 📡 API Reference

The backend exposes a versioned REST API under `/apis/v3/`. Key endpoint groups:

| Module | Base Path |
|--------|-----------|
| **Planning & Gantt** | `/apis/v3/planning/*` |
| **Procurement** | `/apis/v3/procurement/indents`, `/pos`, `/grns`, `/inventory` |
| **Billing** | `/apis/v3/billing/work-orders`, `/bills`, `/bills/summary` |
| **HR** | `/apis/v3/hr/employees`, `/attendance`, `/leaves`, `/timesheets`, `/payroll` |
| **Finance** | `/apis/v3/finance/payments`, `/approve/{id}`, `/ledger`, `/pl` |
| **Quality** | `/apis/v3/quality/checklists`, `/inspections`, `/ncr`, `/material-tests` |
| **Reports** | `/apis/v3/reports/{project_id}`, `/generate/{project_id}`, `/approve` |
| **Drawings** | `/apis/v3/drawings`, `/revisions`, `/pins` |
| **Equipment** | `/apis/v3/equipment` |
| **Safety** | `/apis/v3/safety/*` |
| **Analytics** | `/apis/v3/analytics/company/{id}/operational`, `/financial` |
| **Tally Sync** | `/apis/v3/tally/sync`, `/connections` |
| **Settings** | `/apis/v3/settings/company/{id}` |

Full OpenAPI schema available at: `https://construction-erp-backend-73vm.onrender.com/openapi.json`

---

## 🙋 Frequently Asked Questions (FAQ)

**Q: Which Indian standard codes are embedded in the calculation core?**
SiteFlow integrates **IS 456:2000** for concrete grade material quantification and **IS 1786** for reinforcement rebar unit weight calculations. For concrete testing compliance, compressive checks are performed against **IS 516** limits.

**Q: How does the system compute Works Contract GST and TDS deductions?**
Auditors can switch between pre-tax and post-tax deduction priorities inside the RA bill creator. Preset buttons apply GST rules (18% for Work Contracts, 12% for Infrastructure, 5% for Housing) and TDS parameters (1% Section 194C Individual, 2% Section 194C Corporate, 0.1% Section 194Q for purchases of goods).

**Q: How is attendance geofenced and verified for offsite workers?**
Attendance logs are validated using the Haversine formula to compute the distance between the mobile device's GPS coordinates and the pre-configured project center coordinate. Punch-ins exceeding the geofence radius are flagged as offsite. Offline local storage caching allows site labor to punch in even during network dropouts, syncing once connectivity is restored.

**Q: What accounting systems can SiteFlow sync with?**
Out-of-the-box integrations exist for **Tally Prime** (via local XML sync gateway) and **Zoho Books** (via client-side REST API configurations).

**Q: How does the Financial Dashboard get its data?**
The `/apis/v3/analytics/company/{id}/financial` endpoint aggregates from the Bills ledger using `invoice_type` — `sale` for revenue, `purchase` for costs, `subcon` for subcontractor expenses — giving real-time KPIs, monthly trends, and per-project breakdowns without any manual entry.

**Q: How does the chart type switcher work?**
Each chart card in the dashboard has a floating **5×5 chart type picker** (25 options). Clicking the bar-chart icon opens the grid; selecting any type (Pie, Donut, Line, Area, Scatter, Stacked Bar, Table, etc.) instantly re-renders the chart using pure SVG — no external charting library required. The picker closes automatically on outside click.
