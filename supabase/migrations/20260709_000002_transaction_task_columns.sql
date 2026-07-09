-- Transaction sub-entity persistence + Task actual-progress (2026-07-09)
-- Mirrors backend/app/main.py ensure_sqlite_bill_columns / ensure_sqlite_task_columns.

ALTER TABLE IF EXISTS bills
  ADD COLUMN IF NOT EXISTS items_json text,
  ADD COLUMN IF NOT EXISTS payment_mode varchar(20),
  ADD COLUMN IF NOT EXISTS payment_bank_name varchar(255),
  ADD COLUMN IF NOT EXISTS payment_ref varchar(255),
  ADD COLUMN IF NOT EXISTS ship_to text;

ALTER TABLE IF EXISTS tasks
  ADD COLUMN IF NOT EXISTS progress numeric(5,2) NOT NULL DEFAULT 0;
