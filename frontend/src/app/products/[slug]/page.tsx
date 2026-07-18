import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getContentItemBySlug, getContentItems } from "@/lib/content";
import { Metadata } from "next";
import MarketingShell from "@/components/marketing/MarketingShell";

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
    <MarketingShell>
      <div className="max-w-6xl mx-auto px-6 pt-4 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Body */}
          <main className="lg:col-span-3 space-y-8">
            <div className="bg-alx-surface-container-lowest border border-alx-outline-variant rounded-lg shadow-sm p-8 md:p-12 space-y-6">
              <div className="space-y-4 border-b border-alx-outline-variant pb-6">
                <span className="alx-label inline-block text-xs font-semibold text-alx-primary px-2.5 py-1 rounded bg-alx-primary-fixed/40">
                  Product Modules
                </span>
                <h1 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tight text-alx-on-surface leading-tight">
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
            <div className="bg-alx-surface-container-lowest border border-alx-outline-variant rounded-lg p-5 space-y-4">
              <h3 className="alx-label text-xs font-bold text-alx-on-surface-variant border-b border-alx-outline-variant pb-2">
                Other Modules
              </h3>
              <div className="space-y-3">
                {otherProducts.map((p, idx) => (
                  <Link
                    key={idx}
                    href={`/products/${p.slug}`}
                    className="block text-xs text-alx-on-surface-variant hover:text-alx-primary transition-all truncate cursor-pointer"
                  >
                    🏗️ {p.title}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </MarketingShell>
  );
}
