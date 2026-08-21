CREATE TABLE IF NOT EXISTS "revoked_tokens" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "jti" VARCHAR(36) NOT NULL UNIQUE,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ix_revoked_tokens_jti" ON "revoked_tokens" ("jti");

ALTER TABLE "users"
    ADD COLUMN IF NOT EXISTS "tokens_revoked_at" TIMESTAMPTZ;
