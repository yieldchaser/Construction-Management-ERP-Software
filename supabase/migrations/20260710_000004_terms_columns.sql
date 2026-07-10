-- Migration: add a `terms` column to Bill, BOQDocument, PurchaseOrder.
-- Additive only: new nullable Text column, no existing column altered or dropped.
-- Mirrors the convention of 20260710_000003_file_storage_supabase.sql.

ALTER TABLE bills
  ADD COLUMN IF NOT EXISTS terms TEXT;

ALTER TABLE boq_documents
  ADD COLUMN IF NOT EXISTS terms TEXT;

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS terms TEXT;
