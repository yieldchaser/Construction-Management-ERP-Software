"""R2-744 - the Tally export must book an inter-state supply as IGST.

D4 (place of supply from Project.state per IGST Act s.12(3)) swept reports.py,
the CRM quotations and the invoice PDF. It did not sweep tally.py, which still
splits every supply unconditionally into CGST+SGST halves.

So one bill now produces two documents that disagree on the tax head: GSTR-1
reports IGST, the invoice PDF prints IGST, and the Tally export posts half CGST
and half SGST. The accountant imports the voucher and the books carry credit
under heads the GSTR-2B reconciliation will not match -- disallowed on
reconciliation, and it surfaces at filing time rather than import time.

This is strictly worse than the pre-D4 state, because the other two surfaces are
now right. Before D4 all three were consistently wrong, which at least
reconciled with itself.

The fix routes the split through gst_utils.gst_split, the same helper the rest of
D4 uses, instead of a fourth hand-rolled convention.

The gate R2-744 asks for: feed one intra-state and one inter-state bill through
_build_vouchers and assert the emitted ledger names.
"""
import uuid
from datetime import datetime, timezone

from app import models
from app.routers.tally import _build_vouchers

# Maharashtra (27) and Gujarat (24) are the finding's own example pair.
SUPPLIER_GSTIN = "27AAPFU0939F1ZV"   # supplier registered in Maharashtra
INTER_STATE = "Gujarat"              # site in a different state -> IGST
INTRA_STATE = "Maharashtra"          # site in the supplier's state -> CGST+SGST


def _company(db, name, gstin=SUPPLIER_GSTIN):
    c = models.Company(id=uuid.uuid4(), name=name, currency_decimal_places=2, gstin=gstin)
    db.add(c)
    db.commit()
    return c


def _connection(db, company_id):
    conn = models.TallyConnection(
        id=uuid.uuid4(),
        company_id=company_id,
        tally_company_name="SiteFlow Books",
        registered_mobile="9000000001",
        sync_window_start_date=datetime(2026, 1, 1, tzinfo=timezone.utc),
    )
    db.add(conn)
    db.commit()
    return conn


def _team(db, company_id, name="Counterparty"):
    u = models.User(id=uuid.uuid4(), name=name, mobile=f"9{uuid.uuid4().int % 10**9:09d}")
    db.add(u)
    db.flush()
    t = models.CompanyTeam(id=uuid.uuid4(), company_id=company_id, user_id=u.id)
    db.add(t)
    db.commit()
    return t


def _project(db, company_id, name, state):
    p = models.Project(
        id=uuid.uuid4(), company_id=company_id, name=name, status="Ongoing", state=state
    )
    db.add(p)
    db.commit()
    return p


def _bill(db, company_id, project_id, team_id, invoice_number, invoice_type="sale",
          subtotal=100000.0, gst=18000.0):
    b = models.Bill(
        id=uuid.uuid4(),
        company_id=company_id,
        project_id=project_id,
        party_company_user_id=team_id,
        invoice_number=invoice_number,
        invoice_date=datetime(2026, 8, 10, tzinfo=timezone.utc),
        invoice_type=invoice_type,
        status="Unpaid",
        subtotal=subtotal,
        gst_amount=gst,
        total_payable=subtotal + gst,
        approval_flag="approved",
    )
    db.add(b)
    db.commit()
    return b


def _tax_ledgers(entries):
    return {
        e["ledger"]: e["amount"]
        for e in entries
        if e.get("ledger_type") in ("output_tax", "input_tax")
    }


def test_inter_state_sale_exports_igst_not_halves(client, db, make_tenant):
    comp = _company(db, "R744A")
    conn = _connection(db, comp.id)
    team = _team(db, comp.id)
    project = _project(db, comp.id, "R744A Inter-state Site", INTER_STATE)
    bill = _bill(db, comp.id, project.id, team.id, "R744-INT-1")

    vouchers, _pending = _build_vouchers(db, conn, [bill], [], advance_sequence=False)
    ledgers = _tax_ledgers(vouchers[0]["entries"])

    assert "Output IGST" in ledgers, (
        f"an inter-state supply was exported as {sorted(ledgers)} instead of IGST"
    )
    assert ledgers["Output IGST"] == 18000.0
    assert "Output CGST" not in ledgers and "Output SGST" not in ledgers


def test_intra_state_sale_still_exports_halves(client, db, make_tenant):
    comp = _company(db, "R744B")
    conn = _connection(db, comp.id)
    team = _team(db, comp.id)
    project = _project(db, comp.id, "R744B Intra-state Site", INTRA_STATE)
    bill = _bill(db, comp.id, project.id, team.id, "R744-INTRA-1")

    vouchers, _pending = _build_vouchers(db, conn, [bill], [], advance_sequence=False)
    ledgers = _tax_ledgers(vouchers[0]["entries"])

    assert "Output CGST" in ledgers and "Output SGST" in ledgers
    assert ledgers["Output CGST"] + ledgers["Output SGST"] == 18000.0
    assert "Output IGST" not in ledgers


def test_inter_state_purchase_exports_input_igst(client, db, make_tenant):
    comp = _company(db, "R744C")
    conn = _connection(db, comp.id)
    team = _team(db, comp.id)
    project = _project(db, comp.id, "R744C Inter-state Site", INTER_STATE)
    bill = _bill(db, comp.id, project.id, team.id, "R744-PUR-1", invoice_type="purchase")

    vouchers, _pending = _build_vouchers(db, conn, [bill], [], advance_sequence=False)
    ledgers = _tax_ledgers(vouchers[0]["entries"])

    assert "Input IGST" in ledgers, (
        f"an inter-state purchase was exported as {sorted(ledgers)} instead of IGST"
    )
    assert "Input CGST" not in ledgers and "Input SGST" not in ledgers


def test_tally_split_agrees_with_gst_utils(client, db, make_tenant):
    """The whole point: one convention, not four."""
    from app.gst_utils import gst_split

    comp = _company(db, "R744D")
    conn = _connection(db, comp.id)
    team = _team(db, comp.id)
    project = _project(db, comp.id, "R744D Site", INTER_STATE)
    bill = _bill(db, comp.id, project.id, team.id, "R744-AGREE-1")

    vouchers, _pending = _build_vouchers(db, conn, [bill], [], advance_sequence=False)
    ledgers = _tax_ledgers(vouchers[0]["entries"])

    cgst, sgst, igst, _utgst = gst_split(18000.0, INTER_STATE, SUPPLIER_GSTIN)
    assert ledgers.get("Output CGST", 0.0) == cgst
    assert ledgers.get("Output SGST", 0.0) == sgst
    assert ledgers.get("Output IGST", 0.0) == igst
