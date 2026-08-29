"""Finding R2-763: Transaction modal input labels and placeholders match endpoint destination.

Clauses:
1. Input label dynamically reflects field destination (Ship To for bills, Notes for debit/credit, Details for payment requests).
2. Placeholder matches the semantic purpose of the input per transaction branch.
3. No static 'Ship To (addressing)' label is displayed when creating payment requests or debit/credit notes.
"""
import re
from pathlib import Path


def test_r2_763_transaction_modal_labels_parity():
    frontend_path = (
        Path(__file__).resolve().parents[3]
        / "frontend" / "src" / "app" / "c" / "[company_id]" / "p" / "[project_id]" / "transaction" / "page.tsx"
    )
    src = frontend_path.read_text(encoding="utf-8")

    idx = src.find("function NewTransactionModal")
    assert idx != -1, "NewTransactionModal not found in transaction/page.tsx"
    modal_src = src[idx:]

    # 1. Must not have static unconditioned <Lbl>Ship To (addressing)</Lbl>
    assert not re.search(r"<Lbl>\s*Ship To \(addressing\)\s*</Lbl>", modal_src), (
        "Found unconditional static 'Ship To (addressing)' label in NewTransactionModal"
    )

    # 2. Must conditionally switch label and placeholder per branch
    assert "Details" in modal_src, "Expected 'Details' label for payment request branch"
    assert "Notes" in modal_src, "Expected 'Notes' label for debit/credit note branch"
    assert "Ship To" in modal_src, "Expected 'Ship To' label for bill branch"
