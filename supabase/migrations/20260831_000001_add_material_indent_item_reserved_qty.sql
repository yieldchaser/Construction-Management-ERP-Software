-- Migration: Add reserved_qty column to material_indent_items
-- Idempotent and additive

ALTER TABLE material_indent_items ADD COLUMN IF NOT EXISTS reserved_qty NUMERIC(18,4) NOT NULL DEFAULT 0;
