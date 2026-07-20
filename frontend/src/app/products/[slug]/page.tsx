import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getContentItemBySlug, getContentItems } from "@/lib/content";
import { Metadata } from "next";
import MarketingShell from "@/components/marketing/MarketingShell";
import MockupFrame from "@/components/marketing/MockupFrame";
import ReadingProgress from "@/components/marketing/ReadingProgress";
import ProductArticle from "@/components/marketing/product/ProductArticle";

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

  // Component-driven template: takes over the whole page when the content
  // item carries a `structured` block. Falls back to the legacy body-blob
  // rendering below for every product that hasn't been migrated yet.
  if (article.structured) {
    return (
      <MarketingShell>
        <ReadingProgress />
        <ProductArticle structured={article.structured} title={article.title} />
      </MarketingShell>
    );
  }

  // Legacy body-blob rendering below only applies to products that never got
  // a `structured` template. All 20 shipped products have `structured` now,
  // and their `body` fields were intentionally emptied (the structured
  // template supersedes the scraped competitor HTML) — do not restore them.
  // If a product somehow has neither, bail out instead of rendering an
  // empty article shell.
  if (!article.body) {
    notFound();
  }

  return (
    <MarketingShell>
      <ReadingProgress />
      {/* Hero */}
      <section className="relative px-6 pt-6 pb-20 overflow-hidden alx-scroll-fade is-visible">
        <div className="absolute inset-0 z-0 alx-hero-wash pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-alx-on-surface-variant mb-8">
            <Link href="/" className="hover:text-alx-primary transition-all">
              Home
            </Link>
            <span>/</span>
            <Link href="/products" className="hover:text-alx-primary transition-all">
              Products
            </Link>
            <span>/</span>
            <span className="text-alx-on-surface-variant truncate max-w-[300px]">{article.title}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="alx-label alx-badge-gold inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs">
                Product Module
              </span>
              <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight text-alx-on-surface leading-tight">
                {article.title}
              </h1>
              <p className="font-body text-alx-on-surface-variant text-base md:text-lg leading-relaxed max-w-lg">
                {article.metaDescription}
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/contact"
                  className="alx-bg-gradient-primary text-alx-on-primary px-7 py-3 rounded-full font-uilabel text-sm font-bold tracking-wide hover:shadow-xl hover:shadow-alx-primary/30 transition-all active:scale-95 inline-flex items-center justify-center relative overflow-hidden group"
                >
                  <span className="relative z-10">Book Live Demo</span>
                  <div className="absolute inset-0 alx-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Link>
                <Link
                  href="/products"
                  className="px-7 py-3 rounded-full font-uilabel text-sm font-bold tracking-wide border border-alx-outline-variant text-alx-on-surface hover:border-alx-primary hover:text-alx-primary transition-all inline-flex items-center justify-center"
                >
                  Explore Modules
                </Link>
              </div>
            </div>
            <div className="alx-hover-lift">
              <MockupFrame variant="hero" />
            </div>
          </div>
        </div>
      </section>

      {/* Body + sidebar */}
      <section className="max-w-6xl mx-auto px-6 pb-20 alx-scroll-fade">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Main Body. The extra `product-body` scope lets globals.css
              normalize the bespoke per-product widget systems (hero
              mockups, stat dashboards, progress bars, timelines, FAQ) and
              neutralize the scraped WordPress light-theme inline colors
              without affecting blog/help/resources, which share
              `.help-article`. */}
          <main className="lg:col-span-3 max-w-3xl space-y-8">
            <div
              className="help-article product-body"
              dangerouslySetInnerHTML={{ __html: article.body }}
            />
          </main>

          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="rounded-2xl bg-alx-surface-container-lowest shadow-lg shadow-alx-on-surface/5 border border-alx-outline-variant/15 p-5 space-y-4 alx-hover-lift">
              <h3 className="alx-label text-xs font-bold text-alx-on-surface-variant border-b border-alx-outline-variant/20 pb-2">
                Other Modules
              </h3>
              <div className="space-y-3">
                {otherProducts.map((p, idx) => (
                  <Link
                    key={idx}
                    href={`/products/${p.slug}`}
                    className="block text-xs font-medium text-alx-on-surface-variant hover:text-alx-primary transition-all truncate"
                  >
                    {p.title}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-28 px-6 bg-alx-surface-container-lowest alx-scroll-fade">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-alx-primary-fixed via-alx-surface-container-lowest to-alx-surface-container rounded-[3rem] p-12 md:p-16 text-center relative overflow-hidden border border-alx-outline-variant/20 shadow-2xl shadow-alx-primary/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-alx-primary/10 via-transparent to-transparent opacity-50" />
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-alx-on-surface leading-tight mb-6 relative z-10">
            Ready to run {article.title} in production?
          </h2>
          <p className="font-body text-alx-on-surface-variant text-sm max-w-md mx-auto mb-8 relative z-10">
            Book a live demo to see this module against your own site data, or sign in to explore it inside your
            workspace.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 relative z-10">
            <Link
              href="/contact"
              className="alx-bg-gradient-primary text-alx-on-primary px-8 py-3.5 rounded-full font-uilabel text-sm font-bold tracking-wide hover:shadow-xl hover:shadow-alx-primary/30 transition-all active:scale-95 inline-flex items-center justify-center relative overflow-hidden group"
            >
              <span className="relative z-10">Book Live Demo</span>
              <div className="absolute inset-0 alx-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
            <Link
              href="/login"
              className="px-8 py-3.5 rounded-full font-uilabel text-sm font-bold tracking-wide border border-alx-outline-variant text-alx-on-surface hover:border-alx-primary hover:text-alx-primary transition-all inline-flex items-center justify-center"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
