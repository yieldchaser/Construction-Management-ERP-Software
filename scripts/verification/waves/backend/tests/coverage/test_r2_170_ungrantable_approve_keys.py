"""R2-170 - the three server-required approve keys were ungrantable.

`attendance:approve` (hr.py), `drawings:approve` (drawings.py) and
`reports:approve` (reports.py) are enforced by `require_permission`, but
`attendance` / `drawings` / `reports` were missing from `WORKFLOW_MODULES`,
so `validate_permissions` rejected the keys with 400 "Unknown permission key"
and no role could ever hold them (a configured role was permanently 403 on
those approvals). Adding the three modules to WORKFLOW_MODULES makes every
required key grantable; this file pins both halves of that contract.
"""
import re
import uuid
from pathlib import Path

ORPHAN_KEYS = ("attendance:approve", "drawings:approve", "reports:approve")

ROUTERS_DIR = Path(__file__).resolve().parents[2] / "app" / "routers"


def test_orphan_approve_keys_are_grantable_via_roles_api(
    client, db, make_tenant, auth_headers
):
    comp, owner, _ = make_tenant(company_name="R2-170", user_name="Owner")
    hdr = auth_headers(owner, comp)

    r = client.post(
        f"/apis/v3/settings/roles/{comp.id}",
        json={"role_name": "Approvals Holder"},
        headers=hdr,
    )
    assert r.status_code == 200, r.text
    role_id = r.json()["id"]

    perms = {k: True for k in ORPHAN_KEYS}
    r = client.put(
        f"/apis/v3/settings/roles/{role_id}/permissions",
        json={"permissions": perms},
        headers=hdr,
    )
    assert r.status_code == 200, r.text
    stored = r.json()["permissions"]
    for k in ORPHAN_KEYS:
        assert stored.get(k) is True, f"{k} was not persisted"

    db.expire_all()
    from app import models

    role = db.query(models.CompanyRole).filter_by(id=uuid.UUID(role_id)).first()
    for k in ORPHAN_KEYS:
        assert role.permissions.get(k) is True


def test_every_required_permission_key_exists_in_taxonomy():
    """Mechanical half of R2-170: no router may require_permission() a key the
    taxonomy cannot grant. Re-introducing an orphan key must fail here."""
    from app.permissions import ALL_PERMISSION_KEYS

    call = re.compile(r"require_permission\(")
    literal = re.compile(r'"([a-z_]+:(?:view|edit|approve|run|manage|delete))"')
    required = set()
    for path in sorted(ROUTERS_DIR.glob("*.py")):
        src = path.read_text(encoding="utf-8")
        for m in call.finditer(src):
            depth, i = 1, m.end()
            while depth and i < len(src):
                if src[i] == "(":
                    depth += 1
                elif src[i] == ")":
                    depth -= 1
                i += 1
            required.update(literal.findall(src[m.end():i - 1]))

    assert required, "scanner found no require_permission keys; scanner is broken"
    orphans = sorted(required - ALL_PERMISSION_KEYS)
    assert not orphans, f"required but ungrantable permission keys: {orphans}"
