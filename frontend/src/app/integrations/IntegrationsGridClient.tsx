"use client";

import React, { useState } from "react";
import Link from "next/link";

interface Integration {
  name: string;
  category: string;
  desc: string;
  icon: string;
  status: "active" | "planned";
  link?: string;
}

const INTEGRATIONS_LIST: Integration[] = [
  {
    name: "Tally ERP",
    category: "Accounting",
    desc: "Sync purchase orders, goods receipts (GRN), and vendor bills directly from SiteFlow to Tally without manual re-entry.",
    icon: "🔌",
    status: "active",
    link: "/integrations/tally",
  },
  {
    name: "WhatsApp Business",
    category: "Communication",
    desc: "Automate daily progress report summaries, payment alerts, and site updates directly to client and supervisor WhatsApp groups.",
    icon: "💬",
    status: "planned",
  },
  {
    name: "Zoho Books",
    category: "Accounting",
    desc: "Sync business expenses, vendor ledgers, GST tax breakups, and payment records automatically for month-end reconciliation.",
    icon: "💼",
    status: "planned",
  },
  {
    name: "QuickBooks Online",
    category: "Accounting",
    desc: "Automate subcontractor work orders, invoices, and material receipts syncing directly into QuickBooks.",
    icon: "📊",
    status: "planned",
  },
  {
    name: "Google Drive",
    category: "Storage & Files",
    desc: "Back up project and company files from SiteFlow to your connected Google Drive on demand, with OAuth and encrypted tokens.",
    icon: "💾",
    status: "active",
    link: "/login",
  },
  {
    name: "Microsoft OneDrive",
    category: "Storage & Files",
    desc: "Archive project and company files from SiteFlow to your connected OneDrive via Microsoft Graph, with OAuth and encrypted tokens.",
    icon: "📁",
    status: "active",
    link: "/login",
  },
  {
    name: "PowerBI / Tableau",
    category: "Analytics",
    desc: "Pull your SiteFlow projects, budget variance, and labour productivity data into PowerBI or Tableau as CSV or JSON feeds using API keys.",
    icon: "📈",
    status: "active",
    link: "/login",
  },
  {
    name: "GPS Geofencing (Built-in)",
    category: "Field & Site",
    desc: "Native PWA geofenced attendance and site-location capture built into SiteFlow. Workers punch in within project boundaries and attendance is GPS verified, no third-party connector required.",
    icon: "🏗️",
    status: "active",
    link: "/products",
  },
];

const CATEGORIES = [
  "All",
  "Accounting",
  "Communication",
  "ERP & Finance",
  "Field & Site",
  "Storage & Files",
  "Analytics",
];

export function IntegrationsGridClient() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [requested, setRequested] = useState<Set<string>>(new Set());

  const filtered = INTEGRATIONS_LIST.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.desc.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      activeCategory === "All" || item.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 my-12">
      {/* Search & Categories */}
      <div className="space-y-6">
        <div className="max-w-xl relative">
          <input
            type="text"
            placeholder="Search integrations (Tally, WhatsApp, Zoho...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-5 py-4 pl-12 rounded-lg bg-elevated border border-border-custom text-white placeholder-zinc-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-base shadow-lg"
          />
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted hover:text-foreground transition-all cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2.5 pb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all border cursor-pointer ${
                activeCategory === cat
                  ? "bg-primary border-primary text-white shadow-lg shadow-primary/25"
                  : "bg-elevated border-border-custom text-muted hover:text-foreground hover:border-border-custom"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((item, idx) => (
          <div
            key={idx}
            className="rounded-lg bg-card border border-border-custom rounded-lg p-6 border border-border-custom flex flex-col justify-between hover:border-border-custom hover:shadow-lg transition-all group"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl p-2.5 rounded-md bg-white/[0.03] border border-border-custom">
                  {item.icon}
                </span>
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    item.status === "active"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-primary/10 text-primary border border-primary/10"
                  }`}
                >
                  {item.status === "active" ? "Active" : "Planned"}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-primary transition-all">
                  {item.name}
                </h3>
                <span className="text-[10px] text-muted uppercase tracking-widest block mt-0.5">
                  {item.category}
                </span>
              </div>
              <p className="text-muted text-xs leading-relaxed line-clamp-3">
                {item.desc}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-border-custom flex items-center justify-end">
              {item.status === "active" && item.link ? (
                <Link
                  href={item.link}
                  className="text-xs font-bold text-primary hover:text-foreground transition-all cursor-pointer"
                >
                  Configure Integration &rarr;
                </Link>
              ) : (
                <button
                  onClick={() => setRequested((prev) => new Set(prev).add(item.name))}
                  disabled={requested.has(item.name)}
                  className={`text-xs font-bold transition-all cursor-pointer ${
                    requested.has(item.name)
                      ? "text-emerald-400"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {requested.has(item.name) ? "Requested ✓" : "Request early access →"}
                </button>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 bg-card border border-border-custom rounded-lg rounded-lg border border-border-custom">
            <span className="text-3xl">🔌</span>
            <h3 className="text-lg font-bold text-white mt-3">No integrations found</h3>
            <p className="text-muted text-sm mt-1">
              Try choosing another category or clearing your search query.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
