"""R2-236 - /finance/ledger must not 500 on mixed-timestamp projects.

get_ledger sorted raw entries with:

    raw_entries.sort(key=lambda x: x[0] if x[0] else datetime.min)

Ledger timestamp columns are DateTime(timezone=True): tz-aware on Postgres,
naive on SQLite round-trips, and NULL-able in legacy rows. Comparing an aware
datetime against naive datetime.min raises TypeError, so any project mixing
NULL timestamps with normal rows 500'd the endpoint before the sort ever ran.

After the fix every key is normalized to an aware UTC datetime
(_ledger_sort_dt): None -> datetime.min (UTC), naive stamped UTC, aware
untouched.

Gate: one NULL-timestamp payment plus dated payments/bills -> GET ledger
returns 200, rows ordered most-recent-first with the NULL row last, and the
sort-key helper handles naive/aware/None inputs without raising.
"""
import datetime
import uuid

from sqlalchemy import text

from app import models
from app.routers.finance import _ledger_sort_dt

_SUFFIX = uuid.uuid4().hex[:8]


def _mk_project(db, comp):
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P236", code=f"PRJ-{_SUFFIX}", status="Ongoing"
    )
    db.add(project)
    db.commit()
    return project


def _mk_payment(db, comp, project, when, amount=500.0, ptype="in"):
    p = models.Payment(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        payment_type=ptype, amount=amount, unsettled_amount=amount,
        payment_method="Cash", payment_date=when,
    )
    db.add(p)
    db.commit()
    return p


def _mk_bill(db, comp, project, team, when, amount=800.0):
    b = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, invoice_number=f"INV-R236-{_SUFFIX}",
        invoice_date=when, invoice_type="sale", subtotal=amount, total_payable=amount,
        approval_flag="approved",
    )
    db.add(b)
    db.commit()
    return b


def test_ledger_null_timestamp_with_normal_rows_returns_200_sorted(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name="R236", user_name="U236",
        mobile=f"+9193{_SUFFIX}", email=f"r236-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    # Dated payment (Jan 05) and dated sale invoice (Jan 10).
    pay_dated = _mk_payment(db, comp, project, datetime.datetime(2026, 1, 5))
    bill = _mk_bill(db, comp, project, team, datetime.datetime(2026, 1, 10))

    # Legacy row shape the defect report is about: a NULL timestamp alongside
    # normal ones. Model declares nullable=False, so rebuild the table
    # constraint-free (as a half-applied migration would leave it) and null
    # the row past the ORM the way a backfill would have.
    db.execute(text("ALTER TABLE payments RENAME TO payments_r236_old"))
    db.execute(text("CREATE TABLE payments AS SELECT * FROM payments_r236_old"))
    db.execute(text("DROP TABLE payments_r236_old"))
    db.commit()

    pay_null = _mk_payment(db, comp, project, datetime.datetime(2026, 2, 1))
    db.execute(
        text("UPDATE payments SET payment_date = NULL WHERE id = :pid"),
        {"pid": str(pay_null.id)},
    )
    db.commit()

    r = client.get(f"/apis/v3/finance/ledger?project_id={project.id}", headers=hdr)
    assert r.status_code == 200, r.text

    mine = [row for row in r.json() if row["id"] in {
        str(pay_dated.id), str(bill.id), str(pay_null.id),
    }]
    assert len(mine) == 3, r.json()

    # Response is most-recent-first: Jan 10 bill, Jan 05 payment, NULL last
    # (NULL sorts as datetime.min ascending, so it lands at the end).
    assert [row["id"] for row in mine] == [
        str(bill.id), str(pay_dated.id), str(pay_null.id),
    ], mine

    # The NULL-timestamp row renders an empty date label instead of crashing.
    assert mine[2]["date"] == "", mine[2]

    # Running balance still accumulates in true chronological order:
    # +500 (NULL payment) -> +500 (dated payment) -> +800 (sale invoice).
    assert [row["balance"] for row in mine] == [1800.0, 1000.0, 500.0], mine


def test_ledger_sort_key_normalizes_none_naive_and_aware():
    utc = datetime.timezone.utc

    # None -> aware datetime.min sentinel.
    assert _ledger_sort_dt(None) == datetime.datetime.min.replace(tzinfo=utc)

    # Naive -> same wall time stamped UTC (comparable with aware keys).
    naive = datetime.datetime(2026, 3, 4, 5, 6, 7)
    keyed = _ledger_sort_dt(naive)
    assert keyed.tzinfo is not None
    assert keyed.replace(tzinfo=None) == naive

    # Aware -> untouched, original offset preserved.
    aware = datetime.datetime(2026, 3, 4, 5, 6, 7, tzinfo=datetime.timezone(datetime.timedelta(hours=5, minutes=30)))
    assert _ledger_sort_dt(aware) is aware

    # Mixed shapes sort together without TypeError; NULL sorts oldest.
    mixed = [
        aware,
        datetime.datetime.min.replace(tzinfo=utc),
        naive.replace(tzinfo=utc),
        _ledger_sort_dt(None),
        naive,
    ]
    ordered = sorted(mixed, key=_ledger_sort_dt)
    assert ordered[0].replace(tzinfo=None) == datetime.datetime.min
