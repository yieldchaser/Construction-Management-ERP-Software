import React from "react";
import { notFound } from "next/navigation";
import { getContentItemBySlug } from "@/lib/content";
import MarketingArticle from "@/components/marketing/MarketingArticle";
import MarketingShell from "@/components/marketing/MarketingShell";
import { Metadata } from "next";

// Pages authored as bespoke, full-bleed landing pages with their own scoped
// CSS systems (styled in globals.css). They render full width, without the
// boxed .help-article prose wrapper, and use interactive FAQ accordions.
const BESPOKE_SLUGS = new Set(["who-we-serve", "tally"]);

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// Pages that have dedicated routes — skip generic rendering
const SKIP_SLUGS = new Set([
  "blog", "help", "products", "resources", "login",
  "terms", "privacy", "career", "who-we-serve",
  "index", "webapp-home", "webapp-login",
]);

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  if (SKIP_SLUGS.has(slug)) return { title: "SiteFlow" };
  const page = await getContentItemBySlug("pages", slug);
  if (!page) return { title: "Not Found — SiteFlow" };
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription,
    alternates: { canonical: page.canonical },
  };
}

export default async function GenericPage({ params }: RouteParams) {
  const { slug } = await params;
  if (SKIP_SLUGS.has(slug)) notFound();

  const page = await getContentItemBySlug("pages", slug);
  if (!page) notFound();

  const isCustomLayout = slug === "about";
  const isBespoke = BESPOKE_SLUGS.has(slug);

  if (isBespoke) {
    return (
      <MarketingShell>
        <div className="w-full">
          <MarketingArticle html={page.body} />
        </div>
      </MarketingShell>
    );
  }

  if (isCustomLayout) {
    return (
      <MarketingShell>
        <div className="w-full" dangerouslySetInnerHTML={{ __html: page.body }} />
      </MarketingShell>
    );
  }

  return (
    <MarketingShell>
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div className="bg-alx-surface-container-lowest border border-alx-outline-variant rounded-lg shadow-sm p-8 md:p-12">
          <div
            className="help-article"
            dangerouslySetInnerHTML={{ __html: page.body }}
          />
        </div>
      </div>
    </MarketingShell>
  );
}
