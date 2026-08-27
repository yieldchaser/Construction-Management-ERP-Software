-- F-1 verify: after batch, every expected unique constraint must exist.
-- Run immediately after the purge + constraint batch. Fails loudly (RAISE
-- EXCEPTION) if any named object is missing, so a silently skipped migration
-- cannot be mistaken for success.
--
-- Covers 11 uq_* constraints: the 7 orphan document-number constraints from
-- 20260823_000002_orphan_unique_constraints.sql, the 2 R2-711 constraints
-- from 20260825_000004_missing_unique_constraints.sql, plus
-- uq_three_way_matches_po_grn (20260821_000003 + 20260825_000003) and
-- uq_payroll_runs_company_project_month (20260823_000001). The 9 core
-- document-number constraints from F-1 are a strict subset; this file
-- asserts the full set so future orphans are also caught.
--
-- Batch order must be: backup -> purge (000003) -> constraints (000004) -> verify (this file).
-- This file sorts last (000006) so filename order enforces it.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_material_indents_company_id_indent_number') THEN
        RAISE EXCEPTION 'missing constraint uq_material_indents_company_id_indent_number';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_purchase_orders_company_id_po_number') THEN
        RAISE EXCEPTION 'missing constraint uq_purchase_orders_company_id_po_number';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_goods_receipt_notes_company_id_grn_number') THEN
        RAISE EXCEPTION 'missing constraint uq_goods_receipt_notes_company_id_grn_number';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_work_orders_company_id_wo_number') THEN
        RAISE EXCEPTION 'missing constraint uq_work_orders_company_id_wo_number';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_bills_company_id_invoice_number') THEN
        RAISE EXCEPTION 'missing constraint uq_bills_company_id_invoice_number';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_ncrs_project_id_ncr_number') THEN
        RAISE EXCEPTION 'missing constraint uq_ncrs_project_id_ncr_number';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_payments_company_id_reference_number') THEN
        RAISE EXCEPTION 'missing constraint uq_payments_company_id_reference_number';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_three_way_matches_po_grn') THEN
        RAISE EXCEPTION 'missing constraint uq_three_way_matches_po_grn';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_company_team_company_id_user_id') THEN
        RAISE EXCEPTION 'missing constraint uq_company_team_company_id_user_id';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_library_cost_codes_company_id_code') THEN
        RAISE EXCEPTION 'missing constraint uq_library_cost_codes_company_id_code';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_payroll_runs_company_project_month') THEN
        RAISE EXCEPTION 'missing constraint uq_payroll_runs_company_project_month';
    END IF;
    RAISE NOTICE 'verify: all 11 expected unique constraints present';
END $$;
