-- Finance tab (company-level) & Accounts extensions
ALTER TABLE IF EXISTS library_parties
  ADD COLUMN IF NOT EXISTS contractor_role varchar(100),
  ADD COLUMN IF NOT EXISTS service_rate_categories text,
  ADD COLUMN IF NOT EXISTS opening_balance double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opening_balance_type varchar(20),
  ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS bank_accounts
  ADD COLUMN IF NOT EXISTS opening_balance double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iban varchar(100),
  ADD COLUMN IF NOT EXISTS bank_address text,
  ADD COLUMN IF NOT EXISTS overdraft_limit double precision DEFAULT 0;

ALTER TABLE IF EXISTS payment_requests
  ADD COLUMN IF NOT EXISTS request_no varchar(50);
