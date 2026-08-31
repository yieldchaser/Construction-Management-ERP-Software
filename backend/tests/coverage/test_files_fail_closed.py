"""Tests for Part 10: File upload allowlist fails closed.

Ensures:
1. Unknown files (no magic byte signature) are rejected with 415 even if declared type is allowed.
2. Windows executables (MZ) are rejected with 415 even if declared as PDF.
3. Sniffed content type is authoritative and replaces any client-supplied MIME type.
"""
import uuid
import pytest
from app import models
from app.auth import create_access_token


def _hdr(user, comp):
    return {"Authorization": "Bearer " + create_access_token(
        {"sub": str(user.id), "company_id": str(comp.id), "user_name": user.name})}


def _mk_tenant(db, tag):
    comp = models.Company(id=uuid.uuid4(), name=f"R-Files-{tag}", currency_decimal_places=2)
    db.add(comp)
    db.flush()
    user = models.User(
        id=uuid.uuid4(), name=f"U-Files-{tag}",
        mobile=f"+9193{uuid.uuid4().hex[:9]}", email=f"files-{tag}@test.com",
    )
    db.add(user)
    db.flush()
    team = models.CompanyTeam(id=uuid.uuid4(), company_id=comp.id, user_id=user.id, priority_type="partner")
    db.add(team)
    db.commit()
    return comp, user


def _mk_project(db, comp, code):
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=f"Proj {code}", code=code, status="Ongoing"
    )
    db.add(project)
    db.commit()
    return project


def test_unknown_binary_rejected(client, db):
    comp, user = _mk_tenant(db, "unrec")
    hdr = _hdr(user, comp)
    project = _mk_project(db, comp, "UNREC1")

    # Bytes that do not match any known signature, declared as application/pdf
    r = client.post(
        "/apis/v3/files/upload",
        data={"project_id": str(project.id)},
        files={"file": ("fake.pdf", b"\x00\x11\x22\x33\x44\x55\x66\x77\x88\x99", "application/pdf")},
        headers=hdr,
    )
    assert r.status_code == 415, r.text
    assert "File type not allowed" in r.json()["detail"]


def test_executable_probe_rejected_even_if_declared_allowed(client, db):
    comp, user = _mk_tenant(db, "exe")
    hdr = _hdr(user, comp)
    project = _mk_project(db, comp, "EXE1")

    # Windows PE / MZ executable header
    exe_bytes = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00"
    r = client.post(
        "/apis/v3/files/upload",
        data={"project_id": str(project.id)},
        files={"file": ("probe.exe", exe_bytes, "application/pdf")},
        headers=hdr,
    )
    assert r.status_code == 415, r.text
    assert "File type not allowed" in r.json()["detail"]


def test_sniffed_type_is_authoritative(client, db):
    comp, user = _mk_tenant(db, "auth")
    hdr = _hdr(user, comp)
    project = _mk_project(db, comp, "AUTH1")

    # Genuine PNG bytes sent with declared type image/jpeg
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
    r = client.post(
        "/apis/v3/files/upload",
        data={"project_id": str(project.id)},
        files={"file": ("photo.jpg", png_bytes, "image/jpeg")},
        headers=hdr,
    )
    assert r.status_code == 201, r.text
    # Sniffed type must be image/png, not declared image/jpeg
    assert r.json()["content_type"] == "image/png"
