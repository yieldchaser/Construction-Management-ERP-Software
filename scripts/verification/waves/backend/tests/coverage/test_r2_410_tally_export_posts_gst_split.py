"""R2-410 - the Tally export created no tax ledgers and posted the GST-inclusive
total to Sales/Purchase, so input credit was expensed and output liability was
booked as revenue.

The live export carried exactly six ledgers (Sales A/c, Purchase A/c, CASH,
three parties) and every bill leg was the gross figure: a 10,000 + 1,800 GST
sale posted 11,800.00 to Sales A/c even though the bill row stores subtotal
and gst_amount as separate columns. In Tally that buries the GSTR-3B
reconciliation input and overstates turnover by the output tax.

Gate: Sales/Purchase vouchers post the tax-exclusive base to the revenue /
expense ledger, split the GST into Output/Input CGST+SGST ledgers whose parent
is Duties & Taxes (50/50 halves, same documented convention as
reports._gst_split), keep the party leg at the gross figure so the voucher nets
to zero, and leave zero-GST bills on the plain two-leg shape.
"""
import re
import uuid
from datetime import datetime, timezone

from app import models

_ENTRY_RE = re.compile(
    r"<LEDGERNAME>(.*?)</LEDGERNAME>\s*"
    r"<ISDEEMEDPOSITIVE>\w+</ISDEEMEDPOSITIVE>\s*"
    r"<AMOUNT>(-?[\d.]+)</AMOUNT>",
    re.S,
)


def _voucher_blocks(xml: str):
    out = []
    for msg in re.findall(r"<TALLYMESSAGE.*?</TALLYMESSAGE>", xml, re.S):
        if "<VOUCHER " not in msg:
            continue
        ref = re.search(r"<REFERENCE>(.*?)</REFERENCE>", msg).group(1)
        out.append((ref, {name: amt for name, amt in _ENTRY_RE.findall(msg)}))
    return dict(out)


def test_r2_410_tally_export_posts_gst_to_tax_ledgers(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R2410", user_name="U410")
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P410",
        code=f"PRJ-410-{uuid.uuid4().hex[:8]}", status="Ongoing",
    )
    conn = models.TallyConnection(
        id=uuid.uuid4(), company_id=comp.id,
        tally_company_name="Tally 410", registered_mobile="+919241000410",
        sync_window_start_date=datetime(2026, 1, 1, tzinfo=timezone.utc),
        last_voucher_seq=0,
        auto_create_missing_ledgers=True,
    )

    def _bill(number, inv_type, subtotal, gst):
        return models.Bill(
            id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
            party_company_user_id=team.id, invoice_number=number,
            invoice_date=datetime(2026, 7, 10, tzinfo=timezone.utc),
            invoice_type=inv_type, status="Unpaid",
            subtotal=subtotal, gst_amount=gst, total_payable=subtotal + gst,
            paid_amount=0.0, tally_synced=False,
        )

    sale = _bill("INV-410-S", "sale", 10000.0, 1800.0)
    purchase = _bill("INV-410-P", "purchase", 5000.0, 900.0)
    nongst = _bill("INV-410-N", "sale", 700.0, 0.0)
    db.add_all([project, conn, sale, purchase, nongst])
    db.commit()

    r = client.get(f"/apis/v3/tally/export?company_id={comp.id}", headers=hdr)
    assert r.status_code == 200, r.text

    vouchers = _voucher_blocks(r.text)
    assert set(vouchers) == {"INV-410-S", "INV-410-P", "INV-410-N"}, vouchers.keys()

    # Sale: revenue at the tax-exclusive base, output GST split half/half,
    # debtor stays at the gross figure - the voucher nets to zero.
    s = vouchers["INV-410-S"]
    assert s == {
        "Sales A/c": "-10000.00",
        "U410": "11800.00",
        "Output CGST": "-900.00",
        "Output SGST": "-900.00",
    }, s
    # Purchase: expense at the tax-exclusive base, input GST debited to its
    # own ledgers instead of being expensed into the P&L.
    p = vouchers["INV-410-P"]
    assert p == {
        "Purchase A/c": "5000.00",
        "U410": "-5900.00",
        "Input CGST": "450.00",
        "Input SGST": "450.00",
    }, p
    # Zero-GST bills keep the plain two-leg shape.
    n = vouchers["INV-410-N"]
    assert n == {"Sales A/c": "-700.00", "U410": "700.00"}, n

    for ref, legs in ((("INV-410-S"), s), (("INV-410-P"), p), (("INV-410-N"), n)):
        assert abs(sum(float(v) for v in legs.values())) < 0.005, (ref, legs)

    # The tax ledgers are created as masters under Duties & Taxes when
    # auto_create is on, so the import succeeds into a fresh company.
    parents = dict(re.findall(r'<LEDGER NAME="([^"]+)".*?<PARENT>(.*?)</PARENT>', r.text, re.S))
    for name in ("Output CGST", "Output SGST", "Input CGST", "Input SGST"):
        assert parents.get(name) == "Duties &amp; Taxes", (name, parents)
