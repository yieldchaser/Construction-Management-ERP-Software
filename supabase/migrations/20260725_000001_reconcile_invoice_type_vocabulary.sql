-- Migration: Reconcile bills.invoice_type long-form values to canonical stored values
-- File: supabase/migrations/20260725_000001_reconcile_invoice_type_vocabulary.sql
-- Description: Idempotent data migration to map long-form invoice_type strings (e.g. sales_invoice, material_sales, material_purchase, other_expense, equipment_expense) to canonical values (sale, material_sale, purchase, expense, equipment).

BEGIN;

-- 1. Execute idempotent updates
UPDATE bills SET invoice_type = 'sale' WHERE invoice_type = 'sales_invoice';
UPDATE bills SET invoice_type = 'material_sale' WHERE invoice_type = 'material_sales';
UPDATE bills SET invoice_type = 'purchase' WHERE invoice_type = 'material_purchase';
UPDATE bills SET invoice_type = 'expense' WHERE invoice_type = 'other_expense';
UPDATE bills SET invoice_type = 'equipment' WHERE invoice_type = 'equipment_expense';

COMMIT;

-- Rollback SQL Path:
-- UPDATE bills SET invoice_type = 'sales_invoice' WHERE invoice_type = 'sale';
-- UPDATE bills SET invoice_type = 'material_sales' WHERE invoice_type = 'material_sale';
-- UPDATE bills SET invoice_type = 'material_purchase' WHERE invoice_type = 'purchase';
-- UPDATE bills SET invoice_type = 'other_expense' WHERE invoice_type = 'expense';
-- UPDATE bills SET invoice_type = 'equipment_expense' WHERE invoice_type = 'equipment';
