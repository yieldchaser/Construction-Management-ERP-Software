# SiteFlow Console Help Content Audit

This audit evaluates all 35 existing entries in `frontend/src/app/c/[company_id]/d/help/helpContent.tsx` against the application ground truth established in `docs/WORKFLOW_TRUTH_MAP.md`.

---

## Audit Summary Table

| # | Category | Question | Verdict | Defect Summary & Required Fix |
|---|---|---|---|---|
| 1 | Getting Started | How do I create a company? | VAGUE | Missing required onboarding fields (Legal Name, Phone, City, GSTIN) and initial owner setup. |
| 2 | Getting Started | How do I create a project? | INACCURATE | Missing exact verbatim quotes (`"Projects"`, `"+ New Project"`), required fields (Name, Code, Start Date). |
| 3 | Getting Started | How do I add team members? | VAGUE | Missing exact navigation path (`Settings` -> `Team` -> `"+ Add Member"`), required fields, and role selection. |
| 4 | Getting Started | How do roles and permissions work? | OUTDATED | Does not explain standard roles (Owner, Admin, Manager, Member, Viewer) across 7 sidebar domain groups. |
| 5 | Projects | How do I import a BOQ? | VAGUE | Lacks project selection precondition and required column mappings (Description, Unit, Quantity, Rate). |
| 6 | Projects | How do I set up a budget and cost codes? | INACCURATE | Links to old `/cost-codes` path instead of Library and Financial Control Budgeting. |
| 7 | Projects | How do I plan tasks and view the Gantt chart? | VAGUE | Lacks exact UI navigation (`"Planning & Progress"` -> `"Tasks & Gantt"`), task fields, and dependency dragging. |
| 8 | Projects | What are milestones, baseline and lookahead? | OUTDATED | Links to `/d/team-action` instead of project lookahead scheduling. |
| 9 | Projects | How do I record a Daily Progress Report (DPR)? | INACCURATE | Omits required fields (Report Date, Executed Qty, Workers, Weather) and status progression. |
| 10 | Procurement | How does indent to PO to GRN to three-way match work? | VAGUE | Lacks explicit step-by-step navigation and status transitions for each stage in the chain. |
| 11 | Procurement | How do I create a purchase order? | INACCURATE | Omits vendor party selection, GST calculation, and committed budget impact. |
| 12 | Procurement | How do I run a Request for Quotation (RFQ)? | VAGUE | Missing exact navigation (`"Procurement & Materials"` -> `"Vendors & RFQs"`) and vendor comparison workflow. |
| 13 | Procurement | How do I manage inventory and warehouse? | OUTDATED | Links to old `/materials` route instead of current Procurement & Materials Inventory. |
| 14 | Billing & Finance | How do I record a vendor bill? | INACCURATE | Omits required bill fields (Vendor, Invoice No., Subtotal, GST), PO/GRN linkage, and TDS sections. |
| 15 | Billing & Finance | How do subcontractor work orders and RA bills work? | OUTDATED | Links to `/d/subcon/work-orders` instead of current domain routes. |
| 16 | Billing & Finance | How do I make a payment or raise a payment request? | VAGUE | Fails to distinguish direct payments from multi-level payment request approvals. |
| 17 | Billing & Finance | What is the cashbook? | VAGUE | Does not explain bank accounts, petty cash ledgers, or payment method allocations. |
| 18 | Billing & Finance | How do multi-level approvals work? | OUTDATED | Does not clearly document that approval rules are non-enforcing in current schema. |
| 19 | Billing & Finance | How do I see a project profit and loss? | VAGUE | Points to generic `/reports` instead of specific reports like `monthly-pl` and `project-financial-summary`. |
| 20 | HR & Payroll | How do I add employees? | INACCURATE | Missing salary breakdowns (Basic, HRA, Allowances, TDS) and employee designation. |
| 21 | HR & Payroll | How does site attendance and geofencing work? | VAGUE | Missing GPS geofence radius check and Face Recognition punch process. |
| 22 | HR & Payroll | How do timesheets and labour records work? | VAGUE | Missing contractor muster roll and shift logging specifics. |
| 23 | HR & Payroll | How do I run payroll and export payslips? | VAGUE | Missing month picker, gross/net calculation, bank CSV export, and PDF payslips. |
| 24 | HR & Payroll | How do leave templates and balances work? | REDUNDANT | Overly brief; needs actionable leave application and balance tracking steps. |
| 25 | Subcontractors | How do I register a subcontractor? | VAGUE | Missing party registration in Library and bank account association. |
| 26 | Subcontractors | How do I create work orders and track attendance? | OUTDATED | Links to deprecated subcon paths. |
| 27 | Subcontractors | How do subcontractor scorecards work? | OUTDATED | Links to deprecated scorecards path. |
| 28 | Integrations | How do I connect Tally? | VAGUE | Missing voucher XML export instructions from Finance and ledger mapping. |
| 29 | Integrations | How do I connect Zoho Books? | VAGUE | Missing organization ID setup and transaction push instructions. |
| 30 | Integrations | How do Google Drive backup & Sheets export work? | VAGUE | Missing OAuth authorization steps and sheet ID configuration. |
| 31 | Integrations | How do I pull BI feeds with an API key? | VAGUE | Missing API token generation in Settings and Bearer authorization usage. |
| 32 | Operations | How do I log quality checks? | INACCURATE | Missing checklist template selection, checkpoint pass/fail, and NCR creation. |
| 33 | Operations | How do I manage safety? | VAGUE | Missing incident severity classifications (Near Miss to Critical) and permit to work fields. |
| 34 | Operations | How do I track equipment? | VAGUE | Missing asset registration, site deployment, and fuel log logging. |
| 35 | Operations | How do I manage production and services? | OUTDATED | References dead services module. Needs recipe and batch tracking details. |

---

## Key Correction Plan
1. Completely rewrite all 35 console entries to adhere strictly to the 5-point bar:
   - Preconditions
   - Exact quoted navigation (`"Group"` -> `"Submenu"` -> `"+ Action"`)
   - Required vs optional fields with exact UI labels
   - Save result (API call, status transition, toast)
   - Next step in chain
2. Eliminate all em dashes (`—` and `–`), replacing them with commas or periods.
3. Remove all emoji from help copy.
4. Update `text` search blobs with rich keywords, action verbs, and error guidance.
