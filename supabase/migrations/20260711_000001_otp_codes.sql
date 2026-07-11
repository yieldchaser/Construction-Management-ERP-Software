-- OTP login codes: short-lived, hashed one-time codes for phone-based auth.
-- Replaces the previous fully-mocked OTP flow. The application stores only an
-- HMAC-SHA256 hash of the code (keyed by SECRET_KEY), never the plaintext.
-- Codes expire quickly and are invalidated after a capped number of attempts.

CREATE TABLE IF NOT EXISTS otp_codes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mobile      varchar(20) NOT NULL,
    code_hash   varchar(128) NOT NULL,
    expires_at  timestamptz NOT NULL,
    attempts    integer NOT NULL DEFAULT 0,
    consumed    boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Lookups are always by mobile, newest first, filtered to unconsumed rows.
CREATE INDEX IF NOT EXISTS ix_otp_codes_mobile ON otp_codes (mobile);
CREATE INDEX IF NOT EXISTS ix_otp_codes_mobile_created
    ON otp_codes (mobile, created_at DESC);
