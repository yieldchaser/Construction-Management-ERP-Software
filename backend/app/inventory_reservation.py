"""Shared inventory reservation helpers.
Ensures WarehouseInventory.reserved_qty and MaterialIndentItem.reserved_qty
stay synchronized across all stock movement paths (DPR consumption, DPR reversal,
manual transactions, write-offs, and indent cancellations).
"""
import uuid
from typing import Optional
from sqlalchemy.orm import Session
from app.models import WarehouseInventory, MaterialIndent, MaterialIndentItem


def release_reservation(db: Session, project_id: uuid.UUID, material_name: str, qty: float) -> float:
    """Release up to `qty` of held stock for (project, material).
    Decrements WarehouseInventory.reserved_qty and draws down the
    MaterialIndentItem rows that hold it, oldest approved/ordered indent first.
    Returns the amount actually released."""
    if qty <= 0:
        return 0.0

    inv = db.query(WarehouseInventory).filter(
        WarehouseInventory.project_id == project_id,
        WarehouseInventory.material_name == material_name,
    ).first()

    if not inv or float(inv.reserved_qty or 0) <= 0:
        return 0.0

    released = min(float(inv.reserved_qty), float(qty))
    inv.reserved_qty = max(0.0, float(inv.reserved_qty) - released)
    db.add(inv)

    # Draw down MaterialIndentItem rows holding reservations for this project and material, oldest approved first
    items = (
        db.query(MaterialIndentItem)
        .join(MaterialIndent, MaterialIndentItem.indent_id == MaterialIndent.id)
        .filter(
            MaterialIndent.project_id == project_id,
            MaterialIndent.status.in_(["approved", "ordered"]),
            MaterialIndentItem.material_name == material_name,
            MaterialIndentItem.reserved_qty > 0,
        )
        .order_by(
            MaterialIndent.approved_at.asc(),
            MaterialIndent.created_at.asc(),
            MaterialIndentItem.created_at.asc(),
            MaterialIndentItem.id.asc(),
        )
        .all()
    )

    remaining_to_draw = released
    for item in items:
        if remaining_to_draw <= 0:
            break
        item_reserved = float(item.reserved_qty or 0)
        draw = min(item_reserved, remaining_to_draw)
        item.reserved_qty = max(0.0, item_reserved - draw)
        remaining_to_draw -= draw
        db.add(item)

    return released


def rereserve_reservation(db: Session, project_id: uuid.UUID, material_name: str, qty: float) -> float:
    """Re-reserve up to `qty` of stock for (project, material) upon reversal.
    Re-increments WarehouseInventory.reserved_qty (capped at on_hand_qty) and
    re-reserves onto MaterialIndentItem rows that were previously drawn down.
    Returns the amount actually re-reserved."""
    if qty <= 0:
        return 0.0

    inv = db.query(WarehouseInventory).filter(
        WarehouseInventory.project_id == project_id,
        WarehouseInventory.material_name == material_name,
    ).first()

    if not inv:
        return 0.0

    current_reserved = float(inv.reserved_qty or 0)
    current_on_hand = float(inv.on_hand_qty or 0)
    max_reservable = max(0.0, current_on_hand - current_reserved)
    to_rereserve = min(float(qty), max_reservable)

    if to_rereserve <= 0:
        return 0.0

    inv.reserved_qty = current_reserved + to_rereserve
    db.add(inv)

    # Re-reserve onto MaterialIndentItem rows that have reserved_qty < quantity, newest first
    items = (
        db.query(MaterialIndentItem)
        .join(MaterialIndent, MaterialIndentItem.indent_id == MaterialIndent.id)
        .filter(
            MaterialIndent.project_id == project_id,
            MaterialIndent.status.in_(["approved", "ordered"]),
            MaterialIndentItem.material_name == material_name,
            MaterialIndentItem.reserved_qty < MaterialIndentItem.quantity,
        )
        .order_by(
            MaterialIndent.approved_at.desc(),
            MaterialIndent.created_at.desc(),
            MaterialIndentItem.created_at.desc(),
            MaterialIndentItem.id.desc(),
        )
        .all()
    )

    remaining_to_restore = to_rereserve
    for item in items:
        if remaining_to_restore <= 0:
            break
        item_qty = float(item.quantity or 0)
        item_res = float(item.reserved_qty or 0)
        room = max(0.0, item_qty - item_res)
        if room > 0:
            add = min(room, remaining_to_restore)
            item.reserved_qty = item_res + add
            remaining_to_restore -= add
            db.add(item)

    return to_rereserve
