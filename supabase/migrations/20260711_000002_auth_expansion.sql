-- Multi-provider auth + real onboarding.
-- Additive, idempotent. Extends the phone-OTP-only identity model to support
-- email OTP, Google login, and email+password, and adds a single-use OAuth
-- handoff table so the session JWT is never placed in a redirect URL.

-- 1. users: phone is no longer the sole identity.
--    Multiple NULL mobiles must be allowed (email/Google/password users), which
--    a Postgres UNIQUE index already permits, so we only drop NOT NULL.
ALTER TABLE users ALTER COLUMN mobile DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash  varchar(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_providers varchar(255);

-- 2. otp_codes: generalise the hardened SMS store so the SAME hashed-code / TTL /
--    attempt-cap machinery serves email too. No second, weaker implementation.
ALTER TABLE otp_codes ALTER COLUMN mobile DROP NOT NULL;
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS channel    varchar(10)  NOT NULL DEFAULT 'sms';   -- sms | email
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS identifier varchar(255);                          -- phone or email
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS purpose    varchar(20)  NOT NULL DEFAULT 'login'; -- login | password_reset

-- Backfill identifier for any existing phone rows so lookups by identifier work.
UPDATE otp_codes SET identifier = mobile WHERE identifier IS NULL AND mobile IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_otp_codes_identifier ON otp_codes (identifier);
CREATE INDEX IF NOT EXISTS ix_otp_codes_identifier_created
    ON otp_codes (identifier, created_at DESC);

-- 3. oauth_handoffs: one-time, short-lived exchange codes for OAuth logins.
--    Only the HMAC-SHA256 hash of the code is stored (never the plaintext), the
--    row is burned on first use, and it expires quickly. This keeps the real
--    session JWT out of any redirect URL.
CREATE TABLE IF NOT EXISTS oauth_handoffs (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code_hash   varchar(128) NOT NULL,
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id  uuid REFERENCES companies(id) ON DELETE CASCADE,
    onboarding  boolean NOT NULL DEFAULT false,
    provider    varchar(20) NOT NULL DEFAULT 'google',
    expires_at  timestamptz NOT NULL,
    consumed    boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_oauth_handoffs_code_hash ON oauth_handoffs (code_hash);
