"""R2-308 - the pool must fail fast and self-heal instead of hanging 30s.

The audit's recurring CRITICAL: QueuePool (10 + 20 overflow) exhausted on
/auth/me, each extra request blocking the full 30-second default pool_timeout
before failing, 26 times in a day and escalating. The fix keeps the sizes
(managed Postgres caps total connections) but adds an explicit short
pool_timeout and a pool_recycle, with pre_ping confirmed on.
"""
import pytest

from app import database


def test_postgres_engine_pool_is_fail_fast_and_self_healing():
    pytest.importorskip("psycopg2")
    engine = database.build_engine("postgresql+psycopg2://u:p@localhost:5432/x")
    try:
        pool = engine.pool
        assert type(pool).__name__ == "QueuePool"
        # Fail fast when exhausted instead of hanging the default 30s.
        assert pool._timeout == 15
        # Retire connections before managed providers idle-cull them.
        assert pool._recycle == 1800
        # R2-138 found pre_ping already on; it must stay on.
        assert pool._pre_ping is True
    finally:
        engine.dispose()


def test_sqlite_test_engine_still_uses_the_same_entry_point():
    engine = database.build_engine("sqlite:///./_r2_308_probe.db")
    try:
        assert engine.url.get_backend_name() == "sqlite"
        assert engine.pool is not None
    finally:
        engine.dispose()
