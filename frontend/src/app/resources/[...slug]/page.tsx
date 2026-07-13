import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getContentItemBySlug, getContentItems } from "@/lib/content";
import { Metadata } from "next";
import CalculatorTools from "@/components/resources/CalculatorTools";
import CalcProse from "@/components/resources/CalcProse";
import ComparisonProse from "@/components/resources/ComparisonProse";
import ResourceIndexProse from "@/components/resources/ResourceIndexProse";
import { isCalculatorSlug } from "@/components/resources/calculatorSlugs";

interface RouteParams {
  params: Promise<{
    slug: string[];
  }>;
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  const slugPath = slug.join("/");
  let article = await getContentItemBySlug("resources", slugPath);
  if (!article && slug.length === 1) {
    article = await getContentItemBySlug("resources", `${slugPath}/${slugPath}`);
  }

  if (!article) return { title: "Resources Not Found - SiteFlow" };

  return {
    title: `${article.title} - SiteFlow Resources`,
    description: article.metaDescription,
    alternates: {
      canonical: `https://siteflow.com/resources/${slugPath}`,
    },
  };
}

export default async function ResourcePage({ params }: RouteParams) {
  const { slug } = await params;
  const slugPath = slug.join("/");
  let article = await getContentItemBySlug("resources", slugPath);
  
  if (!article && slug.length === 1) {
    article = await getContentItemBySlug("resources", `${slugPath}/${slugPath}`);
  }

  if (!article) {
    notFound();
  }

  const allResources = await getContentItems("resources");
  const relatedResources = allResources.filter(
    (r) => r.slug !== slugPath && r.slug.startsWith(slug[0])
  );

  const isCalc = isCalculatorSlug(slugPath);
  const isComparison = slugPath.startsWith("feature-comparisons/");
  const isResourceIndex =
    slugPath === "construction-calculators" ||
    slugPath === "construction-terms-meanings";
  const hasBody = !!article.body && article.body.trim().length > 20;

  if (isComparison) {
    return (
      <div className="min-h-screen bg-background text-foreground pb-12 relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] h-[40vw] w-[40vw] rounded-full bg-primary opacity-5 blur-[120px]" />
        </div>

        {/* Header */}
        <header className="sticky top-0 z-50 bg-card border-b border-border-custom px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary font-sans font-bold text-white shadow-md">
              S
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              Site<span className="text-primary">Flow</span> Resources
            </span>
          </Link>
          <Link
            href="/resources/feature-comparisons"
            className="text-sm font-semibold text-muted hover:text-foreground transition-all"
          >
            All comparisons
          </Link>
        </header>

        <main className="relative">
          {hasBody ? (
            <ComparisonProse html={article.body} />
          ) : (
            <div className="comparison-fallback px-6">
              <span className="inline-block text-xs font-semibold text-primary px-2.5 py-1 rounded bg-primary/10 uppercase tracking-wider">
                Software comparison
              </span>
              <h1 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                {article.title}
              </h1>
              <p className="mt-4 text-muted leading-relaxed">
                {article.metaDescription ||
                  "See how SiteFlow compares and why execution-first construction teams choose it."}
              </p>
              <div className="mt-8 flex justify-center gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center bg-primary text-white font-bold px-6 py-3 rounded-lg shadow-md hover:opacity-90 transition"
                >
                  Book a Free Demo
                </Link>
                <Link
                  href="/resources/feature-comparisons"
                  className="inline-flex items-center justify-center border border-border-custom text-foreground font-bold px-6 py-3 rounded-lg hover:border-primary transition"
                >
                  View all comparisons
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-12 relative">
      {/* Background Glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] h-[40vw] w-[40vw] rounded-full bg-primary opacity-5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[40vw] w-[40vw] rounded-full bg-primary opacity-5 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border border-border-custom rounded-lg border-b border-border-custom px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary font-sans font-bold text-white shadow-md">
            S
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            Site<span className="text-primary">Flow</span> Resources
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-4 whitespace-nowrap">
          <Link
            href="/help"
            className="text-sm font-semibold text-muted hover:text-foreground transition-all"
          >
            Help Center
          </Link>
          <span className="text-border-custom">|</span>
          <Link
            href="/blog"
            className="text-sm font-semibold text-muted hover:text-foreground transition-all"
          >
            Blog
          </Link>
        </div>
      </header>

      {/* Content Area */}
      <div className="max-w-6xl mx-auto px-6 pt-12 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Body */}
          <main className="lg:col-span-3 space-y-8">
            {isCalc ? (
              <>
                <CalculatorTools slug={slugPath} />
                <div className="bg-card border border-border-custom rounded-lg shadow-sm rounded-md p-8 md:p-12 border border-border-custom">
                  <CalcProse html={article.body} />
                </div>
              </>
            ) : (
              <div className="bg-card border border-border-custom rounded-lg shadow-sm rounded-md p-8 md:p-12 border border-border-custom space-y-6">
                <div className="space-y-4 border-b border-border-custom pb-6">
                  <span className="inline-block text-xs font-semibold text-primary px-2.5 py-1 rounded bg-primary/10 uppercase tracking-wider">
                    Platform resources
                  </span>
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                    {article.title}
                  </h1>
                </div>

                {/* Render html body safely */}
                {isResourceIndex ? (
                  <ResourceIndexProse html={article.body} />
                ) : (
                  <div
                    className="help-article"
                    dangerouslySetInnerHTML={{ __html: article.body }}
                  />
                )}
              </div>
            )}
          </main>

          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            {relatedResources.length > 0 && (
              <div className="bg-card border border-border-custom rounded-lg rounded-lg p-5 border border-border-custom space-y-4">
                <h3 className="text-xs font-bold text-muted uppercase tracking-widest border-b border-border-custom pb-2">
                  Related Resources
                </h3>
                <div className="space-y-3">
                  {relatedResources.map((r, idx) => (
                    <Link
                      key={idx}
                      href={`/resources/${r.slug}`}
                      className="block text-xs text-muted hover:text-primary transition-all truncate cursor-pointer"
                    >
                      🛠️ {r.title}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
