"""Shared resolution of a CompanyTeam reference to a human-readable party name.

External counterparties (vendors / subcontractors with no platform login) are
stored as a CompanyTeam row with user_id NULL and the real name reachable only
through library_party_id -> LibraryParty.name, so any lookup that walks the
users table alone must fail for the normal external case (R2-131).
"""

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
