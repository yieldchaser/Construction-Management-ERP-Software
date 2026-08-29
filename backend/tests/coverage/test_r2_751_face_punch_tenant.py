"""R2-751 - POST /face/punch must be tenant-checked like the rest of its router.

The face-recognition router is authenticated at router level, and R2-027's
closure correctly established that against an earlier "no auth" claim.
Authentication is not the gap -- authorization is. The three read endpoints all
use verify_company_access; the one write used nothing, and persisted a
client-supplied company_id and project_id verbatim.

So any authenticated user of any tenant could POST a punch naming another
tenant's company and project. It was written, and then visible to the victim
through GET /face/logs/{company_id}, which is guarded -- so the victim saw a
legitimate-looking punch for one of their projects that nobody in their company
created. A face-recognition log is presented as biometric evidence of presence,
so an injected row is evidence-shaped.

The 180 cross-tenant probes over 106 routes were GET only -- a limitation the
round-2 handover states and parks as "write-path isolation unproven". This is
the second confirmed instance of that gap in round 3 after R2-049. F3 asks for
the class to be gated, not the instance, so this file carries both.
"""
import ast
import pathlib
import uuid

from app import models

PUNCH = "/apis/v3/face/punch"

ROUTERS = pathlib.Path(__file__).resolve().parents[2] / "app" / "routers"

WRITE_METHODS = {"post", "put", "patch", "delete"}

# Anything that establishes the caller belongs to the company being written to.
TENANT_GUARDS = {
    "get_company_membership",
    "verify_company_access",
    "verify_project_in_company",
    "verify_project_access",
    "require_permission",
}


def _punch(client, hdr, company_id, project_id, employee_id):
    return client.post(PUNCH, json={
        "company_id": str(company_id),
        "project_id": str(project_id),
        "employee_id": str(employee_id),
        "punch_type": "in",
        "face_verified": True,
        "confidence_score": 0.99,
    }, headers=hdr)


def _project(db, company_id, name):
    p = models.Project(id=uuid.uuid4(), company_id=company_id, name=name, status="Ongoing")
    db.add(p)
    db.commit()
    return p


# --- the defect itself -----------------------------------------------------

def test_punch_into_another_tenant_is_rejected(client, db, make_tenant, auth_headers):
    comp_a, user_a, _ = make_tenant(company_name="R751A", user_name="U751A")
    comp_b, _user_b, _ = make_tenant(company_name="R751B", user_name="U751B")

    project_b = _project(db, comp_b.id, "R751B Project")
    employee_b = models.StaffEmployee(
        id=uuid.uuid4(), company_id=comp_b.id, project_id=project_b.id,
        name="B Employee", status="active",
    )
    db.add(employee_b)
    db.commit()

    r = _punch(client, auth_headers(user_a, comp_a), comp_b.id, project_b.id, employee_b.id)
    assert r.status_code == 403, (
        f"a member of company A wrote a punch into company B (got {r.status_code})"
    )

    assert db.query(models.FaceRecognitionLog).filter(
        models.FaceRecognitionLog.company_id == comp_b.id
    ).count() == 0, "a cross-tenant face punch row was created"


