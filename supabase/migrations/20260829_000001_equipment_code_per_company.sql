-- R2-049 / R2-358b: equipment.code was UNIQUE globally, across all tenants.
--
-- Problem: models.py declared `code = Column(String(100), unique=True, ...)`,
--   which Postgres enforces as `equipment_code_key UNIQUE (code)` -- company_id
--   is not part of the constraint. One tenant registering "EXC-01" permanently
--   blocked every other tenant from using that code, and the resulting 400
--   disclosed to the caller that some other tenant already held it. Equipment
--   codes are short and conventional ("EXC-01", "JCB-1", "CRANE-1"), so
--   collisions were near-certain as tenants grew. Every other duplicate guard
--   in the codebase is company-scoped; equipment was the sole exception.
--
-- Fix: replace the global constraint with UNIQUE (company_id, code).
--
-- Ordering matters, and each step is safe on its own:
--   1. DROP the global constraint. This only loosens an existing rule, so it
--      can never fail on existing data.
--   2. CREATE the composite constraint, but SKIP WITH A NOTICE (not an error)
--      when an intra-company duplicate would violate it. Deleting production
--      rows is a separate, founder-approved operation -- see audit/ Part D, D1,
--      and the purge-and-rebackup idiom in
--      20260825_000003_duplicate_purge_and_constraints.sql. Re-running this
--      migration after that purge creates the constraint.
--
-- Replay-safe: both blocks are guarded by a pg_constraint existence check, so
-- a second run is a no-op that logs NOTICEs.
-- ==============================================================================

-- 1. Drop the global constraint (loosening only).
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipment_code_key') THEN
        ALTER TABLE equipment DROP CONSTRAINT equipment_code_key;
        RAISE NOTICE 'R2-049: dropped global constraint equipment_code_key';
    ELSE
        RAISE NOTICE 'R2-049: equipment_code_key not present; nothing to drop';
    END IF;
END $$;

-- 2. Create the company-scoped constraint, skipping when data would violate it.
DO $$
DECLARE
    dup_groups integer;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_equipment_company_id_code') THEN
        RAISE NOTICE 'R2-049: constraint uq_equipment_company_id_code already exists';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO dup_groups FROM (
        SELECT company_id, code
        FROM equipment
        GROUP BY company_id, code
        HAVING COUNT(*) > 1
    ) d;

    IF dup_groups > 0 THEN
        RAISE NOTICE
            'R2-049: % duplicate (company_id, code) group(s) present in equipment; '
            'skipping uq_equipment_company_id_code. Back up and purge the '
            'duplicates (keep-earliest), then re-run this migration.',
            dup_groups;
        RETURN;
    END IF;

    ALTER TABLE equipment
        ADD CONSTRAINT uq_equipment_company_id_code UNIQUE (company_id, code);
    RAISE NOTICE 'R2-049: created constraint uq_equipment_company_id_code';
END $$;
