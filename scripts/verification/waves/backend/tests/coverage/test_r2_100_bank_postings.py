"""R2-100 + R2-315 - recorded bank payments must reach the accounts they name.

create_payment used to store a free-text account_name only: BankAccount.balance
was written once at account creation and never again, so Company Balance
(= cash wallet + SUM(bank balances)) ignored every bank receipt/expense ever
recorded. A payment may now carry account_id; non-cash methods post the
movement into that account's balance in-transaction and delete_payment
reverses it.
"""
import uuid


def test_bank_receipt_posts_to_account_and_company_balance(client, db, make_tenant, auth_headers):
    comp, user, _team = make_tenant(company_name="R100A", user_name="U100A")
    hdr = auth_headers(user, comp)

    r = client.post(
        f"/apis/v3/finance/accounts/{comp.id}",
        json={
            "account_holder_name": "Holder",
            "bank_name": "HDFC",
            "account_number": "100200300",
            "ifsc_code": "HDFC0000001",
            "balance": 0.0,
        },
        headers=hdr,
    )
    assert r.status_code == 200, r.text
    acc_id = r.json()["id"]

    pay = client.post(
        "/apis/v3/finance/payments",
        json={
            "company_id": str(comp.id),
            "payment_type": "in",
            "amount": 5000.0,
            "payment_method": "Bank Transfer",
            "payment_date": "2026-08-25T10:00:00Z",
            "account_id": acc_id,
        },
        headers=hdr,
    )
    assert pay.status_code == 201, pay.text
    assert pay.json()["account_id"] == acc_id

    accounts = client.get(f"/apis/v3/finance/accounts/{comp.id}", headers=hdr)
    assert accounts.status_code == 200
    assert accounts.json()[0]["balance"] == 5000.0

    summary = client.get(f"/apis/v3/finance/transactions/{comp.id}", headers=hdr)
    assert summary.status_code == 200
    assert summary.json()["company_balance"] == 5000.0


def test_bank_out_debits_account(client, db, make_tenant, auth_headers):
    comp, user, _team = make_tenant(company_name="R100B", user_name="U100B")
    hdr = auth_headers(user, comp)
    acc_id = client.post(
        f"/apis/v3/finance/accounts/{comp.id}",
        json={
            "account_holder_name": "Holder",
            "bank_name": "ICICI",
            "account_number": "777888999",
            "ifsc_code": "ICIC0000001",
            "balance": 10000.0,
        },
        headers=hdr,
    ).json()["id"]

    pay = client.post(
        "/apis/v3/finance/payments",
        json={
            "company_id": str(comp.id),
            "payment_type": "out",
            "amount": 4000.0,
            "payment_method": "UPI",
            "payment_date": "2026-08-25T10:00:00Z",
            "account_id": acc_id,
        },
        headers=hdr,
    )
    assert pay.status_code == 201, pay.text

    accounts = client.get(f"/apis/v3/finance/accounts/{comp.id}", headers=hdr)
    assert accounts.json()[0]["balance"] == 6000.0


def test_delete_payment_reverses_posting(client, db, make_tenant, auth_headers):
    comp, user, _team = make_tenant(company_name="R100C", user_name="U100C")
    hdr = auth_headers(user, comp)
    acc_id = client.post(
        f"/apis/v3/finance/accounts/{comp.id}",
        json={
            "account_holder_name": "Holder",
            "bank_name": "SBI",
            "account_number": "1234509876",
            "ifsc_code": "SBIN0000001",
            "balance": 0.0,
        },
        headers=hdr,
    ).json()["id"]

    pay = client.post(
        "/apis/v3/finance/payments",
        json={
            "company_id": str(comp.id),
            "payment_type": "in",
            "amount": 2500.0,
            "payment_method": "Bank Transfer",
            "payment_date": "2026-08-25T10:00:00Z",
            "account_id": acc_id,
        },
        headers=hdr,
    )
    assert pay.status_code == 201, pay.text

    dele = client.delete(f"/apis/v3/finance/payments/{pay.json()['id']}", headers=hdr)
    assert dele.status_code == 204, dele.text

    accounts = client.get(f"/apis/v3/finance/accounts/{comp.id}", headers=hdr)
    assert accounts.json()[0]["balance"] == 0.0


def test_account_of_another_company_rejected(client, db, make_tenant, auth_headers):
    comp_a, user_a, _t = make_tenant(company_name="R100D", user_name="U100D")
    comp_b, user_b, _t2 = make_tenant(company_name="R100E", user_name="U100E")
    hdr_a = auth_headers(user_a, comp_a)
    hdr_b = auth_headers(user_b, comp_b)
    foreign_acc = client.post(
        f"/apis/v3/finance/accounts/{comp_b.id}",
        json={
            "account_holder_name": "B",
            "bank_name": "Axis",
            "account_number": "5555",
            "ifsc_code": "UTIB0000001",
        },
        headers=hdr_b,
    ).json()["id"]

    pay = client.post(
        "/apis/v3/finance/payments",
        json={
            "company_id": str(comp_a.id),
            "payment_type": "in",
            "amount": 100.0,
            "payment_method": "Bank Transfer",
            "payment_date": "2026-08-25T10:00:00Z",
            "account_id": foreign_acc,
        },
        headers=hdr_a,
    )
    assert pay.status_code == 404, pay.text


def test_cash_with_account_rejected_no_double_post(client, db, make_tenant, auth_headers):
    comp, user, _team = make_tenant(company_name="R100F", user_name="U100F")
    hdr = auth_headers(user, comp)
    acc_id = client.post(
        f"/apis/v3/finance/accounts/{comp.id}",
        json={
            "account_holder_name": "Holder",
            "bank_name": "Kotak",
            "account_number": "424242",
            "ifsc_code": "KKBK0000001",
        },
        headers=hdr,
    ).json()["id"]

    pay = client.post(
        "/apis/v3/finance/payments",
        json={
            "company_id": str(comp.id),
            "payment_type": "in",
            "amount": 300.0,
            "payment_method": "Cash",
            "payment_date": "2026-08-25T10:00:00Z",
            "account_id": acc_id,
        },
        headers=hdr,
    )
    assert pay.status_code == 422, pay.text

    accounts = client.get(f"/apis/v3/finance/accounts/{comp.id}", headers=hdr)
    assert accounts.json()[0]["balance"] == 0.0


def test_payment_without_account_leaves_balances_untouched(client, db, make_tenant, auth_headers):
    comp, user, _team = make_tenant(company_name="R100G", user_name="U100G")
    hdr = auth_headers(user, comp)

    pay = client.post(
        "/apis/v3/finance/payments",
        json={
            "company_id": str(comp.id),
            "payment_type": "in",
            "amount": 900.0,
            "payment_method": "Bank Transfer",
            "payment_date": "2026-08-25T10:00:00Z",
        },
        headers=hdr,
    )
    assert pay.status_code == 201, pay.text

    summary = client.get(f"/apis/v3/finance/transactions/{comp.id}", headers=hdr)
    # No bank accounts exist, so company balance stays at the cash wallet (0).
    assert summary.json()["company_balance"] == 0.0
