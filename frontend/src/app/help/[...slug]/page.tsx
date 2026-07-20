import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getContentItemBySlug, getContentItems } from "@/lib/content";
import { Metadata } from "next";
import MarketingShell from "@/components/marketing/MarketingShell";
import ReadingProgress from "@/components/marketing/ReadingProgress";

interface RouteParams {
  params: Promise<{
    slug: string[];
  }>;
}

interface TocEntry {
  id: string;
  text: string;
}

/**
 * Decode the small set of HTML entities that show up in WP-exported headings
 * (curly quotes, dashes, ampersands) so plain-text TOC labels render
 * correctly outside of dangerouslySetInnerHTML.
 */
function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&#8216;|&lsquo;/g, "‘")
    .replace(/&#8220;|&ldquo;/g, "“")
    .replace(/&#8221;|&rdquo;/g, "”")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8212;|&mdash;/g, "—")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function slugifyHeading(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-+|-+$)/g, "") || "section"
  );
}

/**
 * Finds every real section heading (`<h2 class="wp-block-heading">...</h2>`,
 * the pattern the WP-exported help body always uses) so we can build an "In
 * this article" sidebar TOC, then re-injects a stable, unique anchor id + a
 * scroll offset onto that same heading so the TOC links land below the
 * sticky header. Category-overview bodies (`.help-cat`) don't use this
 * heading class, so they simply produce an empty TOC and the sidebar falls
 * back to the CTA + category list.
 */
function annotateHeadingsForToc(html: string): { html: string; toc: TocEntry[] } {
  const toc: TocEntry[] = [];
  const seen = new Map<string, number>();

  const annotated = html.replace(
    /<h2([^>]*class="[^"]*wp-block-heading[^"]*"[^>]*)>([\s\S]*?)<\/h2>/g,
    (match, rawAttrs: string, inner: string) => {
      const text = decodeEntities(inner.replace(/<[^>]+>/g, "").trim());
      if (!text) return match;

      const base = slugifyHeading(text);
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      const id = count === 0 ? base : `${base}-${count + 1}`;

      toc.push({ id, text });

      const attrs = rawAttrs.replace(/\sid="[^"]*"/, "");
      return `<h2${attrs} id="${id}" style="scroll-margin-top:6.5rem">${inner}</h2>`;
    }
  );

  return { html: annotated, toc };
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  const slugPath = slug.join("/");
  let article = await getContentItemBySlug("help", slugPath);
  if (!article && slug.length === 1) {
    article = await getContentItemBySlug("help", `${slugPath}/${slugPath}`);
  }

  if (!article) return { title: "Not Found - SiteFlow Help" };

  return {
    title: `${article.title} - SiteFlow Help`,
    description: article.metaDescription,
    alternates: {
      canonical: `https://siteflow.com/help/${slugPath}`,
    },
  };
}

