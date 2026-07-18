import React from "react";
import Link from "next/link";
import { getContentItems } from "@/lib/content";
import MarketingShell from "@/components/marketing/MarketingShell";

export const metadata = {
  title: "Blog - SiteFlow Construction Insights",
  description: "Read the latest tips, guides, and trends in construction management, project scheduling, and site budget control.",
};

function NewspaperIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="4" width="14" height="16" rx="1.5" />
      <path d="M7 8h6M7 12h6M7 16h3" />
      <path d="M17 8h4v10a2 2 0 01-2 2h-2" />
    </svg>
  );
}

export default async function BlogIndexPage() {
  const posts = await getContentItems("blog");
  const featuredPost = posts[0];
  const remainingPosts = posts.slice(1);

  return (
    <MarketingShell>
      {/* Hero */}
      <section className="relative px-6 pt-16 pb-16 text-center overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-alx-primary-fixed/30 via-alx-surface-container-lowest to-alx-surface-container-lowest pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10 space-y-6">
          <span className="alx-label alx-badge-gold inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs">
            <NewspaperIcon className="h-3.5 w-3.5" />
            Industry Insights &amp; Operations
          </span>
          <h1 className="font-headline text-4xl md:text-6xl font-extrabold tracking-tight text-alx-on-surface leading-tight">
            SiteFlow Construction Blog
          </h1>
          <p className="font-body text-alx-on-surface-variant text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            Operational blueprints, field management strategies, and building
            calculators compiled by civil engineering leaders.
          </p>
        </div>
      </section>

      {/* Featured Post Card */}
      {featuredPost && (
        <section className="max-w-6xl mx-auto px-6 mb-16">
          <div className="rounded-2xl overflow-hidden bg-alx-surface-container-lowest shadow-xl shadow-alx-on-surface/5 alx-hover-lift grid grid-cols-1 lg:grid-cols-2 group transition-all">
            <div className="p-8 md:p-12 flex flex-col justify-between space-y-6 lg:border-r lg:border-alx-outline-variant/15">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-xs text-alx-on-surface-variant">
                  <span className="alx-label alx-badge-gold text-[11px] font-semibold px-2 py-0.5 rounded-full">
                    Featured
                  </span>
                  <span>&bull;</span>
                  <span>
                    {new Date(featuredPost.publishDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-alx-on-surface group-hover:text-alx-primary transition-all leading-snug">
                  <Link href={`/blog/${featuredPost.slug}`} className="cursor-pointer">
                    {featuredPost.title}
                  </Link>
                </h2>
                <p className="font-body text-sm text-alx-on-surface-variant leading-relaxed line-clamp-3">
                  {featuredPost.metaDescription}
                </p>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-alx-outline-variant/15">
                <span className="font-uilabel text-xs text-alx-on-surface-variant">By {featuredPost.author}</span>
                <Link
                  href={`/blog/${featuredPost.slug}`}
                  className="font-uilabel text-xs font-bold text-alx-primary hover:text-alx-on-surface transition-all flex items-center gap-1 cursor-pointer"
                >
                  Read Article
                  <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                </Link>
              </div>
            </div>
            {/* Visual Block */}
            <div className="h-64 lg:h-auto bg-alx-primary-fixed flex items-center justify-center p-12 relative">
              <div className="relative text-center space-y-2">
                <NewspaperIcon className="h-12 w-12 mx-auto text-alx-primary" />
                <h3 className="font-headline font-extrabold text-alx-on-primary-fixed text-lg tracking-tight">
                  SiteFlow Operations
                </h3>
                <p className="font-uilabel text-[10px] text-alx-on-primary-fixed/70 uppercase tracking-widest">
                  Enterprise Builders Toolkit
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Grid List of Remaining Posts */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <h3 className="font-headline text-lg font-extrabold text-alx-on-surface mb-6 pb-3 border-b border-alx-outline-variant/15">
          All Articles
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {remainingPosts.map((post, idx) => (
            <article
              key={idx}
              className="rounded-2xl bg-alx-surface-container-lowest p-6 flex flex-col justify-between shadow-xl shadow-alx-on-surface/5 alx-hover-lift transition-all group"
            >
              <div className="space-y-4">
                <div className="font-uilabel text-[10px] text-alx-on-surface-variant font-semibold uppercase tracking-wider">
                  {new Date(post.publishDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <h4 className="font-headline text-base font-extrabold text-alx-on-surface group-hover:text-alx-primary transition-all line-clamp-2 leading-snug">
                  <Link href={`/blog/${post.slug}`} className="cursor-pointer">
                    {post.title}
                  </Link>
                </h4>
                <p className="font-body text-alx-on-surface-variant text-xs leading-relaxed line-clamp-3">
                  {post.metaDescription}
                </p>
              </div>
              <div className="pt-4 mt-6 border-t border-alx-outline-variant/15 flex items-center justify-between">
                <span className="font-uilabel text-[10px] text-alx-on-surface-variant">By {post.author}</span>
                <Link
                  href={`/blog/${post.slug}`}
                  className="font-uilabel text-xs font-bold text-alx-primary hover:text-alx-on-surface transition-all cursor-pointer"
                >
                  Read →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
