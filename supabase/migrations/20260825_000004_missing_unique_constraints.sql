-- D-V4 / R2-711 gate-fix (Wave: gate-fix): two orphan UniqueConstraints
-- modeled in backend/app/models.py never reached production because
-- create_all does not alter existing tables and boot schema-sync adds
-- COLUMNS only. Gate backend/tests/coverage/test_dv4_constraint_migration_gate.py
-- walks Base.metadata for uq_* and asserts name in supabase/migrations/*.sql.
-- This file lands the two missing constraints.
--
-- Uses D-V2 duplicate-snapshot pattern per docs/VERIFICATION_DECISIONS_RESOLVED.md
-- because legacy duplicate rows are possible on both tables. Each block:
--  (i)   exits early if constraint already exists,
--  (ii)  if duplicate groups exist, snapshots every member of every group into
--        a timestamped _audit_backup_<table>_<ts> table BEFORE any deletion,
--  (iii) keeps earliest row per group (min created_at, tie min id),
--  (iv)  creates the UNIQUE constraint in same migration.
-- Idempotent and additive-only; no column or table is altered or dropped.

-- [company_team] constraint: uq_company_team_company_id_user_id
-- company_team is nullable on both FKs in the initial schema sync, but
-- Postgres UNIQUE treats NULLs as distinct so only groups where both
-- company_id and user_id are NOT NULL can violate the constraint. All
-- duplicate phases filter IS NOT NULL to match that semantics.
DO $$
DECLARE
    ts text := to_char(clock_timestamp() AT TIME ZONE 'utc', 'YYYYMMDD_HH24MISSUS');
    backup_table text := '_audit_backup_company_team_' || ts;
    dup_groups integer;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_company_team_company_id_user_id') THEN
        RAISE NOTICE 'constraint uq_company_team_company_id_user_id already exists';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO dup_groups FROM (
        SELECT company_id, user_id FROM company_team
        WHERE company_id IS NOT NULL AND user_id IS NOT NULL
        GROUP BY company_id, user_id HAVING COUNT(*) > 1
    ) d;

    IF dup_groups > 0 THEN
        EXECUTE format(
            'CREATE TABLE %I AS SELECT t.* FROM company_team t WHERE t.company_id IS NOT NULL AND t.user_id IS NOT NULL AND EXISTS (SELECT 1 FROM company_team o WHERE o.company_id = t.company_id AND o.user_id = t.user_id AND o.id <> t.id)',
            backup_table);
        DELETE FROM company_team t USING company_team k
            WHERE t.company_id IS NOT NULL AND t.user_id IS NOT NULL
              AND k.company_id IS NOT NULL AND k.user_id IS NOT NULL
              AND t.company_id = k.company_id AND t.user_id = k.user_id
              AND (k.created_at < t.created_at OR (k.created_at = t.created_at AND k.id < t.id));
        RAISE NOTICE 'company_team: % duplicate (company_id, user_id) group(s) backed up to % and collapsed to earliest row', dup_groups, backup_table;
    END IF;

    ALTER TABLE company_team
        ADD CONSTRAINT uq_company_team_company_id_user_id UNIQUE (company_id, user_id);
END $$;

-- [library_cost_codes] constraint: uq_library_cost_codes_company_id_code
DO $$
DECLARE
    ts text := to_char(clock_timestamp() AT TIME ZONE 'utc', 'YYYYMMDD_HH24MISSUS');
    backup_table text := '_audit_backup_library_cost_codes_' || ts;
    dup_groups integer;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_library_cost_codes_company_id_code') THEN
        RAISE NOTICE 'constraint uq_library_cost_codes_company_id_code already exists';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO dup_groups FROM (
        SELECT company_id, code FROM library_cost_codes
        GROUP BY company_id, code HAVING COUNT(*) > 1
    ) d;

    IF dup_groups > 0 THEN
        EXECUTE format(
            'CREATE TABLE %I AS SELECT t.* FROM library_cost_codes t WHERE EXISTS (SELECT 1 FROM library_cost_codes o WHERE o.company_id = t.company_id AND o.code = t.code AND o.id <> t.id)',
            backup_table);
        DELETE FROM library_cost_codes t USING library_cost_codes k
            WHERE t.company_id = k.company_id AND t.code = k.code
              AND (k.created_at < t.created_at OR (k.created_at = t.created_at AND k.id < t.id));
        RAISE NOTICE 'library_cost_codes: % duplicate (company_id, code) group(s) backed up to % and collapsed to earliest row', dup_groups, backup_table;
    END IF;

    ALTER TABLE library_cost_codes
        ADD CONSTRAINT uq_library_cost_codes_company_id_code UNIQUE (company_id, code);
END $$;
