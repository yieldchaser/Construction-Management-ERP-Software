# SiteFlow Application Workflow Execution Log

Generated: 2026-08-30T18:33:35.430851+00:00

This log records the verified execution of end-to-end user workflows against the FastAPI backend, asserting precondition failures, required-field validation rejections (HTTP 422), successful record creations (HTTP 200/201), and status transitions.

## Summary Table

| # | Workflow | Step | Method & Endpoint | Status | Expected | Result | Notes |
|---|---|---|---|---|---|---|---|
| 1 | 1.1 Project Creation | Omit Required Fields | `POST /apis/v3/projects/` | `422` | `422` | **PASS** | Correctly rejected missing name, code, start_date, state |
| 2 | 1.1 Project Creation | Valid Creation | `POST /apis/v3/projects/` | `200` | `200` | **PASS** | Project created with id 36474026-0324-4bae-99dd-08076d3dac30 |
| 3 | 1.2 Task Scheduling | Omit Required Fields | `POST /apis/v3/planning/tasks` | `422` | `422` | **PASS** | Correctly rejected missing name, duration_days, start_date |
| 4 | 1.2 Task Scheduling | Valid Creation | `POST /apis/v3/planning/tasks` | `201` | `201` | **PASS** | Task created with id 8fdeb3a1-e3de-4ec0-8675-2faa259145eb |
| 5 | 1.3 Daily Progress Report | Omit Required Fields | `POST /apis/v3/dpr` | `422` | `422` | **PASS** | Correctly rejected missing dpr_date, executed_qty |
| 6 | 1.3 Daily Progress Report | Valid Creation | `POST /apis/v3/dpr` | `201` | `201` | **PASS** | DPR logged with id 7ce22528-6e3d-4c3d-80d1-0a4c3b5dbb5d |
| 7 | 1.4 Project Budgeting | Invalid Project Precondition | `POST /apis/v3/budgeting/allocation` | `404` | `404` | **PASS** | Correctly rejected non-existent project id |
| 8 | 1.4 Project Budgeting | Valid Allocation | `POST /apis/v3/budgeting/allocation` | `200` | `200` | **PASS** | Allocated 11,000,000 INR project budget |
| 9 | 2.1 Vendor Registration | Omit Required Fields | `POST /apis/v3/library/parties` | `422` | `422` | **PASS** | Correctly rejected missing name, party_type |
| 10 | 2.1 Vendor Registration | Valid Creation | `POST /apis/v3/library/parties` | `200` | `200` | **PASS** | Vendor party created with id 6430d53e-9ab9-40b3-a240-36229f4395e0 |
| 11 | 2.2 Material Indent | Omit Required Fields | `POST /apis/v3/procurement/indents` | `422` | `422` | **PASS** | Correctly rejected missing indent_number, items |
| 12 | 2.2 Material Indent | Valid Creation | `POST /apis/v3/procurement/indents` | `201` | `201` | **PASS** | Material indent created with id 8bd0469c-f2ef-4e41-8ccc-7065f38f31a7 |
| 13 | 2.3 Purchase Order | Omit Required Fields | `POST /apis/v3/procurement/pos` | `422` | `422` | **PASS** | Correctly rejected missing po_number, po_date, vendor_id, items |
| 14 | 2.3 Purchase Order | Valid Creation | `POST /apis/v3/procurement/pos` | `201` | `201` | **PASS** | Purchase order created with id 8cc2eebc-baae-4819-b717-784c05379ad0 |
| 15 | 2.3 Purchase Order | Approve PO | `POST /apis/v3/procurement/pos/8cc2eebc-baae-4819-b717-784c05379ad0/approve` | `200` | `200` | **PASS** | Approved PO for goods receipt |
| 16 | 2.4 Goods Receipt Note | Valid Creation | `POST /apis/v3/procurement/grns` | `201` | `201` | **PASS** | GRN received with id 44c9a3fa-d14d-4af8-9f0b-d683b1f60ce2 |
| 17 | 3.1 Cost Code Master | Valid Creation | `POST /apis/v3/library/cost-codes` | `200` | `200` | **PASS** | Cost code added to company library |
| 18 | 3.2 Bank Account Setup | Valid Creation | `POST /apis/v3/finance/accounts/7a337f59-d6b8-41c3-b3d1-4afa1a4e0304` | `200` | `200` | **PASS** | Bank account created with id af6f0fc5-de43-4c2f-8029-059236839b30 |
| 19 | 3.3 Vendor Bill Processing | Omit Required Fields | `POST /apis/v3/billing/bills` | `422` | `422` | **PASS** | Correctly rejected missing invoice_number, subtotal, party |
| 20 | 3.3 Vendor Bill Processing | Valid Creation | `POST /apis/v3/billing/bills` | `201` | `201` | **PASS** | Bill created in Pending status with id b91c1120-7267-4f9e-8342-4f5f57ba343a |
| 21 | 3.4 Payment Voucher | Valid Creation | `POST /apis/v3/finance/payments` | `201` | `201` | **PASS** | Payment voucher posted with id dbb1f643-2f18-4942-a199-67c16c2b89ef |
| 22 | 4.1 Employee Directory | Valid Creation | `POST /apis/v3/hr/employees` | `201` | `201` | **PASS** | Staff employee created with id db8e464e-f202-4e13-9a11-c59b59faf7ad |
| 23 | 4.2 Quality Inspection | Valid Creation | `POST /apis/v3/quality/inspections` | `201` | `201` | **PASS** | Quality inspection checklist logged |
| 24 | 4.3 Safety Incidents | Valid Creation | `POST /apis/v3/safety/incidents` | `200` | `200` | **PASS** | Safety observation recorded |
| 25 | 5.1 Equipment Asset | Valid Creation | `POST /apis/v3/equipment` | `201` | `201` | **PASS** | Equipment registered with id 2b2d3ada-3b71-4bce-aa37-0aa30670d0b1 |
| 26 | 5.2 Equipment Deployment | Valid Deployment | `POST /apis/v3/equipment/2b2d3ada-3b71-4bce-aa37-0aa30670d0b1/deploy` | `201` | `201` | **PASS** | Equipment deployed to project |
| 27 | 5.3 Equipment Fuel Log | Valid Logging | `POST /apis/v3/equipment/2b2d3ada-3b71-4bce-aa37-0aa30670d0b1/fuel` | `201` | `201` | **PASS** | Fuel consumption logged (85L @ 94 INR/L) |
| 28 | 5.4 Production Recipe | Valid Creation | `POST /apis/v3/production/recipes` | `201` | `201` | **PASS** | Production batch recipe saved |
| 29 | 6.1 CRM Lead Capture | Valid Creation | `POST /apis/v3/crm/leads` | `201` | `201` | **PASS** | CRM Lead created with id 93423a27-7a56-42fe-8ed5-c32f9900ed98 |
| 30 | 6.2 CRM Quotation | Valid Creation | `POST /apis/v3/crm/leads/93423a27-7a56-42fe-8ed5-c32f9900ed98/quotations` | `201` | `201` | **PASS** | Client quotation generated |
| 31 | 6.3 Rate Card Preset | Valid Creation | `POST /apis/v3/library/rates` | `200` | `200` | **PASS** | Standard rate preset registered |
| 32 | 7.1 Standard Reports Hub | Execute Report | `GET /apis/v3/reports/data/cost-code-expense-analysis` | `200` | `200` | **PASS** | Dynamic report aggregation returned rows |

### Execution Stats: **32 Passed**, **0 Failed** (Total Steps: 32)
