"""R2-536 regression pin: every deletion in the product records who performed
it. log_deletion accepted a deleted_by argument that all 30 call sites omitted,
so every DeleteLog row in the platform read as having been deleted by nobody.
Two guards: a mechanical AST scan over the routers (no call site may omit the
actor, and the parameter stays required so future ones cannot either), plus an
API behavior check on the CRM lead delete path."""
import ast
import glob
import os
import uuid

from app import models
from app.routers.delete_logs import log_deletion
import inspect


def test_log_deletion_signature_requires_deleted_by():
    sig = inspect.signature(log_deletion)
    param = sig.parameters["deleted_by"]
    assert param.kind == inspect.Parameter.KEYWORD_ONLY, (
        "deleted_by must stay keyword-only"
    )
    assert param.default is inspect.Parameter.empty, (
        "deleted_by must be required: a new call site must not be able to omit it"
    )


def test_every_log_deletion_call_site_passes_the_actor():
    routers_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "app", "routers",
    )
    offenders = []
    for path in sorted(glob.glob(os.path.join(routers_dir, "*.py"))):
        tree = ast.parse(open(path, encoding="utf-8").read())
        for node in ast.walk(tree):
            if isinstance(node, ast.Call) and getattr(node.func, "id", "") == "log_deletion":
                if not any(kw.arg == "deleted_by" for kw in node.keywords):
                    offenders.append(f"{os.path.basename(path)}:{node.lineno}")
    assert not offenders, f"log_deletion calls missing deleted_by=: {offenders}"


def test_crm_lead_delete_log_records_actor(client, db, make_tenant, auth_headers):
    comp, user_a, _ = make_tenant(company_name="A", user_name="Deleter Dana", mobile="+919999993201")
    r = client.post(
        "/apis/v3/crm/leads",
        json={"company_id": str(comp.id), "lead_type": "New", "contact_name": "Lead R536", "phone_no": "+919999999901"},
        headers=auth_headers(user_a, comp),
    )
    assert r.status_code == 201
    lead_id = r.json()["id"]

    r2 = client.delete(f"/apis/v3/crm/leads/{lead_id}", headers=auth_headers(user_a, comp))
    assert r2.status_code == 204

    log = (
        db.query(models.DeleteLog)
        .filter(models.DeleteLog.entity_type == "crm_lead", models.DeleteLog.entity_id == lead_id)
        .first()
    )
    assert log is not None
    assert log.deleted_by == "Deleter Dana"
