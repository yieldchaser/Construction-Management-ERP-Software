import uuid
from datetime import datetime, timezone
import pytest
from app import models

def test_tally_mappings_correction_paths_part3(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="Tally Test Co", user_name="Tally User")
    hdr = auth_headers(user, comp)
    cid = str(comp.id)

    # 1. Connection with round_off_ledger
    conn_res = client.post(
        "/apis/v3/tally/connections",
        headers=hdr,
        json={
            "company_id": cid,
            "tally_company_name": "Test Builders Ltd",
            "registered_mobile": "+919876543210",
            "round_off_ledger": "Round Off (Expense)",
            "voucher_number_template": "SF-{year}-{number}",
            "auto_create_missing_ledgers": True,
            "sync_window_start_date": datetime.now(timezone.utc).isoformat()
        }
    )
    assert conn_res.status_code == 201, conn_res.text
    conn_data = conn_res.json()
    assert conn_data["round_off_ledger"] == "Round Off (Expense)"
    conn_id = conn_data["id"]

    # Update connection round_off_ledger
    conn_upd = client.put(
        f"/apis/v3/tally/connections/{conn_id}",
        headers=hdr,
        json={
            "round_off_ledger": "Fractional Adjustment A/c"
        }
    )
    assert conn_upd.status_code == 200, conn_upd.text
    assert conn_upd.json()["round_off_ledger"] == "Fractional Adjustment A/c"

    # 2. Ledger Mapping with freight_ledger and surcharge_ledger
    lm_res = client.post(
        "/apis/v3/tally/mappings/ledger",
        headers=hdr,
        json={
            "company_id": cid,
            "onsite_transaction_type": "Material Purchase",
            "posting_mode": "lumpsum",
            "tally_voucher_type": "Purchase",
            "tally_ledger_name": "Purchase Account",
            "freight_ledger": "Freight & Carriage Inward",
            "surcharge_ledger": "Import Duty & Surcharge"
        }
    )
    assert lm_res.status_code == 201, lm_res.text
    lm_data = lm_res.json()
    assert lm_data["freight_ledger"] == "Freight & Carriage Inward"
    assert lm_data["surcharge_ledger"] == "Import Duty & Surcharge"
    lm_id = lm_data["id"]

    # Update ledger mapping
    lm_upd = client.put(
        f"/apis/v3/tally/mappings/ledger/{lm_id}",
        headers=hdr,
        json={
            "freight_ledger": "Transportation Charges",
            "surcharge_ledger": "Customs Surcharge A/c"
        }
    )
    assert lm_upd.status_code == 200, lm_upd.text
    assert lm_upd.json()["freight_ledger"] == "Transportation Charges"
    assert lm_upd.json()["surcharge_ledger"] == "Customs Surcharge A/c"
