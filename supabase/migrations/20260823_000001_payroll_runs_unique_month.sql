-- R2-353: one payroll run per (company_id, project_id, payroll_month).
-- Additive-only: no rows are deleted or modified. If historical duplicate
-- months exist (R2-353 was proven live), the constraint is skipped with a
-- NOTICE and the rule stays enforced at the application layer (hr.py
-- run_payroll 409 guard); collapse the duplicates manually to enable the
-- database-level constraint. NULL project_id rows are never grouped
-- together, matching the endpoint's IS NULL lookup.
DO $$
DECLARE
    dup_months integer;
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_payroll_runs_company_project_month'
    ) THEN
        RAISE NOTICE 'constraint uq_payroll_runs_company_project_month already exists';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO dup_months FROM (
        SELECT company_id, project_id, payroll_month
        FROM payroll_runs
        GROUP BY company_id, project_id, payroll_month
        HAVING COUNT(*) > 1
    ) d;

    IF dup_months > 0 THEN
        RAISE NOTICE 'skipping uq_payroll_runs_company_project_month: % duplicate (company_id, project_id, payroll_month) group(s) present', dup_months;
        RETURN;
    END IF;

    ALTER TABLE payroll_runs
        ADD CONSTRAINT uq_payroll_runs_company_project_month UNIQUE (company_id, project_id, payroll_month);
END $$;
