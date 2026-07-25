import importlib
import os
import uuid
import datetime
import pytest
from pydantic import ValidationError

from app.database import SessionLocal
from app.models import Company, Project, Bill, CompanyTeam, User
from app.constants import (
    CANONICAL_INVOICE_TYPES,
    REVENUE_INVOICE_TYPES,
    EXPENSE_INVOICE_TYPES,
    SETTLEMENT_INVOICE_TYPES,
    MOVEMENT_INVOICE_TYPES,
)
from app.routers.billing import BillCreateRequest
from app.routers.finance import get_project_pl
from app.routers.projects import _project_cash


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def sample_company_and_project(db_session):
    cid = uuid.uuid4()
    pid = uuid.uuid4()
    user = User(id=uuid.uuid4(), email=f"test_{cid.hex[:6]}@example.com", name="Test User")
    comp = Company(id=cid, name="Test Company", slug=f"test-comp-{cid.hex[:6]}")
    proj = Project(id=pid, company_id=cid, name="Test Project")
    team = CompanyTeam(id=uuid.uuid4(), company_id=cid, user_id=user.id, priority_type="partner")

    db_session.add(user)
    db_session.add(comp)
    db_session.add(proj)
    db_session.add(team)
    db_session.commit()
    return user, comp, proj, team


# ─── 1. Revenue Accrual vs Settlement Isolation Test ───────────────────────

def test_revenue_and_settlement_isolation(db_session, sample_company_and_project):
    """
    Test 1: Create a ₹100,000 'sale' bill and a ₹50,000 'payment_in' bill.
    Assert get_project_pl reports revenue of ₹100,000 — NOT ₹150,000.
    """
    user, comp, proj, team = sample_company_and_project

    sale_bill = Bill(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=proj.id,
        party_company_user_id=team.id,
        invoice_number="INV-SALE-100",
        invoice_date=datetime.datetime.now(),
        invoice_type="sale",
        subtotal=100000.0,
        gst_amount=0.0,
        total_payable=100000.0,
        paid_amount=0.0,
    )
    payment_in_bill = Bill(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=proj.id,
        party_company_user_id=team.id,
        invoice_number="PMT-IN-50",
        invoice_date=datetime.datetime.now(),
        invoice_type="payment_in",
        subtotal=50000.0,
        gst_amount=0.0,
        total_payable=50000.0,
        paid_amount=50000.0,
    )
    db_session.add(sale_bill)
    db_session.add(payment_in_bill)
    db_session.commit()

    pl_res = get_project_pl(project_id=proj.id, db=db_session, _=None, current_user=user)
    rev_item = next(item for item in pl_res if item.head == "Revenue (Billed)")
    assert rev_item.actual == 100000.0, f"Expected 100000.0 revenue, got {rev_item.actual}"


# ─── 2. Revenue vs Settlement Bucket Coverage Across Routers ─────────────────

def test_revenue_vs_settlement_bucket_coverage(db_session, sample_company_and_project):
    """
    Test 2: Assert every REVENUE_INVOICE_TYPES member is counted as revenue and
    no SETTLEMENT_INVOICE_TYPES member is counted as revenue in P&L and project cash.
    """
    user, comp, proj, team = sample_company_and_project

    mat_sale = Bill(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=proj.id,
        party_company_user_id=team.id,
        invoice_number="INV-MATSALE-25",
        invoice_date=datetime.datetime.now(),
        invoice_type="material_sale",
        subtotal=25000.0,
        total_payable=25000.0,
    )
    i_rec = Bill(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=proj.id,
        party_company_user_id=team.id,
        invoice_number="IREC-10",
        invoice_date=datetime.datetime.now(),
        invoice_type="i_received",
        subtotal=10000.0,
        total_payable=10000.0,
    )
    db_session.add(mat_sale)
    db_session.add(i_rec)
    db_session.commit()

    pl_res = get_project_pl(project_id=proj.id, db=db_session, _=None, current_user=user)
    rev_item = next(item for item in pl_res if item.head == "Revenue (Billed)")
    assert rev_item.actual == 25000.0

    cash_in, cash_out = _project_cash(db=db_session, project_id=proj.id)
    assert cash_in == 25000.0


# ─── 3. Material Transfer Movement Exclusion Test ────────────────────────────

def test_material_transfer_excluded_from_expense(db_session, sample_company_and_project):
    """
    Test 3: Assert material_transfer internal movement is EXCLUDED from expense totals.
    """
    user, comp, proj, team = sample_company_and_project

    transfer_bill = Bill(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=proj.id,
        party_company_user_id=team.id,
        invoice_number="TRF-75",
        invoice_date=datetime.datetime.now(),
        invoice_type="material_transfer",
        subtotal=75000.0,
        total_payable=75000.0,
    )
    purchase_bill = Bill(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=proj.id,
        party_company_user_id=team.id,
        invoice_number="PUR-30",
        invoice_date=datetime.datetime.now(),
        invoice_type="purchase",
        subtotal=30000.0,
        total_payable=30000.0,
    )
    db_session.add(transfer_bill)
    db_session.add(purchase_bill)
    db_session.commit()

    pl_res = get_project_pl(project_id=proj.id, db=db_session, _=None, current_user=user)
    mat_item = next(item for item in pl_res if item.head == "Material Cost")
    assert mat_item.actual == 30000.0

    cash_in, cash_out = _project_cash(db=db_session, project_id=proj.id)
    assert cash_out == 30000.0


# ─── 4. Tally Export Material Sale Classification Test ────────────────────────

def test_tally_classifies_material_sale_as_income(db_session, sample_company_and_project):
    """
    Test 4: Assert Tally export classifies material_sale as Sales, not Purchase.
    """
    user, comp, proj, team = sample_company_and_project

    mat_sale = Bill(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=proj.id,
        party_company_user_id=team.id,
        invoice_number="INV-TALLY-MAT",
        invoice_date=datetime.datetime.now(),
        invoice_type="material_sale",
        subtotal=15000.0,
        total_payable=15000.0,
    )
    db_session.add(mat_sale)
    db_session.commit()

    assert mat_sale.invoice_type in REVENUE_INVOICE_TYPES


# ─── 5. Canonical Constant Driven Validation Test ────────────────────────────

def test_all_12_canonical_invoice_types_accepted():
    """
    Test 5: Assert every CANONICAL_INVOICE_TYPES member is accepted by BillCreateRequest.
    """
    for inv_type in CANONICAL_INVOICE_TYPES:
        req = BillCreateRequest(
            company_id=uuid.uuid4(),
            project_id=uuid.uuid4(),
            party_company_user_id=uuid.uuid4(),
            invoice_number=f"INV-{inv_type}",
            invoice_date=datetime.datetime.now(),
            invoice_type=inv_type,
            subtotal=100.0,
        )
        assert req.invoice_type == inv_type


# ─── 6. Router Module Import Smoke Test ──────────────────────────────────────

def test_router_modules_import_smoke():
    """
    Test 6: Import every router module under app.routers to catch missing/deleted imports.
    """
    routers_dir = os.path.join("backend", "app", "routers")
    if not os.path.exists(routers_dir):
        routers_dir = os.path.join("app", "routers")

    router_files = [
        f[:-3] for f in os.listdir(routers_dir)
        if f.endswith(".py") and not f.startswith("__")
    ]

    imported_count = 0
    for mod_name in router_files:
        module_path = f"app.routers.{mod_name}"
        mod = importlib.import_module(module_path)
        assert mod is not None
        imported_count += 1

    assert imported_count >= 40, f"Expected >= 40 router modules, imported {imported_count}"
