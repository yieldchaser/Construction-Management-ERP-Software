"""R2-614 — company branding upload validates bytes and size, not just asset_type.

Gate: POST /settings/company-file must reject payloads that are not PNG/JPEG
by magic byte (even when the client lies about the content type) with a 422
naming the problem, reject oversized files, and still accept a genuine small
PNG end to end.
"""
import struct
import zlib

from app.models import CompanyFile


def _png(w=3, h=2):
    def chunk(t, d):
        c = t + d
        return struct.pack(">I", len(d)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    raw = (b"\x00" + bytes(w * 3)) * h
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )


def _upload(client, hdrs, comp_id, payload, content_type="image/png"):
    return client.post(
        f"/apis/v3/settings/company-file/{comp_id}",
        params={"asset_type": "logo"},
        headers=hdrs,
        files={"file": ("logo.png", payload, content_type)},
    )


def test_r2_614_garbage_bytes_with_image_content_type_rejected(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R614A", user_name="U614A")
    hdr = auth_headers(user, comp)

    r = _upload(client, hdr, comp.id, b"definitely-not-an-image", content_type="image/png")
    assert r.status_code == 422, r.text
    assert "PNG or JPEG" in r.json()["detail"]

    # The rejected upload must not leave a row behind.
    rows = db.query(CompanyFile).filter(CompanyFile.company_id == comp.id).all()
    assert rows == []


def test_r2_614_valid_small_png_accepted(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R614B", user_name="U614B")
    hdr = auth_headers(user, comp)

    r = _upload(client, hdr, comp.id, _png())
    assert r.status_code == 200, r.text
    assert r.json()["asset_type"] == "logo"

    row = (
        db.query(CompanyFile)
        .filter(CompanyFile.company_id == comp.id, CompanyFile.asset_type == "logo")
        .one()
    )
    assert row.data.startswith(b"\x89PNG\r\n\x1a\n")


def test_r2_614_oversized_upload_rejected(client, db, make_tenant, auth_headers):
    from app.routers.settings import MAX_BRANDING_FILE_BYTES

    comp, user, _ = make_tenant(company_name="R614C", user_name="U614C")
    hdr = auth_headers(user, comp)

    oversized = _png() + b"\x00" * (MAX_BRANDING_FILE_BYTES + 1)
    r = _upload(client, hdr, comp.id, oversized)
    assert r.status_code == 422, r.text
    assert "MB upload limit" in r.json()["detail"]
