-- ============================================================================
-- 20260714_000005_add_approval_rule_id_columns.sql
-- Fix prod schema drift: the Multi-Level Approval feature added an
-- approval_rule_id FK to both payment_requests and purchase_orders in the ORM
-- models (models.py), but no migration ever added the columns to prod Postgres.
-- Result: GET /finance/payment-requests/{company_id} (and the PO list) 500 with
--   psycopg2.errors.UndefinedColumn: column payment_requests.approval_rule_id does not exist
--
-- Additive + idempotent (IF NOT EXISTS): safe to run once, harmless to re-run.
-- Nullable FK to approval_rules, ON DELETE SET NULL (matches the ORM definition).
-- ============================================================================

ALTER TABLE "payment_requests"
    ADD COLUMN IF NOT EXISTS "approval_rule_id" UUID
    REFERENCES "approval_rules"("id") ON DELETE SET NULL;

ALTER TABLE "purchase_orders"
    ADD COLUMN IF NOT EXISTS "approval_rule_id" UUID
    REFERENCES "approval_rules"("id") ON DELETE SET NULL;
