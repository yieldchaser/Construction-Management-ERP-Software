-- D-V2 + R2-613 (founder decisions, docs/VERIFICATION_DECISIONS_RESOLVED.md):
-- legacy duplicate rows are purged into timestamped backup tables, then every
-- unique constraint that 20260823_000002_orphan_unique_constraints.sql may
-- have skipped (its NOTICE-skip idiom leaves the constraint uncreated when a
-- duplicate group exists) is created HERE, in the same migration, so the
-- duplicate window cannot reopen.
--
-- R2-613 conditions, applied to all eight targets below:
--   (i)   SELECT every member of every duplicate group into a timestamped
--         backup table (_audit_backup_<table>_<utc ts>) BEFORE any deletion;
--   (ii)  keep the EARLIEST row of each group: min(created_at), tie-broken
--         by min(id); nothing else is touched;
--   (iii) constraint creation runs in this same migration after its purge.
--
-- Idempotent: each block exits early when its constraint already exists, and
-- the purge phases run only when duplicate groups are actually present, so a
-- re-run creates no second backup table and deletes nothing.
--
-- Schema-additive: no column or table is altered or dropped. Rows are removed
-- only from within duplicate groups and only after their full group has been
-- snapshotted, so no data is lost; restore is a plain INSERT from the backup.

-- [material_indents] constraint: uq_material_indents_company_id_indent_number
DO $$
DECLARE
    ts text := to_char(clock_timestamp() AT TIME ZONE 'utc', 'YYYYMMDD_HH24MISSUS');
    backup_table text := '_audit_backup_material_indents_' || ts;
    dup_groups integer;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_material_indents_company_id_indent_number') THEN
        RAISE NOTICE 'constraint uq_material_indents_company_id_indent_number already exists';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO dup_groups FROM (
        SELECT company_id, indent_number FROM material_indents
        GROUP BY company_id, indent_number HAVING COUNT(*) > 1
    ) d;

    IF dup_groups > 0 THEN
        EXECUTE format(
            'CREATE TABLE %I AS SELECT t.* FROM material_indents t WHERE EXISTS (SELECT 1 FROM material_indents o WHERE o.company_id = t.company_id AND o.indent_number = t.indent_number AND o.id <> t.id)',
            backup_table);
        DELETE FROM material_indents t USING material_indents k
            WHERE t.company_id = k.company_id AND t.indent_number = k.indent_number
              AND (k.created_at < t.created_at OR (k.created_at = t.created_at AND k.id < t.id));
        RAISE NOTICE 'material_indents: duplicate group(s) backed up to % and collapsed to earliest row', backup_table;
    END IF;

    ALTER TABLE material_indents
        ADD CONSTRAINT uq_material_indents_company_id_indent_number UNIQUE (company_id, indent_number);
END $$;

-- [purchase_orders] constraint: uq_purchase_orders_company_id_po_number
DO $$
DECLARE
    ts text := to_char(clock_timestamp() AT TIME ZONE 'utc', 'YYYYMMDD_HH24MISSUS');
    backup_table text := '_audit_backup_purchase_orders_' || ts;
    dup_groups integer;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_purchase_orders_company_id_po_number') THEN
        RAISE NOTICE 'constraint uq_purchase_orders_company_id_po_number already exists';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO dup_groups FROM (
        SELECT company_id, po_number FROM purchase_orders
        GROUP BY company_id, po_number HAVING COUNT(*) > 1
    ) d;

    IF dup_groups > 0 THEN
        EXECUTE format(
            'CREATE TABLE %I AS SELECT t.* FROM purchase_orders t WHERE EXISTS (SELECT 1 FROM purchase_orders o WHERE o.company_id = t.company_id AND o.po_number = t.po_number AND o.id <> t.id)',
            backup_table);
        DELETE FROM purchase_orders t USING purchase_orders k
            WHERE t.company_id = k.company_id AND t.po_number = k.po_number
              AND (k.created_at < t.created_at OR (k.created_at = t.created_at AND k.id < t.id));
        RAISE NOTICE 'purchase_orders: duplicate group(s) backed up to % and collapsed to earliest row', backup_table;
    END IF;

    ALTER TABLE purchase_orders
        ADD CONSTRAINT uq_purchase_orders_company_id_po_number UNIQUE (company_id, po_number);
END $$;

