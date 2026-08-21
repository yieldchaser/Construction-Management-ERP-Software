-- R2-594: one three-way match per (po_id, grn_id) pair.
-- Additive-only: no rows are deleted or modified. If historical duplicate
-- pairs exist, the constraint is skipped with a NOTICE and the rule stays
-- enforced at the application layer (three_way.py create_match 409 guard);
-- collapse the duplicates manually to enable the database-level constraint.
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
        RAISE NOTICE 'skipping uq_three_way_matches_po_grn: % duplicate (po_id, grn_id) pair(s) present', dup_pairs;
        RETURN;
    END IF;

    ALTER TABLE three_way_matches
        ADD CONSTRAINT uq_three_way_matches_po_grn UNIQUE (po_id, grn_id);
END $$;
