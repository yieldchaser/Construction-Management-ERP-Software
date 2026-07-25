"""
Central domain constants and canonical discriminator definitions for SiteFlow backend.
"""

CANONICAL_INVOICE_TYPES = (
    "sale",
    "purchase",
    "subcon",
    "material_sale",
    "material_return",
    "material_transfer",
    "expense",
    "equipment",
)

INVOICE_TYPE_PATTERN = f"^({'|'.join(CANONICAL_INVOICE_TYPES)})$"

REVENUE_INVOICE_TYPES = ("sale", "material_sale")
EXPENSE_INVOICE_TYPES = ("purchase", "subcon", "expense", "equipment", "material_transfer")
