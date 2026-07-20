"use client";

import React, { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { HELP_CATEGORIES, FaqCategory } from "./helpContent";
import Icon from "@/components/marketing/Icon";

export default function HelpPage() {
  const params = useParams();
  const companyId =
    (params?.company_id as string) ||
    "e0000000-0000-0000-0000-000000000000";

  const [query, setQuery] = useState("");
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const categories: FaqCategory[] = useMemo(
    () => HELP_CATEGORIES(companyId),
    [companyId]
  );

  const q = query.trim().toLowerCase();

  const matches = (text: string) => !q || text.toLowerCase().includes(q);

  const filtered = categories
    .map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (it) => matches(it.q) || matches(it.text)
      ),
    }))
    .filter((cat) => cat.items.length > 0);

  const toggleCat = (id: string) =>
    setOpenCats((prev) => ({ ...prev, [id]: !prev[id] }));

  const toggleItem = (key: string) =>
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));

  const resultCount = filtered.reduce((n, c) => n + c.items.length, 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-elevated/10">
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Banner Section */}
        <div className="relative rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-border-custom p-8 overflow-hidden">
          <div className="max-w-2xl relative z-10 space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Help Centre
            </h1>
            <p className="text-xs text-muted">
              Answers to common questions about how SiteFlow actually works, grouped
              by area. Every step below reflects a real module in your account.
            </p>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-primary/5 to-transparent blur-3xl pointer-events-none" />
        </div>

        {/* Search */}
        <div className="max-w-2xl relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search help, e.g. 'RA bill', 'attendance', 'Tally', 'PO'..."
            className="w-full px-5 py-3.5 pl-12 rounded-lg bg-card border border-border-custom text-foreground placeholder:text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-sm shadow-sm"
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
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-foreground transition-all cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border-custom rounded-xl bg-card">
            <Icon name="search" className="w-8 h-8 mx-auto text-muted" />
            <h3 className="text-sm font-bold text-foreground mt-2">
              No matching answers
            </h3>
            <p className="text-xs text-muted mt-1">
              Try a different keyword, or contact support from the main site.
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted">
            {resultCount} answer{resultCount === 1 ? "" : "s"} across {filtered.length}{" "}
            area{filtered.length === 1 ? "" : "s"}
            {q ? " for your search" : ""}.
          </p>
        )}

        {/* Q&A accordions grouped by area */}
        <div className="space-y-4">
          {filtered.map((cat) => {
            const catOpen = q ? true : !!openCats[cat.id];
            return (
              <section
                key={cat.id}
                className="rounded-xl border border-border-custom bg-card overflow-hidden"
              >
                <button
                  onClick={() => toggleCat(cat.id)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-elevated/40 transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <Icon name={cat.icon} className="w-5 h-5 text-primary" />
                    <span className="text-sm font-bold text-foreground">
                      {cat.title}
                    </span>
                    <span className="text-[11px] text-muted">
                      {cat.items.length}
                    </span>
                  </span>
                  <svg
                    className={`h-4 w-4 text-muted transition-transform ${
                      catOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {catOpen && (
                  <div className="border-t border-border-custom divide-y divide-border-custom/60">
                    {cat.items.map((it, idx) => {
                      const key = `${cat.id}-${idx}`;
                      const itemOpen = q ? true : !!openItems[key];
                      return (
                        <div key={key}>
                          <button
                            onClick={() => toggleItem(key)}
                            className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-elevated/30 transition-all cursor-pointer"
                          >
                            <span className="text-sm font-medium text-foreground">
                              {it.q}
                            </span>
                            <svg
                              className={`h-4 w-4 text-muted shrink-0 transition-transform ${
                                itemOpen ? "rotate-180" : ""
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>
                          {itemOpen && (
                            <div className="px-5 pb-5 pt-0">
                              <div className="text-xs leading-relaxed text-muted help-answer">
                                {it.a}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
