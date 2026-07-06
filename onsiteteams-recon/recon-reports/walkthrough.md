# Competitor Parity Implementations & Verification Walkthrough

We have successfully addressed all feature gaps identified in the competitor parity check for **Onsite Teams** and **SiteFlow**, completing both backend logic and beautiful frontend integrations.

## Summary of Changes

### 1. Database & Models
- Added `Payment` fields to support double-sided transactions (`source_ref_id` linking related transactions, e.g. for P2P transfers).
- Added `StaffEmployee` fields (`tds_monthly`, `gross_salary`, `fixed_allowance`) for detailed monthly salary calculations.
- Added `mix_type` column to `ProductionRecipe` to enable dynamic concrete and dry material recipe categorization.

### 2. Backend API
- **P2P Wallet Transfers** (`/apis/v3/cashbook/p2p` and `/apis/v3/finance/cashbook/p2p`): Logs a paired payment (debit & credit) from one team member's digital wallet to another's, tracking the double-sided relationship using `source_ref_id`.
- **Payroll CSV Bulk Import** (`/apis/v3/hr/payroll/upload`): Parses complex CSV structures (like the template) to dynamically create or update employees with their basic salary, HRA percentage, allowances (Medical, Travel, and Fixed), and TDS deductions.
- **Dry Volume Concrete Batch Deductions**: Modifies the batch runs flow in `production.py` to:
  - Conditionally deduct materials from inventory stock **only** when the batch is marked as `"completed"`.
  - Apply the standard civil engineering $1.54$ conversion factor (`dry_volume = wet_volume * 1.54`) for dry components (`Cement`, `Sand`, `Aggregate`) in concrete mixes when actual quantity is not overridden.
  - Added a PATCH `/batches/{batch_id}/complete` endpoint to allow transitions to completed and trigger the corresponding stock deductions safely.

### 3. Frontend Dashboards
- **Finance P2P Modal**: Wired the "Party to Party" transaction type to show two searchable select dropdowns populated with project team members, linking the P2P API call on save.
- **CSV Import Triggers**: Added end-to-end file selectors and triggers:
  - **Finance Dashboard**: Added a file input trigger inside the "Upload Payments" section to parse and upload a bulk payment CSV.
  - **HR Dashboard**: Added a file input trigger next to "Compute Payroll" to upload the payroll CSV template directly to the backend.
- **Production Stock Alert Badges**: Integrated a glowing `⚠️ Low Stock` warning badge next to the batch number in both the Overview batch cards and the Batch Runs list when any batch or parent recipe material is marked as needing reorder.

---

## Verification & Testing

All integration tests are successfully passing:
- **Existing test suite**: `pytest` passed completely (12 passed, 187 warnings).
- **New Integration Test** (`test_competitor_parity.py`):
  - Verified P2P Wallet Transfer creates paired debit/credit transactions.
  - Verified Payroll CSV Import correctly computes salary, allowances, and TDS.
  - Verified Concrete Batch execution is deferred until `"completed"`, at which point the $1.54$ dry volume scaling factor is applied and stock is deducted correctly.
