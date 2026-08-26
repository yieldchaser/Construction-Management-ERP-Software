"""R2-178 / CD-1 - the Multi Level Approval screen offered categories no code
path enforces, so an admin could build a chain (say "GRN Material above 5
lakh") that silently approves nothing: a compliance control failing in the
permissive direction. The offered set is now cut to exactly the labels an
enforcement constant consults ("Payment Entries", "Payment Request",
"Purchase Order"), and rules already stored under removed labels must survive
untouched in the database - hidden from the UI, never deleted by any save or
list round-trip - so wiring such a category later reactivates real intent.
"""
import uuid
from typing import get_args

from app import models
from app.approvals import (
    APPROVAL_FEATURE_TYPES,
    PAYMENT_ENTRIES_FEATURE_TYPE,
    PAYMENT_REQUEST_FEATURE_TYPE,
    PO_FEATURE_TYPE,
    find_matching_rule,
)
from app.routers.settings import ApprovalRuleCreate

WIRED = {PAYMENT_ENTRIES_FEATURE_TYPE, PAYMENT_REQUEST_FEATURE_TYPE, PO_FEATURE_TYPE}
HIDDEN_LEGACY = "GRN Material"


def _seed_legacy_rule(db, company_id):
    rule = models.ApprovalRule(
        company_id=company_id,
        feature_type=HIDDEN_LEGACY,
        min_amount=500000,
        max_amount=None,
        levels=3,
        approvers="owner@co.in",
    )
    db.add(rule)
    db.commit()
    return rule


def test_offered_categories_are_exactly_the_enforced_set():
    """The creation boundary offers precisely the wired labels: every one has
    an enforcement constant, and nothing else can be configured into a rule
    nothing would ever consult."""
    assert set(APPROVAL_FEATURE_TYPES) == WIRED
    annotation = ApprovalRuleCreate.model_fields["feature_type"].annotation
    assert set(get_args(annotation)) == WIRED


def test_hidden_category_not_creatable_and_legacy_row_survives_roundtrip(client, db, make_tenant, auth_headers):
    comp, owner, _ = make_tenant(company_name="R2-178", user_name="Owner")
    hdr = auth_headers(owner, comp)

    # Pre-existing data: a rule stored under a now-hidden category.
    legacy = _seed_legacy_rule(db, comp.id)
    legacy_id = legacy.id

    url = f"/apis/v3/settings/approval-rules/{comp.id}"
    body = {"min_amount": 1000, "max_amount": None, "levels": 1, "approvers": owner.name}

    r_hidden = client.post(url, json={"feature_type": HIDDEN_LEGACY, **body}, headers=hdr)
    assert r_hidden.status_code == 422, r_hidden.text

    for ft in sorted(WIRED):
        ok = client.post(url, json={"feature_type": ft, **body}, headers=hdr)
        assert ok.status_code == 200, ok.text

    listed = client.get(url, headers=hdr).json()
    by_id = {row["id"]: row for row in listed}
    assert len(listed) == 1 + len(WIRED), "save round-trip must not add or drop rows"

    kept = by_id[str(legacy_id)]
    assert kept["feature_type"] == HIDDEN_LEGACY
    assert kept["min_amount"] == 500000.0
    assert kept["max_amount"] is None
    assert kept["levels"] == 3
    assert kept["approvers"] == "owner@co.in"

    db.expire_all()
    assert (
        db.query(models.ApprovalRule).filter(models.ApprovalRule.id == legacy_id).first()
        is not None
    ), "hidden-category rule was deleted by a code path"


def test_matching_still_scopes_by_exact_label_after_the_cut(db, make_tenant):
    """find_matching_rule behaviour is unchanged: wired labels match their
    stored rules; a hidden-category row can only ever satisfy a lookup made
    under its own exact string, which no enforcement site issues, so it stays
    inert while every wired constant keeps matching."""
    comp, owner, _ = make_tenant(company_name="R2-178-match", user_name="Owner")
    _seed_legacy_rule(db, comp.id)

    rule = models.ApprovalRule(
        company_id=comp.id,
        feature_type=PO_FEATURE_TYPE,
        min_amount=0,
        max_amount=None,
        levels=1,
        approvers="owner@co.in",
    )
    db.add(rule)
    db.commit()

    assert find_matching_rule(db, comp.id, PO_FEATURE_TYPE, 1000.0) is not None
    for ft in WIRED:
        assert ft in APPROVAL_FEATURE_TYPES
