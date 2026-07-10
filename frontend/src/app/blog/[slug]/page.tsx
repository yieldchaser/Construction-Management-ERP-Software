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
    <div className="min-h-screen bg-background text-foreground pb-20 relative">
      {/* Background Glow */}
      <div className="absolute top-[-10%] right-[-10%] h-[40vw] w-[40vw] rounded-full bg-primary opacity-5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] h-[40vw] w-[40vw] rounded-full bg-primary opacity-5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border border-border-custom rounded-lg border-b border-border-custom px-6 py-4 flex items-center justify-between">
        <Link href="/blog" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary font-sans font-bold text-white shadow-md">
            S
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            Site<span className="text-primary">Flow</span> Blog
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/blog"
            className="text-sm font-semibold text-muted hover:text-foreground transition-all"
          >
            All Articles
          </Link>
          <span className="text-border-custom">|</span>
          <Link
            href="/help"
            className="text-sm font-semibold text-muted hover:text-foreground transition-all"
          >
            Help Center
          </Link>
        </div>
      </header>

      {/* Content Area */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-muted mb-8">
          <Link href="/blog" className="hover:text-foreground transition-all">
            Blog
          </Link>
          <span>/</span>
          <span className="text-muted truncate max-w-[300px]">
            {article.title}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Body */}
          <main className="lg:col-span-3 space-y-8">
            <div className="bg-card border border-border-custom rounded-lg shadow-sm rounded-md p-8 md:p-12 border border-border-custom space-y-6">
              <div className="space-y-4 border-b border-border-custom pb-6">
                <span className="inline-block text-xs font-semibold text-primary px-2.5 py-1 rounded bg-primary/10 uppercase tracking-wider">
                  SiteFlow operations
                </span>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                  {article.title}
                </h1>
                <div className="flex items-center gap-4 text-xs text-muted pt-2">
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
            <div className="bg-card border border-border-custom rounded-lg rounded-lg p-5 border border-border-custom space-y-4">
              <h3 className="text-xs font-bold text-muted uppercase tracking-widest border-b border-border-custom pb-2">
                Recent Posts
              </h3>
              <div className="space-y-4">
                {recentPosts.map((post, idx) => (
                  <Link
                    key={idx}
                    href={`/blog/${post.slug}`}
                    className="block space-y-1 group cursor-pointer"
                  >
                    <span className="text-[10px] text-muted font-semibold block">
                      {new Date(post.publishDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <h4 className="text-xs font-bold text-muted group-hover:text-primary transition-all line-clamp-2 leading-snug">
                      {post.title}
                    </h4>
                  </Link>
                ))}
              </div>
            </div>

            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-xs text-muted hover:text-foreground transition-all group"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform">
                ←
              </span>
              Back to all posts
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
