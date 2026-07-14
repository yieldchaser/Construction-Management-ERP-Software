-- ============================================================================
-- 20260714_000004_zoho_books_connection.sql
-- Zoho Books integration: store one OAuth connection per company so vendor bills
-- can be pushed into Zoho Books. Mirrors google_drive_connections / Google Sheets.
--
-- Additive only: creates a new table. No existing table is altered or dropped.
-- Access/refresh tokens are stored encrypted at rest (app/crypto.py Fernet).
-- Token values must never be logged. The Zoho organization_id is fetched on
-- connect and stored so bill pushes target the correct org.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "zoho_books_connections" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL UNIQUE REFERENCES "companies"("id") ON DELETE CASCADE,
    "organization_id" VARCHAR(64),
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expiry" TIMESTAMPTZ,
    "connected_by_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
