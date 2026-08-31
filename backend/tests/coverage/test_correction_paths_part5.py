import io
import uuid
from decimal import Decimal
import pytest
from app import models, supabase_storage

def test_statutory_payroll_settings_part5(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="Payroll Test Co", user_name="Payroll User")
    hdr = auth_headers(user, comp)
    cid = str(comp.id)

    # 1. GET payroll settings initially has defaults
    get_res = client.get(f"/apis/v3/settings/payroll/{cid}", headers=hdr)
    assert get_res.status_code == 200, get_res.text
    data = get_res.json()
    assert data["pf_wage_ceiling"] == 15000.0
    assert data["assume_full_month_when_no_attendance"] is False

    # 2. PUT without confirm_changes fails with 400
    put_fail = client.put(
        f"/apis/v3/settings/payroll/{cid}",
        headers=hdr,
        json={
            "pf_employee_pct": 11.5,
            "pf_wage_ceiling": 20000.0,
            "assume_full_month_when_no_attendance": True,
            "confirm_changes": False
        }
    )
    assert put_fail.status_code == 400
    assert "confirm_changes must be true" in put_fail.json()["detail"]

    # 3. PUT with confirm_changes succeeds
    put_ok = client.put(
        f"/apis/v3/settings/payroll/{cid}",
        headers=hdr,
        json={
            "pf_employee_pct": 11.5,
            "pf_wage_ceiling": 20000.0,
            "assume_full_month_when_no_attendance": True,
            "confirm_changes": True
        }
    )
    assert put_ok.status_code == 200, put_ok.text
    saved = put_ok.json()
    assert saved["pf_employee_pct"] == 11.5
    assert saved["pf_wage_ceiling"] == 20000.0
    assert saved["assume_full_month_when_no_attendance"] is True

    # 4. Verify in DB
    db.expire_all()
    ps = db.query(models.CompanyPayrollSettings).filter(models.CompanyPayrollSettings.company_id == comp.id).first()
    assert float(ps.pf_employee_pct) == 11.5
    assert float(ps.pf_wage_ceiling) == 20000.0
    c_db = db.query(models.Company).filter(models.Company.id == comp.id).first()
    assert c_db.assume_full_month_when_no_attendance is True


def test_party_kyc_documents_part5b(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="KYC Test Co", user_name="KYC Officer")
    hdr = auth_headers(user, comp)
    cid = str(comp.id)

    # 1. Dedicated private bucket exists
    assert supabase_storage.BUCKET_KYC_DOCUMENTS == "kyc-documents"

    # 2. Create a library party
    party = models.LibraryParty(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="Aadhaar Vendor Pvt Ltd",
        party_type="Supplier",
        aadhaar_number="123456789012",
        pan_number="ABCDE1234F",
    )
    db.add(party)
    db.commit()
    pid = str(party.id)

    # 3. Validation: Reject invalid file type (e.g. text/html)
    invalid_file = io.BytesIO(b"<html>malicious</html>")
    res_bad_type = client.post(
        f"/apis/v3/library/parties/{pid}/kyc/aadhaar_file",
        headers=hdr,
        files={"file": ("hack.html", invalid_file, "text/html")}
    )
    assert res_bad_type.status_code == 400
    assert "Invalid file type" in res_bad_type.json()["detail"]

    # 4. Validation: Reject oversized file (> 5 MB)
    big_file = io.BytesIO(b"0" * (5 * 1024 * 1024 + 100))
    res_big = client.post(
        f"/apis/v3/library/parties/{pid}/kyc/aadhaar_file",
        headers=hdr,
        files={"file": ("big.pdf", big_file, "application/pdf")}
    )
    assert res_big.status_code == 400
    assert "5 MB" in res_big.json()["detail"]

    # 5. Upload valid Aadhaar image
    valid_img = io.BytesIO(b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00FakeJpegBytes")
    res_upload_aadhaar = client.post(
        f"/apis/v3/library/parties/{pid}/kyc/aadhaar_file",
        headers=hdr,
        files={"file": ("my_aadhaar.jpg", valid_img, "image/jpeg")}
    )
    assert res_upload_aadhaar.status_code == 200, res_upload_aadhaar.text
    data_aadhaar = res_upload_aadhaar.json()
    assert data_aadhaar["success"] is True
    assert "aadhaar_file_" in data_aadhaar["storage_path"]
    # Path is securely generated, not trusting client filename
    assert "my_aadhaar.jpg" not in data_aadhaar["storage_path"]

    # Upload valid PAN PDF
    valid_pdf = io.BytesIO(b"%PDF-1.4 FakePdfBytes")
    res_upload_pan = client.post(
        f"/apis/v3/library/parties/{pid}/kyc/pan_file",
        headers=hdr,
        files={"file": ("pan_card.pdf", valid_pdf, "application/pdf")}
    )
    assert res_upload_pan.status_code == 200, res_upload_pan.text

    # 6. Read KYC document generates signed URL & logs access
    res_read_aadhaar = client.get(
        f"/apis/v3/library/parties/{pid}/kyc/aadhaar_file",
        headers=hdr
    )
    assert res_read_aadhaar.status_code == 200, res_read_aadhaar.text
    read_data = res_read_aadhaar.json()
    assert read_data["expires_in_seconds"] == 900
    assert "url" in read_data

    # Verify access log in DB
    db.expire_all()
    logs = db.query(models.KYCAccessLog).filter(models.KYCAccessLog.party_id == party.id).all()
    assert len(logs) >= 1
    assert logs[0].document_type == "aadhaar_file"
    assert logs[0].accessed_by == user.name

    # 7. Aadhaar reveal endpoint & audit logging
    res_reveal = client.get(
        f"/apis/v3/library/parties/{pid}/aadhaar-reveal",
        headers=hdr
    )
    assert res_reveal.status_code == 200
    assert res_reveal.json()["aadhaar_number"] == "123456789012"

    db.expire_all()
    reveal_logs = db.query(models.KYCAccessLog).filter(
        models.KYCAccessLog.party_id == party.id,
        models.KYCAccessLog.document_type == "aadhaar_number_reveal"
    ).all()
    assert len(reveal_logs) == 1
    assert reveal_logs[0].party_name == "Aadhaar Vendor Pvt Ltd"

    # 8. Delete party deletes storage objects and party record
    res_del = client.delete(f"/apis/v3/library/parties/{pid}", headers=hdr)
    assert res_del.status_code == 200

    db.expire_all()
    p_deleted = db.query(models.LibraryParty).filter(models.LibraryParty.id == uuid.UUID(pid)).first()
    assert p_deleted is None
