"""R2-608 + R2-609 - finance.py Payment cost-code gate and upload honesty.

R2-609: POST /finance/payments wrote cost_code/sub_cost_code straight from
the request body with no validation, so a typo silently forked a sixth code
that never rolls up with the rest. Same gate as budgeting.py's BOQ import:
codes must exist in the company's Cost Code Library, rejected atomically
with 422 naming the offenders.

R2-608: POST /finance/cashbook/upload wrapped the file read in a generic
except Exception that surfaced raw interpreter internals for any non-text
blob. A user-error input must come back as an honest 400, never a 500 and
never a library message.
"""
import datetime
import io
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _mk_tenant(db, tag):
    comp = models.Company(id=uuid.uuid4(), name=f"R608609-{tag}-{_SUFFIX}", currency_decimal_places=2)
    db.add(comp)
    db.flush()
    user = models.User(
        id=uuid.uuid4(), name=f"U-{tag}-{_SUFFIX}",
        mobile=f"+9196{uuid.uuid4().hex[:8]}", email=f"r608609-{tag}-{_SUFFIX}@test.com",
    )
    db.add(user)
    db.flush()
    team = models.CompanyTeam(id=uuid.uuid4(), company_id=comp.id, user_id=user.id, priority_type="partner")
    db.add(team)
    db.commit()
    return comp, user


def _add_library_code(db, comp, code=None, sub=None):
    row = models.LibraryCostCode(
        id=uuid.uuid4(), company_id=comp.id,
        code=code or f"{sub}-PARENT", sub_cost_code=sub, name=f"CC {code or sub}",
    )
    db.add(row)
    db.commit()
    return row


def _payment_payload(comp, **over):
    body = {
        "company_id": str(comp.id),
        "payment_type": "out",
        "amount": 500.0,
        "payment_method": "Cash",
        "payment_date": datetime.datetime.now().isoformat(),
    }
    body.update(over)
    return body


def _payments_count(db, comp):
    return db.query(models.Payment).filter(models.Payment.company_id == comp.id).count()


def test_payment_rejects_unknown_cost_code_atomically(client, db):
    comp, user = _mk_tenant(db, "a")
    from app.auth import create_access_token
    hdr = {"Authorization": "Bearer " + create_access_token(
        {"sub": str(user.id), "company_id": str(comp.id), "user_name": user.name})}

    r = client.post("/apis/v3/finance/payments", json=_payment_payload(comp, cost_code="TYPO-99"), headers=hdr)
    assert r.status_code == 422, r.text
    detail = r.json()["detail"]
    assert "TYPO-99" in detail
    assert "Cost Code Library" in detail

    # Atomic: nothing was written for the rejected request.
    assert _payments_count(db, comp) == 0


def test_payment_rejects_unknown_sub_cost_code(client, db):
    comp, user = _mk_tenant(db, "b")
    from app.auth import create_access_token
    hdr = {"Authorization": "Bearer " + create_access_token(
        {"sub": str(user.id), "company_id": str(comp.id), "user_name": user.name})}
    _add_library_code(db, comp, code="CC-FIN-1")

    r = client.post(
        "/apis/v3/finance/payments",
        json=_payment_payload(comp, cost_code="CC-FIN-1", sub_cost_code="SUB-GHOST"),
        headers=hdr,
    )
    assert r.status_code == 422, r.text
    assert "SUB-GHOST" in r.json()["detail"]
    assert _payments_count(db, comp) == 0


def test_payment_accepts_library_codes_and_writes_them(client, db):
    comp, user = _mk_tenant(db, "c")
    from app.auth import create_access_token
    hdr = {"Authorization": "Bearer " + create_access_token(
        {"sub": str(user.id), "company_id": str(comp.id), "user_name": user.name})}
    _add_library_code(db, comp, code="CC-FIN-2")
    # One library row carries the code and its sub code (uq on company+code).
    row = db.query(models.LibraryCostCode).filter(
        models.LibraryCostCode.company_id == comp.id,
        models.LibraryCostCode.code == "CC-FIN-2",
    ).first()
    row.sub_cost_code = "SC-77"
    db.commit()

    r = client.post(
        "/apis/v3/finance/payments",
        json=_payment_payload(comp, cost_code="CC-FIN-2", sub_cost_code="SC-77"),
        headers=hdr,
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["cost_code"] == "CC-FIN-2"
    assert body["sub_cost_code"] == "SC-77"


def test_upload_binary_blob_is_honest_400_not_500(client, db):
    comp, user = _mk_tenant(db, "d")
    from app.auth import create_access_token
    hdr = {"Authorization": "Bearer " + create_access_token(
        {"sub": str(user.id), "company_id": str(comp.id), "user_name": user.name})}

    r = client.post(
        "/apis/v3/cashbook/upload",
        data={"company_id": str(comp.id)},
        files={"file": ("payments.xlsx", b"\xff\xfe\x00\x01not-really-csv", "application/octet-stream")},
        headers=hdr,
    )
    assert r.status_code == 400, r.text
    detail = r.json()["detail"]
    # Honest copy naming the fix, free of raw codec internals.
    assert "CSV" in detail
    assert "codec" not in detail
    assert "0xff" not in detail
    assert _payments_count(db, comp) == 0


def test_upload_still_accepts_a_valid_csv(client, db):
    comp, user = _mk_tenant(db, "e")
    from app.auth import create_access_token
    hdr = {"Authorization": "Bearer " + create_access_token(
        {"sub": str(user.id), "company_id": str(comp.id), "user_name": user.name})}

    csv_bytes = io.BytesIO("Payment Type,Party Name,Amount\nout,ACME Supplies,1200\n".encode("utf-8"))
    r = client.post(
        "/apis/v3/cashbook/upload",
        data={"company_id": str(comp.id)},
        files={"file": ("payments.csv", csv_bytes.getvalue(), "text/csv")},
        headers=hdr,
    )
    assert r.status_code == 200, r.text
    assert r.json()["created"] == 1
