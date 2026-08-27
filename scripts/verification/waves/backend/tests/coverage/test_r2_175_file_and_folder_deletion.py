"""R2-175: uploaded files and folders can finally be deleted.

files.py had no DELETE route at all, so every upload was permanent for the
life of the tenant. The fix adds DELETE /files/file/{id} (storage object +
row + delete-log entry, gated on data:delete like every other destructive
delete) and DELETE /files/folders/{id} which refuses while non-empty.
"""
import uuid

from app import models
from app.auth import create_access_token


def _hdr(user, comp):
    return {"Authorization": "Bearer " + create_access_token(
        {"sub": str(user.id), "company_id": str(comp.id), "user_name": user.name})}


def _mk_tenant(db, tag):
    comp = models.Company(id=uuid.uuid4(), name=f"R175-{tag}", currency_decimal_places=2)
    db.add(comp)
    db.flush()
    user = models.User(
        id=uuid.uuid4(), name=f"U-R175-{tag}",
        mobile=f"+9193{uuid.uuid4().hex[:9]}", email=f"r175-{tag}@test.com",
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


def _upload(client, hdr, project_id, folder_id=None):
    r = client.post(
        "/apis/v3/files/upload",
        data={
            "project_id": str(project_id),
            **({"folder_id": str(folder_id)} if folder_id else {}),
        },
        files={"file": ("probe.txt", b"deletable bytes", "text/plain")},
        headers=hdr,
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_file_delete_removes_row_and_logs(client, db):
    comp, user = _mk_tenant(db, "a")
    hdr = _hdr(user, comp)
    project = _mk_project(db, comp, "R175A")
    file_id = _upload(client, hdr, project.id)

    r = client.delete(f"/apis/v3/files/file/{file_id}", headers=hdr)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "success"

    assert client.get(f"/apis/v3/files/file/{file_id}", headers=hdr).status_code == 404
    assert db.query(models.ProjectFile).filter(models.ProjectFile.id == file_id).first() is None
    log = (
        db.query(models.DeleteLog)
        .filter(models.DeleteLog.entity_type == "project_file", models.DeleteLog.company_id == comp.id)
        .first()
    )
    assert log is not None
    assert log.entity_id == str(file_id)


def test_folder_delete_refuses_while_non_empty_then_succeeds(client, db):
    comp, user = _mk_tenant(db, "b")
    hdr = _hdr(user, comp)
    project = _mk_project(db, comp, "R175B")

    r = client.post(
        "/apis/v3/files/folders",
        json={"project_id": str(project.id), "name": "Drawings"},
        headers=hdr,
    )
    assert r.status_code == 201, r.text
    folder_id = r.json()["id"]

    file_id = _upload(client, hdr, project.id, folder_id=folder_id)
    r = client.delete(f"/apis/v3/files/folders/{folder_id}", headers=hdr)
    assert r.status_code == 409, r.text
    assert "not empty" in r.json()["detail"]
    assert client.get(
        f"/apis/v3/files/folders?project_id={project.id}", headers=hdr
    ).json(), "folder must survive a refused delete"

    assert client.delete(f"/apis/v3/files/file/{file_id}", headers=hdr).status_code == 200
    r = client.delete(f"/apis/v3/files/folders/{folder_id}", headers=hdr)
    assert r.status_code == 200, r.text
    assert client.get(
        f"/apis/v3/files/folders?project_id={project.id}", headers=hdr
    ).json() == []


def test_outsider_cannot_delete_another_tenants_file(client, db):
    comp_a, user_a = _mk_tenant(db, "c1")
    comp_b, user_b = _mk_tenant(db, "c2")
    hdr_a = _hdr(user_a, comp_a)
    hdr_b = _hdr(user_b, comp_b)
    project = _mk_project(db, comp_a, "R175C")
    file_id = _upload(client, hdr_a, project.id)

    r = client.delete(f"/apis/v3/files/file/{file_id}", headers=hdr_b)
    assert r.status_code == 403, r.text
    assert db.query(models.ProjectFile).filter(models.ProjectFile.id == file_id).first() is not None


def test_member_without_data_delete_is_denied(client, db):
    comp, owner = _mk_tenant(db, "d1")
    viewer = models.User(
        id=uuid.uuid4(), name="V-R175",
        mobile=f"+9194{uuid.uuid4().hex[:9]}", email="r175-viewer@test.com",
    )
    db.add(viewer)
    db.flush()
    role = models.CompanyRole(company_id=comp.id, role_name="NoDelete", permissions={"projects:view": True})
    db.add(role)
    db.flush()
    db.add(models.CompanyTeam(
        id=uuid.uuid4(), company_id=comp.id, user_id=viewer.id,
        priority_type="employee", role_id=role.id,
    ))
    db.commit()

    hdr_owner = _hdr(owner, comp)
    hdr_viewer = _hdr(viewer, comp)
    project = _mk_project(db, comp, "R175D")
    file_id = _upload(client, hdr_owner, project.id)

    r = client.delete(f"/apis/v3/files/file/{file_id}", headers=hdr_viewer)
    assert r.status_code == 403, r.text
    assert "data:delete" in r.json()["detail"]
