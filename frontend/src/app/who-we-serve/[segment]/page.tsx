import React from "react";
import { notFound } from "next/navigation";
import { getContentItemBySlug } from "@/lib/content";
import { Metadata } from "next";
import MarketingShell from "@/components/marketing/MarketingShell";
import ReadingProgress from "@/components/marketing/ReadingProgress";
import ProductArticle from "@/components/marketing/product/ProductArticle";

interface RouteParams {
  params: Promise<{
    segment: string;
  }>;
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { segment } = await params;
  const article = await getContentItemBySlug("who-we-serve", segment);

  if (!article) return { title: "Segment Not Found - SiteFlow" };

  return {
    title: `${article.title} - SiteFlow`,
    description: article.metaDescription,
    alternates: {
      canonical: `https://siteflow.com/who-we-serve/${segment}`,
    },
  };
}

/**
 * Deep-dive landing page for each construction segment linked from the
 * /who-we-serve overview grid. Reuses the same component-driven template as
 * /products/[slug] (hero, stat strip, problem-grid personas, alternating
 * feature blocks, data table, FAQ, closing CTA) rather than inventing a
 * competing visual system, since the structural shape (hero -> "why X
 * projects lose money" -> feature blocks -> FAQ -> CTA) is identical to a
 * product deep-dive.
 */
export default async function WhoWeServeSegmentPage({ params }: RouteParams) {
  const { segment } = await params;
  const article = await getContentItemBySlug("who-we-serve", segment);

  if (!article || !article.structured) {
    notFound();
  }

  return (
    <MarketingShell>
      <ReadingProgress />
      <ProductArticle
        structured={article.structured}
        title={article.title}
        breadcrumbLabel="Who We Serve"
        breadcrumbHref="/who-we-serve"
      />
    </MarketingShell>
  );
}
