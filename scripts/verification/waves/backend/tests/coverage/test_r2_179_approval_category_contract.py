"""R2-179 - enforcement was bound to the Settings > Multi Level Approval
category label by exact string match, with that label typed independently in
finance.py ("Payment Entries", "Payment Request"), procurement.py ("Purchase
Order") and settings/page.tsx (APPROVAL_CATEGORIES). Renaming what looks like
a purely cosmetic display label silently detached every rule already stored
under the old label from the code enforcing it. The labels are now defined
once - APPROVAL_FEATURE_TYPES in app/approvals.py - and both routers plus the
settings Literal derive from it; this file pins the whole chain so drift turns
into a red test instead of a silent enforcement gap.
"""
import re
import uuid
from pathlib import Path
from typing import Literal, get_args, get_origin

from app.approvals import (
    APPROVAL_FEATURE_TYPES,
    PO_FEATURE_TYPE,
    PAYMENT_ENTRIES_FEATURE_TYPE,
    PAYMENT_REQUEST_FEATURE_TYPE,
    find_matching_rule,
)
from app.routers.settings import ApprovalRuleCreate


def test_enforcement_constants_are_canonical_categories():
    """Every label an enforcement site matches rules by must be one of the
    canonical categories - a stray literal here is an unenforceable rule."""
    for constant in (
        PO_FEATURE_TYPE,
        PAYMENT_REQUEST_FEATURE_TYPE,
        PAYMENT_ENTRIES_FEATURE_TYPE,
    ):
        assert constant in APPROVAL_FEATURE_TYPES, (
            f"{constant!r} is not a canonical approval category"
        )


def test_settings_literal_matches_canonical_tuple():
    """The API boundary must accept exactly the canonical labels: adding or
    renaming one in approvals.py without the schema following (or vice versa)
    fails here."""
    annotation = ApprovalRuleCreate.model_fields["feature_type"].annotation
    assert get_origin(annotation) is Literal
    assert set(get_args(annotation)) == set(APPROVAL_FEATURE_TYPES)


def test_frontend_categories_mirror_canonical_tuple():
    """settings/page.tsx renders its dropdown from APPROVAL_CATEGORIES; if it
    drifted, admins would configure rules under labels the backend rejects
    (or never enforces). Order matters - it defines the dropdown order."""
    frontend = (
        Path(__file__).resolve().parents[3]
        / "frontend" / "src" / "app" / "c" / "[company_id]" / "settings" / "page.tsx"
    )
    src = frontend.read_text(encoding="utf-8")
    m = re.search(r"const APPROVAL_CATEGORIES = \[(.*?)\]", src, re.S)
    assert m, "APPROVAL_CATEGORIES not found in settings/page.tsx"
    labels = re.findall(r'"([^"]+)"', m.group(1))
    assert labels == list(APPROVAL_FEATURE_TYPES), (
        f"frontend/backend category drift: "
        f"frontend-only={sorted(set(labels) - set(APPROVAL_FEATURE_TYPES))}, "
        f"backend-only={sorted(set(APPROVAL_FEATURE_TYPES) - set(labels))}"
    )


def test_wire_label_matches_enforcement_constant(client, db, make_tenant, auth_headers):
    """Behavior half: a rule created through the API under the canonical wire
    label is matched by the enforcement lookup using the shared constant -
    the exact link R2-179 saw break on any rename."""
    comp, owner, _ = make_tenant(company_name="R2-179", user_name="Owner")
    hdr = auth_headers(owner, comp)

    r = client.post(
        f"/apis/v3/settings/approval-rules/{comp.id}",
        json={
            "feature_type": PO_FEATURE_TYPE,
            "min_amount": 1000,
            "max_amount": None,
            "levels": 1,
            "approvers": owner.name,
        },
        headers=hdr,
    )
    assert r.status_code == 200, r.text
    rule_id = r.json()["id"]
    assert r.json()["feature_type"] == PO_FEATURE_TYPE

    # A renamed / mistyped label is rejected loudly at the boundary instead of
    # being stored to rot as an unenforceable row.
    bad = dict(r.json())
    bad["feature_type"] = "Purchasing Order"
    r2 = client.post(
        f"/apis/v3/settings/approval-rules/{comp.id}", json=bad, headers=hdr
    )
    assert r2.status_code == 422, r2.text

    db.expire_all()
    matched = find_matching_rule(db, comp.id, PO_FEATURE_TYPE, 1500.0)
    assert matched is not None, "stored rule not matched via the shared constant"
    assert str(matched.id) == rule_id
    # Outside the band -> ungated, unchanged pre-existing behaviour.
    assert find_matching_rule(db, comp.id, PAYMENT_REQUEST_FEATURE_TYPE, 1500.0) is None


def test_unknown_feature_types_cannot_gate_at_runtime(db):
    """A legacy/junk feature_type can never satisfy an enforcement lookup:
    matching is by exact canonical label only, so unknown rows fail open
    (documented pre-existing behaviour) rather than gate arbitrarily."""
    from app import models

    comp = models.Company(id=uuid.uuid4(), name="R2-179-junk", currency_decimal_places=2)
    db.add(comp)
    db.flush()
    junk = models.ApprovalRule(
        company_id=comp.id, feature_type="Purchase Orders ",
        min_amount=0, max_amount=None, levels=1, approvers="x",
    )
    db.add(junk)
    db.commit()
    assert find_matching_rule(db, comp.id, PO_FEATURE_TYPE, 9999.0) is None
