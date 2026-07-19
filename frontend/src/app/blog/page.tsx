import React from "react";
import Link from "next/link";
import { getContentItems, ContentItem } from "@/lib/content";
import { Metadata } from "next";
import MarketingShell from "@/components/marketing/MarketingShell";
import BlogIndexClient, { BlogCategory, BlogPostView } from "./BlogIndexClient";
import Aurora from "@/components/marketing/Aurora";
import Icon from "@/components/marketing/Icon";

export const metadata: Metadata = {
  title: "SiteFlow Insights - Construction Management Blog",
  description:
    "Deep-dive analysis, technical briefings, and operational guides for the modern construction enterprise, written by the SiteFlow team.",
};

// Deterministic topic classifier. SiteFlow's raw blog content has no
// `category` field (all null), so instead of fabricating one we derive an
// honest editorial tag from each post's real title/slug text, the same
// pattern already used on /resources and /products.
const CATEGORY_RULES: { label: BlogCategory; keywords: string[] }[] = [
  {
    label: "Financial Ledger",
    keywords: [
      "budget", "cost", "invoic", "cashflow", "cash-flow", "accounting", "financ",
      "tax", "gst", "payment", "billing", "profit", "expense", "boq", "estimat",
    ],
  },
  {
    label: "Procurement & Materials",
    keywords: [
      "material", "inventory", "procurement", "warehouse", "supply", "equipment",
      "vendor", "wastage", "rfq", "purchase",
    ],
  },
  {
    label: "Compliance & Workforce",
    keywords: [
      "labour", "labor", "worker", "compliance", "insolvency", "contract",
      "subcontractor", "hr ", "payroll", "attendance", "safety", "legal",
    ],
  },
  {
    label: "Technology",
    keywords: [
      "software", "app ", "app-", "digital", "automation", "robot", "ai ",
      "erp", "tech", "tool", "whatsapp", "excel", "mobile",
    ],
  },
  {
    label: "Site Execution",
    keywords: [
      "site", "dpr", "field", "construction-project", "schedule", "planning",
      "quality", "execution", "progress", "gantt", "timeline", "soil",
    ],
  },
];

function classifyPost(title: string, slug: string): BlogCategory {
  const haystack = `${title} ${slug}`.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => haystack.includes(kw))) {
      return rule.label;
    }
  }
  return "Insights";
}

// Rough, honest reading-time estimate from the real post body (HTML tags
// stripped, ~200 words/min). No invented numbers.
function estimateMinRead(body: string): number | null {
  if (!body) return null;
  const text = body.replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/gi, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words === 0) return null;
  return Math.max(1, Math.round(words / 200));
}

function toPostView(item: ContentItem): BlogPostView {
  return {
    slug: item.slug,
    title: item.title.replace(/\s*\|\s*SiteFlow.*$/i, "").trim() || item.title,
    excerpt: item.metaDescription,
    author: item.author,
    publishDate: item.publishDate,
    category: classifyPost(item.title, item.slug),
    minRead: estimateMinRead(item.body),
  };
}

