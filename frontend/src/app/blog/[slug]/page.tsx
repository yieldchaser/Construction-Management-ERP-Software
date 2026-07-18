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
  const recentPosts = allPosts
    .filter((post) => post.slug !== slug)
    .slice(0, 4);

  return (
    <MarketingShell>
      <div className="max-w-6xl mx-auto px-6 pt-4 pb-24">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-alx-on-surface-variant mb-8">
          <Link href="/blog" className="hover:text-alx-primary transition-all">
            Blog
          </Link>
          <span>/</span>
          <span className="text-alx-on-surface-variant truncate max-w-[300px]">
            {article.title}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Body */}
          <main className="lg:col-span-3 space-y-8">
            <div className="bg-alx-surface-container-lowest border border-alx-outline-variant rounded-lg shadow-sm p-8 md:p-12 space-y-6">
              <div className="space-y-4 border-b border-alx-outline-variant pb-6">
                <span className="alx-label inline-block text-xs font-semibold text-alx-primary px-2.5 py-1 rounded bg-alx-primary-fixed/40">
                  SiteFlow operations
                </span>
                <h1 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tight text-alx-on-surface leading-tight">
                  {article.title}
                </h1>
                <div className="flex items-center gap-4 text-xs text-alx-on-surface-variant pt-2">
                  <span>By {article.author}</span>
                  <span>•</span>
                  <span>
                    Published:{" "}
                    {new Date(article.publishDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Render article body */}
              <div
                className="help-article"
                dangerouslySetInnerHTML={{ __html: article.body }}
              />
            </div>
          </main>

          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="bg-alx-surface-container-lowest border border-alx-outline-variant rounded-lg p-5 space-y-4">
              <h3 className="alx-label text-xs font-bold text-alx-on-surface-variant border-b border-alx-outline-variant pb-2">
                Recent Posts
              </h3>
              <div className="space-y-4">
                {recentPosts.map((post, idx) => (
                  <Link
                    key={idx}
                    href={`/blog/${post.slug}`}
                    className="block space-y-1 group cursor-pointer"
                  >
                    <span className="text-[10px] text-alx-on-surface-variant font-semibold block">
                      {new Date(post.publishDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <h4 className="text-xs font-bold text-alx-on-surface-variant group-hover:text-alx-primary transition-all line-clamp-2 leading-snug">
                      {post.title}
                    </h4>
                  </Link>
                ))}
              </div>
            </div>

            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-xs text-alx-on-surface-variant hover:text-alx-primary transition-all group"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform">
                ←
              </span>
              Back to all posts
            </Link>
          </aside>
        </div>
      </div>
    </MarketingShell>
  );
}
