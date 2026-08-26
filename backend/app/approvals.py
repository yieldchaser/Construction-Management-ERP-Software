"""Shared enforcement helpers for the ApprovalRule engine.

Wires the ApprovalRule records configured in Settings > Multi Level Approval
into the creation/approval flows for the entities that carry an amount field
(Purchase Order, Payment Request today — see approve endpoints in
procurement.py / finance.py). An entity is "gated" when, at creation time, its
amount falls inside a configured rule's [min_amount, max_amount] range for
its company + feature_type; the rule id it matched is pinned on the entity
(`approval_rule_id`) so later edits to the rule library don't retroactively
change what an already-created record needs.

Per-level sign-off is recorded in ApprovalAction (one row per decision). An
entity is fully approved once the count of "approved" rows against it reaches
the governing rule's `levels`; a single "rejected" row ends the chain.
"""
from typing import Optional
import uuid
from sqlalchemy.orm import Session
from app.models import ApprovalRule, ApprovalAction, User


# ── Canonical Multi Level Approval categories (R2-179) ───────────────────────
# Single source of truth for the Settings > Multi Level Approval category
# labels. The settings router's Literal and every enforcement constant below
# derive from this tuple, so the label that binds a stored rule to the code
# that enforces it can no longer be typed independently per call site (a
# rename there used to silently detach every rule already stored under the old
# label). A contract test pins this tuple to the frontend APPROVAL_CATEGORIES.
APPROVAL_FEATURE_TYPES = (
    "Asset Transfer",
    "Equipment Expense",
    "GRN Material",
    "Material Issue",
    "Material Purchase",
    "Material Transfer",
    "Material Used",
    "Other Expense",
    "Payment Entries",
    "Payment Request",
    "Purchase Order",
    "RFQ",
)

PO_FEATURE_TYPE = "Purchase Order"
PAYMENT_REQUEST_FEATURE_TYPE = "Payment Request"
PAYMENT_ENTRIES_FEATURE_TYPE = "Payment Entries"

assert all(
    t in APPROVAL_FEATURE_TYPES
    for t in (PO_FEATURE_TYPE, PAYMENT_REQUEST_FEATURE_TYPE, PAYMENT_ENTRIES_FEATURE_TYPE)
), "enforcement feature type outside APPROVAL_FEATURE_TYPES"


def find_matching_rule(db: Session, company_id: uuid.UUID, feature_type: str, amount: float) -> Optional[ApprovalRule]:
    """Return the ApprovalRule whose min/max range covers `amount` for this
    company + feature_type, or None if nothing is configured (in which case
    the caller should proceed ungated — unchanged, pre-existing behaviour)."""
    rules = db.query(ApprovalRule).filter(
        ApprovalRule.company_id == company_id,
        ApprovalRule.feature_type == feature_type,
    ).all()
    candidates = [
        r for r in rules
        if amount >= (r.min_amount or 0)
        and (r.max_amount is None or amount <= r.max_amount)
    ]
    if not candidates:
        return None
    # If an admin publishes overlapping ranges, the block with the highest
    # min_amount (the tightest/most specific lower bound) wins.
    candidates.sort(key=lambda r: r.min_amount or 0, reverse=True)
    return candidates[0]


def match_approver(approvers: str, user: Optional[User]) -> Optional[str]:
    """Match the logged-in user against a rule's comma-separated approvers
    list, returning the matched entry (for audit) or None.

    Matches against User.email first — the Settings UI's own placeholder text
    ("e.g. manager@co.in, finance@co.in") assumes emails — and falls back to
    User.name for rows where an admin typed a name instead. Comparison is
    case-insensitive and whitespace-trimmed on both sides.
    """
    if not approvers or not user:
        return None
    email = (user.email or "").strip().lower()
    name = (user.name or "").strip().lower()
    for raw in approvers.split(","):
        candidate = raw.strip()
        if not candidate:
            continue
        low = candidate.lower()
        if (email and low == email) or (name and low == name):
            return candidate
    return None


def levels_approved(db: Session, entity_type: str, entity_id: uuid.UUID) -> int:
    """How many distinct approval levels have already signed off on this entity."""
    return db.query(ApprovalAction).filter(
        ApprovalAction.entity_type == entity_type,
        ApprovalAction.entity_id == entity_id,
        ApprovalAction.action == "approved",
    ).count()


def user_already_acted(db: Session, entity_type: str, entity_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    """A single approver can only satisfy one level of a chain — this stops
    one person from rubber-stamping every required level alone."""
    return db.query(ApprovalAction).filter(
        ApprovalAction.entity_type == entity_type,
        ApprovalAction.entity_id == entity_id,
        ApprovalAction.approver_user_id == user_id,
    ).first() is not None


def record_action(
    db: Session,
    *,
    company_id: uuid.UUID,
    rule_id: Optional[uuid.UUID],
    entity_type: str,
    entity_id: uuid.UUID,
    level: int,
    action: str,
    user: Optional[User],
    matched_label: Optional[str],
    comment: Optional[str] = None,
) -> ApprovalAction:
    row = ApprovalAction(
        company_id=company_id,
        rule_id=rule_id,
        entity_type=entity_type,
        entity_id=entity_id,
        level=level,
        action=action,
        approver_user_id=user.id if user else None,
        approver_label=matched_label,
        comment=comment,
    )
    db.add(row)
    db.flush()
    return row
