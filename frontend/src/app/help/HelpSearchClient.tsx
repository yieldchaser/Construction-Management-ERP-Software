"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ContentItem } from "@/lib/content";

interface HelpSearchClientProps {
  helpItems: ContentItem[];
  categories: Record<string, ContentItem[]>;
  categoryMeta: Record<string, { title: string; desc: string; icon: string }>;
  activeCategories: string[];
}

export function HelpSearchClient({
  helpItems,
  categories,
  categoryMeta,
  activeCategories,
}: HelpSearchClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = searchQuery
    ? helpItems.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.metaDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.body.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-12">
      {/* Search Input Bar */}
      <div className="max-w-2xl mx-auto relative">
        <input
          type="text"
          placeholder="Search articles, e.g., 'salary template', 'inventory', 'DPR'..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
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
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted hover:text-foreground transition-all cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {searchQuery ? (
        /* Search Results Panel */
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between border-b border-border-custom pb-3">
            <h2 className="text-xl font-bold text-white">
              Search Results ({filteredItems.length})
            </h2>
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-primary hover:underline cursor-pointer"
            >
              Clear search
            </button>
          </div>

          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredItems.map((item, idx) => {
                const catMeta = item.category ? categoryMeta[item.category] : null;
                return (
                  <Link
                    key={idx}
                    href={`/help/${item.slug}`}
                    className="p-5 rounded-lg bg-card border border-border-custom rounded-lg hover:bg-elevated hover:border-white/20 transition-all flex flex-col gap-2 group cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {catMeta && (
                        <span className="text-xs font-semibold text-primary px-2 py-0.5 rounded-md bg-primary/10">
                          {catMeta.title}
                        </span>
                      )}
                      <span className="text-xs text-muted">
                        {new Date(item.publishDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-primary transition-all">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted line-clamp-2">
                      {item.metaDescription}
                    </p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-card border border-border-custom rounded-lg rounded-lg border border-border-custom">
              <span className="text-3xl">🔍</span>
              <h3 className="text-lg font-bold text-white mt-3">No articles found</h3>
              <p className="text-muted text-sm mt-1">
                Try checking spelling or search for general keywords.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Category Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeCategories.map((catKey) => {
            const meta = categoryMeta[catKey];
            const articles = categories[catKey];
            if (!meta) return null;

            return (
              <div
                key={catKey}
                className="rounded-lg bg-card border border-border-custom rounded-lg p-6 flex flex-col justify-between hover:border-border-custom hover:shadow-lg transition-all"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 rounded-md bg-white/[0.03] border border-border-custom">
                      {meta.icon}
                    </span>
                    <h2 className="text-lg font-extrabold text-white tracking-tight">
                      {meta.title}
                    </h2>
                  </div>
                  <p className="text-muted text-xs leading-relaxed">
                    {meta.desc}
                  </p>
                  
                  {/* Article links list (top 4) */}
                  <div className="pt-2 space-y-2 border-t border-border-custom">
                    {articles.slice(0, 4).map((art, aIdx) => (
                      <Link
                        key={aIdx}
                        href={`/help/${art.slug}`}
                        className="block text-xs font-medium text-muted hover:text-primary transition-all truncate cursor-pointer"
                      >
                        📄 {art.title}
                      </Link>
                    ))}
                    {articles.length > 4 && (
                      <p className="text-[10px] text-muted font-semibold uppercase tracking-wider">
                        + {articles.length - 4} more guides
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-border-custom flex justify-end">
                  <Link
                    href={`/help/${catKey}`}
                    className="text-xs font-bold text-secondary hover:text-foreground transition-all flex items-center gap-1 group cursor-pointer"
                  >
                    Explore Category
                    <span className="group-hover:translate-x-0.5 transition-transform">
                      →
                    </span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
