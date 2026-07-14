-- Tally sync audit log (records each XML export / mark-synced action).
-- Additive: does not alter any existing table.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tally_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    exported_at TIMESTAMP WITH TIME ZONE,
    marked_synced_at TIMESTAMP WITH TIME ZONE,
    voucher_count INTEGER NOT NULL DEFAULT 0,
    bill_ids TEXT,
    payment_ids TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tally_sync_logs_company ON tally_sync_logs(company_id);
