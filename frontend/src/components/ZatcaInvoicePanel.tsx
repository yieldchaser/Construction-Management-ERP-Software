"use client";

import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { getApi, authHeaders } from "@/lib/siteflow";

type ZatcaPayload = {
  is_zatca_enabled: boolean;
  qr_tlv_base64: string;
  ubl_xml: string;
  invoice_number: string;
  issue_date: string;
  total_excl_vat: number;
  vat_total: number;
  total_incl_vat: number;
};

export default function ZatcaInvoicePanel({
  billId,
  onClose,
}: {
  billId: string;
  companyId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<ZatcaPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    const url = getApi(`/billing/bills/${billId}/zatca`);
    fetch(url, { headers: authHeaders() ?? {} })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || "Failed to load ZATCA payload");
        }
        return res.json();
      })
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e) => {
        if (alive) setError(e.message || "Failed to load ZATCA payload");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [billId]);

  const downloadXml = () => {
    if (!data) return;
    const blob = new Blob([data.ubl_xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zatca-${data.invoice_number || billId}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">ZATCA Simplified Tax Invoice</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            data?.is_zatca_enabled
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-amber-500/10 text-amber-400"
          }`}
        >
          {data?.is_zatca_enabled ? "Enabled" : "Not enabled for company"}
        </span>
      </div>

      {loading && <p className="text-sm text-muted">Loading…</p>}
      {error && <p className="text-sm text-rose-400">{error}</p>}

      {data && (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-2 rounded-lg border border-border-custom p-4">
            <QRCodeSVG value={data.qr_tlv_base64} size={180} level="M" />
            <p className="text-xs text-muted">Scan to verify (ZATCA TLV base64)</p>
          </div>

          <div className="grid grid-cols-2 gap-y-1 text-sm">
            <div className="text-muted">Invoice</div>
            <div className="text-right text-foreground">{data.invoice_number}</div>
            <div className="text-muted">Date</div>
            <div className="text-right text-foreground">{data.issue_date}</div>
            <div className="text-muted">Taxable</div>
            <div className="text-right text-foreground">{Number(data.total_excl_vat).toFixed(2)}</div>
            <div className="text-muted">VAT</div>
            <div className="text-right text-foreground">{Number(data.vat_total).toFixed(2)}</div>
            <div className="text-muted font-medium">Total</div>
            <div className="text-right font-medium text-foreground">
              {Number(data.total_incl_vat).toFixed(2)}
            </div>
          </div>

          <button
            type="button"
            onClick={downloadXml}
            className="w-full rounded-md border border-border-custom px-4 py-2 text-sm text-foreground hover:border-primary"
          >
            Download UBL 2.1 XML
          </button>
        </div>
      )}
    </div>
  );
}
