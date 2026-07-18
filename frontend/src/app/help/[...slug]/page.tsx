import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getContentItemBySlug, getContentItems } from "@/lib/content";
import { Metadata } from "next";
import MarketingShell from "@/components/marketing/MarketingShell";

interface RouteParams {
  params: Promise<{
    slug: string[];
  }>;
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

  return (
    <MarketingShell>
      <div className="max-w-6xl mx-auto px-6 pt-4 pb-24">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-alx-on-surface-variant mb-8">
          <Link href="/help" className="hover:text-alx-primary transition-all">
            Help Center
          </Link>
          <span>/</span>
          <span className="capitalize">{category.replace("-", " ")}</span>
          <span>/</span>
          <span className="text-alx-on-surface-variant truncate max-w-[200px]">
            {article.title}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="bg-alx-surface-container-lowest border border-alx-outline-variant rounded-lg p-5 space-y-4">
              <h3 className="alx-label text-xs font-bold text-alx-on-surface-variant border-b border-alx-outline-variant pb-2">
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

          {/* Article Viewer */}
          <main className="lg:col-span-3 space-y-8">
            <div className="bg-alx-surface-container-lowest border border-alx-outline-variant rounded-lg shadow-sm p-8 md:p-12 space-y-6">
              <div className="space-y-4 border-b border-alx-outline-variant pb-7">
                <span className="alx-label inline-block text-xs font-bold text-alx-primary px-2.5 py-1 rounded-md bg-alx-primary-fixed/40 capitalize">
                  {category.replace("-", " ")}
                </span>
                <h1 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tight text-alx-on-surface leading-tight">
                  {article.title}
                </h1>
                <div className="flex items-center gap-4 text-xs text-alx-on-surface-variant pt-1">
                  <span>Written by {article.author}</span>
                  <span>•</span>
                  <span>
                    Updated:{" "}
                    {new Date(article.publishDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Render html body safely */}
              <div
                className="help-article"
                dangerouslySetInnerHTML={{ __html: article.body }}
              />
            </div>
          </main>
        </div>
      </div>
    </MarketingShell>
  );
}
