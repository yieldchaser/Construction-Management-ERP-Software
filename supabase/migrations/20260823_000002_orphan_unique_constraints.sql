-- Orphan-sweep (Wave: H-verify-sweep): five UniqueConstraints modeled in
-- backend/app/models.py from earlier campaign waves never reached production
-- because create_all does not alter existing tables and boot schema-sync adds
-- COLUMNS only; UniqueConstraint/Index reach prod ONLY via these migrations.
-- This file also lands the two NEW constraints from findings R2-386 (ncrs)
-- and R2-543 (payments).
--
-- Additive-only: no rows are deleted or modified. Each block is duplicate-safe
-- (same idiom as uq_three_way_matches_po_grn / payroll_runs_unique_month): if
-- historical duplicate groups exist, that constraint is skipped with a NOTICE
-- and the rule stays enforced at the application layer's friendly 409 guard;
-- collapse the duplicates manually to enable the database-level constraint.

-- uq_material_indents_company_id_indent_number (models.py MaterialIndent;
-- earlier campaign wave, orphaned until this sweep).
DO $$
DECLARE
    dup_groups integer;
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_material_indents_company_id_indent_number'
    ) THEN
        RAISE NOTICE 'constraint uq_material_indents_company_id_indent_number already exists';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO dup_groups FROM (
        SELECT company_id, indent_number
        FROM material_indents
        GROUP BY company_id, indent_number
        HAVING COUNT(*) > 1
    ) d;

    IF dup_groups > 0 THEN
        RAISE NOTICE 'skipping uq_material_indents_company_id_indent_number: % duplicate (company_id, indent_number) group(s) present', dup_groups;
        RETURN;
    END IF;

    ALTER TABLE material_indents
        ADD CONSTRAINT uq_material_indents_company_id_indent_number UNIQUE (company_id, indent_number);
END $$;

-- uq_purchase_orders_company_id_po_number (models.py PurchaseOrder;
-- earlier campaign wave, orphaned until this sweep).
DO $$
DECLARE
    dup_groups integer;
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_purchase_orders_company_id_po_number'
    ) THEN
        RAISE NOTICE 'constraint uq_purchase_orders_company_id_po_number already exists';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO dup_groups FROM (
        SELECT company_id, po_number
        FROM purchase_orders
        GROUP BY company_id, po_number
        HAVING COUNT(*) > 1
    ) d;

    IF dup_groups > 0 THEN
        RAISE NOTICE 'skipping uq_purchase_orders_company_id_po_number: % duplicate (company_id, po_number) group(s) present', dup_groups;
        RETURN;
    END IF;

    ALTER TABLE purchase_orders
        ADD CONSTRAINT uq_purchase_orders_company_id_po_number UNIQUE (company_id, po_number);
END $$;

-- uq_goods_receipt_notes_company_id_grn_number (models.py GoodsReceiptNote;
-- earlier campaign wave, orphaned until this sweep).
DO $$
DECLARE
    dup_groups integer;
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_goods_receipt_notes_company_id_grn_number'
    ) THEN
        RAISE NOTICE 'constraint uq_goods_receipt_notes_company_id_grn_number already exists';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO dup_groups FROM (
        SELECT company_id, grn_number
        FROM goods_receipt_notes
        GROUP BY company_id, grn_number
        HAVING COUNT(*) > 1
    ) d;

    IF dup_groups > 0 THEN
        RAISE NOTICE 'skipping uq_goods_receipt_notes_company_id_grn_number: % duplicate (company_id, grn_number) group(s) present', dup_groups;
        RETURN;
    END IF;

    ALTER TABLE goods_receipt_notes
        ADD CONSTRAINT uq_goods_receipt_notes_company_id_grn_number UNIQUE (company_id, grn_number);
END $$;

-- uq_work_orders_company_id_wo_number (models.py WorkOrder;
-- earlier campaign wave, orphaned until this sweep).
DO $$
DECLARE
    dup_groups integer;
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_work_orders_company_id_wo_number'
    ) THEN
        RAISE NOTICE 'constraint uq_work_orders_company_id_wo_number already exists';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO dup_groups FROM (
        SELECT company_id, wo_number
        FROM work_orders
        GROUP BY company_id, wo_number
        HAVING COUNT(*) > 1
    ) d;

    IF dup_groups > 0 THEN
        RAISE NOTICE 'skipping uq_work_orders_company_id_wo_number: % duplicate (company_id, wo_number) group(s) present', dup_groups;
        RETURN;
    END IF;

    ALTER TABLE work_orders
        ADD CONSTRAINT uq_work_orders_company_id_wo_number UNIQUE (company_id, wo_number);
END $$;

-- uq_bills_company_id_invoice_number (models.py Bill;
-- earlier campaign wave, orphaned until this sweep).
DO $$
DECLARE
    dup_groups integer;
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_bills_company_id_invoice_number'
    ) THEN
        RAISE NOTICE 'constraint uq_bills_company_id_invoice_number already exists';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO dup_groups FROM (
        SELECT company_id, invoice_number
        FROM bills
        GROUP BY company_id, invoice_number
        HAVING COUNT(*) > 1
    ) d;

    IF dup_groups > 0 THEN
        RAISE NOTICE 'skipping uq_bills_company_id_invoice_number: % duplicate (company_id, invoice_number) group(s) present', dup_groups;
        RETURN;
    END IF;

    ALTER TABLE bills
        ADD CONSTRAINT uq_bills_company_id_invoice_number UNIQUE (company_id, invoice_number);
END $$;

-- uq_ncrs_project_id_ncr_number (R2-386, Wave: H-verify-sweep). ncrs is
-- project-scoped (project_id FK), so the number is unique per project, which
-- transitively scopes it within the owning company.
DO $$
DECLARE
    dup_groups integer;
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_ncrs_project_id_ncr_number'
    ) THEN
        RAISE NOTICE 'constraint uq_ncrs_project_id_ncr_number already exists';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO dup_groups FROM (
        SELECT project_id, ncr_number
        FROM ncrs
        GROUP BY project_id, ncr_number
        HAVING COUNT(*) > 1
    ) d;

    IF dup_groups > 0 THEN
        RAISE NOTICE 'skipping uq_ncrs_project_id_ncr_number: % duplicate (project_id, ncr_number) group(s) present', dup_groups;
        RETURN;
    END IF;

    ALTER TABLE ncrs
        ADD CONSTRAINT uq_ncrs_project_id_ncr_number UNIQUE (project_id, ncr_number);
END $$;

-- uq_payments_company_id_reference_number (R2-543, Wave: H-verify-sweep).
-- reference_number is nullable: Postgres UNIQUE treats NULLs as distinct, so
-- payments without a reference are never grouped together, matching the
-- router's `if req.reference_number:` check-then-insert 409 guard.
DO $$
DECLARE
    dup_groups integer;
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_payments_company_id_reference_number'
    ) THEN
        RAISE NOTICE 'constraint uq_payments_company_id_reference_number already exists';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO dup_groups FROM (
        SELECT company_id, reference_number
        FROM payments
        WHERE reference_number IS NOT NULL
        GROUP BY company_id, reference_number
        HAVING COUNT(*) > 1
    ) d;

    IF dup_groups > 0 THEN
        RAISE NOTICE 'skipping uq_payments_company_id_reference_number: % duplicate (company_id, reference_number) group(s) present', dup_groups;
        RETURN;
    END IF;

    ALTER TABLE payments
        ADD CONSTRAINT uq_payments_company_id_reference_number UNIQUE (company_id, reference_number);
END $$;
