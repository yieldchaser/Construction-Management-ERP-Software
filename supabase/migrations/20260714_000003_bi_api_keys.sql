-- ============================================================================
-- 20260714_000003_bi_api_keys.sql
-- BI Data Export: per-company API keys consumed by PowerBI / Tableau feeds.
-- The raw key is shown ONCE on creation; only a hash is stored. Feeds resolve
-- the company from the key and only ever read that company's data.
--
-- Additive only: creates a new table. No existing table is altered or dropped.
-- key_hash is HMAC-SHA256 of the raw key keyed by SECRET_KEY (see bi_export.py).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "bi_api_keys" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
    "label" VARCHAR(120) NOT NULL,
    "key_hash" VARCHAR(128) NOT NULL,
    "created_by_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "last_used_at" TIMESTAMPTZ,
    "revoked" BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS "ix_bi_api_keys_company_id" ON "bi_api_keys" ("company_id");
