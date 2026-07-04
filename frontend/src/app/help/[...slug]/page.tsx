import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getContentItemBySlug, getContentItems } from "@/lib/content";
import { Metadata } from "next";

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
    <div className="min-h-screen bg-background text-foreground pb-20 relative">
      {/* Background Glow */}
      <div className="absolute top-[-10%] right-[-10%] h-[40vw] w-[40vw] rounded-full bg-primary opacity-5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] h-[40vw] w-[40vw] rounded-full bg-primary opacity-5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border border-border-custom rounded-lg border-b border-border-custom px-6 py-4 flex items-center justify-between">
        <Link href="/help" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-tr bg-primary font-sans font-bold text-white shadow-md">
            S
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Site<span className="text-primary">Flow</span> Help
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/help"
            className="text-sm font-semibold text-muted hover:text-foreground transition-all"
          >
            All Categories
          </Link>
          <span className="text-zinc-700">|</span>
          <Link
            href="/"
            className="text-sm font-semibold text-muted hover:text-foreground transition-all"
          >
            Launch Console
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-muted mb-8">
          <Link href="/help" className="hover:text-foreground transition-all">
            Help Center
          </Link>
          <span>/</span>
          <span className="capitalize">{category.replace("-", " ")}</span>
          <span>/</span>
          <span className="text-muted truncate max-w-[200px]">
            {article.title}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="bg-card border border-border-custom rounded-lg rounded-lg p-5 border border-border-custom space-y-4">
              <h3 className="text-xs font-bold text-muted uppercase tracking-widest border-b border-border-custom pb-2">
                In this Category
              </h3>
              <div className="space-y-3">
                {/* Category Main Page Link */}
                <Link
                  href={`/help/${category}`}
                  className={`block text-xs font-semibold hover:text-primary transition-all truncate cursor-pointer ${
                    slugPath === category || slugPath === `${category}/${category}`
                      ? "text-primary"
                      : "text-muted"
                  }`}
                >
                  📁 Category Overview
                </Link>

                {categoryArticles.map((art, idx) => (
                  <Link
                    key={idx}
                    href={`/help/${art.slug}`}
                    className={`block text-xs hover:text-primary transition-all truncate cursor-pointer ${
                      slugPath === art.slug ? "text-primary font-semibold" : "text-muted"
                    }`}
                  >
                    📄 {art.title}
                  </Link>
                ))}
                
                {categoryArticles.length === 0 && (
                  <p className="text-xs text-muted">No other articles</p>
                )}
              </div>
            </div>

            <Link
              href="/help"
              className="inline-flex items-center gap-2 text-xs text-muted hover:text-foreground transition-all group"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform">
                ←
              </span>
              Back to help categories
            </Link>
          </aside>

          {/* Article Viewer */}
          <main className="lg:col-span-3 space-y-8">
            <div className="bg-card border border-border-custom rounded-lg shadow-sm rounded-md p-8 md:p-12 border border-border-custom space-y-6">
              <div className="space-y-3 border-b border-border-custom pb-6">
                <span className="inline-block text-xs font-bold text-primary px-2.5 py-1 rounded-md bg-primary/10 capitalize">
                  {category.replace("-", " ")}
                </span>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  {article.title}
                </h1>
                <div className="flex items-center gap-4 text-xs text-muted pt-2">
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
                className="prose prose-invert max-w-none prose-zinc prose-headings:text-white prose-headings:font-extrabold prose-p:text-zinc-300 prose-p:leading-relaxed prose-li:text-zinc-300 prose-strong:text-white prose-a:text-secondary hover:prose-a:underline prose-table:border-collapse prose-table:w-full prose-td:border prose-td:border-border-custom prose-td:p-3 prose-th:border prose-th:border-border-custom prose-th:p-3 prose-th:bg-elevated prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-img:rounded-lg"
                dangerouslySetInnerHTML={{ __html: article.body }}
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
