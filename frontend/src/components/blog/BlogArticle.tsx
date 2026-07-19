import React from "react";
import Link from "next/link";
import Image from "next/image";
import type { ContentItem } from "@/lib/content";
import ReadingProgress from "@/components/marketing/ReadingProgress";
import CtaBand from "@/components/marketing/product/CtaBand";
import type { ProductCta } from "@/lib/productTypes";
import Icon from "@/components/marketing/Icon";

// ---------------------------------------------------------------------------
// Category classification. SiteFlow's raw blog content has no `category`
// field (all null), so instead of fabricating one we derive an honest
// editorial tag from each post's real title/slug text - the same rule set
// already used on the /blog index.
// ---------------------------------------------------------------------------
type BlogCategory =
  | "Financial Ledger"
  | "Procurement & Materials"
  | "Compliance & Workforce"
  | "Technology"
  | "Site Execution"
  | "Insights";

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

function CategoryIcon({ category, className }: { category: BlogCategory; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  switch (category) {
    case "Financial Ledger":
      return (
        <svg {...common}>
          <path d="M3 17l6-6 4 4 8-8" />
          <path d="M14 7h7v7" />
        </svg>
      );
    case "Procurement & Materials":
      return (
        <svg {...common}>
          <path d="M21 8L12 3 3 8l9 5 9-5z" />
          <path d="M3 8v8l9 5 9-5V8" />
          <path d="M12 13v8" />
        </svg>
      );
    case "Compliance & Workforce":
      return (
        <svg {...common}>
          <path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case "Technology":
      return (
        <svg {...common}>
          <rect x="6" y="6" width="12" height="12" rx="2" />
          <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
        </svg>
      );
    case "Site Execution":
      return (
        <svg {...common}>
          <path d="M3 21h18" />
          <path d="M5 21V10l7-6 7 6v11" />
          <path d="M9 21v-6h6v6" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2.3h6c0-1.1.4-1.8 1-2.3A7 7 0 0 0 12 2z" />
        </svg>
      );
  }
}

// ---------------------------------------------------------------------------
// Reading time. Real post body, HTML/entities stripped, ~200 words/min.
// No invented numbers; omitted entirely if the body yields zero words.
// ---------------------------------------------------------------------------
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#8217;|&#8216;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&#8220;|&#8221;|&rdquo;|&ldquo;/gi, '"')
    .replace(/&#8211;|&#8212;/gi, "-")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function estimateMinRead(body: string): number | null {
  const text = stripHtml(body);
  if (!text) return null;
  const words = text.split(" ").filter(Boolean).length;
  if (words === 0) return null;
  return Math.max(1, Math.round(words / 200));
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SF";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// ---------------------------------------------------------------------------
// Table of contents. The blog corpus is a WordPress export, so its H2/H3
// headings already carry real, human-authored section titles. We parse them
// server-side with a string transform (no DOM/markdown dependency), slugify
// them into stable anchor ids, and inject those ids (plus a scroll-margin so
// the sticky header never covers a jumped-to heading) back into the body
// HTML we already render. If a post happens to carry fewer than two
// headings the sidebar omits the TOC gracefully (falls back to related
// posts / recent posts instead of showing a near-empty list).
// ---------------------------------------------------------------------------
interface TocEntry {
  level: 2 | 3;
  text: string;
  id: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function withScrollMargin(attrs: string): string {
  if (/\sstyle=(["'])/i.test(attrs)) {
    return attrs.replace(/\sstyle=(["'])([^"']*)\1/i, (_m, q, styleContent) => {
      const trimmed = styleContent.trim();
      const sep = trimmed === "" || trimmed.endsWith(";") ? "" : ";";
      return ` style=${q}${styleContent}${sep}scroll-margin-top:7rem${q}`;
    });
  }
  return `${attrs} style="scroll-margin-top:7rem"`;
}

function buildTocAndInjectIds(body: string): { html: string; toc: TocEntry[] } {
  const toc: TocEntry[] = [];
  // Track every id actually emitted (not just base slugs) so a heading whose
  // text slugifies to e.g. "foo-2" can never collide with a suffixed id.
  const seen = new Set<string>();

  const html = body.replace(
    /<(h2|h3)([^>]*)>([\s\S]*?)<\/\1>/gi,
    (fullMatch, tag: string, attrs: string, inner: string) => {
      const text = stripHtml(inner);
      if (!text) return fullMatch;

      const base = slugify(text) || `section-${toc.length + 1}`;
      let id = base;
      let n = 2;
      while (seen.has(id)) {
        id = `${base}-${n}`;
        n += 1;
      }
      seen.add(id);

      toc.push({ level: tag.toLowerCase() === "h2" ? 2 : 3, text, id });

      const cleanedAttrs = withScrollMargin(attrs.replace(/\s+id=("[^"]*"|'[^']*')/i, ""));
      return `<${tag}${cleanedAttrs} id="${id}">${inner}</${tag}>`;
    }
  );

  // Fewer than 2 headings isn't a useful "In this article" list - drop it and
  // let the sidebar fall back to related/recent posts instead.
  return { html, toc: toc.length >= 2 ? toc : [] };
}

const CLOSING_CTA: ProductCta = {
  heading: "See how SiteFlow runs this on real projects",
  body: "From budgets to boots-on-ground execution, SiteFlow keeps your office and site teams working off the same numbers.",
};

export interface BlogArticleProps {
  article: ContentItem;
  relatedPosts: ContentItem[];
  /** Public path to a real hero photo. Undefined renders the in-code gradient band. */
  heroImage?: string;
}

export default function BlogArticle({ article, relatedPosts, heroImage }: BlogArticleProps) {
  const displayTitle = article.title.replace(/\s*\|\s*SiteFlow.*$/i, "").trim() || article.title;
  const category = classifyPost(article.title, article.slug);
  const minRead = estimateMinRead(article.body);
  const formattedDate = new Date(article.publishDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const metaLine = minRead ? `${formattedDate} • ${minRead} Min Read` : formattedDate;

  const { html: articleHtml, toc } = buildTocAndInjectIds(article.body);
  const showRecentInSidebar = toc.length > 0 && relatedPosts.length > 0;

  return (
    <>
      <ReadingProgress />
      <div className="max-w-6xl mx-auto px-6 pt-4 pb-4">
        {/* Breadcrumb */}
        <nav className="alx-scroll-fade flex items-center gap-1.5 font-uilabel text-[11px] uppercase tracking-widest text-alx-outline mb-6">
          <Link href="/" className="hover:text-alx-primary transition-all">
            Home
          </Link>
          <span className="text-alx-outline-variant">/</span>
          <Link href="/blog" className="hover:text-alx-primary transition-all">
            Blog
          </Link>
          <span className="text-alx-outline-variant">/</span>
          <Link href="/blog" className="hover:text-alx-primary transition-all">
            {category}
          </Link>
          <span className="text-alx-outline-variant">/</span>
          <span className="text-alx-primary font-bold truncate max-w-[16rem]">{displayTitle}</span>
        </nav>

        {/* Header */}
        <header className="alx-scroll-fade mb-8">
          <h1 className="font-headline text-3xl md:text-5xl font-extrabold tracking-tight text-alx-on-surface leading-tight mb-6 max-w-4xl">
            {displayTitle}
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-b border-alx-outline-variant/20 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-alx-primary text-white font-uilabel text-xs font-bold">
                {getInitials(article.author)}
              </span>
              <div className="leading-tight">
                <p className="font-body text-sm font-semibold text-alx-on-surface">{article.author}</p>
                <p className="font-uilabel text-[11px] text-alx-on-surface-variant">{metaLine}</p>
              </div>
            </div>
            <span className="alx-label w-fit inline-flex cursor-default items-center gap-2 rounded-full border border-alx-outline-variant/40 px-4 py-2 text-xs font-semibold text-alx-on-surface-variant">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-3.5 w-3.5" aria-hidden="true">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <path d="M8.6 10.5l6.8-3.9M8.6 13.5l6.8 3.9" />
              </svg>
              Share Article
            </span>
          </div>
        </header>

        {/* Hero band: a real photo when one is supplied, otherwise a tasteful
            in-code gradient band with the post's category glyph - never a
            broken <img>. */}
        {heroImage ? (
          <div className="alx-scroll-fade relative mb-12 h-56 md:h-96 overflow-hidden rounded-2xl">
            <Image
              src={heroImage}
              alt={displayTitle}
              fill
              sizes="(min-width: 1024px) 1152px, 100vw"
              className="object-cover"
              priority
            />
          </div>
        ) : (
          <div
            className="alx-scroll-fade relative mb-12 flex h-56 md:h-72 items-center justify-center overflow-hidden rounded-2xl"
            style={{
              backgroundImage:
                "linear-gradient(135deg, var(--color-alx-primary-fixed) 0%, var(--color-alx-tertiary-fixed) 130%)",
            }}
          >
            <CategoryIcon category={category} className="h-20 w-20 md:h-28 md:w-28 text-alx-on-primary-fixed opacity-25" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Article body */}
          <main className="alx-scroll-fade lg:col-span-8">
            <div className="help-article" dangerouslySetInnerHTML={{ __html: articleHtml }} />

            <div className="mt-12 border-t border-alx-outline-variant/20 pt-8">
              <Link
                href="/blog"
                className="group inline-flex items-center gap-2 font-uilabel text-xs font-bold text-alx-on-surface-variant hover:text-alx-primary transition-all"
              >
                <span className="transition-transform group-hover:-translate-x-1 inline-flex">
                  <Icon name="arrow_left" className="w-4 h-4" />
                </span>
                Back to all posts
              </Link>
            </div>
          </main>

          {/* Sidebar */}
          <aside className="lg:col-span-4">
            <div className="alx-scroll-fade lg:sticky lg:top-28 space-y-6">
              {toc.length > 0 ? (
                <div className="alx-hover-lift max-h-[60vh] overflow-y-auto rounded-2xl border border-alx-outline-variant/15 bg-alx-surface-container-lowest p-6 shadow-lg shadow-alx-on-surface/5 transition-all">
                  <span className="mb-4 block font-uilabel text-[11px] font-bold uppercase tracking-widest text-alx-outline">
                    In this article
                  </span>
                  {/* Long articles produced a TOC taller than the card, which
                      clipped the last entries with no way to reach them. Cap
                      the height and let it scroll on its own. */}
                  <ul className="space-y-3 max-h-[45vh] overflow-y-auto overscroll-contain pr-2">
                    {toc.map((item) => (
                      <li key={item.id} className={item.level === 3 ? "pl-4" : ""}>
                        <a
                          href={`#${item.id}`}
                          className="-ml-px block border-l-2 border-transparent pl-3 font-body text-sm leading-snug text-alx-on-surface-variant transition-all hover:border-alx-primary hover:text-alx-primary"
                        >
                          {item.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : relatedPosts.length > 0 ? (
                <div className="alx-hover-lift rounded-2xl border border-alx-outline-variant/15 bg-alx-surface-container-lowest p-6 shadow-lg shadow-alx-on-surface/5 transition-all">
                  <span className="mb-4 block font-uilabel text-[11px] font-bold uppercase tracking-widest text-alx-outline">
                    Related Reading
                  </span>
                  <div className="space-y-4">
                    {relatedPosts.slice(0, 3).map((post) => (
                      <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
                        <span className="mb-1 block font-uilabel text-[10px] text-alx-on-surface-variant">
                          {new Date(post.publishDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <h4 className="font-body text-sm font-semibold leading-snug text-alx-on-surface transition-all line-clamp-2 group-hover:text-alx-primary">
                          {post.title}
                        </h4>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Newsletter capture - Blue Alexandria, honest copy only. */}
              <div
                className="alx-hover-lift rounded-2xl p-6 text-white shadow-xl shadow-alx-on-surface/10 transition-all"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, var(--color-alx-primary) 0%, var(--color-alx-primary-container) 100%)",
                }}
              >
                <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 7l9 6 9-6" />
                  </svg>
                </span>
                <h3 className="font-headline text-lg font-extrabold mb-2">Stay in the loop</h3>
                <p className="mb-4 font-body text-xs leading-relaxed text-white/85">
                  Get new construction and ERP guides in your inbox.
                </p>
                <form className="space-y-2">
                  <input
                    type="email"
                    placeholder="work@company.com"
                    className="w-full rounded-lg border border-white/25 bg-white/10 px-4 py-2.5 text-sm text-white placeholder-white/60 transition-all focus:border-white/60 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="w-full cursor-pointer rounded-lg bg-white px-4 py-2.5 font-uilabel text-sm font-bold text-alx-primary transition-all hover:brightness-95"
                  >
                    Subscribe
                  </button>
                </form>
              </div>

              {showRecentInSidebar && (
                <div className="alx-hover-lift rounded-2xl border border-alx-outline-variant/15 bg-alx-surface-container-lowest p-6 shadow-lg shadow-alx-on-surface/5 transition-all">
                  <span className="mb-4 block font-uilabel text-[11px] font-bold uppercase tracking-widest text-alx-outline">
                    Recent Posts
                  </span>
                  <div className="space-y-4">
                    {relatedPosts.slice(0, 3).map((post) => (
                      <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
                        <span className="mb-1 block font-uilabel text-[10px] text-alx-on-surface-variant">
                          {new Date(post.publishDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <h4 className="font-body text-sm font-semibold leading-snug text-alx-on-surface transition-all line-clamp-2 group-hover:text-alx-primary">
                          {post.title}
                        </h4>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Closing CTA */}
      <section className="px-6 pt-4 pb-24 alx-scroll-fade">
        <div className="max-w-4xl mx-auto">
          <CtaBand cta={CLOSING_CTA} />
        </div>
      </section>
    </>
  );
}

