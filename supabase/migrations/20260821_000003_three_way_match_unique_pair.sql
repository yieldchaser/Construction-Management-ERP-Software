-- R2-594: one three-way match per (po_id, grn_id) pair.
-- Additive-only: no rows are deleted or modified. If historical duplicate
-- pairs exist, the migration now RAISEs EXCEPTION (F-1) and fails the batch
-- rather than silently skipping; purge duplicates via
-- 20260825_000003_duplicate_purge_and_constraints.sql first, then re-run.
-- The application layer (three_way.py create_match 409 guard) remains.
DO $$
DECLARE
    dup_pairs integer;
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_three_way_matches_po_grn'
    ) THEN
        RAISE NOTICE 'constraint uq_three_way_matches_po_grn already exists';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO dup_pairs FROM (
        SELECT po_id, grn_id
        FROM three_way_matches
        GROUP BY po_id, grn_id
        HAVING COUNT(*) > 1
    ) d;

    IF dup_pairs > 0 THEN
        RAISE EXCEPTION 'constraint uq_three_way_matches_po_grn missing: % duplicate (po_id, grn_id) group(s) present - purge required', dup_pairs;
    END IF;

    ALTER TABLE three_way_matches
        ADD CONSTRAINT uq_three_way_matches_po_grn UNIQUE (po_id, grn_id);
END $$;