export default async function BlogIndexPage() {
  const posts = await getContentItems("blog");
  const postViews = posts.map(toPostView);

  const featuredPost = postViews[0];
  const latestBriefing = postViews[1];
  const industryPulse = postViews[2];
  const gridPosts = postViews.slice(3);

  const categories = Array.from(new Set(postViews.map((p) => p.category)));
  const totalArticles = postViews.length;

  return (
    <MarketingShell>
      {/* 1. Master hero + digest panel */}
      <section className="relative overflow-hidden max-w-6xl mx-auto px-6 pt-10 pb-12 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start alx-scroll-fade">
        <Aurora variant="hero" className="absolute inset-0" />
        <div className="lg:col-span-8 space-y-5 relative z-10">
          <nav className="flex items-center gap-1.5 font-uilabel text-[11px] uppercase tracking-widest text-alx-outline">
            <span>Resources</span>
            <span className="text-alx-outline-variant">/</span>
            <span className="text-alx-primary font-bold">SiteFlow Insights</span>
          </nav>
          <h1 className="font-headline text-4xl md:text-6xl font-extrabold tracking-tight text-alx-on-surface leading-tight">
            SiteFlow <span className="italic text-alx-primary">Insights</span>
          </h1>
          <p className="font-body text-alx-on-surface-variant text-base md:text-lg max-w-xl leading-relaxed">
            Deep-dive analysis, technical briefings, and operational guides for
            the modern construction enterprise. We translate real site
            workflows into actionable strategy for project leads.
          </p>
        </div>
        <div className="lg:col-span-4 relative z-10">
          <div className="rounded-2xl bg-alx-surface-container-lowest border border-alx-outline-variant/15 p-6 shadow-xl shadow-alx-on-surface/5">
            <div className="flex items-center justify-between mb-4">
              <span className="font-uilabel text-[11px] font-bold uppercase tracking-widest text-alx-primary">
                Insights Archive
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5 text-alx-primary" aria-hidden="true">
                <path d="M3 3v18h18" />
                <path d="M8 18v-6M13 18V8M18 18v-9" />
              </svg>
            </div>
            <div className="rounded-xl bg-alx-primary-fixed px-6 py-8 mb-4 flex flex-col items-center justify-center gap-1 text-center">
              <span className="font-headline text-4xl font-extrabold text-alx-primary">{totalArticles}</span>
              <span className="font-uilabel text-[11px] uppercase tracking-widest text-alx-on-primary-fixed/70">
                Articles Published
              </span>
            </div>
            <p className="font-body text-xs text-alx-on-surface-variant text-center leading-relaxed">
              Written by the SiteFlow operations and editorial teams across{" "}
              {categories.length} coverage areas, from financial controls to
              site execution.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Featured spotlight + latest / pulse */}
      <section className="max-w-6xl mx-auto px-6 pb-12 grid grid-cols-1 lg:grid-cols-12 gap-6 alx-scroll-fade">
        {featuredPost && (
          <div className="lg:col-span-8">
            <Link
              href={`/blog/${featuredPost.slug}`}
              className="group relative rounded-2xl overflow-hidden bg-alx-surface-container-lowest shadow-xl shadow-alx-on-surface/5 alx-hover-lift transition-all h-full flex flex-col justify-end min-h-[22rem] p-8 md:p-10 cursor-pointer"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, var(--color-alx-primary) 0%, var(--color-alx-primary-container) 55%, var(--color-alx-tertiary) 130%)",
              }}
            >
              <span className="alx-label inline-flex w-fit items-center rounded-full bg-white/15 text-white px-3 py-1 text-[11px] mb-4">
                Featured Report
              </span>
              <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-white leading-tight mb-3 max-w-xl">
                {featuredPost.title}
              </h2>
              <p className="font-body text-white/85 text-sm md:text-base max-w-lg mb-5 line-clamp-2">
                {featuredPost.excerpt}
              </p>
              <span className="font-uilabel text-sm font-bold text-white inline-flex items-center gap-1.5">
                Read Full Briefing
                <span className="group-hover:translate-x-0.5 transition-transform inline-flex">
                  <Icon name="arrow_right" className="w-4 h-4" />
                </span>
              </span>
            </Link>
          </div>
        )}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {latestBriefing && (
            <Link
              href={`/blog/${latestBriefing.slug}`}
              className="group rounded-2xl bg-alx-surface-container-lowest p-6 flex-1 flex flex-col justify-between shadow-xl shadow-alx-on-surface/5 alx-hover-lift transition-all cursor-pointer"
            >
              <div>
                <span className="font-uilabel text-[11px] font-bold uppercase tracking-widest text-alx-primary block mb-2">
                  Latest Briefing
                </span>
                <h3 className="font-headline text-base font-extrabold text-alx-on-surface group-hover:text-alx-primary transition-all leading-snug mb-2 line-clamp-2">
                  {latestBriefing.title}
                </h3>
                <p className="font-body text-xs text-alx-on-surface-variant leading-relaxed line-clamp-3">
                  {latestBriefing.excerpt}
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-alx-outline-variant/15 flex items-center justify-between">
                <span className="font-uilabel text-[11px] text-alx-outline">
                  {latestBriefing.minRead ? `${latestBriefing.minRead} min read` : "Quick read"}
                </span>
                <span className="text-alx-primary group-hover:translate-x-0.5 transition-transform inline-flex">
                  <Icon name="arrow_right" className="w-4 h-4" />
                </span>
              </div>
            </Link>
          )}
          {industryPulse && (
            <Link
              href={`/blog/${industryPulse.slug}`}
              className="group rounded-2xl bg-alx-surface-container-lowest p-6 flex-1 flex flex-col justify-between shadow-xl shadow-alx-on-surface/5 alx-hover-lift transition-all cursor-pointer"
            >
              <div>
                <span className="font-uilabel text-[11px] font-bold uppercase tracking-widest text-alx-primary block mb-2">
                  Industry Pulse
                </span>
                <h3 className="font-headline text-base font-extrabold text-alx-on-surface group-hover:text-alx-primary transition-all leading-snug mb-2 line-clamp-2">
                  {industryPulse.title}
                </h3>
                <p className="font-body text-xs text-alx-on-surface-variant leading-relaxed line-clamp-3">
                  {industryPulse.excerpt}
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-alx-outline-variant/15 flex items-center justify-between">
                <span className="font-uilabel text-[11px] text-alx-outline">
                  {industryPulse.minRead ? `${industryPulse.minRead} min read` : "Quick read"}
                </span>
                <span className="text-alx-primary group-hover:translate-x-0.5 transition-transform inline-flex">
                  <Icon name="arrow_right" className="w-4 h-4" />
                </span>
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* 3, 4. Filter row + uniform article grid (client for tab + search state) */}
      <section className="max-w-6xl mx-auto px-6 pb-16 alx-scroll-fade">
        <BlogIndexClient posts={gridPosts} categories={categories} />
      </section>

      {/* 5. Newsletter band */}
      <section className="max-w-6xl mx-auto px-6 pb-24 alx-scroll-fade">
        <div className="rounded-2xl bg-alx-surface-container-low border border-alx-outline-variant/15 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-xl text-center md:text-left">
            <h2 className="font-headline text-xl md:text-2xl font-extrabold text-alx-on-surface mb-2">
              Join our Insights Newsletter
            </h2>
            <p className="font-body text-sm text-alx-on-surface-variant leading-relaxed">
              Stay ahead of the curve with a periodic breakdown of construction
              technology trends and project management best practices.
            </p>
          </div>
          <form className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              placeholder="Enter your business email"
              className="w-full sm:w-72 px-5 py-3 rounded-lg bg-alx-surface-container-lowest border border-alx-outline-variant/40 text-alx-on-surface placeholder-alx-on-surface-variant/60 focus:outline-none focus:border-alx-primary focus:ring-1 focus:ring-alx-primary/20 transition-all text-sm"
            />
            <button
              type="submit"
              className="alx-cta font-uilabel text-sm font-bold px-6 py-3 rounded-lg transition-all cursor-pointer whitespace-nowrap"
            >
              Subscribe Now
            </button>
          </form>
        </div>
      </section>
    </MarketingShell>
  );
}

