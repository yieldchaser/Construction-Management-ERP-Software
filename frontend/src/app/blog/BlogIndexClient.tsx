"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Icon from "@/components/marketing/Icon";

export type BlogCategory =
  | "Financial Ledger"
  | "Procurement & Materials"
  | "Compliance & Workforce"
  | "Technology"
  | "Site Execution"
  | "Insights";

export interface BlogPostView {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  publishDate: string;
  category: BlogCategory;
  minRead: number | null;
}

interface CategoryStyle {
  chip: string;
  band: string;
  iconColor: string;
}

const CATEGORY_STYLES: Record<BlogCategory, CategoryStyle> = {
  "Financial Ledger": {
    chip: "bg-alx-primary-fixed text-alx-primary",
    band: "from-alx-primary-fixed to-alx-primary-fixed-dim",
    iconColor: "text-alx-primary",
  },
  "Procurement & Materials": {
    chip: "bg-alx-secondary-container text-alx-on-secondary-container",
    band: "from-alx-secondary-container/70 to-alx-surface-container-high",
    iconColor: "text-alx-on-secondary-container",
  },
  "Compliance & Workforce": {
    chip: "bg-alx-error-container text-alx-on-error-container",
    band: "from-alx-error-container/70 to-alx-surface-container-high",
    iconColor: "text-alx-on-error-container",
  },
  Technology: {
    chip: "bg-alx-tertiary-fixed text-alx-tertiary",
    band: "from-alx-tertiary-fixed to-alx-tertiary-fixed/60",
    iconColor: "text-alx-tertiary",
  },
  "Site Execution": {
    chip: "bg-alx-primary-container text-alx-on-primary-container",
    band: "from-alx-primary-container/30 to-alx-primary-fixed",
    iconColor: "text-alx-primary-container",
  },
  Insights: {
    chip: "bg-alx-surface-container-high text-alx-on-surface-variant",
    band: "from-alx-surface-container-high to-alx-surface-container",
    iconColor: "text-alx-on-surface-variant",
  },
};

// Real category header photos, one per editorial category. Falls back to the
// in-code gradient band + glyph when a category has no matching file.
const CATEGORY_IMAGES: Record<BlogCategory, string> = {
  "Financial Ledger": "/marketing/blog/cat-financial-ledger.webp",
  "Procurement & Materials": "/marketing/blog/cat-procurement.webp",
  "Compliance & Workforce": "/marketing/blog/cat-compliance.webp",
  Technology: "/marketing/blog/cat-technology.webp",
  "Site Execution": "/marketing/blog/cat-site-execution.webp",
  Insights: "/marketing/blog/cat-insights.webp",
};

