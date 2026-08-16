import pytest
import uuid
import datetime
from pydantic import ValidationError

from app.constants import CANONICAL_INVOICE_TYPES, INVOICE_TYPE_PATTERN
from app.routers.billing import BillCreateRequest, DeductionItemSchema
from app.routers.drawings import DrawingCreateRequest, RevisionApproveRequest
from app.routers.calculators import ConcreteCalcRequest, DeductionItem
from app.routers.finance import PaymentCreateRequest
from app.routers.library import PartyCreate

# ─── 1. Taxonomy & Canonical Constant Validation ─────────────────────────────

def test_all_canonical_invoice_types_accepted():
    """Assert every canonical invoice_type is accepted by BillCreateRequest."""
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

def test_invalid_invoice_type_rejected():
    """Assert invalid or unmapped invoice_type strings raise 422 ValidationError."""
    with pytest.raises(ValidationError):
        BillCreateRequest(
            company_id=uuid.uuid4(),
            project_id=uuid.uuid4(),
            party_company_user_id=uuid.uuid4(),
            invoice_number="INV-INVALID",
            invoice_date=datetime.datetime.now(),
            invoice_type="invalid_type_name",
            subtotal=100.0,
        )

# ─── 2. All 9 Pattern-Validated Fields Regression Coverage ────────────────────

def test_deduction_type_validation():
    """Test valid and invalid deduction_type in billing."""
    valid = DeductionItemSchema(deduction_type="TDS", amount=50.0)
    assert valid.deduction_type == "TDS"
    with pytest.raises(ValidationError):
        DeductionItemSchema(deduction_type="InvalidDeduction", amount=50.0)

def test_drawing_category_validation():
    """Test valid and invalid category in drawings."""
    valid = DrawingCreateRequest(
        project_id=uuid.uuid4(),
        name="Layout A",
        category="2D Layout",
        created_by=uuid.uuid4(),
        file_url="/images/drawings/test.pdf"
    )
    assert valid.category == "2D Layout"
    with pytest.raises(ValidationError) as exc_info:
        DrawingCreateRequest(
            project_id=uuid.uuid4(),
            name="Layout A",
            category="4D Hologram",
            created_by=uuid.uuid4(),
            file_url="/images/drawings/test.pdf"
        )
    assert any(e["loc"] == ("category",) for e in exc_info.value.errors()), exc_info.value.errors()

def test_approval_status_validation():
    """Test valid and invalid approval_status in drawings."""
    valid = RevisionApproveRequest(approval_status="approved")
    assert valid.approval_status == "approved"
    valid = RevisionApproveRequest(approval_status="pending")
    assert valid.approval_status == "pending"
    with pytest.raises(ValidationError):
        RevisionApproveRequest(approval_status="invalid_status")

def test_concrete_grade_validation():
    """Test valid and invalid concrete grade in calculators."""
    valid = ConcreteCalcRequest(grade="M25", wet_volume=5.0)
    assert valid.grade == "M25"
    with pytest.raises(ValidationError):
        ConcreteCalcRequest(grade="M100", wet_volume=5.0)

def test_calculator_deduction_type_validation():
    """Test valid and invalid deduction item type in calculators."""
    valid = DeductionItem(type="pct_total", val=10.0)
    assert valid.type == "pct_total"
    with pytest.raises(ValidationError) as exc_info:
        DeductionItem(type="unknown_pct", val=10.0)
    assert any(e["loc"] == ("type",) for e in exc_info.value.errors()), exc_info.value.errors()

def test_payment_type_validation():
    """Test valid and invalid payment_type in finance."""
    valid = PaymentCreateRequest(
        company_id=uuid.uuid4(),
        payment_type="in",
        amount=100.0,
        payment_method="Cash",
        payment_date=datetime.datetime.now()
    )
    assert valid.payment_type == "in"
    with pytest.raises(ValidationError):
        PaymentCreateRequest(
            company_id=uuid.uuid4(),
            payment_type="invalid_dir",
            amount=100.0,
            payment_method="Cash",
            payment_date=datetime.datetime.now()
        )

def test_payment_method_validation():
    """Test valid and invalid payment_method in finance."""
    valid = PaymentCreateRequest(
        company_id=uuid.uuid4(),
        payment_type="out",
        amount=100.0,
        payment_method="Bank Transfer",
        payment_date=datetime.datetime.now()
    )
    assert valid.payment_method == "Bank Transfer"
    with pytest.raises(ValidationError):
        PaymentCreateRequest(
            company_id=uuid.uuid4(),
            payment_type="out",
            amount=100.0,
            payment_method="CryptoCurrency",
            payment_date=datetime.datetime.now()
        )

def test_party_type_validation():
    """Test valid and invalid party_type in library."""
    valid = PartyCreate(company_id=uuid.uuid4(), name="Vendor Corp", party_type="Supplier")
    assert valid.party_type == "Supplier"
    with pytest.raises(ValidationError):
        PartyCreate(company_id=uuid.uuid4(), name="Vendor Corp", party_type="AlienParty")

def test_opening_balance_direction_validation():
    """Test valid and invalid opening_balance_direction in library."""
    valid = PartyCreate(company_id=uuid.uuid4(), name="Vendor Corp", opening_balance_direction="will_pay")
    assert valid.opening_balance_direction == "will_pay"
    with pytest.raises(ValidationError):
        PartyCreate(company_id=uuid.uuid4(), name="Vendor Corp", opening_balance_direction="invalid_dir")
