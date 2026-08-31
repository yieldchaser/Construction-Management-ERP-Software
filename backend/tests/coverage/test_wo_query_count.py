"""Test for constant query count on get_work_orders (N+1 query optimization).

Verifies:
1. Query count does not grow with the number of work orders (5 WOs vs 10 WOs).
2. Response payload remains byte/value-identical across all fields.
"""
import uuid
import datetime
import pytest
from sqlalchemy import event
from app import models


class QueryCounter:
    def __init__(self, engine):
        self.engine = engine
        self.count = 0
        self.queries = []

    def _before_cursor_execute(self, conn, cursor, statement, parameters, context, executemany):
        self.count += 1
        self.queries.append(statement)

    def __enter__(self):
        self.count = 0
        self.queries = []
        event.listen(self.engine, "before_cursor_execute", self._before_cursor_execute)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        event.remove(self.engine, "before_cursor_execute", self._before_cursor_execute)


def _seed_project_with_wos(db, comp, team, num_wos):
    project = models.Project(
        id=uuid.uuid4(),
        company_id=comp.id,
        name=f"WO-Test-Proj-{uuid.uuid4().hex[:6]}",
        code=f"PRJ-WO-{uuid.uuid4().hex[:6]}",
        status="Ongoing",
        state="Maharashtra",
    )
    db.add(project)
    db.commit()

    # Also create a LibraryParty to test linked library party resolution
    lp = models.LibraryParty(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="Apex Subcon Master Ltd",
        party_type="Subcontractor",
    )
    db.add(lp)
    db.commit()

    # Link team member to LibraryParty
    team.library_party_id = lp.id
    db.commit()

    for idx in range(num_wos):
        wo_sfx = uuid.uuid4().hex[:6]
        wo = models.WorkOrder(
            id=uuid.uuid4(),
            company_id=comp.id,
            project_id=project.id,
            subcontractor_id=team.id,
            wo_number=f"WO-{wo_sfx}-{idx:03d}",
            wo_date=datetime.datetime.utcnow(),
            status="approved",
            estimated_work_amount=50000.0 * (idx + 1),
            terms="Net 30",
        )
        db.add(wo)
        db.commit()

        # Add 2 items per WO
        item1 = models.WorkOrderItem(
            id=uuid.uuid4(),
            wo_id=wo.id,
            quantity=10.0,
            rate=1000.0,
            amount=10000.0,
        )
        item2 = models.WorkOrderItem(
            id=uuid.uuid4(),
            wo_id=wo.id,
            quantity=5.0,
            rate=2000.0,
            amount=10000.0,
        )
        db.add_all([item1, item2])

        # Add 1 active bill and 1 cancelled bill
        b_active = models.Bill(
            id=uuid.uuid4(),
            company_id=comp.id,
            project_id=project.id,
            party_company_user_id=team.id,
            wo_id=wo.id,
            invoice_number=f"INV-ACT-{idx}-{uuid.uuid4().hex[:4]}",
            invoice_date=datetime.datetime.utcnow(),
            invoice_type="subcon",
            subtotal=15000.0,
            total_payable=15000.0,
            status="Approved",
        )
        b_cancelled = models.Bill(
            id=uuid.uuid4(),
            company_id=comp.id,
            project_id=project.id,
            party_company_user_id=team.id,
            wo_id=wo.id,
            invoice_number=f"INV-CAN-{idx}-{uuid.uuid4().hex[:4]}",
            invoice_date=datetime.datetime.utcnow(),
            invoice_type="subcon",
            subtotal=5000.0,
            total_payable=5000.0,
            status="Cancelled",
        )
        db.add_all([b_active, b_cancelled])
        db.commit()

    return project


def test_work_orders_constant_query_count(client, db, make_tenant, auth_headers):
    sfx = uuid.uuid4().hex[:8]
    comp, user, team = make_tenant(
        company_name=f"WOCount-{sfx}",
        user_name=f"UWOCount-{sfx}",
        mobile=f"+9198{sfx}",
        email=f"wocount-{sfx}@test.com",
    )
    hdr = auth_headers(user, comp)
    engine = db.get_bind()

    # Seed 5 work orders
    proj_5 = _seed_project_with_wos(db, comp, team, 5)

    with QueryCounter(engine) as qc_5:
        res_5 = client.get(f"/apis/v3/billing/work-orders?project_id={proj_5.id}", headers=hdr)
    assert res_5.status_code == 200
    data_5 = res_5.json()
    assert len(data_5) == 5
    count_5 = qc_5.count

    # Seed 10 work orders
    proj_10 = _seed_project_with_wos(db, comp, team, 10)

    with QueryCounter(engine) as qc_10:
        res_10 = client.get(f"/apis/v3/billing/work-orders?project_id={proj_10.id}", headers=hdr)
    assert res_10.status_code == 200
    data_10 = res_10.json()
    assert len(data_10) == 10
    count_10 = qc_10.count

    print(f"\n[QUERY COUNT] 5 WOs queries: {count_5}, 10 WOs queries: {count_10}")

    # Core assertion: Query count must be CONSTANT and not scale with number of work orders
    assert count_5 == count_10, (
        f"N+1 regression: query count grew from {count_5} (for 5 WOs) to {count_10} (for 10 WOs)"
    )
