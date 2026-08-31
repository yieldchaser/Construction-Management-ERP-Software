"""Shared resolution of a CompanyTeam reference to a human-readable party name.

External counterparties (vendors / subcontractors with no platform login) are
stored as a CompanyTeam row with user_id NULL and the real name reachable only
through library_party_id -> LibraryParty.name, so any lookup that walks the
users table alone must fail for the normal external case (R2-131).
"""

from typing import Any, Dict, Iterable
from sqlalchemy.orm import Session

from app import models


def resolve_party_name(db: Session, company_team_id, fallback: str = "Unknown") -> str:
    # R2-131 / R2-748: one shared implementation for every party-name lookup —
    # linked LibraryParty name FIRST (authoritative vendor master business name),
    # then linked login User name as fallback, then fallback sentinel.
    if not company_team_id:
        return fallback
    team = db.query(models.CompanyTeam).filter(models.CompanyTeam.id == company_team_id).first()
    if not team:
        return fallback
    if team.library_party_id:
        party = db.query(models.LibraryParty).filter(models.LibraryParty.id == team.library_party_id).first()
        if party and party.name:
            return party.name
    if team.user_id:
        user = db.query(models.User).filter(models.User.id == team.user_id).first()
        if user and user.name:
            return user.name
    return fallback


def resolve_party_names_batch(db: Session, company_team_ids: Iterable[Any], fallback: str = "Unknown") -> Dict[Any, str]:
    """Batch-resolves multiple CompanyTeam IDs to human-readable party names in constant queries."""
    ids = [cid for cid in set(company_team_ids) if cid is not None]
    if not ids:
        return {}

    teams = db.query(models.CompanyTeam).filter(models.CompanyTeam.id.in_(ids)).all()
    team_by_id = {t.id: t for t in teams}

    # Fetch linked LibraryParties
    lp_ids = [t.library_party_id for t in teams if t.library_party_id is not None]
    lp_names = {}
    if lp_ids:
        parties = db.query(models.LibraryParty).filter(models.LibraryParty.id.in_(set(lp_ids))).all()
        lp_names = {p.id: p.name for p in parties if p.name}

    # Fetch linked Users
    user_ids = [t.user_id for t in teams if t.user_id is not None]
    user_names = {}
    if user_ids:
        users = db.query(models.User).filter(models.User.id.in_(set(user_ids))).all()
        user_names = {u.id: u.name for u in users if u.name}

    result = {}
    for cid in ids:
        team = team_by_id.get(cid)
        if not team:
            result[cid] = fallback
            continue
        if team.library_party_id and team.library_party_id in lp_names:
            result[cid] = lp_names[team.library_party_id]
        elif team.user_id and team.user_id in user_names:
            result[cid] = user_names[team.user_id]
        else:
            result[cid] = fallback

    return result
