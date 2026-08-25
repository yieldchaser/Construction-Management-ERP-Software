"""Build a valid Tally Prime "Import Data -> Vouchers" XML ENVELOPE.

This module is pure: it receives a list of already-resolved voucher dicts and
renders Tally-compliant XML. It never talks to the database or decides mappings;
that logic lives in routers/tally.py so it can be reasoned about and tested on
its own.

LEDGER ENTRY CONVENTION (Tally double entry):
  * Debit leg  -> ISDEEMEDPOSITIVE="No", AMOUNT is positive.
  * Credit leg -> ISDEEMEDPOSITIVE="Yes", AMOUNT is negative.
The legs within a voucher must net to zero.

GST handling (R2-410): Sales/Purchase vouchers post the tax-exclusive base to
the revenue/expense ledger and the GST to Output/Input CGST+SGST ledgers under
the "Duties & Taxes" parent, so the party leg stays at the gross figure and the
voucher still nets to zero. Zero-GST bills keep the plain two-leg shape.
"""
import xml.sax.saxutils as _sx

# Tally treats these characters inside ledger names / narration as special.
_ESCAPE_TABLE = {'"': "&quot;", "'": "&apos;"}


def _esc(value):
    if value is None:
        return ""
    return _sx.escape(str(value), _ESCAPE_TABLE)


def _amount(amount) -> str:
    """Render a positive magnitude as a 2-decimal string."""
    try:
        return f"{float(amount):.2f}"
    except (TypeError, ValueError):
        return "0.00"


def _signed_amount(amount, debit: bool) -> str:
    amt = _amount(amount)
    return amt if debit else f"-{amt}"


def _ledger_parent(ledger_type: str) -> str:
    """Map a SiteFlow ledger role to a sensible Tally parent group."""
    return {
        "purchase": "Purchase Accounts",
        "sales": "Sales Accounts",
        "party_creditor": "Sundry Creditors",
        "party_debtor": "Sundry Debtors",
        "bank": "Bank Accounts",
        "cash": "Cash-in-Hand",
        # R2-410: GST ledgers must land in Duties & Taxes, not P&L groups.
        "input_tax": "Duties & Taxes",
        "output_tax": "Duties & Taxes",
    }.get(ledger_type, "Indirect Expenses")


def _emit_ledger_master(out, name, ledger_type):
    out.append('        <TALLYMESSAGE xmlns:UDF="TallyUDF">')
    out.append(f'          <LEDGER NAME="{_esc(name)}" ACTION="Alter">')
    out.append(f"            <NAME>{_esc(name)}</NAME>")
    out.append(f"            <ALTERID>{_esc(name)}</ALTERID>")
    out.append(f"            <PARENT>{_esc(_ledger_parent(ledger_type))}</PARENT>")
    out.append("            <OPENINGBALANCE>0</OPENINGBALANCE>")
    out.append("          </LEDGER>")
    out.append("        </TALLYMESSAGE>")


def build_tally_envelope(company_name: str, vouchers: list, auto_create: bool = False) -> str:
    """Render an ENVELOPE for the given vouchers.

    Each voucher dict shape:
    {
      "vchtype": "Purchase" | "Sales" | "Receipt" | "Payment",
      "voucher_type_name": str,            # optional, defaults to vchtype
      "voucher_number": str,
      "date": "YYYYMMDD",
      "party_ledger_name": str,
      "narration": str,
      "entries": [
        {
          "ledger": str,
          "amount": float,                 # positive magnitude
          "debit": bool,                   # True => debit (No), False => credit (Yes)
          "cost_centre": str | None,       # optional, allocated on this leg
          "ledger_type": str | None        # optional: purchase/sales/party_creditor/
                                           # party_debtor/bank/cash (drives auto-create parent)
        },
        ...
      ]
    }

    When ``auto_create`` is True, LEDGER masters are emitted (de-duplicated) for every
    distinct ledger the vouchers reference, so an import into Tally Prime succeeds even
    when those ledgers do not yet exist. Masters are emitted before the vouchers.
    """
    out = []
    out.append('<?xml version="1.0" encoding="UTF-8"?>')
    out.append("<ENVELOPE>")
    out.append("  <HEADER>")
    out.append("    <TALLYREQUEST>Import Data</TALLYREQUEST>")
    out.append("  </HEADER>")
    out.append("  <BODY>")
    out.append("    <IMPORTDATA>")
    out.append("      <REQUESTDESC>")
    out.append("        <REPORTNAME>Vouchers</REPORTNAME>")
    out.append("        <STATICVARIABLES>")
    out.append(f"          <SVCURRENTCOMPANY>{_esc(company_name)}</SVCURRENTCOMPANY>")
    out.append("        </STATICVARIABLES>")
    out.append("      </REQUESTDESC>")
    out.append("      <REQUESTDATA>")

    if auto_create:
        seen = {}
        for v in vouchers:
            for e in v.get("entries", []):
                name = e.get("ledger")
                if name:
                    seen[name] = e.get("ledger_type") or "expense"
        for name, ltype in seen.items():
            _emit_ledger_master(out, name, ltype)

    for v in vouchers:
        vchtype = _esc(v.get("vchtype") or "")
        vtypename = _esc(v.get("voucher_type_name") or v.get("vchtype") or "")
        out.append('        <TALLYMESSAGE xmlns:UDF="TallyUDF">')
        out.append(f'          <VOUCHER VCHTYPE="{vchtype}" ACTION="Create">')
        out.append(f"            <DATE>{_esc(v.get('date'))}</DATE>")
        out.append(f"            <VOUCHERTYPENAME>{vtypename}</VOUCHERTYPENAME>")
        out.append(f"            <VOUCHERNUMBER>{_esc(v.get('voucher_number'))}</VOUCHERNUMBER>")
        out.append(f"            <REFERENCE>{_esc(v.get('reference'))}</REFERENCE>")
        out.append(f"            <PARTYLEDGERNAME>{_esc(v.get('party_ledger_name'))}</PARTYLEDGERNAME>")
        out.append(f"            <NARRATION>{_esc(v.get('narration'))}</NARRATION>")
        for e in v.get("entries", []):
            debit = bool(e.get("debit"))
            amt = _signed_amount(e.get("amount") or 0, debit)
            out.append("            <ALLLEDGERENTRIES.LIST>")
            out.append(f"              <LEDGERNAME>{_esc(e.get('ledger'))}</LEDGERNAME>")
            out.append(f"              <ISDEEMEDPOSITIVE>{'No' if debit else 'Yes'}</ISDEEMEDPOSITIVE>")
            out.append(f"              <AMOUNT>{amt}</AMOUNT>")
            cc = e.get("cost_centre")
            if cc:
                out.append("              <CATEGORYALLOCATIONS.LIST>")
                out.append("                <CATEGORY>PROJECTS</CATEGORY>")
                out.append("                <COSTCENTREALLOCATIONS.LIST>")
                out.append(f"                  <NAME>{_esc(cc)}</NAME>")
                out.append(f"                  <AMOUNT>{amt}</AMOUNT>")
                out.append("                </COSTCENTREALLOCATIONS.LIST>")
                out.append("              </CATEGORYALLOCATIONS.LIST>")
            out.append("            </ALLLEDGERENTRIES.LIST>")
        out.append("          </VOUCHER>")
        out.append("        </TALLYMESSAGE>")

    out.append("      </REQUESTDATA>")
    out.append("    </IMPORTDATA>")
    out.append("  </BODY>")
    out.append("</ENVELOPE>")
    return "\n".join(out)
