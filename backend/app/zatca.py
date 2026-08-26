"""ZATCA Phase 1 — Simplified Tax Invoice e-invoicing.

Implements the two deliverables required for a ZATCA Phase 1 (simplified)
e-invoice without any external API call:
  1. The QR code payload: a TLV-encoded (Tag-Length-Value), base64 string
     carrying seller name, VAT number, timestamp, invoice total (with VAT)
     and VAT total.
  2. The UBL 2.1 XML representation of the simplified tax invoice.

All inputs come from existing domain models (Company + Bill); no ZATCA
network integration is performed here.
"""

from datetime import datetime
from typing import List, Optional


def _tlv(tag: int, value: str) -> bytes:
    data = value.encode("utf-8")
    return bytes([tag, len(data)]) + data


def build_tlv_base64(
    seller_name: str,
    vat_number: str,
    timestamp_iso: str,
    invoice_total: float,
    vat_total: float,
) -> str:
    """Build the ZATCA Phase 1 QR payload (TLV -> base64)."""
    payload = b"".join(
        [
            _tlv(1, seller_name or ""),
            _tlv(2, vat_number or ""),
            _tlv(3, timestamp_iso or ""),
            _tlv(4, f"{float(invoice_total):.2f}"),
            _tlv(5, f"{float(vat_total):.2f}"),
        ]
    )
    import base64

    return base64.b64encode(payload).decode("ascii")


def build_simplified_invoice_xml(
    seller_name: str,
    vat_number: str,
    invoice_number: str,
    issue_date: str,
    line_items: List[dict],
    total_excl_vat: float,
    total_vat: float,
    total_incl_vat: float,
    currency: str = "SAR",
) -> str:
    """Build a minimal-but-valid UBL 2.1 Invoice XML for a simplified tax invoice."""

    lines_xml = []
    for idx, item in enumerate(line_items, start=1):
        name = (item.get("description") or item.get("name") or "Item").replace("&", "&amp;")
        qty = float(item.get("quantity", 1) or 1)
        price = float(item.get("amount", 0) or 0)
        lines_xml.append(
            f"""    <cac:InvoiceLine>
      <cbc:ID>{idx}</cbc:ID>
      <cbc:LineExtensionAmount currencyID="{currency}">{price:.2f}</cbc:LineExtensionAmount>
      <cac:Item>
        <cbc:Name>{name}</cbc:Name>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="{currency}">{price:.2f}</cbc:PriceAmount>
        <cbc:BaseQuantity unitCode="unit">{qty:.2f}</cbc:BaseQuantity>
      </cac:Price>
    </cac:InvoiceLine>"""
        )

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>{invoice_number}</cbc:ID>
  <cbc:IssueDate>{issue_date}</cbc:IssueDate>
  <cbc:InvoiceTypeCode name="0111010">388</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>{currency}</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>{seller_name.replace("&", "&amp;")}</cbc:Name>
      </cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>{vat_number}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="{currency}">{total_vat:.2f}</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="{currency}">{total_excl_vat:.2f}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="{currency}">{total_excl_vat:.2f}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="{currency}">{total_incl_vat:.2f}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="{currency}">{total_incl_vat:.2f}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
{chr(10).join(lines_xml)}
</Invoice>"""


def build_zatca_payload(company, bill) -> dict:
    """Assemble the ZATCA Phase 1 payload for a sale invoice (Bill)."""
    seller_name = company.name or company.legal_business_name or ""
    # R2-412: only a deliberately stored Saudi VAT registration number may be
    # presented as the seller's tax identity; the Indian GSTIN must never
    # masquerade as one in the QR or the UBL.
    vat_number = str(getattr(company, "vat_number", None) or "").strip()

    if bill.invoice_date:
        timestamp_iso = bill.invoice_date.strftime("%Y-%m-%dT%H:%M:%SZ")
        issue_date = bill.invoice_date.strftime("%Y-%m-%d")
    else:
        now = datetime.utcnow()
        timestamp_iso = now.strftime("%Y-%m-%dT%H:%M:%SZ")
        issue_date = now.strftime("%Y-%m-%d")

    total_incl = float(bill.total_payable or 0)
    vat_total = float(bill.gst_amount or 0)
    total_excl = round(total_incl - vat_total, 2)

    # R2-413: the lines come from the bill's own data or there is no
    # document. Stored entries use "desc" (quotation-to-invoice conversion,
    # models.Bill comment); amounts fall back to qty*rate exactly as the
    # R2-401 create-time validator computes them.
    def _line_name(it: dict) -> str:
        return str(
            it.get("desc") or it.get("description") or it.get("name") or ""
        ).strip()

    def _line_amount(it: dict) -> float:
        amount = it.get("amount")
        if amount is None:
            amount = float(it.get("qty") or 0) * float(it.get("rate") or 0)
        return float(amount or 0)

    raw_items: List[dict] = []
    if getattr(bill, "items_json", None):
        try:
            import json

            parsed = json.loads(bill.items_json)
            if isinstance(parsed, list):
                raw_items = [it for it in parsed if isinstance(it, dict)]
        except Exception:
            raw_items = []

    line_items: List[dict] = []
    for it in raw_items:
        name = _line_name(it)
        if not name:
            raise ValueError("line item has no description; refusing to fabricate one")
        line_items.append(
            {
                "description": name,
                "quantity": float(it.get("qty", 1) or 1),
                "amount": _line_amount(it),
            }
        )

    if not line_items:
        raise ValueError("bill carries no line items; refusing to fabricate a placeholder line")

    lines_total = round(sum(item["amount"] for item in line_items), 2)
    if abs(lines_total - total_excl) > 0.01:
        raise ValueError(
            f"invoice lines total {lines_total:.2f} do not sum to the document total {total_excl:.2f}"
        )

    qr_tlv_base64 = build_tlv_base64(
        seller_name=seller_name,
        vat_number=vat_number,
        timestamp_iso=timestamp_iso,
        invoice_total=total_incl,
        vat_total=vat_total,
    )

    ubl_xml = build_simplified_invoice_xml(
        seller_name=seller_name,
        vat_number=vat_number,
        invoice_number=bill.invoice_number or "",
        issue_date=issue_date,
        line_items=line_items,
        total_excl_vat=total_excl,
        total_vat=vat_total,
        total_incl_vat=total_incl,
        currency="SAR",
    )

    return {
        "qr_tlv_base64": qr_tlv_base64,
        "ubl_xml": ubl_xml,
        "seller_name": seller_name,
        "vat_number": vat_number,
        "invoice_number": bill.invoice_number,
        "issue_date": issue_date,
        "total_excl_vat": total_excl,
        "vat_total": vat_total,
        "total_incl_vat": total_incl,
    }
