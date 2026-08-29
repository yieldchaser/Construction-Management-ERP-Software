"""Finding R2-757: Role permissions editor preserves stored keys outside current taxonomy.

Clauses:
1. RolePermissionsModal.tsx buildInitialDraft seeds from input perms so unknown/legacy keys are not dropped.
2. Out-of-taxonomy keys are rendered in the modal UI under Preserved Legacy Permissions.
3. setAll preserves unknown keys in draft state rather than discarding them.
"""
import os
import io


def test_r2_757_role_permissions_modal_preserves_unknown_keys():
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    modal_file = os.path.join(repo_root, "frontend", "src", "components", "rbac", "RolePermissionsModal.tsx")
    assert os.path.exists(modal_file), f"Modal file not found: {modal_file}"

    content = io.open(modal_file, encoding="utf-8").read()

    # Clause 1: buildInitialDraft starts by copying perms
    assert "perms ? { ...perms } : {}" in content
    # Clause 2: unrecognisedKeys computed and rendered
    assert "unrecognisedKeys" in content
    assert "Preserved Legacy Permissions" in content
    # Clause 3: setAll merges over prev
    assert "next: PermissionDict = { ...prev }" in content
