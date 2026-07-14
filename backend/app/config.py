import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator

# Environments where a throwaway dev SECRET_KEY fallback is acceptable. Any other
# value (e.g. "production", "staging") makes SECRET_KEY mandatory.
_LOCAL_ENVS = {"local", "development", "dev", "test", "ci"}

# The SECRET_KEY value that used to ship as a committed default. It must never be
# used in a real deployment (repo history has had leaked-key exposure), so the
# app refuses to start with it outside local dev.
_KNOWN_INSECURE_SECRET = "supersecretjwtkeyforlocaldevelopmentsiteflowapp2026!"

class Settings(BaseSettings):
    # Deployment environment. Leave as "local" for dev/tests; set
    # ENVIRONMENT=production on Render (and any real deploy). When this is not a
    # local value, SECRET_KEY becomes mandatory and the app refuses to start
    # without a strong one.
    ENVIRONMENT: str = "local"

    DATABASE_URL: str = "sqlite:///./test.db"
    # No hardcoded production default. Must be supplied via the SECRET_KEY env
    # var in any non-local environment (openssl rand -hex 32). A throwaway
    # dev-only fallback is injected below only when ENVIRONMENT is local/dev/test.
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # --- OTP / SMS login delivery ---
    # Real OTP login needs an SMS provider. Implemented against MSG91 (common in
    # India) behind a thin interface (see app/sms.py). When SMS_PROVIDER_API_KEY
    # is empty, real SMS is disabled: only the demo allowlist below can log in,
    # using the fixed demo code. Arbitrary numbers get a clear 503.
    SMS_PROVIDER: str = "msg91"
    SMS_PROVIDER_API_KEY: str = ""
    MSG91_SENDER_ID: str = "SITEFL"
    MSG91_OTP_TEMPLATE_ID: str = ""
    # Server-generated OTP lifetime and per-code attempt cap.
    OTP_TTL_SECONDS: int = 300
    OTP_MAX_ATTEMPTS: int = 5
    # Comma-separated demo numbers allowed to log in with OTP_DEMO_CODE when no
    # SMS provider is configured. Never bypasses real SMS once a key is set.
    OTP_DEMO_ALLOWLIST: str = "9876543210,+919876543210"
    OTP_DEMO_CODE: str = "123456"

    # --- Email OTP login delivery (SMTP) ---
    # Email OTP reuses the SAME hardened otp_codes machinery as SMS (HMAC-hashed
    # code, TTL, attempt cap, single-use). Delivery is by SMTP: point these at
    # Supabase's SMTP relay (Project Settings -> Auth -> SMTP) or any provider.
    # When SMTP is not configured, email OTP is disabled for non-allowlisted
    # addresses and returns 503 (mirrors SMS), never a silent bypass.
    # Preferred transport: Brevo's transactional email HTTPS API (port 443),
    # which avoids outbound-SMTP-port blocking on hosts like Render's free/
    # starter tiers. Get the key from Brevo -> SMTP & API -> API Keys (this is
    # a different credential from the SMTP key).
    BREVO_API_KEY: str = ""
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""  # e.g. "SiteFlow <no-reply@siteflow.co>"
    SMTP_USE_TLS: bool = True  # STARTTLS on the configured port
    # Comma-separated demo emails allowed to log in with OTP_DEMO_CODE when SMTP
    # is not configured (dev/demo only; never bypasses real delivery once set).
    EMAIL_OTP_DEMO_ALLOWLIST: str = "demo@siteflow.co"

    # --- Password policy (email + password auth) ---
    PASSWORD_MIN_LENGTH: int = 8

    # --- Google login (identity) ---
    # SEPARATE from the Google Sheets integration: this consent uses the identity
    # scopes (openid email profile), not the spreadsheets scope, and its own
    # redirect URI ({BACKEND_PUBLIC_URL}/apis/v3/auth/google/callback). To reuse
    # the same Google OAuth client, leave these empty and the Sheets client
    # credentials are used; otherwise set dedicated login credentials here.
    GOOGLE_LOGIN_CLIENT_ID: str = ""
    GOOGLE_LOGIN_CLIENT_SECRET: str = ""

    # --- Firebase Phone Auth (identity) ---
    # An ADDITIVE phone-verification path alongside MSG91 OTP. Firebase Phone Auth
    # runs client-side (reCAPTCHA + SMS + code) in the browser via the Firebase JS
    # SDK; the backend only verifies the resulting Firebase ID token with the
    # Admin SDK (see app/firebase_auth.py) and mints OUR session. Provide the
    # Admin SDK service account as FIREBASE_SERVICE_ACCOUNT_JSON (the entire
    # service-account JSON as a single-line env var string; preferred for hosts
    # like Render), or FIREBASE_SERVICE_ACCOUNT_PATH (path to a JSON file) as a
    # fallback. When both are empty, /auth/firebase/verify returns 503, exactly
    # like the other methods, and MSG91 OTP is unaffected.
    FIREBASE_SERVICE_ACCOUNT_JSON: str = ""
    FIREBASE_SERVICE_ACCOUNT_PATH: str = ""

    # --- CORS preview origins ---
    # Regex for THIS project's own Vercel preview deployments only (not all of
    # *.vercel.app). Override via env if the Vercel project slug/scope changes.
    FRONTEND_ORIGIN_REGEX: str = (
        r"^https://(construction-management-erp-softwar[a-z0-9-]*|siteflow[a-z0-9-]*|site-flow[a-z0-9-]*)\.vercel\.app$"
    )

    # Supabase Storage (file blobs moved out of the DB bytea columns).
    # Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the prod env (e.g. Render)
    # for uploads/downloads to use object storage instead of the DB. When these
    # are unset, the file routers fall back to storing bytes in the `data`
    # column so local dev (SQLite) keeps working unchanged.
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # Sentry error tracking (backend). Optional: when empty, Sentry init is
    # skipped cleanly and the app runs normally. Set SENTRY_DSN in the prod env
    # (e.g. Render) to enable backend error/performance reporting.
    SENTRY_DSN: str = ""

    # Google Sheets OAuth (integrations). Optional: when empty, the connect flow
    # returns a clear error. Create an OAuth client in Google Cloud and register
    # the backend callback URL as a redirect URI.
    GOOGLE_SHEETS_CLIENT_ID: str = ""
    GOOGLE_SHEETS_CLIENT_SECRET: str = ""
    # Google Drive OAuth (integrations). Reuses the Google OAuth client when the
    # dedicated Drive client id/secret are unset (same fallback pattern as
    # google_login_client_id). Scope: drive.file (per-file, user-consented).
    GOOGLE_DRIVE_CLIENT_ID: str = ""
    GOOGLE_DRIVE_CLIENT_SECRET: str = ""
    # Microsoft Graph OAuth (OneDrive integration). Optional; when empty the
    # connect flow returns a clear error. "common" tenant allows any Microsoft
    # personal/work account.
    MS_GRAPH_CLIENT_ID: str = ""
    MS_GRAPH_CLIENT_SECRET: str = ""
    MS_GRAPH_TENANT: str = "common"
    # Public base URL of this backend, used to build the OAuth redirect URI.
    # Falls back to the request URL when empty.
    BACKEND_PUBLIC_URL: str = ""
    # Public base URL of the frontend, used to redirect the browser back after
    # the OAuth callback. Falls back to the first configured frontend origin.
    FRONTEND_PUBLIC_URL: str = ""

    # Admin migration secret. Temporary, for one-off admin-triggered migrations
    # (e.g. the file-storage backfill), NOT a general auth mechanism. When empty,
    # the admin migration routes always reject with 403. Set a random value in the
    # prod env (e.g. Render) per deployment; never ship a default here.
    ADMIN_MIGRATION_SECRET: str = ""

    # Encryption key for OAuth tokens stored at rest (currently
    # GoogleSheetsConnection.access_token / refresh_token; see app/crypto.py).
    # Must be 32 url-safe base64-encoded bytes, e.g.:
    #   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    # Optional at boot (Sheets is an optional integration) so the app does not
    # fail to start without it, but app/crypto.py fails closed on writes: it
    # refuses to encrypt/store a token when this is empty. Reads fall back to
    # treating stored values as legacy plaintext when this is unset or when a
    # value does not decrypt (see app/crypto.py decrypt_token).
    TOKEN_ENCRYPTION_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def is_local_env(self) -> bool:
        return (self.ENVIRONMENT or "").strip().lower() in _LOCAL_ENVS

    @property
    def demo_allowlist(self) -> set[str]:
        return {p.strip() for p in (self.OTP_DEMO_ALLOWLIST or "").split(",") if p.strip()}

    @property
    def email_demo_allowlist(self) -> set[str]:
        return {p.strip().lower() for p in (self.EMAIL_OTP_DEMO_ALLOWLIST or "").split(",") if p.strip()}

    @property
    def google_login_client_id(self) -> str:
        """Dedicated login client id, falling back to the Sheets client when unset."""
        return (self.GOOGLE_LOGIN_CLIENT_ID or self.GOOGLE_SHEETS_CLIENT_ID or "").strip()

    @property
    def google_login_client_secret(self) -> str:
        return (self.GOOGLE_LOGIN_CLIENT_SECRET or self.GOOGLE_SHEETS_CLIENT_SECRET or "").strip()

    @property
    def google_drive_client_id(self) -> str:
        """Dedicated Drive client id, falling back to the Sheets client when unset."""
        return (self.GOOGLE_DRIVE_CLIENT_ID or self.GOOGLE_SHEETS_CLIENT_ID or "").strip()

    @property
    def google_drive_client_secret(self) -> str:
        return (self.GOOGLE_DRIVE_CLIENT_SECRET or self.GOOGLE_SHEETS_CLIENT_SECRET or "").strip()

    @model_validator(mode="after")
    def _require_secret_key(self):
        key = (self.SECRET_KEY or "").strip()
        if self.is_local_env:
            # Local/dev/test only: fall back to a clearly-marked throwaway key so
            # developers do not have to set one. This is never reachable in prod
            # because ENVIRONMENT is not a local value there.
            if not key or key == _KNOWN_INSECURE_SECRET:
                self.SECRET_KEY = "dev-only-insecure-key-not-for-production"
            return self
        # Non-local: SECRET_KEY is mandatory and must not be the leaked default.
        if not key:
            raise RuntimeError(
                "SECRET_KEY must be set in a non-local environment. "
                "Generate one with `openssl rand -hex 32` and set it as an env var."
            )
        if key == _KNOWN_INSECURE_SECRET:
            raise RuntimeError(
                "SECRET_KEY is the committed development value, which is public. "
                "Generate a fresh secret with `openssl rand -hex 32` for production."
            )
        return self

settings = Settings()
