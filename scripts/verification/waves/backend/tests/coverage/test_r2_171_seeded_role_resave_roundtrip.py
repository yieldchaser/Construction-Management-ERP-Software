"""R2-171 - two seeded roles (Manager, Project partner) held ten `:approve`
keys for modules missing from WORKFLOW_MODULES, so validate_permissions
rejected their stored sets and re-saving either role unchanged returned
400 "Unknown permission key: 'crm:approve'" - permanently un-editable through
the Roles & Access matrix, while the matrix editor's draft silently stripped
the same keys on save.

Evidence-close: WORKFLOW_MODULES now covers every module the presets grant
`:approve` for (landed with R2-170/R2-172), the frontend rbac.ts mirror is
pinned to it, and test_r2_172_preset_keys_representable.py pins every preset
key against ALL_PERMISSION_KEYS. This file re-runs the auditor's exact live
probe at the API level - PUT each affected role's full stored permission set
back unchanged - and asserts it round-trips 200 instead of 400.
"""
from app.permissions import ALL_PERMISSION_KEYS, DEFAULT_ROLE_PRESETS


def _audit_ten_keys():
    """The exact keys the finding listed as ungrantable."""
    return (
        "crm:approve", "safety:approve", "quality:approve", "reports:approve",
        "drawings:approve", "planning:approve", "projects:approve",
        "equipment:approve", "attendance:approve", "production:approve",
    )


def test_audit_probe_named_roles_resave_unchanged_round_trip(
    client, make_tenant, auth_headers
):
    comp, owner, _ = make_tenant(company_name="R2-171", user_name="Owner")
    hdr = auth_headers(owner, comp)

    for role_name in ("Manager", "Project partner"):
        stored = DEFAULT_ROLE_PRESETS[role_name]
        assert all(k in ALL_PERMISSION_KEYS for k in stored), (
            f"{role_name} still holds a key outside the taxonomy"
        )

        r = client.post(
            f"/apis/v3/settings/roles/{comp.id}",
            json={"role_name": f"{role_name} R2-171 Probe"},
            headers=hdr,
        )
        assert r.status_code == 200, r.text
        role_id = r.json()["id"]

        # The auditor's exact operation: read the role's permissions and PUT
        # them back unchanged - previously 400 Unknown permission key.
        r2 = client.put(
            f"/apis/v3/settings/roles/{role_id}/permissions",
            json={"permissions": stored},
            headers=hdr,
        )
        assert r2.status_code == 200, (
            f"{role_name} still un-re-saveable via the API: {r2.text}"
        )
        back = r2.json()["permissions"]
        for key, value in stored.items():
            assert back.get(key) is value, f"{role_name}: {key} not persisted"


def test_manager_stored_set_contains_all_ten_audit_keys():
    """Manager's grant set really does exercise every key the finding named -
    if a later trim drops one from the preset this probe stops covering it."""
    manager = DEFAULT_ROLE_PRESETS["Manager"]
    missing = [k for k in _audit_ten_keys() if k not in manager or not manager[k]]
    assert not missing, f"Manager preset no longer grants: {missing}"