export default async function HelpArticlePage({ params }: RouteParams) {
  const { slug } = await params;
  const slugPath = slug.join("/");
  let article = await getContentItemBySlug("help", slugPath);

  // Fallback for single category slug (e.g. /help/attendance-payroll)
  if (!article && slug.length === 1) {
    article = await getContentItemBySlug("help", `${slugPath}/${slugPath}`);
  }

  if (!article) {
    notFound();
  }

  const allHelpItems = await getContentItems("help");
  const category = article.category || slug[0];

  // List of other articles in the same category
  const categoryArticles = allHelpItems.filter(
    (item) =>
      item.category === category &&
      item.slug !== slugPath &&
      item.slug !== `${category}/${category}`
  );

  const { html: bodyHtml, toc } = annotateHeadingsForToc(article.body);
  const categoryLabel = category.replace(/-/g, " ");
  const updatedLabel = new Date(article.publishDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <MarketingShell>
      <ReadingProgress />
      {/* Reading header */}
      <section className="relative pt-6 pb-10 md:pb-14 overflow-hidden alx-scroll-fade is-visible">
        <div className="absolute inset-0 z-0 alx-hero-wash pointer-events-none" />
        {/* Same max-w-6xl + px-6 container as the body section below, so the
            header's left edge lines up with the article column instead of
            sitting in a narrower centered box. */}
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-alx-on-surface-variant">
            <Link href="/" className="hover:text-alx-primary transition-all">
              Home
            </Link>
            <span>/</span>
            <Link href="/help" className="hover:text-alx-primary transition-all">
              Help Center
            </Link>
            <span>/</span>
            <Link
              href={`/help/${category}`}
              className="hover:text-alx-primary transition-all capitalize"
            >
              {categoryLabel}
            </Link>
            <span>/</span>
            <span className="text-alx-on-surface truncate max-w-[220px]">{article.title}</span>
          </div>

          <span className="alx-label inline-block text-xs font-bold text-alx-primary px-2.5 py-1 rounded-md bg-alx-primary-fixed/40 capitalize">
            {categoryLabel}
          </span>

          <h1 className="font-headline text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-alx-on-surface leading-tight">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-xs text-alx-on-surface-variant pt-1">
            <span>Written by {article.author}</span>
            <span>•</span>
            <span>Updated {updatedLabel}</span>
          </div>
          </div>
        </div>
      </section>

      {/* Reading column + sidebar */}
      <section className="max-w-6xl mx-auto px-6 pb-24 alx-scroll-fade">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-12 lg:gap-16">
          <main className="min-w-0">
            <div
              className="help-article max-w-none"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />

            {/* Closing CTA */}
            <div className="mt-12 rounded-2xl alx-bg-gradient-primary p-6 md:p-8 text-alx-on-primary shadow-lg shadow-alx-primary/25 alx-hover-lift flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div className="space-y-1.5">
                <h3 className="font-headline text-lg font-bold">Was this guide helpful?</h3>
                <p className="text-sm text-alx-on-primary/85 leading-relaxed">
                  Couldn&apos;t find what you needed? Our team can walk you through it in a live demo.
                </p>
              </div>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center shrink-0 bg-alx-surface-container-lowest text-alx-primary font-bold text-sm px-5 py-3 rounded-lg hover:opacity-90 transition"
              >
                Contact Support
              </Link>
            </div>
          </main>

          <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
            {toc.length > 0 && (
              <div className="rounded-2xl border border-alx-outline-variant/20 bg-alx-surface-container-lowest p-5 shadow-md shadow-alx-on-surface/5 alx-hover-lift">
                <h3 className="alx-label text-xs font-bold text-alx-on-surface-variant border-b border-alx-outline-variant/20 pb-2.5 mb-3">
                  In this article
                </h3>
                <nav className="space-y-2.5">
                  {toc.map((entry) => (
                    <a
                      key={entry.id}
                      href={`#${entry.id}`}
                      className="block text-xs text-alx-on-surface-variant hover:text-alx-primary transition-all leading-snug"
                    >
                      {entry.text}
                    </a>
                  ))}
                </nav>
              </div>
            )}

            <div className="rounded-2xl alx-bg-gradient-primary p-6 text-alx-on-primary shadow-lg shadow-alx-primary/25 alx-hover-lift">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-alx-on-primary/15 mb-3">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
              </div>
              <h3 className="font-headline text-lg font-bold mb-2">Need more help?</h3>
              <p className="text-sm text-alx-on-primary/85 mb-4 leading-relaxed">
                Can&apos;t find what you are looking for? Our team can walk you through it in a
                live demo.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center w-full bg-alx-surface-container-lowest text-alx-primary font-bold text-sm px-4 py-2.5 rounded-lg hover:opacity-90 transition"
              >
                Contact Support
              </Link>
            </div>

            <div className="rounded-2xl border border-alx-outline-variant/20 bg-alx-surface-container-lowest p-5 space-y-4 alx-hover-lift">
              <h3 className="alx-label text-xs font-bold text-alx-on-surface-variant border-b border-alx-outline-variant/20 pb-2.5">
                In this Category
              </h3>
              <div className="space-y-3">
                {/* Category Main Page Link */}
                <Link
                  href={`/help/${category}`}
                  className={`flex items-center gap-2 text-xs font-semibold hover:text-alx-primary transition-all cursor-pointer ${
                    slugPath === category || slugPath === `${category}/${category}`
                      ? "text-alx-primary"
                      : "text-alx-on-surface-variant"
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  </svg>
                  <span className="truncate">Category Overview</span>
                </Link>

                {categoryArticles.map((art, idx) => (
                  <Link
                    key={idx}
                    href={`/help/${art.slug}`}
                    className={`flex items-center gap-2 text-xs hover:text-alx-primary transition-all cursor-pointer ${
                      slugPath === art.slug ? "text-alx-primary font-semibold" : "text-alx-on-surface-variant"
                    }`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
                    </svg>
                    <span className="truncate">{art.title}</span>
                  </Link>
                ))}

                {categoryArticles.length === 0 && (
                  <p className="text-xs text-alx-on-surface-variant">No other articles</p>
                )}
              </div>
            </div>

            <Link
              href="/help"
              className="inline-flex items-center gap-2 text-xs text-alx-on-surface-variant hover:text-alx-primary transition-all group"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform">
                ←
              </span>
              Back to help categories
            </Link>
          </aside>
        </div>
      </section>
    </MarketingShell>
  );
}
