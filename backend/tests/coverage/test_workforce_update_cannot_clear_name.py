"""LibraryWorkforce.name is NOT NULL, but WorkforceUpdate.name is Optional.

update_library_workforce applies model_dump(exclude_unset=True) so a partial
update can omit any field. That is correct, and it is also why an explicit
{"name": null} used to reach the database: exclude_unset keeps a key that was
sent, so setattr wrote None into a NOT NULL column. The global IntegrityError
handler then turned that into a 409 Conflict, so the caller was told their edit
collided with existing data rather than that the field was required. Verified:
against the unfixed router this file fails at `assert 409 == 422`.

Clauses:
1. PUT with an explicit null name is rejected 422, not 500.
2. PUT with a blank name is rejected 422.
3. Omitting name entirely still updates the other fields and leaves name intact.
4. The optional fields can still be cleared to null, which is what
   exclude_unset was introduced for.
"""
import uuid

from app import models


def _workforce(db, comp):
    item = models.LibraryWorkforce(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="Mason",
        rate_type="shift",
        cost_code="CC-100",
    )
    db.add(item)
    db.commit()
    return item


def test_explicit_null_name_is_rejected(client, db, make_tenant, auth_headers):
    sfx = uuid.uuid4().hex[:8]
    comp, user, team = make_tenant(
        company_name=f"WfName-{sfx}", user_name=f"UWfName-{sfx}",
        mobile=f"+9193{sfx}", email=f"wfname-{sfx}@test.com",
    )
    hdr = auth_headers(user, comp)
    item = _workforce(db, comp)

    r = client.put(f"/apis/v3/library/workforces/{item.id}", json={"name": None}, headers=hdr)
    assert r.status_code == 422, (
        "explicit null name must be rejected by the schema; "
        f"got {r.status_code}, which means it reached the NOT NULL column"
    )

    r = client.put(f"/apis/v3/library/workforces/{item.id}", json={"name": "   "}, headers=hdr)
    assert r.status_code == 422, f"blank name must be rejected; got {r.status_code}"

    db.refresh(item)
    assert item.name == "Mason", "name must be unchanged after a rejected update"


def test_omitting_name_still_updates_other_fields(client, db, make_tenant, auth_headers):
    sfx = uuid.uuid4().hex[:8]
    comp, user, team = make_tenant(
        company_name=f"WfPartial-{sfx}", user_name=f"UWfPartial-{sfx}",
        mobile=f"+9194{sfx}", email=f"wfpartial-{sfx}@test.com",
    )
    hdr = auth_headers(user, comp)
    item = _workforce(db, comp)

    r = client.put(f"/apis/v3/library/workforces/{item.id}", json={"shift_hours": 9}, headers=hdr)
    assert r.status_code == 200, r.text
    db.refresh(item)
    assert item.name == "Mason", "omitted name must not be nulled"
    assert float(item.shift_hours) == 9.0


def test_optional_fields_can_still_be_cleared(client, db, make_tenant, auth_headers):
    """The reason exclude_unset was introduced. Guard it against a revert to
    `if payload.X is not None`, which silently ignores a clear."""
    sfx = uuid.uuid4().hex[:8]
    comp, user, team = make_tenant(
        company_name=f"WfClear-{sfx}", user_name=f"UWfClear-{sfx}",
        mobile=f"+9195{sfx}", email=f"wfclear-{sfx}@test.com",
    )
    hdr = auth_headers(user, comp)
    item = _workforce(db, comp)

    r = client.put(f"/apis/v3/library/workforces/{item.id}", json={"cost_code": None}, headers=hdr)
    assert r.status_code == 200, r.text
    db.refresh(item)
    assert item.cost_code is None, "an optional field sent as null must be cleared"
