-- ============================================================================
-- 20260710_000005_google_sheets_connection.sql
-- Google Sheets integration: store one OAuth connection per company so payroll
-- runs (and later, other reports) can be exported to a live Google Sheet.
--
-- Additive only: creates a new table. No existing table is altered or dropped.
-- Tokens are stored as-is for this proof-of-concept; encrypting them at rest is
-- a tracked follow-up. Token values must never be logged.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "google_sheets_connections" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL UNIQUE REFERENCES "companies"("id") ON DELETE CASCADE,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expiry" TIMESTAMPTZ,
    "connected_by_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
