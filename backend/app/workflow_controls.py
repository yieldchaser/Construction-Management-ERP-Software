"""
Workflow Control enforcement helpers.

Company Settings -> Workflow Controls (Entry / Progress / Finance / Material)
stores a set of company-level restriction flags on the `companies` table
(see the Company model). This module centralises the actual enforcement
logic so every router applies the same day-math / stock-math and raises the
same HTTP error shape, instead of re-implementing it per endpoint.
"""
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Company, WarehouseInventory


def get_company(db: Session, company_id: Optional[UUID]) -> Optional[Company]:
    if company_id is None:
        return None
    return db.query(Company).filter(Company.id == company_id).first()


def _as_utc(dt: datetime) -> datetime:
    """Normalise a possibly-naive datetime to UTC-aware so subtraction against
    datetime.now(timezone.utc) never raises."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def enforce_entry_creation_window(db: Session, company_id: Optional[UUID], entry_date: Optional[datetime]) -> None:
    """Settings -> Workflow Controls -> Entry Controls:
    'Restrict creating entries older than (N) days'.

    Blocks creating a dated record (Task, Bill/Transaction, DPR, ...) when its
    date falls more than `restrict_entry_creation_days` days in the past.
    No-op when the flag is off or the entry has no date."""
    if entry_date is None:
        return
    company = get_company(db, company_id)
    if not company or not company.restrict_entry_creation_enabled:
        return
    limit_days = company.restrict_entry_creation_days or 0
    age_days = (datetime.now(timezone.utc) - _as_utc(entry_date)).days
    if age_days > limit_days:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Entry Controls: cannot create an entry dated more than {limit_days} "
                f"day(s) in the past (this entry is {age_days} day(s) old)."
            ),
        )


def enforce_entry_editing_window(db: Session, company_id: Optional[UUID], entry_date: Optional[datetime]) -> None:
    """Settings -> Workflow Controls -> Entry Controls:
    'Restrict editing entries older than (N) days'.

    Blocks editing a record whose own dated field is already more than
    `restrict_entry_editing_days` days in the past. No-op when the flag is
    off or the entry has no date."""
    if entry_date is None:
        return
    company = get_company(db, company_id)
    if not company or not company.restrict_entry_editing_enabled:
        return
    limit_days = company.restrict_entry_editing_days or 0
    age_days = (datetime.now(timezone.utc) - _as_utc(entry_date)).days
    if age_days > limit_days:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Entry Controls: cannot edit an entry dated more than {limit_days} "
                f"day(s) in the past (this entry is {age_days} day(s) old)."
            ),
        )


def enforce_progress_over_estimate(db: Session, company_id: Optional[UUID], new_progress: Optional[float]) -> None:
    """Settings -> Workflow Controls -> Progress Controls:
    'Restrict progress more than estimation'.

    Blocks a task progress update that would push recorded progress beyond
    100% of the linked estimate. No-op when the flag is off."""
    if new_progress is None:
        return
    company = get_company(db, company_id)
    if not company or not company.restrict_progress_over_estimate:
        return
    if float(new_progress) > 100.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Progress Controls: progress cannot exceed 100% of the estimated quantity.",
        )


def enforce_stock_availability(
    db: Session,
    project_id: UUID,
    material_name: str,
    qty: float,
    restriction_label: str,
) -> None:
    """Settings -> Workflow Controls -> Material Controls.

    Shared 'would this push stock negative' check used by Restrict Material
    Usage (negative_stock_lock), Restrict Subcontractor Material Issue,
    Restrict Material Transfer and Restrict Production Material. The caller
    is responsible for checking whether the relevant flag is enabled before
    calling this."""
    inv = db.query(WarehouseInventory).filter(
        WarehouseInventory.project_id == project_id,
        WarehouseInventory.material_name == material_name,
    ).first()
    available = float(inv.on_hand_qty) if inv else 0.0
    if qty > available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"{restriction_label}: insufficient stock for '{material_name}' "
                f"(available {available}, requested {qty})."
            ),
        )
