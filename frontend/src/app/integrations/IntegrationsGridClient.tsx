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
    desc: "Push vendor bills from SiteFlow into Zoho Books for accounting and GST reconciliation, with OAuth and encrypted tokens.",
    icon: "💼",
    status: "active",
    link: "/login",
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
            className="w-full px-5 py-4 pl-12 rounded-lg bg-alx-surface-container-lowest border border-alx-outline-variant/40 text-alx-on-surface placeholder-alx-on-surface-variant/60 focus:outline-none focus:border-alx-primary focus:ring-1 focus:ring-alx-primary/20 transition-all text-base shadow-sm"
          />
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-alx-on-surface-variant"
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
              className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-alx-on-surface-variant hover:text-alx-primary transition-all cursor-pointer"
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
                  ? "bg-alx-primary border-alx-primary text-alx-on-primary shadow-sm"
                  : "bg-alx-surface-container border-alx-outline-variant/40 text-alx-on-surface-variant hover:text-alx-on-surface hover:border-alx-outline-variant"
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
            className="alx-hover-lift rounded-lg bg-alx-surface-container-lowest border border-alx-outline-variant/40 shadow-sm p-6 flex flex-col justify-between group"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl p-2.5 rounded-md bg-alx-surface-container border border-alx-outline-variant/40">
                  {item.icon}
                </span>
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    item.status === "active"
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-alx-tertiary-fixed/50 text-alx-tertiary border border-alx-tertiary/20"
                  }`}
                >
                  {item.status === "active" ? "Active" : "Planned"}
                </span>
              </div>
              <div>
                <h3 className="font-headline text-lg font-semibold text-alx-on-surface group-hover:text-alx-primary transition-all">
                  {item.name}
                </h3>
                <span className="text-[10px] text-alx-on-surface-variant uppercase tracking-widest block mt-0.5">
                  {item.category}
                </span>
              </div>
              <p className="text-alx-on-surface-variant text-xs leading-relaxed line-clamp-3">
                {item.desc}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-alx-outline-variant/40 flex items-center justify-end">
              {item.status === "active" && item.link ? (
                <Link
                  href={item.link}
                  className="text-xs font-bold text-alx-primary hover:text-alx-on-surface transition-all cursor-pointer"
                >
                  Configure Integration &rarr;
                </Link>
              ) : (
                <button
                  onClick={() => setRequested((prev) => new Set(prev).add(item.name))}
                  disabled={requested.has(item.name)}
                  className={`text-xs font-bold transition-all cursor-pointer ${
                    requested.has(item.name)
                      ? "text-emerald-600"
                      : "text-alx-on-surface-variant hover:text-alx-primary"
                  }`}
                >
                  {requested.has(item.name) ? "Requested ✓" : "Request early access →"}
                </button>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 bg-alx-surface-container-lowest border border-alx-outline-variant/40 rounded-lg shadow-sm">
            <span className="text-3xl">🔌</span>
            <h3 className="font-headline text-lg font-semibold text-alx-on-surface mt-3">No integrations found</h3>
            <p className="text-alx-on-surface-variant text-sm mt-1">
              Try choosing another category or clearing your search query.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
