import React from "react";
import { notFound } from "next/navigation";
import { getContentItemBySlug, getContentItems } from "@/lib/content";
import { Metadata } from "next";
import MarketingShell from "@/components/marketing/MarketingShell";
import BlogArticle from "@/components/blog/BlogArticle";

interface RouteParams {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  const article = await getContentItemBySlug("blog", slug);

  if (!article) return { title: "Blog Post Not Found - SiteFlow" };

  return {
    title: `${article.title} - SiteFlow Blog`,
    description: article.metaDescription,
    alternates: {
      canonical: `https://siteflow.com/blog/${slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: RouteParams) {
  const { slug } = await params;
  const article = await getContentItemBySlug("blog", slug);

  if (!article) {
    notFound();
  }

  const allPosts = await getContentItems("blog");
  const relatedPosts = allPosts.filter((post) => post.slug !== slug).slice(0, 4);

  return (
    <MarketingShell>
      <BlogArticle article={article} relatedPosts={relatedPosts} />
    </MarketingShell>
  );
}
