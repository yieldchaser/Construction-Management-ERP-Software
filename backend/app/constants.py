"""
Central domain constants and canonical discriminator definitions for SiteFlow backend.
"""

CANONICAL_INVOICE_TYPES = (
    "sale", "material_sale",
    "purchase", "subcon", "expense", "equipment",
    "material_transfer", "material_return",
    "payment_in", "payment_out", "i_paid", "i_received",
)
INVOICE_TYPE_PATTERN = f"^({'|'.join(CANONICAL_INVOICE_TYPES)})$"

REVENUE_INVOICE_TYPES = ("sale", "material_sale")
EXPENSE_INVOICE_TYPES = ("purchase", "subcon", "expense", "equipment")
SETTLEMENT_INVOICE_TYPES = ("payment_in", "payment_out", "i_paid", "i_received")
MOVEMENT_INVOICE_TYPES = ("material_transfer", "material_return")

SETTLEMENT_MONEY_IN_TYPES = ("payment_in", "i_received")
SETTLEMENT_MONEY_OUT_TYPES = ("payment_out", "i_paid")

BILL_BUCKET_REVENUE = "revenue"
BILL_BUCKET_EXPENSE = "expense"
BILL_BUCKET_SETTLEMENT = "settlement"
BILL_BUCKET_MOVEMENT = "movement"
BILL_BUCKET_UNKNOWN = "unknown"


def classify_invoice_type(invoice_type: str) -> str:
    """Classify a Bill.invoice_type into one shared bucket.

    Single source of truth for D3. Every aggregation and the Tally exporter
    must route through this helper so settlement types cannot leak into
    revenue or expense totals. Unknown types return BILL_BUCKET_UNKNOWN.
    """
    if invoice_type in REVENUE_INVOICE_TYPES:
        return BILL_BUCKET_REVENUE
    if invoice_type in EXPENSE_INVOICE_TYPES:
        return BILL_BUCKET_EXPENSE
    if invoice_type in SETTLEMENT_INVOICE_TYPES:
        return BILL_BUCKET_SETTLEMENT
    if invoice_type in MOVEMENT_INVOICE_TYPES:
        return BILL_BUCKET_MOVEMENT
    return BILL_BUCKET_UNKNOWN


def is_revenue_invoice_type(invoice_type: str) -> bool:
    return invoice_type in REVENUE_INVOICE_TYPES


def is_expense_invoice_type(invoice_type: str) -> bool:
    return invoice_type in EXPENSE_INVOICE_TYPES


def is_settlement_invoice_type(invoice_type: str) -> bool:
    return invoice_type in SETTLEMENT_INVOICE_TYPES


def is_movement_invoice_type(invoice_type: str) -> bool:
    return invoice_type in MOVEMENT_INVOICE_TYPES


def is_settlement_money_in(invoice_type: str) -> bool:
    return invoice_type in SETTLEMENT_MONEY_IN_TYPES


def is_settlement_money_out(invoice_type: str) -> bool:
    return invoice_type in SETTLEMENT_MONEY_OUT_TYPES

MILESTONE_TYPES = ("start", "inspection", "critical", "payment", "handover")
MILESTONE_TYPE_PATTERN = f"^({'|'.join(MILESTONE_TYPES)})$"
MILESTONE_STATUSES = ("upcoming", "achieved")
MILESTONE_STATUS_PATTERN = f"^({'|'.join(MILESTONE_STATUSES)})$"
PREDECESSOR_LINK_TYPES = ("finish_to_start",)
PREDECESSOR_LINK_TYPE_PATTERN = f"^({'|'.join(PREDECESSOR_LINK_TYPES)})$"

WASTAGE_TYPES = ("scrap", "offcut", "damaged", "expired", "theft")
WASTAGE_TYPE_PATTERN = f"^({'|'.join(WASTAGE_TYPES)})$"

WASTAGE_STATUSES = ("reported", "reviewed", "approved", "disposed")
WASTAGE_STATUS_PATTERN = f"^({'|'.join(WASTAGE_STATUSES)})$"

CANONICAL_PROJECT_STATUSES = (
    "Not Started", "Planning", "Ongoing", "On Hold", "Onhold", "Completed", "Cancelled",
)
PROJECT_STATUS_PATTERN = f"^({'|'.join(CANONICAL_PROJECT_STATUSES)})$"
