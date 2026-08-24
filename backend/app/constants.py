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
