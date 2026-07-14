-- ============================================================================
-- 20260714_000002_onedrive_connection.sql
-- OneDrive integration: store one OAuth connection per company so files can be
-- backed up to the connected OneDrive via Microsoft Graph. Mirrors the Drive
-- and Sheets connection tables.
--
-- Additive only: creates a new table. No existing table is altered or dropped.
-- Access/refresh tokens are stored encrypted at rest (app/crypto.py Fernet).
-- Token values must never be logged.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "onedrive_connections" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL UNIQUE REFERENCES "companies"("id") ON DELETE CASCADE,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expiry" TIMESTAMPTZ,
    "connected_by_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
