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
