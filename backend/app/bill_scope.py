"""Shared Bill-aggregation scope (R2-723) + shared classifier (D3).

Every Budget-vs-Actual / tower / BI aggregation must price only ACTIVE bills:
a bill whose status is "Cancelled" must never book cost or revenue. This module
holds the single query scope so the exclusion cannot drift per-router again
(R2-232 landed it in finance.py; this sweeps the remaining routers).

D3: KEEP Bill and Payment duality and classify explicitly. This module is the
ONE shared classifier for Bill.invoice_type buckets (revenue / expense /
settlement / movement). All aggregations and the Tally exporter must route
through classify_invoice_type or its is_* helpers so settlement types cannot
leak into revenue/expense totals. The canonical tuples live in
app.constants; the classification logic lives here and is re-exported from
constants for lightweight imports.
"""
from sqlalchemy.orm import Session

from app.constants import (
    BILL_BUCKET_EXPENSE,
    BILL_BUCKET_MOVEMENT,
    BILL_BUCKET_REVENUE,
    BILL_BUCKET_SETTLEMENT,
    BILL_BUCKET_UNKNOWN,
    EXPENSE_INVOICE_TYPES,
    MOVEMENT_INVOICE_TYPES,
    REVENUE_INVOICE_TYPES,
    SETTLEMENT_INVOICE_TYPES,
    SETTLEMENT_MONEY_IN_TYPES,
    SETTLEMENT_MONEY_OUT_TYPES,
    classify_invoice_type,
    is_expense_invoice_type,
    is_movement_invoice_type,
    is_revenue_invoice_type,
    is_settlement_invoice_type,
    is_settlement_money_in,
    is_settlement_money_out,
)
from app.models import Bill


def _active_bills(db: Session, project_id, invoice_types):
    """Query of a project's bills restricted to invoice_types, excluding Cancelled."""
    return db.query(Bill).filter(
        Bill.project_id == project_id,
        Bill.invoice_type.in_(invoice_types),
        Bill.status != "Cancelled",
    )


__all__ = [
    "_active_bills",
    "classify_invoice_type",
    "is_revenue_invoice_type",
    "is_expense_invoice_type",
    "is_settlement_invoice_type",
    "is_movement_invoice_type",
    "is_settlement_money_in",
    "is_settlement_money_out",
    "BILL_BUCKET_REVENUE",
    "BILL_BUCKET_EXPENSE",
    "BILL_BUCKET_SETTLEMENT",
    "BILL_BUCKET_MOVEMENT",
    "BILL_BUCKET_UNKNOWN",
]
