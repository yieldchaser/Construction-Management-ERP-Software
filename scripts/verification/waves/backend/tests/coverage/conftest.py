import os
import tempfile
import uuid

# Must be set BEFORE importing the app (app.database builds the engine from
# DATABASE_URL at import time). A throwaway local SQLite file keeps the suite
# hermetic and avoids touching any real Supabase/dev database.
os.environ["ENVIRONMENT"] = "test"
_DB_PATH = os.path.join(tempfile.gettempdir(), f"siteflow_coverage_{uuid.uuid4().hex}.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_DB_PATH}"

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.auth import create_access_token
from app import models
from app.rate_limit import limiter

# The auth/OTP endpoints are rate-limited (5/minute). Disable limits for the
# suite so repeated OTP sends in tests don't trip 429s.
limiter.enabled = False


@pytest.fixture(scope="session", autouse=True)
def _boot():
    # Entering the context runs the FastAPI lifespan (create_all + seed) exactly
    # once for the whole session.
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def client(_boot):
    return _boot


@pytest.fixture()
def db():
    s = SessionLocal()
    try:
        yield s
    finally:
        s.close()


def _make_tenant(db, company_name, user_name, mobile=None, email=None):
    company = models.Company(id=uuid.uuid4(), name=company_name, currency_decimal_places=2)
    db.add(company)
    db.flush()
    user = models.User(id=uuid.uuid4(), name=user_name, mobile=mobile, email=email)
    db.add(user)
    db.flush()
    team = models.CompanyTeam(
        id=uuid.uuid4(), company_id=company.id, user_id=user.id, priority_type="partner"
    )
    db.add(team)
    db.commit()
    return company, user, team


def _auth_headers(user, company):
    token = create_access_token(
        {"sub": str(user.id), "company_id": str(company.id), "user_name": user.name}
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def make_tenant(db):
    def _factory(**kw):
        return _make_tenant(db, **kw)

    return _factory


@pytest.fixture()
def auth_headers():
    return _auth_headers
