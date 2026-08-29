# -*- coding: utf-8 -*-
"""R2-131 regression test - shared party-name resolution across all call sites.

Seeds an isolated SQLite DB with the three CompanyTeam shapes that exist in
production and asserts every fixed resolver surfaces the real party name:
  1. internal member   - user_id set, resolves through users.name
  2. external counterparty - user_id NULL, real name on LibraryParty
  3. anonymous team    - neither link, caller's fallback placeholder applies
"""

import os
import sys
import tempfile
import uuid

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.dirname(HERE)
sys.path.append(BACKEND_ROOT)

_DB_FD, _DB_PATH = tempfile.mkstemp(suffix=".db")
os.close(_DB_FD)
os.environ["DATABASE_URL"] = f"sqlite:///{_DB_PATH}"

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import models

engine = create_engine(
    f"sqlite:///{_DB_PATH}", connect_args={"check_same_thread": False}
)
models.Base.metadata.create_all(bind=engine)
db = sessionmaker(bind=engine)()

company_id = uuid.uuid4()
internal_user = models.User(id=uuid.uuid4(), name="Ravi Internal", mobile="9000000001", email="ravi@test.co")
party = models.LibraryParty(id=uuid.uuid4(), company_id=company_id, name="ZZ QA Subcon Co")
team_internal = models.CompanyTeam(id=uuid.uuid4(), company_id=company_id, user_id=internal_user.id, priority_type="employee")
team_external = models.CompanyTeam(
    id=uuid.uuid4(), company_id=company_id, user_id=None, role_id=None,
    priority_type="subcontractor", library_party_id=party.id,
)
team_anonymous = models.CompanyTeam(
    id=uuid.uuid4(), company_id=company_id, user_id=None, role_id=None,
    priority_type="subcontractor",
)
db.add_all([internal_user, party, team_internal, team_external, team_anonymous])
db.commit()

from app.party_names import resolve_party_name
from app.routers.labour import _resolve_contractor_name
from app.routers.subcon_performance import _resolve_subcontractor_name
from app.routers.finance import _txn_party_name

failures = []


def check(label, got, want):
    if got != want:
        failures.append(f"{label}: got {got!r}, want {want!r}")


# Shared helper - every shape and fallback path.
check("helper internal user", resolve_party_name(db, team_internal.id), "Ravi Internal")
check("helper external party", resolve_party_name(db, team_external.id), "ZZ QA Subcon Co")
check("helper anonymous default", resolve_party_name(db, team_anonymous.id), "Unknown")
check("helper custom fallback", resolve_party_name(db, team_anonymous.id, fallback="Unknown Party"), "Unknown Party")
check("helper none id", resolve_party_name(db, None), "Unknown")
check("helper unknown id", resolve_party_name(db, uuid.uuid4()), "Unknown")

# labour.py - reliability report / BOCW contractor names.
check("labour external", _resolve_contractor_name(db, team_external.id), "ZZ QA Subcon Co")
check("labour internal", _resolve_contractor_name(db, team_internal.id), "Ravi Internal")
check("labour missing", _resolve_contractor_name(db, None), "Unknown")

# subcon_performance.py - scorecards.
check("subcon scorecard", _resolve_subcontractor_name(db, team_external.id), "ZZ QA Subcon Co")
check("subcon anonymous", _resolve_subcontractor_name(db, team_anonymous.id), "Unknown")

# finance.py - transaction ledger keeps its two placeholders.
check("finance walk-in", _txn_party_name(db, None), "Walk-in Party")
check("finance external", _txn_party_name(db, team_external.id), "ZZ QA Subcon Co")
check("finance unknown", _txn_party_name(db, uuid.uuid4()), "Unknown Party")

try:
    os.remove(_DB_PATH)
except OSError:
    pass


def test_r2_131_party_name_resolution():
    assert not failures, "R2-131 resolution mismatches: " + "; ".join(failures)