def test_punch_into_own_company_is_allowed(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R751C", user_name="U751C")
    project = _project(db, comp.id, "R751C Project")
    employee = models.StaffEmployee(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        name="C Employee", status="active",
    )
    db.add(employee)
    db.commit()

    r = _punch(client, auth_headers(user, comp), comp.id, project.id, employee.id)
    assert r.status_code == 201, r.text


def test_project_of_another_company_is_rejected(client, db, make_tenant, auth_headers):
    """Even for your own company, the project must belong to it."""
    comp_a, user_a, _ = make_tenant(company_name="R751D", user_name="U751D")
    comp_b, _user_b, _ = make_tenant(company_name="R751E", user_name="U751E")

    own_project = _project(db, comp_a.id, "R751D Project")
    foreign_project = _project(db, comp_b.id, "R751E Project")
    employee = models.StaffEmployee(
        id=uuid.uuid4(), company_id=comp_a.id, project_id=own_project.id,
        name="D Employee", status="active",
    )
    db.add(employee)
    db.commit()

    r = _punch(client, auth_headers(user_a, comp_a), comp_a.id, foreign_project.id, employee.id)
    assert r.status_code in (403, 404), r.text


# --- the class: write paths taking company_id in the body -------------------

# Parameters that are never a request body.
_NOT_BODY = {"db", "current_user", "request", "models", "self", "response"}


def _write_handlers_with_body_company_id():
    """Write endpoints that read a company_id off a body/model, not the path.

    Two details matter, both learned from false positives:
      - The dominant guard idiom in this codebase is a FastAPI DEPENDENCY in the
        signature (`_: None = Depends(verify_project_access)`) or in the
        decorator's dependencies=[] list, not a call in the body. A body-only
        scan flags six correctly-guarded endpoints as unprotected.
      - `company_id` reached through a local variable (handoff.company_id,
        proj.company_id) is a row read, not a caller-supplied field. Only
        parameter names count as a body.
    """
    found = []
    for path in sorted(ROUTERS.glob("*.py")):
        tree = ast.parse(path.read_text(encoding="utf-8-sig"))

        # Request models declared in this file that carry a company_id field.
        models_with_company_id = set()
        for node in ast.walk(tree):
            if not isinstance(node, ast.ClassDef):
                continue
            for stmt in node.body:
                target = getattr(stmt, "target", None)
                if isinstance(target, ast.Name) and target.id == "company_id":
                    models_with_company_id.add(node.name)

        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue

            is_write = False
            for dec in node.decorator_list:
                target = dec.func if isinstance(dec, ast.Call) else dec
                if isinstance(target, ast.Attribute) and target.attr in WRITE_METHODS:
                    # router.post(...), app.post(...) -- any router object.
                    if isinstance(target.value, ast.Name):
                        is_write = True
            if not is_write:
                continue

            param_names = {
                a.arg for a in node.args.args
                if a.arg not in _NOT_BODY and not a.arg.startswith("_")
            }

            # A handler can carry a caller-supplied company_id without ever
            # naming it -- the original face_punch was
            # `FaceRecognitionLog(**payload.model_dump())`. So also treat a
            # parameter as a body source when its annotated request model
            # declares a company_id field.
            annotated_models = {
                a.annotation.id
                for a in node.args.args
                if isinstance(a.annotation, ast.Name)
            }
            model_carries_company_id = any(
                cls in models_with_company_id for cls in annotated_models
            )

            body_company_id = False
            guarded = False
            for n in ast.walk(node):
                # payload.company_id / req.company_id -- a caller-supplied field.
                if isinstance(n, ast.Attribute) and n.attr == "company_id":
                    if isinstance(n.value, ast.Name) and n.value.id in param_names:
                        body_company_id = True
                # A guard called in the body...
                if isinstance(n, ast.Call) and isinstance(n.func, ast.Name):
                    if n.func.id in TENANT_GUARDS:
                        guarded = True
                # ...or declared as a dependency: Depends(guard) anywhere,
                # in a parameter default or in dependencies=[...].
                if isinstance(n, ast.Call) and getattr(n.func, "id", None) == "Depends":
                    for arg in n.args:
                        if isinstance(arg, ast.Name) and arg.id in TENANT_GUARDS:
                            guarded = True
                        if isinstance(arg, ast.Call) and getattr(arg.func, "id", None) in TENANT_GUARDS:
                            guarded = True

            if body_company_id or model_carries_company_id:
                found.append((path.name, node.name, node.lineno, guarded))
    return found


def test_scan_finds_write_handlers_taking_body_company_id():
    found = _write_handlers_with_body_company_id()
    assert found, "the scan found none -- the mechanism moved"


def test_every_write_taking_body_company_id_is_tenant_checked():
    """The gate F3 asks for: pin the class, not the instance.

    The 180-probe isolation sweep was GET only, and this is the second
    write-path tenancy defect of round 3. A per-finding pin would have stayed
    green while /face/punch was open.
    """
    found = _write_handlers_with_body_company_id()
    unguarded = [
        f"{fname}:{lineno} {fn}()"
        for fname, fn, lineno, guarded in found
        if not guarded
    ]
    assert not unguarded, (
        "these write endpoints accept a company_id in the body without any "
        "tenant guard, so a caller can name another tenant: "
        + ", ".join(unguarded)
    )


def test_face_punch_is_covered_by_the_scan():
    names = {(fname, fn) for fname, fn, _ln, _g in _write_handlers_with_body_company_id()}
    assert ("face_recognition.py", "face_punch") in names, (
        "face_punch is no longer detected as a body-company_id write path"
    )
