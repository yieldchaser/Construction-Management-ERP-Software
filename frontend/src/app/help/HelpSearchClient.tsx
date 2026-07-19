"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ContentItem } from "@/lib/content";

interface HelpSearchClientProps {
  helpItems: ContentItem[];
  categories: Record<string, ContentItem[]>;
  categoryMeta: Record<string, { title: string; desc: string; icon: string }>;
  activeCategories: string[];
  totalGuides: number;
}

export function HelpSearchClient({
  helpItems,
  categories,
  categoryMeta,
  activeCategories,
  totalGuides,
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
          className="w-full px-5 py-4 pl-12 rounded-full bg-alx-surface-container-lowest border border-alx-outline-variant/40 text-alx-on-surface placeholder-alx-on-surface-variant/60 focus:outline-none focus:border-alx-primary focus:ring-1 focus:ring-alx-primary/20 transition-all text-base shadow-xl shadow-alx-on-surface/5"
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
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-uilabel font-semibold text-alx-on-surface-variant hover:text-alx-on-surface transition-all cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {searchQuery ? (
        /* Search Results Panel */
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between border-b border-alx-outline-variant/20 pb-3">
            <h2 className="font-headline text-xl font-bold text-alx-on-surface">
              Search Results ({filteredItems.length})
            </h2>
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs font-uilabel font-bold text-alx-primary hover:underline cursor-pointer"
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
                    className="p-5 rounded-2xl bg-alx-surface-container-lowest shadow-xl shadow-alx-on-surface/5 alx-hover-lift transition-all flex flex-col gap-2 group cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {catMeta && (
                        <span className="text-xs font-uilabel font-semibold text-alx-primary px-2 py-0.5 rounded-md bg-alx-primary-fixed">
                          {catMeta.title}
                        </span>
                      )}
                      <span className="text-xs text-alx-on-surface-variant">
                        {new Date(item.publishDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <h3 className="font-headline text-lg font-bold text-alx-on-surface group-hover:text-alx-primary transition-all">
                      {item.title}
                    </h3>
                    <p className="font-body text-sm text-alx-on-surface-variant line-clamp-2">
                      {item.metaDescription}
                    </p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 rounded-2xl bg-alx-surface-container-lowest shadow-xl shadow-alx-on-surface/5">
              <span className="text-3xl">🔍</span>
              <h3 className="font-headline text-lg font-bold text-alx-on-surface mt-3">No articles found</h3>
              <p className="font-body text-alx-on-surface-variant text-sm mt-1">
                Try checking spelling or search for general keywords.
              </p>
            </div>
          )}
        </div>
       ) : (
        /* Category Grid */
        <div className="space-y-8">
          <div className="flex items-end justify-between">
            <h2 className="font-headline text-2xl font-bold text-alx-on-surface tracking-tight">
              Browse by Category
            </h2>
            <span className="text-xs font-uilabel font-semibold uppercase tracking-wider text-alx-on-surface-variant">
              {activeCategories.length} categories
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 alx-scroll-fade">
          {activeCategories.map((catKey) => {
            const meta = categoryMeta[catKey];
            const articles = categories[catKey];
            if (!meta) return null;

            return (
              <div
                key={catKey}
                className="rounded-2xl bg-alx-surface-container-lowest p-6 flex flex-col justify-between shadow-xl shadow-alx-on-surface/5 alx-hover-lift transition-all"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl p-2 rounded-xl bg-alx-primary-fixed">
                        {meta.icon}
                      </span>
                      <h2 className="font-headline text-lg font-extrabold text-alx-on-surface tracking-tight">
                        {meta.title}
                      </h2>
                    </div>
                    <span className="shrink-0 text-xs font-uilabel font-semibold text-alx-primary bg-alx-primary-fixed px-2.5 py-1 rounded-full">
                      {articles.length} {articles.length === 1 ? "guide" : "guides"}
                    </span>
                  </div>
                  <p className="font-body text-alx-on-surface-variant text-xs leading-relaxed">
                    {meta.desc}
                  </p>

                  {/* Article links list (top 4) */}
                  <div className="pt-2 space-y-2 border-t border-alx-outline-variant/15">
                    {articles.slice(0, 4).map((art, aIdx) => (
                      <Link
                        key={aIdx}
                        href={`/help/${art.slug}`}
                        className="block text-xs font-medium text-alx-on-surface-variant hover:text-alx-primary transition-all truncate cursor-pointer"
                      >
                        📄 {art.title}
                      </Link>
                    ))}
                    {articles.length > 4 && (
                      <p className="text-[10px] text-alx-on-surface-variant font-uilabel font-semibold uppercase tracking-wider">
                        + {articles.length - 4} more guides
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-alx-outline-variant/15 flex justify-end">
                  <Link
                    href={`/help/${catKey}`}
                    className="text-xs font-uilabel font-bold text-alx-primary hover:text-alx-on-surface transition-all flex items-center gap-1 group cursor-pointer"
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
        </div>
      )}
    </div>
  );
}
