-- PROMPT_9 / E7: durable per-company Tally voucher sequence counter so voucher
-- numbers never restart / collide across partial syncs.
ALTER TABLE tally_connections ADD COLUMN IF NOT EXISTS last_voucher_seq INTEGER NOT NULL DEFAULT 0;
