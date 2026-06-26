import React from "react";
import Link from "next/link";
import { getContentItems } from "@/lib/content";

export const metadata = {
  title: "Blog - SiteFlow Construction Insights",
  description: "Read the latest tips, guides, and trends in construction management, project scheduling, and site budget control.",
};

export default async function BlogIndexPage() {
  const posts = await getContentItems("blog");
  const featuredPost = posts[0];
  const remainingPosts = posts.slice(1);

  return (
    <div className="min-h-screen bg-[#0E0C15] text-[#ededed] pb-20 relative">
      {/* Background glow elements */}
      <div className="absolute top-[-10%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-[#E8184C] opacity-5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] h-[50vw] w-[50vw] rounded-full bg-[#7C5CFF] opacity-5 blur-[120px] pointer-events-none" />

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
            href="/help"
            className="text-sm font-semibold text-zinc-400 hover:text-white transition-all"
          >
            Help Center
          </Link>
          <span className="text-zinc-700">|</span>
          <Link
            href="/"
            className="text-sm font-semibold text-zinc-400 hover:text-white transition-all"
          >
            Launch Console
          </Link>
        </div>
      </header>

      {/* Hero Header */}
      <section className="relative px-6 py-16 text-center max-w-4xl mx-auto space-y-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-4 py-1.5 text-xs font-semibold text-secondary border border-secondary/20">
          📰 Industry Insights & Operations
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
          SiteFlow Construction Blog
        </h1>
        <p className="text-zinc-400 text-sm max-w-xl mx-auto">
          Operational blueprints, field management strategies, and building calculators compiled by civil engineering leaders.
        </p>
      </section>

      {/* Featured Post Card */}
      {featuredPost && (
        <section className="max-w-6xl mx-auto px-6 mb-12">
          <div className="border border-white/5 rounded-3xl overflow-hidden glass-panel-glow grid grid-cols-1 lg:grid-cols-2 group hover:border-white/10 transition-all">
            <div className="p-8 md:p-12 flex flex-col justify-between space-y-6 lg:border-r lg:border-white/5">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span className="text-xs font-semibold text-primary px-2 py-0.5 rounded bg-primary/10">
                    Featured
                  </span>
                  <span>•</span>
                  <span>
                    {new Date(featuredPost.publishDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white group-hover:text-primary transition-all leading-snug">
                  <Link href={`/blog/${featuredPost.slug}`} className="cursor-pointer">
                    {featuredPost.title}
                  </Link>
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">
                  {featuredPost.metaDescription}
                </p>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <span className="text-xs text-zinc-500">By {featuredPost.author}</span>
                <Link
                  href={`/blog/${featuredPost.slug}`}
                  className="text-xs font-bold text-secondary hover:text-white transition-all flex items-center gap-1 group-link cursor-pointer"
                >
                  Read Article
                  <span className="group-hover:translate-x-0.5 transition-transform">
                    →
                  </span>
                </Link>
              </div>
            </div>
            {/* Visual Block */}
            <div className="h-64 lg:h-auto bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center p-12 relative">
              <div className="absolute inset-0 bg-[#0E0C15]/40 backdrop-blur-[2px]" />
              <div className="relative text-center space-y-2">
                <span className="text-5xl">🏗️</span>
                <h3 className="font-extrabold text-white text-lg tracking-tight">SiteFlow Operations</h3>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Enterprise Builders Toolkit</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Grid List of Remaining Posts */}
      <section className="max-w-6xl mx-auto px-6">
        <h3 className="text-lg font-extrabold text-white mb-6 pb-2 border-b border-white/5">
          All Articles
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {remainingPosts.map((post, idx) => (
            <article
              key={idx}
              className="rounded-2xl glass-panel p-6 flex flex-col justify-between hover:border-white/10 hover:shadow-lg transition-all group"
            >
              <div className="space-y-4">
                <div className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                  {new Date(post.publishDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <h4 className="text-base font-extrabold text-white group-hover:text-primary transition-all line-clamp-2 leading-snug">
                  <Link href={`/blog/${post.slug}`} className="cursor-pointer">
                    {post.title}
                  </Link>
                </h4>
                <p className="text-zinc-400 text-xs leading-relaxed line-clamp-3">
                  {post.metaDescription}
                </p>
              </div>
              <div className="pt-4 mt-6 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">By {post.author}</span>
                <Link
                  href={`/blog/${post.slug}`}
                  className="text-xs font-bold text-secondary hover:text-white transition-all cursor-pointer"
                >
                  Read →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