-- [goods_receipt_notes] constraint: uq_goods_receipt_notes_company_id_grn_number
DO $$
DECLARE
    ts text := to_char(clock_timestamp() AT TIME ZONE 'utc', 'YYYYMMDD_HH24MISSUS');
    backup_table text := '_audit_backup_goods_receipt_notes_' || ts;
    dup_groups integer;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_goods_receipt_notes_company_id_grn_number') THEN
        RAISE NOTICE 'constraint uq_goods_receipt_notes_company_id_grn_number already exists';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO dup_groups FROM (
        SELECT company_id, grn_number FROM goods_receipt_notes
        GROUP BY company_id, grn_number HAVING COUNT(*) > 1
    ) d;

    IF dup_groups > 0 THEN
        EXECUTE format(
            'CREATE TABLE %I AS SELECT t.* FROM goods_receipt_notes t WHERE EXISTS (SELECT 1 FROM goods_receipt_notes o WHERE o.company_id = t.company_id AND o.grn_number = t.grn_number AND o.id <> t.id)',
            backup_table);
        DELETE FROM goods_receipt_notes t USING goods_receipt_notes k
            WHERE t.company_id = k.company_id AND t.grn_number = k.grn_number
              AND (k.created_at < t.created_at OR (k.created_at = t.created_at AND k.id < t.id));
        RAISE NOTICE 'goods_receipt_notes: duplicate group(s) backed up to % and collapsed to earliest row', backup_table;
    END IF;

    ALTER TABLE goods_receipt_notes
        ADD CONSTRAINT uq_goods_receipt_notes_company_id_grn_number UNIQUE (company_id, grn_number);
END $$;

-- [work_orders] constraint: uq_work_orders_company_id_wo_number
DO $$
DECLARE
    ts text := to_char(clock_timestamp() AT TIME ZONE 'utc', 'YYYYMMDD_HH24MISSUS');
    backup_table text := '_audit_backup_work_orders_' || ts;
    dup_groups integer;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_work_orders_company_id_wo_number') THEN
        RAISE NOTICE 'constraint uq_work_orders_company_id_wo_number already exists';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO dup_groups FROM (
        SELECT company_id, wo_number FROM work_orders
        GROUP BY company_id, wo_number HAVING COUNT(*) > 1
    ) d;

    IF dup_groups > 0 THEN
        EXECUTE format(
            'CREATE TABLE %I AS SELECT t.* FROM work_orders t WHERE EXISTS (SELECT 1 FROM work_orders o WHERE o.company_id = t.company_id AND o.wo_number = t.wo_number AND o.id <> t.id)',
            backup_table);
        DELETE FROM work_orders t USING work_orders k
            WHERE t.company_id = k.company_id AND t.wo_number = k.wo_number
              AND (k.created_at < t.created_at OR (k.created_at = t.created_at AND k.id < t.id));
        RAISE NOTICE 'work_orders: duplicate group(s) backed up to % and collapsed to earliest row', backup_table;
    END IF;

    ALTER TABLE work_orders
        ADD CONSTRAINT uq_work_orders_company_id_wo_number UNIQUE (company_id, wo_number);
END $$;

-- [bills] constraint: uq_bills_company_id_invoice_number
DO $$
DECLARE
    ts text := to_char(clock_timestamp() AT TIME ZONE 'utc', 'YYYYMMDD_HH24MISSUS');
    backup_table text := '_audit_backup_bills_' || ts;
    dup_groups integer;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_bills_company_id_invoice_number') THEN
        RAISE NOTICE 'constraint uq_bills_company_id_invoice_number already exists';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO dup_groups FROM (
        SELECT company_id, invoice_number FROM bills
        GROUP BY company_id, invoice_number HAVING COUNT(*) > 1
    ) d;

    IF dup_groups > 0 THEN
        EXECUTE format(
            'CREATE TABLE %I AS SELECT t.* FROM bills t WHERE EXISTS (SELECT 1 FROM bills o WHERE o.company_id = t.company_id AND o.invoice_number = t.invoice_number AND o.id <> t.id)',
            backup_table);
        DELETE FROM bills t USING bills k
            WHERE t.company_id = k.company_id AND t.invoice_number = k.invoice_number
              AND (k.created_at < t.created_at OR (k.created_at = t.created_at AND k.id < t.id));
        RAISE NOTICE 'bills: duplicate group(s) backed up to % and collapsed to earliest row', backup_table;
    END IF;

    ALTER TABLE bills
        ADD CONSTRAINT uq_bills_company_id_invoice_number UNIQUE (company_id, invoice_number);
END $$;

