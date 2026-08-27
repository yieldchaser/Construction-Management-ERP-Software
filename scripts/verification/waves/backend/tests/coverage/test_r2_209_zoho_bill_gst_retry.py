"""R2-209: the Zoho Books bill push sent gst_treatment unconditionally for
GSTIN-bearing vendors and hard-failed 502 on orgs that reject the element
(code 8), so 100% of pushes for GST vendors never reached Zoho. Vendor
creation already retried once without the GST fields; the bill payload did
not. These tests pin the same retry-once-without-gst_treatment resilience on
the bills endpoint itself."""
import uuid
from datetime import datetime, timedelta, timezone

from cryptography.fernet import Fernet

from app import models
from app.config import settings
from app.auth import create_access_token
from app.crypto import encrypt_token


class _FakeResp:
    def __init__(self, status_code, payload):
        self.status_code = status_code
        self._payload = payload
        self.text = str(payload)

    def json(self):
        return self._payload


def _hdr(user, comp):
    return {"Authorization": "Bearer " + create_access_token(
        {"sub": str(user.id), "company_id": str(comp.id), "user_name": user.name})}


def _make_bill_fixture(db, tag, with_gstin):
    comp = models.Company(id=uuid.uuid4(), name=f"R209-{tag}", currency_decimal_places=2)
    db.add(comp)
    db.flush()
    owner = models.User(
        id=uuid.uuid4(), name=f"O-R209-{tag}",
        mobile=f"+9195{uuid.uuid4().hex[:9]}", email=f"r209-owner-{tag}@test.com",
    )
    subcon_user = models.User(
        id=uuid.uuid4(), name="R209 Subcon Co",
        mobile=f"+9196{uuid.uuid4().hex[:9]}", email=f"r209-subcon-{tag}@test.com",
    )
    db.add_all([owner, subcon_user])
    db.flush()
    db.add(models.CompanyTeam(id=uuid.uuid4(), company_id=comp.id, user_id=owner.id, priority_type="partner"))
    party_team = models.CompanyTeam(id=uuid.uuid4(), company_id=comp.id, user_id=subcon_user.id, priority_type="subcontractor")
    db.add(party_team)
    db.flush()
    if with_gstin:
        party = models.LibraryParty(company_id=comp.id, name="R209 Subcon Co", tax_no="27ABCDE1234F1Z5")
        db.add(party)
        db.flush()
        party_team.library_party_id = party.id
    project = models.Project(company_id=comp.id, name=f"R209 Site {tag}")
    db.add(project)
    db.flush()
    bill = models.Bill(
        company_id=comp.id,
        project_id=project.id,
        party_company_user_id=party_team.id,
        invoice_number=f"R209-{tag}-001",
        invoice_date=datetime.now(timezone.utc),
        invoice_type="subcon",
        subtotal=10000,
        gst_amount=1800,
        total_payable=11800,
    )
    db.add(bill)
    connection = models.ZohoBooksConnection(
        company_id=comp.id,
        organization_id="60078211590",
        access_token=encrypt_token("r209-access-token"),
        refresh_token=encrypt_token("r209-refresh-token"),
        token_expiry=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.add(connection)
    db.commit()
    return comp, owner, bill


def test_push_bill_retries_once_without_gst_treatment_on_code_8(client, db, monkeypatch):
    monkeypatch.setattr(settings, "ZOHO_CLIENT_ID", "r209-id")
    monkeypatch.setattr(settings, "ZOHO_CLIENT_SECRET", "r209-secret")
    monkeypatch.setattr(settings, "TOKEN_ENCRYPTION_KEY", Fernet.generate_key().decode())
    comp, owner, bill = _make_bill_fixture(db, "retry", with_gstin=True)

    bills_posts = []
    contact_posts = []

    def fake_get(url, **kw):
        if "chartofaccounts" in url:
            return _FakeResp(200, {"chartofaccounts": [
                {"account_id": "acc-1", "account_type": "expense", "is_active": True}]})
        if "contacts" in url:
            return _FakeResp(200, {"contacts": []})
        raise AssertionError(f"unexpected GET {url}")

    def fake_post(url, **kw):
        if "contacts" in url:
            contact_posts.append(dict(kw.get("json")))
            return _FakeResp(201, {"contact": {"contact_id": "vend-1"}})
        if "/bills" in url:
            # Snapshot: the route pops gst_treatment from its own payload dict
            # for the retry, so a bare reference would mutate under us.
            bills_posts.append(dict(kw.get("json")))
            if len(bills_posts) == 1:
                # Zoho's own rejection of a non-GST org, verbatim shape.
                return _FakeResp(400, {"code": 8, "message": "Invalid Element gst_treatment"})
            return _FakeResp(201, {"bill": {"bill_id": "zbill-209"}})
        raise AssertionError(f"unexpected POST {url}")

    monkeypatch.setattr("app.routers.zoho_books.requests.get", fake_get)
    monkeypatch.setattr("app.routers.zoho_books.requests.post", fake_post)

    r = client.post(
        f"/apis/v3/integrations/zoho-books/companies/{comp.id}/push-bill/{bill.id}",
        headers=_hdr(owner, comp),
    )
    assert r.status_code == 200, r.text
    assert r.json()["zoho_bill_id"] == "zbill-209"

    assert len(bills_posts) == 2, "expected exactly one retry after the code 8 rejection"
    assert bills_posts[0]["gst_treatment"] == "business_gst"
    assert "gst_treatment" not in bills_posts[1]
    assert bills_posts[1]["vendor_id"] == "vend-1"
    assert bills_posts[1]["bill_number"] == bill.invoice_number

    db.expire_all()
    assert db.query(models.Bill).filter(models.Bill.id == bill.id).first().zoho_bill_id == "zbill-209"


def test_push_bill_without_gstin_never_sends_gst_treatment(client, db, monkeypatch):
    monkeypatch.setattr(settings, "ZOHO_CLIENT_ID", "r209-id")
    monkeypatch.setattr(settings, "ZOHO_CLIENT_SECRET", "r209-secret")
    monkeypatch.setattr(settings, "TOKEN_ENCRYPTION_KEY", Fernet.generate_key().decode())
    comp, owner, bill = _make_bill_fixture(db, "nogst", with_gstin=False)

    bills_posts = []

    def fake_get(url, **kw):
        if "chartofaccounts" in url:
            return _FakeResp(200, {"chartofaccounts": [
                {"account_id": "acc-1", "account_type": "expense", "is_active": True}]})
        if "contacts" in url:
            return _FakeResp(200, {"contacts": []})
        raise AssertionError(f"unexpected GET {url}")

    def fake_post(url, **kw):
        if "contacts" in url:
            return _FakeResp(201, {"contact": {"contact_id": "vend-1"}})
        if "/bills" in url:
            bills_posts.append(dict(kw.get("json")))
            return _FakeResp(201, {"bill": {"bill_id": "zbill-nogst"}})
        raise AssertionError(f"unexpected POST {url}")

    monkeypatch.setattr("app.routers.zoho_books.requests.get", fake_get)
    monkeypatch.setattr("app.routers.zoho_books.requests.post", fake_post)

    r = client.post(
        f"/apis/v3/integrations/zoho-books/companies/{comp.id}/push-bill/{bill.id}",
        headers=_hdr(owner, comp),
    )
    assert r.status_code == 200, r.text
    assert len(bills_posts) == 1
    assert "gst_treatment" not in bills_posts[0]
