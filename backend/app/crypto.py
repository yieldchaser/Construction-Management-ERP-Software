"""Encryption for OAuth tokens stored at rest (Google Sheets access_token /
refresh_token on GoogleSheetsConnection).

Uses Fernet (symmetric, authenticated encryption) from the `cryptography`
package. The key comes from the TOKEN_ENCRYPTION_KEY env var (see
app/config.py) and must be 32 url-safe base64-encoded bytes, e.g. generated
with:

    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

Encrypted values are ASCII text (Fernet's own base64 wire format), so they
fit in the existing Text columns without a migration.

Legacy fallback: connections created before this encryption was added (or any
row written while TOKEN_ENCRYPTION_KEY was unset) have plaintext tokens in the
DB. decrypt_token() detects a value that is not a valid Fernet token and
returns it unchanged, logging a warning, instead of crashing. Those rows
self-heal to encrypted storage the next time the connection is
re-authorized (see routers/google_sheets.py callback()).
"""
import logging

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings

logger = logging.getLogger(__name__)


def _get_fernet() -> Fernet:
    key = (settings.TOKEN_ENCRYPTION_KEY or "").strip()
    if not key:
        raise RuntimeError(
            "TOKEN_ENCRYPTION_KEY is not set. Generate one with "
            '`python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` '
            "and set it as an env var before storing Google Sheets OAuth tokens."
        )
    try:
        return Fernet(key.encode("utf-8"))
    except (ValueError, TypeError) as exc:
        raise RuntimeError(
            "TOKEN_ENCRYPTION_KEY is not a valid Fernet key "
            "(must be 32 url-safe base64-encoded bytes)."
        ) from exc


def encrypt_token(plaintext: str) -> str:
    """Encrypt a token before writing it to the DB.

    Fails closed: raises RuntimeError if TOKEN_ENCRYPTION_KEY is not
    configured, rather than silently storing plaintext.
    """
    if plaintext is None:
        return None
    fernet = _get_fernet()
    return fernet.encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_token(value: str) -> str:
    """Decrypt a token read from the DB for API use.

    Falls back to treating the value as legacy plaintext (pre-encryption
    rows, or any row written while TOKEN_ENCRYPTION_KEY was unset) instead of
    raising, so old connections keep working until they are re-authorized.
    """
    if value is None:
        return None
    key = (settings.TOKEN_ENCRYPTION_KEY or "").strip()
    if not key:
        # No key configured at all: nothing to decrypt with, use as-is.
        return value
    try:
        fernet = _get_fernet()
        return fernet.decrypt(value.encode("utf-8")).decode("utf-8")
    except (InvalidToken, ValueError, TypeError):
        logger.warning(
            "GoogleSheetsConnection token is not a valid Fernet token; "
            "treating as legacy plaintext. It will be encrypted on next "
            "re-authorization."
        )
        return value
