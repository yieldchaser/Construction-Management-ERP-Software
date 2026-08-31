import uuid
import pytest
from app import models
from app.routers.reports import _rep_party_library, _mask_aadhaar

def test_mask_aadhaar_helper():
    assert _mask_aadhaar(None) == ""
    assert _mask_aadhaar("") == ""
    assert _mask_aadhaar("123456789012") == "XXXX XXXX 9012"
    assert _mask_aadhaar("1234 5678 9012") == "XXXX XXXX 9012"
    assert _mask_aadhaar("12") == "XXXX XXXX 12"

def test_party_library_report_masks_aadhaar(db, make_tenant):
    comp, user, _ = make_tenant(company_name="Masking Test Co", user_name="Masking User")
    party = models.LibraryParty(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="Secret Identity Vendor",
        party_type="Supplier",
        account_number="987654321012345",
        pan_number="ABCDE1234F",
        passport_no="K1234567",
        aadhaar_number="123456789012"
    )
    db.add(party)
    db.commit()

    rows = _rep_party_library(db, comp.id, None)
    assert len(rows) >= 1
    found = next(r for r in rows if r["Party Name"] == "Secret Identity Vendor")
    
    # Aadhaar is masked
    assert found["Aadhar Card Number"] == "XXXX XXXX 9012"
    # Other sensitive identity fields remain unmasked
    assert found["Account Number"] == "987654321012345"
    assert found["PAN Card Number"] == "ABCDE1234F"
    assert found["Passport No."] == "K1234567"