function CategoryMotif({ category, className }: { category: BlogCategory; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
  switch (category) {
    case "Financial Ledger":
      return (
        <svg {...common}>
          <line x1="4" y1="21" x2="20" y2="21" />
          <line x1="6" y1="10" x2="6" y2="18" />
          <line x1="10" y1="10" x2="10" y2="18" />
          <line x1="14" y1="10" x2="14" y2="18" />
          <line x1="18" y1="10" x2="18" y2="18" />
          <polygon points="12 3 21 8 3 8" />
        </svg>
      );
    case "Procurement & Materials":
      return (
        <svg {...common}>
          <path d="M21 8l-9-5-9 5 9 5 9-5z" />
          <path d="M3 8v8l9 5 9-5V8" />
          <path d="M12 13v8" />
        </svg>
      );
    case "Compliance & Workforce":
      return (
        <svg {...common}>
          <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case "Technology":
      return (
        <svg {...common}>
          <rect x="7" y="2" width="10" height="20" rx="2" />
          <line x1="11" y1="18" x2="13" y2="18" />
          <path d="m17.5 8 1.5 1.5L22 6" />
        </svg>
      );
    case "Site Execution":
      return (
        <svg {...common}>
          <path d="M12 2v4" />
          <path d="m6.5 21 5.5-15 5.5 15" />
          <path d="M9.5 15h5" />
          <path d="M4 21h16" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="1" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="3" y1="15" x2="21" y2="15" />
          <line x1="9" y1="3" x2="9" y2="21" />
          <line x1="15" y1="3" x2="15" y2="21" />
        </svg>
      );
  }
}

export default function BlogIndexClient({
  posts,
  categories,
}: {
  posts: BlogPostView[];
  categories: BlogCategory[];
}) {
  const [activeCategory, setActiveCategory] = useState<"All" | BlogCategory>("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesCategory = activeCategory === "All" || post.category === activeCategory;
      const matchesQuery =
        !q ||
        post.title.toLowerCase().includes(q) ||
        post.excerpt.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [posts, activeCategory, query]);

  return (
    <div>
      {/* Filter row */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-y border-alx-outline-variant/15 py-4 mb-10">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory("All")}
            className={`font-uilabel text-xs font-bold px-4 py-2 rounded-full transition-all cursor-pointer ${
              activeCategory === "All"
                ? "bg-alx-primary text-alx-on-primary"
                : "text-alx-on-surface-variant hover:bg-alx-surface-container-high"
            }`}
          >
            All Articles
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`font-uilabel text-xs font-bold px-4 py-2 rounded-full transition-all cursor-pointer ${
                activeCategory === cat
                  ? "bg-alx-primary text-alx-on-primary"
                  : "text-alx-on-surface-variant hover:bg-alx-surface-container-high"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-alx-outline"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search insights..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-alx-surface-container-lowest border border-alx-outline-variant/40 text-sm text-alx-on-surface placeholder-alx-on-surface-variant/60 focus:outline-none focus:border-alx-primary focus:ring-1 focus:ring-alx-primary/20 transition-all"
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((post) => {
            const style = CATEGORY_STYLES[post.category];
            const image = CATEGORY_IMAGES[post.category];
            return (
              <article
                key={post.slug}
                className="rounded-2xl bg-alx-surface-container-lowest overflow-hidden flex flex-col shadow-xl shadow-alx-on-surface/5 alx-hover-lift transition-all group"
              >
                <Link href={`/blog/${post.slug}`} className="cursor-pointer">
                  {image ? (
                    <div className="relative h-36 overflow-hidden">
                      <Image
                        src={image}
                        alt={`${post.category} article`}
                        fill
                        sizes="(min-width: 1024px) 384px, (min-width: 768px) 50vw, 100vw"
                        className="object-cover"
                      />
                      <div
                        className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent"
                        aria-hidden="true"
                      />
                    </div>
                  ) : (
                    <div className={`relative h-36 bg-gradient-to-br ${style.band} flex items-center justify-center`}>
                      <CategoryMotif category={post.category} className={`h-12 w-12 ${style.iconColor} opacity-70`} />
                    </div>
                  )}
                </Link>
                <div className="flex-1 flex flex-col p-6">
                  <span className={`font-uilabel text-[11px] font-bold px-3 py-1 rounded-full w-fit mb-4 ${style.chip}`}>
                    {post.category}
                  </span>
                  <h3 className="font-headline text-base font-extrabold text-alx-on-surface group-hover:text-alx-primary transition-all leading-snug line-clamp-2 mb-2">
                    <Link href={`/blog/${post.slug}`} className="cursor-pointer">
                      {post.title}
                    </Link>
                  </h3>
                  <p className="font-body text-xs text-alx-on-surface-variant leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>
                </div>
                <div className="mt-auto px-6 py-4 flex items-center justify-between border-t border-alx-outline-variant/15">
                  <span className="font-uilabel text-[11px] text-alx-outline uppercase tracking-wide">
                    {post.minRead ? `${post.minRead} min read` : "Quick read"}
                  </span>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="font-uilabel text-xs font-bold text-alx-primary hover:text-alx-on-surface transition-all flex items-center gap-1 cursor-pointer"
                  >
                    Read Article
                    <span className="group-hover:translate-x-0.5 transition-transform inline-flex">
                      <Icon name="arrow_right" className="w-4 h-4" />
                    </span>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 rounded-2xl bg-alx-surface-container-lowest shadow-xl shadow-alx-on-surface/5">
          <h3 className="font-headline text-lg font-bold text-alx-on-surface">No articles found</h3>
          <p className="font-body text-alx-on-surface-variant text-sm mt-1">
            Try a different category or search term.
          </p>
        </div>
      )}
    </div>
  );
}

