"""Crypto at-rest tests (app/crypto.py): Fernet round-trip, legacy plaintext
fallback, and fail-closed behaviour when TOKEN_ENCRYPTION_KEY is unset.

These cover the OAuth-token-at-rest encryption used by the Google/Zoho
integrations. A leaked DB must only ever contain ciphertext, and encrypt must
NEVER silently store plaintext."""
from cryptography.fernet import Fernet

import pytest

from app import crypto
from app.config import settings


def _set_key(monkeypatch, key):
    monkeypatch.setattr(settings, "TOKEN_ENCRYPTION_KEY", key)


def test_roundtrip_encrypt_decrypt(monkeypatch):
    _set_key(monkeypatch, Fernet.generate_key().decode())
    secret = "ya29.oauth-access-token-abc-123"
    enc = crypto.encrypt_token(secret)
    assert enc != secret
    assert crypto.decrypt_token(enc) == secret


def test_encrypt_output_is_not_plaintext(monkeypatch):
    _set_key(monkeypatch, Fernet.generate_key().decode())
    enc = crypto.encrypt_token("some-token")
    # Fernet tokens are base64url ASCII, never equal to the input.
    assert enc != "some-token"
    assert isinstance(enc, str)


def test_decrypt_legacy_plaintext_returns_unchanged(monkeypatch):
    # A valid key is configured, but the stored value is a pre-encryption
    # plaintext row: decrypt_token must fall back to returning it unchanged
    # (it is NOT a valid Fernet token) instead of crashing.
    _set_key(monkeypatch, Fernet.generate_key().decode())
    legacy = "plaintext-legacy-token-value"
    assert crypto.decrypt_token(legacy) == legacy


def test_decrypt_without_key_returns_value_as_is(monkeypatch):
    # No key configured at all: nothing to decrypt with, use the value as-is.
    _set_key(monkeypatch, "")
    assert crypto.decrypt_token("whatever-token") == "whatever-token"


def test_encrypt_none_returns_none(monkeypatch):
    _set_key(monkeypatch, Fernet.generate_key().decode())
    assert crypto.encrypt_token(None) is None


def test_decrypt_none_returns_none(monkeypatch):
    _set_key(monkeypatch, Fernet.generate_key().decode())
    assert crypto.decrypt_token(None) is None


def test_encrypt_fails_closed_when_key_unset(monkeypatch):
    # Documented fail-closed behaviour: raising is preferred over silently
    # persisting a plaintext token.
    _set_key(monkeypatch, "")
    with pytest.raises(RuntimeError):
        crypto.encrypt_token("secret")
