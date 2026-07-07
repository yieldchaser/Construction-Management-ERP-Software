"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";

export default function ItemWiseSalesReportPage() {
  const params = useParams();
  const companyId = params?.company_id as string || "e0000000-0000-0000-0000-000000000000";

  const [projectFilter, setProjectFilter] = useState("All");
  const [clientFilter, setClientFilter] = useState("All");
  const [itemFilter, setItemFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const mockSales = [
    { type: "Tax Invoice", project: "Metro Terminal (Phase 2)", client: "L&T Construction", invNum: "INV-2026-004", invDate: "2026-07-02", itemName: "Reinforcement Steel (12mm)", unit: "Tons", qty: "12.5", rate: "4500", tax: "18%", taxAmt: "10125", grossAmt: "56250", totalAmt: "66375", created: "02-Jul-2026" },
    { type: "Retail Invoice", project: "Bypass Highway Flyover", client: "Public Works Dept", invNum: "INV-2026-012", invDate: "2026-07-03", itemName: "Ready Mix Concrete M35", unit: "Cum", qty: "45.0", rate: "5000", tax: "18%", taxAmt: "40500", grossAmt: "225000", totalAmt: "265500", created: "03-Jul-2026" },
    { type: "Proforma Invoice", project: "Alpha Premium Residences", client: "Alpha Builders Ltd", invNum: "INV-2026-009", invDate: "2026-06-28", itemName: "OPC Cement 43 Grade", unit: "Bags", qty: "300", rate: "400", tax: "18%", taxAmt: "21600", grossAmt: "120000", totalAmt: "141600", created: "28-Jun-2026" }
  ];

  const filteredSales = mockSales.filter(row => {
    const matchesProj = projectFilter === "All" || row.project.includes(projectFilter);
    const matchesClient = clientFilter === "All" || row.client.includes(clientFilter);
    const matchesItem = itemFilter === "All" || row.itemName.includes(itemFilter);
    const matchesType = typeFilter === "All" || row.type.includes(typeFilter);
    const matchesSearch = searchQuery === "" || 
      row.itemName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      row.client.toLowerCase().includes(searchQuery.toLowerCase()) || 
      row.invNum.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesProj && matchesClient && matchesItem && matchesType && matchesSearch;
  });

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar onShowToast={showToast} />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <PageHeader title="Item Wise Sales Report" />

        {/* Filters Top Bar */}
        <div className="bg-sidebar border-b border-border-custom px-6 py-4 flex flex-col gap-4 shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            
            {/* Project */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted uppercase font-bold">Project Name:</span>
              <select
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                className="bg-card border border-border-custom rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
              >
                <option value="All">All Projects</option>
                <option value="Metro Terminal">Metro Terminal</option>
                <option value="Bypass Highway">Bypass Flyover</option>
                <option value="Alpha Premium">Alpha Residences</option>
              </select>
            </div>

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

            {/* Sales Type */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted uppercase font-bold">Sales Type:</span>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="bg-card border border-border-custom rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
              >
                <option value="All">All Types</option>
                <option value="Tax Invoice">Tax Invoice</option>
                <option value="Retail Invoice">Retail Invoice</option>
                <option value="Proforma Invoice">Proforma Invoice</option>
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
              <span className="absolute left-3 top-2 text-muted text-xs">🔍</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => showToast("Exporting Item Wise Sales Report...")} className="px-3 py-1.5 bg-[#FF8A00] hover:bg-[#E07A00] text-white text-xs font-bold rounded-lg">
                Download Excel 📥
              </button>
            </div>
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-6 bg-elevated/10">
          <div className="bg-card border border-border-custom rounded-xl p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border-custom text-muted font-semibold text-[10px] uppercase">
                    <th className="pb-2">#</th>
                    <th className="pb-2">Sale Type</th>
                    <th className="pb-2">Project Name</th>
                    <th className="pb-2">Client Name</th>
                    <th className="pb-2">Invoice Number</th>
                    <th className="pb-2">Invoice Date</th>
                    <th className="pb-2">Item Name</th>
                    <th className="pb-2">Unit</th>
                    <th className="pb-2">Quantity</th>
                    <th className="pb-2">Item Rate</th>
                    <th className="pb-2">Tax %</th>
                    <th className="pb-2">Tax Amount</th>
                    <th className="pb-2">Gross Amount</th>
                    <th className="pb-2">Total Amount</th>
                    <th className="pb-2">Invoice Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="py-8 text-center text-muted">No sales invoice items match the active filters.</td>
                    </tr>
                  ) : (
                    filteredSales.map((row, i) => (
                      <tr key={i} className="border-b border-border-custom/40 last:border-0 hover:bg-elevated/40">
                        <td className="py-3 text-muted">{i + 1}</td>
                        <td className="py-3 font-semibold text-white">{row.type}</td>
                        <td className="py-3 text-muted">{row.project}</td>
                        <td className="py-3 text-white font-medium">{row.client}</td>
                        <td className="py-3 text-muted">{row.invNum}</td>
                        <td className="py-3 text-muted">{row.invDate}</td>
                        <td className="py-3 text-white">{row.itemName}</td>
                        <td className="py-3 text-muted">{row.unit}</td>
                        <td className="py-3 text-white font-bold">{row.qty}</td>
                        <td className="py-3 text-muted">{row.rate}</td>
                        <td className="py-3 text-muted">{row.tax}</td>
                        <td className="py-3 text-muted">{row.taxAmt}</td>
                        <td className="py-3 text-muted">{row.grossAmt}</td>
                        <td className="py-3 text-muted">{row.totalAmt}</td>
                        <td className="py-3 text-muted">{row.created}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Global Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 bg-card border border-success/30 rounded-lg px-4 py-3 text-xs text-success shadow-lg flex items-center gap-2 z-50 transition-all">
            <span>⚡</span>
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}
      </main>
    </div>
  );
}
