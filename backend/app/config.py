import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./test.db"
    SECRET_KEY: str = "supersecretjwtkeyforlocaldevelopmentsiteflowapp2026!"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

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
    # Public base URL of this backend, used to build the OAuth redirect URI.
    # Falls back to the request URL when empty.
    BACKEND_PUBLIC_URL: str = ""
    # Public base URL of the frontend, used to redirect the browser back after
    # the OAuth callback. Falls back to the first configured frontend origin.
    FRONTEND_PUBLIC_URL: str = ""

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
