import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getContentItemBySlug, getContentItems } from "@/lib/content";
import { Metadata } from "next";

interface RouteParams {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  const article = await getContentItemBySlug("products", slug);

  if (!article) return { title: "Product Features Not Found - SiteFlow" };

  return {
    title: `${article.title} - SiteFlow Platform`,
    description: article.metaDescription,
    alternates: {
      canonical: `https://siteflow.com/products/${slug}`,
    },
  };
}

export default async function ProductFeaturePage({ params }: RouteParams) {
  const { slug } = await params;
  const article = await getContentItemBySlug("products", slug);

  if (!article) {
    notFound();
  }

  const allProducts = await getContentItems("products");
  const otherProducts = allProducts.filter((p) => p.slug !== slug);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 relative">
      {/* Background Glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] h-[40vw] w-[40vw] rounded-full bg-primary opacity-5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[40vw] w-[40vw] rounded-full bg-primary opacity-5 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border border-border-custom rounded-lg border-b border-border-custom px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary font-sans font-bold text-white shadow-md">
            S
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            Site<span className="text-primary">Flow</span> Platform
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/help"
            className="text-sm font-semibold text-muted hover:text-foreground transition-all"
          >
            Help Center
          </Link>
          <span className="text-border-custom">|</span>
          <Link
            href="/blog"
            className="text-sm font-semibold text-muted hover:text-foreground transition-all"
          >
            Blog
          </Link>
        </div>
      </header>

      {/* Content Area */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Body */}
          <main className="lg:col-span-3 space-y-8">
            <div className="bg-card border border-border-custom rounded-lg shadow-sm rounded-md p-8 md:p-12 border border-border-custom space-y-6">
              <div className="space-y-4 border-b border-border-custom pb-6">
                <span className="inline-block text-xs font-semibold text-primary px-2.5 py-1 rounded bg-primary/10 uppercase tracking-wider">
                  Product Modules
                </span>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                  {article.title}
                </h1>
              </div>

              {/* Render article body. The extra `product-body` scope lets
                  globals.css normalize the bespoke per-product widget systems
                  (hero mockups, stat dashboards, progress bars, timelines) and
                  neutralize the scraped WordPress light-theme inline colors
                  without affecting blog/help/resources, which share
                  `.help-article`. */}
              <div
                className="help-article product-body"
                dangerouslySetInnerHTML={{ __html: article.body }}
              />
            </div>
          </main>

          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="bg-card border border-border-custom rounded-lg rounded-lg p-5 border border-border-custom space-y-4">
              <h3 className="text-xs font-bold text-muted uppercase tracking-widest border-b border-border-custom pb-2">
                Other Modules
              </h3>
              <div className="space-y-3">
                {otherProducts.map((p, idx) => (
                  <Link
                    key={idx}
                    href={`/products/${p.slug}`}
                    className="block text-xs text-muted hover:text-primary transition-all truncate cursor-pointer"
                  >
                    🏗️ {p.title}
                  </Link>
                ))}
              </div>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs text-muted hover:text-foreground transition-all group"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform">
                ←
              </span>
              Back to Home page
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
