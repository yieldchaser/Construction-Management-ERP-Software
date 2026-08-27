-- R2-353: one payroll run per (company_id, project_id, payroll_month).
-- Additive-only: no rows are deleted or modified. If historical duplicate
-- months exist (R2-353 was proven live), the migration now RAISEs EXCEPTION
-- (F-1) and fails the batch rather than silently skipping; purge duplicates
-- manually then re-run. The application layer (hr.py run_payroll 409 guard)
-- remains. NULL project_id rows are never grouped together, matching the
-- endpoint's IS NULL lookup.
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
        RAISE EXCEPTION 'constraint uq_payroll_runs_company_project_month missing: % duplicate (company_id, project_id, payroll_month) group(s) present - purge required', dup_months;
    END IF;

    ALTER TABLE payroll_runs
        ADD CONSTRAINT uq_payroll_runs_company_project_month UNIQUE (company_id, project_id, payroll_month);
END $$;
