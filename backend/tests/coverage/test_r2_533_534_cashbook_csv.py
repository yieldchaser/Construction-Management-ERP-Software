"""R2-533 + R2-534 - the cashbook payments CSV importer.

R2-533 is four compounding defects in the single handler `upload_payments`:

  1. `reference_number` falls back to a random value when the file has no
     Payment Request ID, so nothing identifies a row as already imported and
     re-uploading one statement books every payment a second time.
  2. Only "receipt"/"in" mean incoming. "Credit", "Received", a stray space or
     a blank cell all silently become outgoing payments.
  3. An unparseable date is replaced by today, and "%d/%m/%Y" is tried before
     "%m/%d/%Y", so a US-exported statement is read the wrong way round.
  4. Skipped rows are never counted and the response still says "success".

R2-534 lives in the same handler: the party is resolved with
`db.query(User).filter(User.name == party_name).first()` - no company scope -
so a same-named user in a foreign tenant shadows this company's own member and
the payment is stored with no party at all.

Each test below fails against the unfixed tree at the defect's own assertion.
"""
import io
import uuid

from app import models

UPLOAD = "/apis/v3/cashbook/upload"


def _csv(rows, headers=("Payment Type", "Party Name", "Amount", "Payment Date")):
    buf = io.StringIO()
    buf.write(",".join(headers) + "\n")
    for r in rows:
        buf.write(",".join(r) + "\n")
    return buf.getvalue().encode("utf-8")


def _upload(client, hdr, company_id, payload, date_format=None):
    data = {"company_id": str(company_id)}
    if date_format:
        data["date_format"] = date_format
    return client.post(
        UPLOAD,
        data=data,
        files={"file": ("payments.csv", payload, "text/csv")},
        headers=hdr,
    )


def _count(db, company_id):
    return db.query(models.Payment).filter(models.Payment.company_id == company_id).count()


def _rows(db, company_id):
    return (
        db.query(models.Payment)
        .filter(models.Payment.company_id == company_id)
        .order_by(models.Payment.payment_date)
        .all()
    )


# --- clause 1: idempotency -------------------------------------------------

