"""Password hashing and strength checks for email+password auth.

Hashing uses bcrypt (the same algorithm passlib[bcrypt] provides). We call the
bcrypt library directly: passlib 1.7.4's bcrypt backend fails to initialise
against bcrypt >= 4.1 (it reads a removed __about__.__version__ and trips a
detection bug), which would break hashing in production too. The output is the
standard "$2b$" bcrypt hash, so it stays interchangeable with passlib. bcrypt
verification is constant-time, so login does not leak match timing. This module
never logs passwords or hashes.
"""
import bcrypt

from app.config import settings

# bcrypt only considers the first 72 bytes of the input; longer inputs raise in
# bcrypt >= 4.x. Truncating to 72 bytes matches historical behaviour and keeps
# very long passwords working safely.
_BCRYPT_MAX_BYTES = 72

# A real dummy hash used to keep login timing similar when a user is not found.
_DUMMY_HASH = bcrypt.hashpw(b"dummy-password-for-timing", bcrypt.gensalt(rounds=12)).decode("utf-8")

# A tiny denylist of trivially guessable passwords. Not a substitute for a real
# breached-password check, but blocks the most obvious ones for v1.
_TRIVIAL_PASSWORDS = {
    "password", "12345678", "123456789", "1234567890", "qwerty123",
    "password1", "password123", "iloveyou", "admin123", "letmein1",
    "siteflow", "welcome1",
}


def _encode(password: str) -> bytes:
    return (password or "").encode("utf-8")[:_BCRYPT_MAX_BYTES]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_encode(password), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Constant-time-safe verify. Returns False on any error rather than raising."""
    if not password or not password_hash:
        # Still spend time on a dummy compare so absence is not obviously faster.
        try:
            bcrypt.checkpw(_encode(password), _DUMMY_HASH.encode("utf-8"))
        except Exception:
            pass
        return False
    try:
        return bcrypt.checkpw(_encode(password), password_hash.encode("utf-8"))
    except Exception:
        return False


def dummy_verify(password: str) -> None:
    """Run a throwaway verify to keep timing similar when the user does not exist."""
    verify_password(password, _DUMMY_HASH)


def validate_password_strength(password: str) -> str | None:
    """Return an error message if the password is too weak, else None.

    Rules kept simple and honest for v1: minimum length, not all one character,
    not purely numeric, and not on the trivial denylist.
    """
    pw = password or ""
    if len(pw) < settings.PASSWORD_MIN_LENGTH:
        return f"Password must be at least {settings.PASSWORD_MIN_LENGTH} characters."
    if pw.isdigit():
        return "Password must not be entirely numeric."
    if len(set(pw)) < 4:
        return "Password is too repetitive. Use a stronger password."
    if pw.lower() in _TRIVIAL_PASSWORDS:
        return "That password is too common. Please choose a stronger one."
    return None
