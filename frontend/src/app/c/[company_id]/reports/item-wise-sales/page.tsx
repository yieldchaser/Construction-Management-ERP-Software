"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getApiHost } from "@/lib/api";
import { authHeaders } from "@/lib/siteflow";
import Icon from "@/components/marketing/Icon";
import { isMissingOrDemoTenant, redirectToLogin } from "@/lib/company-guard";

export default function ItemWiseSalesReportPage() {
  const params = useParams();
  const companyId = params?.company_id as string;

  useEffect(() => {
    if (isMissingOrDemoTenant(companyId)) {
      redirectToLogin();
    }
  }, [companyId]);

  const [clientFilter, setClientFilter] = useState("All");
  const [itemFilter, setItemFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  useEffect(() => {
    if (isMissingOrDemoTenant(companyId)) return;
    const fetchReport = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${getApiHost()}/apis/v3/reports/data/item-wise-sales?company_id=${companyId}`, {
          headers: { ...(authHeaders() || {}) }
        });
        const data = await res.json();
        setRows(data.rows || []);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [companyId]);

  const cell = (row: Record<string, any>, key: string) => (row[key] ?? "").toString();

  const filteredSales = rows.filter(row => {
    const matchesClient = clientFilter === "All" || cell(row, "Client Name").includes(clientFilter);
    const matchesItem = itemFilter === "All" || cell(row, "Item Name").includes(itemFilter);
    const matchesSearch = searchQuery === "" ||
      cell(row, "Item Name").toLowerCase().includes(searchQuery.toLowerCase()) ||
      cell(row, "Client Name").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClient && matchesItem && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

        {/* Filters Top Bar */}
        <div className="bg-sidebar border-b border-border-custom px-6 py-4 flex flex-col gap-4 shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">

            {/* Client */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted uppercase font-bold">Client Name:</span>
              <select
                value={clientFilter}
                onChange={e => setClientFilter(e.target.value)}
                className="bg-card border border-border-custom rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
              >
                <option value="All">All Clients</option>
                <option value="L&T Construction">L&T Construction</option>
                <option value="Public Works">Public Works Dept</option>
                <option value="Alpha Builders">Alpha Builders Ltd</option>
              </select>
            </div>

            {/* Invoice Date */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted uppercase font-bold">Invoice Date:</span>
              <input
                type="date"
                className="bg-card border border-border-custom rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-primary"
              />
            </div>

            {/* Item Name */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted uppercase font-bold">Item Name:</span>
              <select
                value={itemFilter}
                onChange={e => setItemFilter(e.target.value)}
                className="bg-card border border-border-custom rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
              >
                <option value="All">All Items</option>
                <option value="Steel">Reinforcement Steel</option>
                <option value="Concrete">Ready Mix Concrete</option>
                <option value="Cement">OPC Cement</option>
              </select>
            </div>

          </div>

          <div className="flex items-center justify-between gap-4 pt-2 border-t border-border-custom/40">
            <div className="relative w-full md:w-72">
              <input
                type="text"
                placeholder="Search Item or Client..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-card border border-border-custom rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-primary"
              />
              <Icon name="search" className="absolute left-3 top-2 w-3.5 h-3.5 text-muted" />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => showToast("Exporting Item Wise Sales Report...")} className="px-3 py-1.5 bg-[#FF8A00] hover:bg-[#E07A00] text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5">
                Download Excel <Icon name="arrow_down" className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-6 bg-elevated/10">
          {loading ? (
            <div className="bg-card border border-border-custom rounded-xl p-4 text-center text-muted text-sm">Loading…</div>
          ) : (
            <div className="bg-card border border-border-custom rounded-xl p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border-custom text-muted font-semibold text-[10px] uppercase">
                      <th className="pb-2">#</th>
                      <th className="pb-2">Client Name</th>
                      <th className="pb-2">Invoice Date</th>
                      <th className="pb-2">Item Name</th>
                      <th className="pb-2">Unit</th>
                      <th className="pb-2">Quantity</th>
                      <th className="pb-2">Item Rate</th>
                      <th className="pb-2">Tax %</th>
                      <th className="pb-2">Total Amount</th>
                      <th className="pb-2">Invoice Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-muted">No data available for this report yet.</td>
                      </tr>
                    ) : (
                      filteredSales.map((row, i) => (
                        <tr key={i} className="border-b border-border-custom/40 last:border-0 hover:bg-elevated/40">
                          <td className="py-3 text-muted">{i + 1}</td>
                          <td className="py-3 text-white font-medium">{cell(row, "Client Name")}</td>
                          <td className="py-3 text-muted">{cell(row, "Invoice Date")}</td>
                          <td className="py-3 text-white">{cell(row, "Item Name")}</td>
                          <td className="py-3 text-muted">{cell(row, "Unit")}</td>
                          <td className="py-3 text-white font-bold">{cell(row, "Quantity")}</td>
                          <td className="py-3 text-muted">{cell(row, "Item Rate")}</td>
                          <td className="py-3 text-muted">{cell(row, "Tax %")}</td>
                          <td className="py-3 text-muted">{cell(row, "Total Amount")}</td>
                          <td className="py-3 text-muted">{cell(row, "Invoice Created")}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Global Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 bg-card border border-success/30 rounded-lg px-4 py-3 text-xs text-success shadow-lg flex items-center gap-2 z-50 transition-all">
            <Icon name="bolt" className="w-4 h-4" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}
    </div>
  );
}
