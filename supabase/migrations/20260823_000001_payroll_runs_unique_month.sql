-- R2-353: one payroll run per (company_id, project_id, payroll_month).
-- F-1 ordering fix: inline purge so file no longer deadlocks before
-- 20260825_000003_duplicate_purge_and_constraints.sql. Historical duplicate
-- months are backed up into a timestamped table, collapsed to earliest row
-- (min created_at, tie min id), then constraint created in same migration.
-- Uses same D-V2/R2-613 purge shape as 20260825_000003 (see that file for
-- pattern). The application layer (hr.py run_payroll 409 guard) remains.
-- NULL project_id uses IS NOT DISTINCT FROM so legacy null-duplicates
-- (GROUP BY groups nulls) are correctly collapsed; Postgres UNIQUE treats
-- nulls as distinct but purging them is harmless and makes detection exact.
DO $$
DECLARE
    ts text := to_char(clock_timestamp() AT TIME ZONE 'utc', 'YYYYMMDD_HH24MISSUS');
    backup_table text := '_audit_backup_payroll_runs_' || ts;
    dup_groups integer;
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_payroll_runs_company_project_month'
    ) THEN
        RAISE NOTICE 'constraint uq_payroll_runs_company_project_month already exists';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO dup_groups FROM (
        SELECT company_id, project_id, payroll_month
        FROM payroll_runs
        GROUP BY company_id, project_id, payroll_month
        HAVING COUNT(*) > 1
    ) d;

    IF dup_groups > 0 THEN
        EXECUTE format(
            'CREATE TABLE %I AS SELECT t.* FROM payroll_runs t WHERE EXISTS (SELECT 1 FROM payroll_runs o WHERE o.company_id = t.company_id AND o.project_id IS NOT DISTINCT FROM t.project_id AND o.payroll_month = t.payroll_month AND o.id <> t.id)',
            backup_table);
        DELETE FROM payroll_runs t USING payroll_runs k
            WHERE t.company_id = k.company_id AND t.project_id IS NOT DISTINCT FROM k.project_id AND t.payroll_month = k.payroll_month
              AND (k.created_at < t.created_at OR (k.created_at = t.created_at AND k.id < t.id));
        RAISE NOTICE 'payroll_runs: duplicate group(s) backed up to % and collapsed to earliest row', backup_table;
    END IF;

    ALTER TABLE payroll_runs
        ADD CONSTRAINT uq_payroll_runs_company_project_month UNIQUE (company_id, project_id, payroll_month);
END $$;
