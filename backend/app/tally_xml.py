"""Build a valid Tally Prime "Import Data -> Vouchers" XML ENVELOPE.

This module is pure: it receives a list of already-resolved voucher dicts and
renders Tally-compliant XML. It never talks to the database or decides mappings;
that logic lives in routers/tally.py so it can be reasoned about and tested on
its own.

LEDGER ENTRY CONVENTION (Tally double entry):
  * Debit leg  -> ISDEEMEDPOSITIVE="No", AMOUNT is positive.
  * Credit leg -> ISDEEMEDPOSITIVE="Yes", AMOUNT is negative.
The legs within a voucher must net to zero.

GST is intentionally OUT of v1: we post the gross total on the
expense/sales leg. A GST breakout (CGST/SGST split ledgers) is a follow-up.
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


def build_tally_envelope(company_name: str, vouchers: list) -> str:
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
          "cost_centre": str | None        # optional, allocated on this leg
        },
        ...
      ]
    }
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

    for v in vouchers:
        vchtype = _esc(v.get("vchtype") or "")
        vtypename = _esc(v.get("voucher_type_name") or v.get("vchtype") or "")
        out.append('        <TALLYMESSAGE xmlns:UDF="TallyUDF">')
        out.append(f'          <VOUCHER VCHTYPE="{vchtype}" ACTION="Create">')
        out.append(f"            <DATE>{_esc(v.get('date'))}</DATE>")
        out.append(f"            <VOUCHERTYPENAME>{vtypename}</VOUCHERTYPENAME>")
        out.append(f"            <VOUCHERNUMBER>{_esc(v.get('voucher_number'))}</VOUCHERNUMBER>")
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
