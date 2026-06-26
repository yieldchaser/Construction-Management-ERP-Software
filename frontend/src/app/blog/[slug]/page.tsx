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
    <div className="min-h-screen bg-[#0E0C15] text-[#ededed] pb-20 relative">
      {/* Background Glow */}
      <div className="absolute top-[-10%] right-[-10%] h-[40vw] w-[40vw] rounded-full bg-[#E8184C] opacity-5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] h-[40vw] w-[40vw] rounded-full bg-[#7C5CFF] opacity-5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <Link href="/blog" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] font-sans font-bold text-white shadow-md">
            S
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Site<span className="text-primary">Flow</span> Blog
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/blog"
            className="text-sm font-semibold text-zinc-400 hover:text-white transition-all"
          >
            All Articles
          </Link>
          <span className="text-zinc-700">|</span>
          <Link
            href="/help"
            className="text-sm font-semibold text-zinc-400 hover:text-white transition-all"
          >
            Help Center
          </Link>
        </div>
      </header>

      {/* Content Area */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-8">
          <Link href="/blog" className="hover:text-white transition-all">
            Blog
          </Link>
          <span>/</span>
          <span className="text-zinc-400 truncate max-w-[300px]">
            {article.title}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Body */}
          <main className="lg:col-span-3 space-y-8">
            <div className="glass-panel-glow rounded-3xl p-8 md:p-12 border border-white/5 space-y-6">
              <div className="space-y-4 border-b border-white/5 pb-6">
                <span className="inline-block text-xs font-semibold text-secondary px-2.5 py-1 rounded bg-secondary/10 uppercase tracking-wider">
                  SiteFlow operations
                </span>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  {article.title}
                </h1>
                <div className="flex items-center gap-4 text-xs text-zinc-500 pt-2">
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
                className="prose prose-invert max-w-none prose-zinc prose-headings:text-white prose-headings:font-extrabold prose-p:text-zinc-300 prose-p:leading-relaxed prose-li:text-zinc-300 prose-strong:text-white prose-a:text-secondary hover:prose-a:underline prose-table:border-collapse prose-table:w-full prose-td:border prose-td:border-white/10 prose-td:p-3 prose-th:border prose-th:border-white/10 prose-th:p-3 prose-th:bg-white/[0.02] prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-img:rounded-2xl"
                dangerouslySetInnerHTML={{ __html: article.body }}
              />
            </div>
          </main>

          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="glass-panel rounded-2xl p-5 border border-white/5 space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-2">
                Recent Posts
              </h3>
              <div className="space-y-4">
                {recentPosts.map((post, idx) => (
                  <Link
                    key={idx}
                    href={`/blog/${post.slug}`}
                    className="block space-y-1 group cursor-pointer"
                  >
                    <span className="text-[10px] text-zinc-500 font-semibold block">
                      {new Date(post.publishDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <h4 className="text-xs font-bold text-zinc-400 group-hover:text-primary transition-all line-clamp-2 leading-snug">
                      {post.title}
                    </h4>
                  </Link>
                ))}
              </div>
            </div>

            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-all group"
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
