ALTER TABLE IF EXISTS library_parties
  ADD COLUMN IF NOT EXISTS bank_name varchar(255),
  ADD COLUMN IF NOT EXISTS account_name varchar(255),
  ADD COLUMN IF NOT EXISTS account_number varchar(100),
  ADD COLUMN IF NOT EXISTS ifsc_code varchar(20),
  ADD COLUMN IF NOT EXISTS tax_no varchar(100),
  ADD COLUMN IF NOT EXISTS esi_number varchar(100),
  ADD COLUMN IF NOT EXISTS pf_number varchar(100),
  ADD COLUMN IF NOT EXISTS father_name varchar(255),
  ADD COLUMN IF NOT EXISTS passport_no varchar(100),
  ADD COLUMN IF NOT EXISTS passport_expiry_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS creator_name varchar(255);

ALTER TABLE IF EXISTS library_cost_codes
  ADD COLUMN IF NOT EXISTS sub_cost_code varchar(100);
