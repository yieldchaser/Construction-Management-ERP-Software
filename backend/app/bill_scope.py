"""Shared Bill-aggregation scope (R2-723).

Every Budget-vs-Actual / tower / BI aggregation must price only ACTIVE bills:
a bill whose status is "Cancelled" must never book cost or revenue. This module
holds the single query scope so the exclusion cannot drift per-router again
(R2-232 landed it in finance.py; this sweeps the remaining routers).
"""
from sqlalchemy.orm import Session

from app.models import Bill


def _active_bills(db: Session, project_id, invoice_types):
    """Query of a project's bills restricted to invoice_types, excluding Cancelled."""
    return db.query(Bill).filter(
        Bill.project_id == project_id,
        Bill.invoice_type.in_(invoice_types),
        Bill.status != "Cancelled",
    )
