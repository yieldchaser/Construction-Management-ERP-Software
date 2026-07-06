# Task List: Onsite ERP Competitor Gaps Implementation

## Phase 8: Backend API & Schema Alignment
- [ ] Implement `/apis/v3/cashbook/p2p` POST endpoint in `backend/app/routers/finance.py` to handle direct wallet-to-wallet transactions.
- [ ] Implement `/payroll/upload` POST endpoint in `backend/app/routers/hr.py` to parse CSV schemas matching `Payroll-Upload-Template.csv`.
- [ ] Update `backend/app/routers/production.py` to calculate dry volumes ($1.54$ factor) and automatically deduct inventory stock upon batch completion.
- [ ] Add `photo_verified` and `location_verified` boolean flags to the Timesheet and Attendance tables in `backend/app/models.py`.

## Phase 9: Frontend Views & Action Modals
- [ ] Integrate "Party to Party Transfer" form modal in `/c/[company_id]/p/[project_id]/finance/page.tsx` with double searchable inputs.
- [ ] Add CSV import triggers on the HR payroll and Finance payments dashboards.
- [ ] Add low stock warning badges on the production batch lists.

## Phase 10: Verification & Build
- [ ] Run `pytest` on backend services to verify database schemas compile successfully.
- [ ] Run `npm run build` on frontend to verify Next.js/TypeScript compilations.
- [ ] Create walkthrough.md documentation.
