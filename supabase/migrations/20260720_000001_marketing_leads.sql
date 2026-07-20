-- Public, tenant-less lead capture for the marketing site (contact form, demo
-- requests). Prospects are not customers, so there is no company_id FK. Only
-- a salted hash of the submitter IP is stored (never the raw IP), matching
-- the same HMAC-SHA256-keyed-by-SECRET_KEY approach used for otp_codes.

CREATE TABLE IF NOT EXISTS marketing_leads (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        varchar(120) NOT NULL,
    company     varchar(200),
    email       varchar(255) NOT NULL,
    phone       varchar(32),
    role        varchar(120),
    sites       varchar(120),
    message     text,
    source      varchar(60) NOT NULL DEFAULT 'contact_form',
    page_url    varchar(500),
    user_agent  varchar(400),
    ip_hash     varchar(128),
    email_sent  boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_marketing_leads_email ON marketing_leads (email);
CREATE INDEX IF NOT EXISTS ix_marketing_leads_created_at ON marketing_leads (created_at);