def test_reupload_does_not_double_book(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R533A", user_name="U533A")
    hdr = auth_headers(user, comp)
    payload = _csv(
        [("out", "Acme", "100.00", "2026-08-01"), ("out", "Acme", "250.50", "2026-08-02")]
    )

    first = _upload(client, hdr, comp.id, payload)
    assert first.status_code == 200, first.text
    assert first.json()["created"] == 2
    assert _count(db, comp.id) == 2

    second = _upload(client, hdr, comp.id, payload)
    assert second.status_code == 200, second.text
    assert second.json()["created"] == 0, "re-upload must not book the same rows again"
    assert second.json()["duplicates"] == 2
    assert _count(db, comp.id) == 2, "double-booked payments on re-upload"


def test_identical_rows_in_one_file_are_booked_once(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R533B", user_name="U533B")
    hdr = auth_headers(user, comp)
    payload = _csv([("out", "Acme", "100.00", "2026-08-01")] * 3)

    r = _upload(client, hdr, comp.id, payload)
    assert r.status_code == 200, r.text
    assert r.json()["created"] == 1
    assert r.json()["duplicates"] == 2
    assert _count(db, comp.id) == 1


# --- clause 2: money direction ---------------------------------------------

def test_credit_is_incoming_not_silently_outgoing(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R533C", user_name="U533C")
    hdr = auth_headers(user, comp)
    payload = _csv([("Credit", "Acme", "5000.00", "2026-08-01")])

    r = _upload(client, hdr, comp.id, payload)
    assert r.status_code == 200, r.text
    rows = _rows(db, comp.id)
    assert len(rows) == 1
    assert rows[0].payment_type == "in", "a receipt booked as an outgoing payment"


def test_unrecognised_payment_type_is_skipped_not_booked_as_out(
    client, db, make_tenant, auth_headers
):
    comp, user, _ = make_tenant(company_name="R533D", user_name="U533D")
    hdr = auth_headers(user, comp)
    payload = _csv([("Banana", "Acme", "5000.00", "2026-08-01")])

    r = _upload(client, hdr, comp.id, payload)
    assert r.status_code == 200, r.text
    assert r.json()["created"] == 0, "an unreadable Payment Type must not default to 'out'"
    assert _count(db, comp.id) == 0


def test_blank_payment_type_is_skipped_not_defaulted(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R533E", user_name="U533E")
    hdr = auth_headers(user, comp)
    payload = _csv([("", "Acme", "5000.00", "2026-08-01")])

    r = _upload(client, hdr, comp.id, payload)
    assert r.status_code == 200, r.text
    assert r.json()["created"] == 0, "a blank Payment Type must not silently become 'out'"
    assert _count(db, comp.id) == 0


# --- clause 3: dates -------------------------------------------------------

def test_unparseable_date_is_skipped_not_booked_as_today(
    client, db, make_tenant, auth_headers
):
    comp, user, _ = make_tenant(company_name="R533F", user_name="U533F")
    hdr = auth_headers(user, comp)
    payload = _csv([("out", "Acme", "100.00", "not-a-date")])

    r = _upload(client, hdr, comp.id, payload)
    assert r.status_code == 200, r.text
    assert r.json()["created"] == 0, "an unreadable date must not be booked as today"
    assert _count(db, comp.id) == 0


def test_missing_date_is_skipped_not_booked_as_today(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R533G", user_name="U533G")
    hdr = auth_headers(user, comp)
    payload = _csv([("out", "Acme", "100.00", "")])

    r = _upload(client, hdr, comp.id, payload)
    assert r.status_code == 200, r.text
    assert r.json()["created"] == 0, "a missing date must not be substituted with today"
    assert _count(db, comp.id) == 0


def test_slash_date_honours_declared_format(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R533H", user_name="U533H")
    hdr = auth_headers(user, comp)
    payload = _csv([("out", "Acme", "100.00", "03/04/2026")])

    r = _upload(client, hdr, comp.id, payload, date_format="MDY")
    assert r.status_code == 200, r.text
    assert r.json()["created"] == 1
    rows = _rows(db, comp.id)
    assert rows[0].payment_date.strftime("%Y-%m-%d") == "2026-03-04", (
        "MDY requested but the ambiguous date was read day-first"
    )


# --- clause 4: honest reporting -------------------------------------------

def test_skipped_rows_are_reported_with_line_numbers(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R533I", user_name="U533I")
    hdr = auth_headers(user, comp)
    payload = _csv(
        [
            ("out", "Acme", "100.00", "2026-08-01"),   # csv line 2 - ok
            ("out", "Acme", "abc", "2026-08-02"),      # csv line 3 - bad amount
            ("out", "Acme", "-5", "2026-08-03"),       # csv line 4 - non-positive
            ("out", "Acme", "100.00", "garbage"),      # csv line 5 - bad date
        ]
    )

    r = _upload(client, hdr, comp.id, payload)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["created"] == 1
    assert body["status"] != "success", "rows were skipped but the response still says success"

    skipped = body["skipped"]
    assert len(skipped) == 3
    assert {s["line"] for s in skipped} == {3, 4, 5}, "skipped rows must carry their line number"
    assert all(s.get("reason") for s in skipped), "each skipped row must say why"


# --- R2-534: party resolution is company-scoped ---------------------------

def test_party_resolved_within_own_company_not_globally(
    client, db, make_tenant, auth_headers
):
    # The foreign tenant is created FIRST, so the unscoped
    # User.name == party_name query finds its member before this company's own.
    _foreign_comp, _foreign_user, _foreign_team = make_tenant(
        company_name="R534 Foreign", user_name="Ramesh Kumar"
    )
    comp, user, own_team = make_tenant(company_name="R534 Home", user_name="Owner")
    member = models.User(id=uuid.uuid4(), name="Ramesh Kumar", mobile="1000000002")
    db.add(member)
    db.flush()
    own_member_team = models.CompanyTeam(
        id=uuid.uuid4(), company_id=comp.id, user_id=member.id
    )
    db.add(own_member_team)
    db.commit()

    hdr = auth_headers(user, comp)
    payload = _csv([("out", "Ramesh Kumar", "100.00", "2026-08-01")])

    r = _upload(client, hdr, comp.id, payload)
    assert r.status_code == 200, r.text
    rows = _rows(db, comp.id)
    assert len(rows) == 1
    assert rows[0].party_company_user_id == own_member_team.id, (
        "the party resolved to a user in another company, or to nobody"
    )
