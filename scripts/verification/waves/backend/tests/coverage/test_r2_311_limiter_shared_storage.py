"""R2-311 - rate-limit counters must live in storage shared by every instance.

Render logs showed one burst served by three instance IPs against slowapi's
default per-process MemoryStorage, making the effective policy
limit x instance_count. The prescribed fix: forward RATE_LIMIT_STORAGE_URI to
Limiter(storage_uri=...) so operators point every instance at one shared
backend (e.g. redis://), keeping the proxy-aware key function.

These tests pin the module's construction contract. They stub Limiter rather
than building a real RedisStorage because the local test env has no redis
dependency and no server; the pass-through itself is what regresses silently.
"""
import importlib

import pytest

import app.rate_limit as rl


@pytest.fixture()
def fresh_rate_limit_module():
    importlib.reload(rl)
    yield
    importlib.reload(rl)


class _RecordingLimiter:
    args_seen = {}

    def __init__(self, key_func=None, storage_uri=None):
        _RecordingLimiter.args_seen = {"key_func": key_func, "storage_uri": storage_uri}


def test_storage_uri_and_proxy_key_are_forwarded_to_limiter(fresh_rate_limit_module, monkeypatch):
    # Patch the source module: reload() re-runs `from slowapi import Limiter`,
    # so a stub on app.rate_limit itself would be overwritten by the reimport.
    monkeypatch.setattr("slowapi.Limiter", _RecordingLimiter)
    monkeypatch.setattr(rl.settings, "RATE_LIMIT_STORAGE_URI", "redis://shared.example:6379/0")

    importlib.reload(rl)

    assert _RecordingLimiter.args_seen["storage_uri"] == "redis://shared.example:6379/0"
    assert _RecordingLimiter.args_seen["key_func"] is rl._rate_limit_key


def test_empty_storage_uri_builds_limiter_without_backend_and_warns(
    fresh_rate_limit_module, monkeypatch, caplog
):
    monkeypatch.setattr("slowapi.Limiter", _RecordingLimiter)
    monkeypatch.setattr(rl.settings, "RATE_LIMIT_STORAGE_URI", "")

    with caplog.at_level("WARNING", logger="app.rate_limit"):
        importlib.reload(rl)

    assert _RecordingLimiter.args_seen["storage_uri"] is None
    assert _RecordingLimiter.args_seen["key_func"] is rl._rate_limit_key
    assert any("RATE_LIMIT_STORAGE_URI" in rec.message for rec in caplog.records)