-- [ncrs] constraint: uq_ncrs_project_id_ncr_number
DO $$
DECLARE
    ts text := to_char(clock_timestamp() AT TIME ZONE 'utc', 'YYYYMMDD_HH24MISSUS');
    backup_table text := '_audit_backup_ncrs_' || ts;
    dup_groups integer;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_ncrs_project_id_ncr_number') THEN
        RAISE NOTICE 'constraint uq_ncrs_project_id_ncr_number already exists';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO dup_groups FROM (
        SELECT project_id, ncr_number FROM ncrs
        GROUP BY project_id, ncr_number HAVING COUNT(*) > 1
    ) d;

    IF dup_groups > 0 THEN
        EXECUTE format(
            'CREATE TABLE %I AS SELECT t.* FROM ncrs t WHERE EXISTS (SELECT 1 FROM ncrs o WHERE o.project_id = t.project_id AND o.ncr_number = t.ncr_number AND o.id <> t.id)',
            backup_table);
        DELETE FROM ncrs t USING ncrs k
            WHERE t.project_id = k.project_id AND t.ncr_number = k.ncr_number
              AND (k.created_at < t.created_at OR (k.created_at = t.created_at AND k.id < t.id));
        RAISE NOTICE 'ncrs: duplicate group(s) backed up to % and collapsed to earliest row', backup_table;
    END IF;

    ALTER TABLE ncrs
        ADD CONSTRAINT uq_ncrs_project_id_ncr_number UNIQUE (project_id, ncr_number);
END $$;

-- [payments] constraint: uq_payments_company_id_reference_number
-- reference_number is nullable: NULLs never group together (Postgres UNIQUE
-- treats them as distinct), so every phase filters IS NOT NULL.
DO $$
DECLARE
    ts text := to_char(clock_timestamp() AT TIME ZONE 'utc', 'YYYYMMDD_HH24MISSUS');
    backup_table text := '_audit_backup_payments_' || ts;
    dup_groups integer;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_payments_company_id_reference_number') THEN
        RAISE NOTICE 'constraint uq_payments_company_id_reference_number already exists';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO dup_groups FROM (
        SELECT company_id, reference_number FROM payments
        WHERE reference_number IS NOT NULL
        GROUP BY company_id, reference_number HAVING COUNT(*) > 1
    ) d;

    IF dup_groups > 0 THEN
        EXECUTE format(
            'CREATE TABLE %I AS SELECT t.* FROM payments t WHERE t.reference_number IS NOT NULL AND EXISTS (SELECT 1 FROM payments o WHERE o.company_id = t.company_id AND o.reference_number = t.reference_number AND o.id <> t.id)',
            backup_table);
        DELETE FROM payments t USING payments k
            WHERE t.company_id = k.company_id AND t.reference_number = k.reference_number
              AND k.reference_number IS NOT NULL
              AND (k.created_at < t.created_at OR (k.created_at = t.created_at AND k.id < t.id));
        RAISE NOTICE 'payments: duplicate group(s) backed up to % and collapsed to earliest row', backup_table;
    END IF;

    ALTER TABLE payments
        ADD CONSTRAINT uq_payments_company_id_reference_number UNIQUE (company_id, reference_number);
END $$;

-- [three_way_matches] constraint: uq_three_way_matches_po_grn
-- R2-613 itself: legacy pre-R2-594 rows can hold duplicate (po_id, grn_id)
-- pairs, which made 20260821_000003 skip this constraint with a NOTICE. Purge,
-- then land it here so the window cannot reopen.
DO $$
DECLARE
    ts text := to_char(clock_timestamp() AT TIME ZONE 'utc', 'YYYYMMDD_HH24MISSUS');
    backup_table text := '_audit_backup_three_way_matches_' || ts;
    dup_groups integer;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_three_way_matches_po_grn') THEN
        RAISE NOTICE 'constraint uq_three_way_matches_po_grn already exists';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO dup_groups FROM (
        SELECT po_id, grn_id FROM three_way_matches
        GROUP BY po_id, grn_id HAVING COUNT(*) > 1
    ) d;

    IF dup_groups > 0 THEN
        EXECUTE format(
            'CREATE TABLE %I AS SELECT t.* FROM three_way_matches t WHERE EXISTS (SELECT 1 FROM three_way_matches o WHERE o.po_id = t.po_id AND o.grn_id = t.grn_id AND o.id <> t.id)',
            backup_table);
        DELETE FROM three_way_matches t USING three_way_matches k
            WHERE t.po_id = k.po_id AND t.grn_id = k.grn_id
              AND (k.created_at < t.created_at OR (k.created_at = t.created_at AND k.id < t.id));
        RAISE NOTICE 'three_way_matches: duplicate group(s) backed up to % and collapsed to earliest row', backup_table;
    END IF;

    ALTER TABLE three_way_matches
        ADD CONSTRAINT uq_three_way_matches_po_grn UNIQUE (po_id, grn_id);
END $$;
