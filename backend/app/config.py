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
    # Empty by default: with no env set, the demo login path is fully disabled.
    OTP_DEMO_ALLOWLIST: str = ""
    OTP_DEMO_CODE: str = ""

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

    # --- Marketing lead notifications ---
    # Where the public contact-form / demo-request submissions (app/routers/
    # public_leads.py) are emailed to. Falls back to SMTP_FROM when empty. If
    # BOTH are empty, leads are still persisted to marketing_leads but no
    # notification email is sent (email_sent stays False on the row).
    LEAD_NOTIFY_EMAIL: str = ""

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

    # --- CORS Allowed Origins ---
    # Comma-separated list of allowed origins (e.g. "https://app.siteflow.co,https://site-flow-omega.vercel.app").
    ALLOWED_ORIGINS: str = ""
    FRONTEND_URL: str = ""

    # JWT_SECRET alias for SECRET_KEY
    JWT_SECRET: str = ""

    # Regex for THIS project's own Vercel preview deployments only (not all of
    # *.vercel.app). Override via env if the Vercel project slug/scope changes.
    FRONTEND_ORIGIN_REGEX: str = (
        r"^https://(construction-management-erp-softwar[a-z0-9-]*|siteflow[a-z0-9-]*|site-flow[a-z0-9-]*)\.vercel\.app$"
    )

    # Supabase Storage (file blobs moved out of the DB bytea columns).
    # Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the prod env (e.g. Render)
    # for uploads/downloads to use object storage instead of the DB.
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # Sentry error tracking (backend). Optional: when empty, Sentry init is
    # skipped cleanly and the app runs normally. Set SENTRY_DSN in the prod env
    # (e.g. Render) to enable backend error/performance reporting.
    SENTRY_DSN: str = ""
    SENTRY_RELEASE: str = ""

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
    # Zoho Books OAuth (integrations). Zoho data centers are region-specific
    # (accounts server + API host both use the region suffix, e.g. ".in"); the
    # region drives both base URLs so ".com"/".eu" also work, with ".in" the
    # target tier. Scope: ZohoBooks.fullaccess.all. Optional at boot: with the
    # client id/secret unset the connect flow returns 503 and the app boots fine.
    ZOHO_CLIENT_ID: str = ""
    ZOHO_CLIENT_SECRET: str = ""
    ZOHO_REGION: str = "in"
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
    RATE_LIMIT_STORAGE_URI: str = ""

    # Encryption key for OAuth tokens stored at rest (currently
    # GoogleSheetsConnection.access_token / refresh_token; see app/crypto.py).
    # Must be 32 url-safe base64-encoded bytes, e.g.:
    #   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
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
    def allowed_origins_list(self) -> list[str]:
        """Parsed list of allowed CORS origins, combined from ALLOWED_ORIGINS and FRONTEND_URL env vars,
        with required production and dev fallback origins."""
        raw_env = f"{self.ALLOWED_ORIGINS},{self.FRONTEND_URL}".strip()
        custom_origins = [o.strip() for o in raw_env.split(",") if o.strip()]

        default_fallbacks = [
            "https://site-flow-omega.vercel.app",
            "https://site-flow-git-main-killer-biller1.vercel.app",
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
            "https://construction-management-erp-softwar-ten.vercel.app",
            "https://construction-management-erp-software.vercel.app",
            "https://siteflow.vercel.app",
            "https://siteflow.co",
            "https://app.siteflow.co",
        ]

        seen = set()
        result = []
        for origin in custom_origins + default_fallbacks:
            normalized = origin.rstrip("/")
            if normalized and normalized not in seen:
                seen.add(normalized)
                result.append(normalized)
        return result

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

    @property
    def zoho_client_id(self) -> str:
        return (self.ZOHO_CLIENT_ID or "").strip()

    @property
    def zoho_client_secret(self) -> str:
        return (self.ZOHO_CLIENT_SECRET or "").strip()

    @property
    def zoho_region(self) -> str:
        """Region suffix for Zoho data centers, defaulting to "in" (India)."""
        return (self.ZOHO_REGION or "in").strip().lstrip(".").lower() or "in"

    @model_validator(mode="after")
    def _validate_critical_secrets(self):
        # Support JWT_SECRET as fallback for SECRET_KEY if SECRET_KEY is not set
        if not (self.SECRET_KEY or "").strip() and (self.JWT_SECRET or "").strip():
            self.SECRET_KEY = self.JWT_SECRET.strip()

        key = (self.SECRET_KEY or "").strip()
        if self.is_local_env:
            # Local/dev/test only: fall back to a clearly-marked throwaway key so
            # developers do not have to set one. This is never reachable in prod
            # because ENVIRONMENT is not a local value there.
            if not key or key == _KNOWN_INSECURE_SECRET:
                self.SECRET_KEY = "dev-only-insecure-key-not-for-production"
            return self

        # Non-local / production environment checks: fail-fast on missing critical keys
        if not key:
            raise RuntimeError(
                "CRITICAL SECURITY CONFIGURATION ERROR: SECRET_KEY (or JWT_SECRET) must be set in production/non-local environments. "
                "Generate one with `openssl rand -hex 32` and set it as an environment variable."
            )
        if key == _KNOWN_INSECURE_SECRET:
            raise RuntimeError(
                "CRITICAL SECURITY RISK: SECRET_KEY is set to the committed public development key. "
                "Generate a fresh secret with `openssl rand -hex 32` for production."
            )

        if not (self.SUPABASE_URL or "").strip():
            raise RuntimeError(
                "CRITICAL SECURITY CONFIGURATION ERROR: SUPABASE_URL must be set in production/non-local environments."
            )
        if not (self.SUPABASE_SERVICE_ROLE_KEY or "").strip():
            raise RuntimeError(
                "CRITICAL SECURITY CONFIGURATION ERROR: SUPABASE_SERVICE_ROLE_KEY must be set in production/non-local environments."
            )

        return self

settings = Settings()
