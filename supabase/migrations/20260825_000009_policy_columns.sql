-- R2-741: D2/CD-4 policy columns missing from all migrations (outage 2026-08-27).
--
-- Problem: commit 4418a54 (also edd3e4d) added four columns to backend/app/models.py
--   with nullable=True for boot sync but no migration ever created them. A fresh
--   DB and production (which skips the startup runner on Postgres per M-1) lacked
--   them, so every login that touched Company or payroll 500ed on
--   psycopg2.errors.UndefinedColumn. Sentry first-seen ~10:14 on 2026-08-27,
--   before the 14:19 merge.
--
-- Columns verified against models.py __tablename__:
--   companies.assume_full_month_when_no_attendance (Boolean)
--   companies.pf_wage_ceiling (Numeric(14,2))
--   company_payroll_settings.pf_wage_ceiling (Numeric(14,2))
--   payroll_line_items.attendance_source (String(20))
--
-- Fix: explicit replay-safe migration via ADD COLUMN IF NOT EXISTS so a fresh
--   DB and replayed boots converge without error. Matches the standing per-migration
--   replay rule. No data backfill required; existing rows keep NULL which the
--   application treats as OFF (assume_full_month_when_no_attendance) and 15000
--   (pf_wage_ceiling) defaults.
-- ==============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS assume_full_month_when_no_attendance BOOLEAN;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS pf_wage_ceiling NUMERIC(14,2);
ALTER TABLE company_payroll_settings ADD COLUMN IF NOT EXISTS pf_wage_ceiling NUMERIC(14,2);
ALTER TABLE payroll_line_items ADD COLUMN IF NOT EXISTS attendance_source VARCHAR(20);
