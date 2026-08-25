from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# R2-138/R2-308: the Sentry board showed QueuePool (size 10 + overflow 20)
# exhaustion on /auth/me recurring daily. Sizes stay put on purpose - managed
# Postgres tiers cap total connections, so raising them just moves the failure
# to the server - but exhaustion must fail fast and self-heal:
#   - pool_timeout=15 gives up after 15s instead of hanging the full default
#     30s per request while the pool is starved;
#   - pool_recycle=1800 retires connections before managed-provider idle culls
#     turn them into stale surprises;
#   - pool_pre_ping stays on so dead connections are replaced transparently.
_POOL_KWARGS = dict(
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_timeout=15,
    pool_recycle=1800,
)


def build_engine(url: str):
    """Build the app engine for ``url`` (exposed for tests)."""
    if url.startswith("sqlite"):
        return create_engine(url, connect_args={"check_same_thread": False})
    return create_engine(url, **_POOL_KWARGS)


# Create engine (supports pool_pre_ping to automatically handle stale connections in Supabase)
engine = build_engine(settings.DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency to get db session in FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
