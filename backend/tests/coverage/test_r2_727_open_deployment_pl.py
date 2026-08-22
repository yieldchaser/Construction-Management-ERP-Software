"""R2-727 sweep / R2-221 - an OPEN equipment deployment must not 500 the P&L.

EquipmentDeployment.start_date/end_date are timezone-aware
(DateTime(timezone=True), models.py:991-992). The "still deployed" fallback
computed `end` with naive datetime.utcnow(), so aware-minus-naive raised
TypeError and GET /finance/pl 500ed for any project with an open deployment.
The same latent pattern existed in the budget committed math (budget.py) and
the BI budget-variance feed (bi_export.py). All three now fall back to
datetime.now(timezone.utc) so both operands are aware.

Gate: with end_date NULL on a live deployment, /finance/pl,
/budget/committed/{id} and the BI budget-variance feed all return 200 and
bill the running hours at the equipment's hourly rate.
"""
import uuid
from datetime import datetime, timedelta, timezone

from app import models
from app.routers.bi_export import _hash_key

_SUFFIX = uuid.uuid4().hex[:8]

_RATE = 100.0
_HOURS_OPEN = 5.0


def _mk_open_deployment(db, comp, project):
    eq = models.Equipment(
        id=uuid.uuid4(), company_id=comp.id, name=f"Excavator-{_SUFFIX}",
        code=f"EQ-{_SUFFIX}", category="Excavator", ownership_type="Owned",
        status="deployed", hourly_rate=_RATE,
    )
    db.add(eq)
    db.flush()
    dep = models.EquipmentDeployment(
        id=uuid.uuid4(), equipment_id=eq.id, project_id=project.id,
        start_date=datetime.now(timezone.utc) - timedelta(hours=_HOURS_OPEN),
        end_date=None,
        remarks="R2-727 open deployment",
    )
    db.add(dep)
    db.commit()
    return eq, dep


def _mk_bi_key(db, comp, user):
    raw = f"siteflow_bi_{uuid.uuid4().hex}"
    key = models.BiApiKey(
        id=uuid.uuid4(), company_id=comp.id, label="r727",
        key_hash=_hash_key(raw), created_by_user_id=user.id,
    )
    db.add(key)
    db.commit()
    return {"X-API-Key": raw}


def test_open_deployment_pl_and_siblings_200_not_500(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name="R727", user_name="U727",
        mobile=f"+9191{_SUFFIX}", email=f"r727-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P727", code=f"PRJ-{_SUFFIX}", status="Ongoing"
    )
    db.add(project)
    db.commit()
    _mk_open_deployment(db, comp, project)
    bi_hdr = _mk_bi_key(db, comp, user)

    # Primary gate (founder-flagged): P&L must not 500 on the open deployment.
    r = client.get(f"/apis/v3/finance/pl?project_id={project.id}", headers=hdr)
    assert r.status_code == 200, r.text
    pl = {row["head"]: row for row in r.json()}
    # >= 5h x 100/hr booked as Plant & Machinery actual; an open deployment
    # keeps accruing in real time, so allow a few seconds of drift.
    assert _RATE * _HOURS_OPEN <= pl["Plant & Machinery"]["actual"] < _RATE * (_HOURS_OPEN + 0.01), pl

    # Sibling site 1: budget committed math over the same deployment.
    r = client.get(f"/apis/v3/budget/committed/{project.id}", headers=hdr)
    assert r.status_code == 200, r.text
    body = r.json()
    assert _RATE * _HOURS_OPEN <= body["equipment_actual"] < _RATE * (_HOURS_OPEN + 0.01), r.text

    # Sibling site 2: BI budget-variance feed over the same deployment.
    r = client.get(
        f"/apis/v3/integrations/bi/feed/{comp.id}/budget-variance?fmt=json",
        headers=bi_hdr,
    )
    assert r.status_code == 200, r.text
    rows = [x for x in r.json() if x["project_id"] == str(project.id)]
    assert len(rows) == 1, r.text
    assert _RATE * _HOURS_OPEN <= rows[0]["equipment_actual"] < _RATE * (_HOURS_OPEN + 0.01), rows
