"""R2-172 - the permission matrix silently stripped any stored key it did not
recognise, so saving Manager or Project partner revoked ten approve rights
behind a 200 "Permissions saved" toast: buildInitialDraft iterates only the
frontend ALL_PERMISSION_KEYS and save sends only the draft, while
DEFAULT_ROLE_PRESETS grant `:approve` for modules outside WORKFLOW_MODULES -
keys validate_permissions rejects (direct API re-save 400s) and the UI drops
instead. The root fix makes every preset-emitted key representable by covering
all of them in WORKFLOW_MODULES; this file pins that contract permanently.
"""
from app.permissions import ALL_PERMISSION_KEYS, DEFAULT_ROLE_PRESETS


def test_every_seeded_preset_key_is_grantable_and_representable():
    """No default role may hold a key that validate_permissions rejects - such a
    role is un-re-saveable via the API and silently mutilated via the matrix."""
    for name, perms in DEFAULT_ROLE_PRESETS.items():
        unknown = sorted(set(perms) - ALL_PERMISSION_KEYS)
        assert not unknown, (
            f"{name} preset holds keys outside ALL_PERMISSION_KEYS "
            f"(silently stripped on save): {unknown}"
        )


def test_manager_approve_keys_all_render_in_matrix():
    """The ten keys R2-172 caught being revoked must all be first-class keys."""
    for key in (
        "crm:approve",
        "safety:approve",
        "quality:approve",
        "reports:approve",
        "drawings:approve",
        "planning:approve",
        "projects:approve",
        "equipment:approve",
        "attendance:approve",
        "production:approve",
    ):
        assert key in ALL_PERMISSION_KEYS, f"{key} is still ungrantable"


def test_frontend_rbac_mirror_matches_backend_taxonomy():
    """rbac.ts must mirror permissions.py exactly - any drift reopens the
    silent-strip because the modal builds its draft from the frontend list."""
    import re
    from pathlib import Path

    backend = Path(__file__).resolve().parents[2] / "app" / "permissions.py"
    m = re.search(r"WORKFLOW_MODULES = \{(.*?)\}", backend.read_text(encoding="utf-8"), re.S)
    backend_set = set(re.findall(r'"([a-z_]+)"', m.group(1)))

    frontend = (
        Path(__file__).resolve().parents[3]
        / "frontend" / "src" / "lib" / "rbac.ts"
    )
    m = re.search(
        r"WORKFLOW_MODULES: ReadonlySet<string> = new Set\(\[(.*?)\]\)",
        frontend.read_text(encoding="utf-8"),
        re.S,
    )
    frontend_list = re.findall(r'"([a-z_]+)"', m.group(1))
    # Frontend order defines matrix row order; set equality catches drift.
    assert set(frontend_list) == backend_set, (
        f"rbac.ts WORKFLOW_MODULES drifted from permissions.py: "
        f"backend-only={sorted(backend_set - set(frontend_list))}, "
        f"frontend-only={sorted(set(frontend_list) - backend_set)}"
    )
