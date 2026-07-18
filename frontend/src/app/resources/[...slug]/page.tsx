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
import MarketingShell from "@/components/marketing/MarketingShell";

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
      <MarketingShell>
        <div className="max-w-6xl mx-auto px-6 pt-4 pb-2">
          <Link
            href="/resources/feature-comparisons"
            className="text-sm font-semibold text-alx-on-surface-variant hover:text-alx-primary transition-all"
          >
            All comparisons
          </Link>
        </div>

        <main className="relative">
          {hasBody ? (
            <ComparisonProse html={article.body} />
          ) : (
            <div className="comparison-fallback px-6">
              <span className="alx-label inline-block text-xs font-semibold text-alx-primary px-2.5 py-1 rounded bg-alx-primary-fixed/40">
                Software comparison
              </span>
              <h1 className="font-headline mt-4 text-3xl md:text-4xl font-extrabold tracking-tight text-alx-on-surface">
                {article.title}
              </h1>
              <p className="mt-4 text-alx-on-surface-variant leading-relaxed">
                {article.metaDescription ||
                  "See how SiteFlow compares and why execution-first construction teams choose it."}
              </p>
              <div className="mt-8 flex justify-center gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center bg-alx-primary text-alx-on-primary font-bold px-6 py-3 rounded-lg shadow-md hover:opacity-90 transition"
                >
                  Book a Free Demo
                </Link>
                <Link
                  href="/resources/feature-comparisons"
                  className="inline-flex items-center justify-center border border-alx-outline-variant text-alx-on-surface font-bold px-6 py-3 rounded-lg hover:border-alx-primary transition"
                >
                  View all comparisons
                </Link>
              </div>
            </div>
          )}
        </main>
      </MarketingShell>
    );
  }

  return (
    <MarketingShell>
      <div className="max-w-6xl mx-auto px-6 pt-4 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Body */}
          <main className="lg:col-span-3 space-y-8">
            {isCalc ? (
              <>
                <CalculatorTools slug={slugPath} />
                <div className="bg-alx-surface-container-lowest border border-alx-outline-variant rounded-lg shadow-sm p-8 md:p-12">
                  <CalcProse html={article.body} />
                </div>
              </>
            ) : (
              <div className="bg-alx-surface-container-lowest border border-alx-outline-variant rounded-lg shadow-sm p-8 md:p-12 space-y-6">
                <div className="space-y-4 border-b border-alx-outline-variant pb-6">
                  <span className="alx-label inline-block text-xs font-semibold text-alx-primary px-2.5 py-1 rounded bg-alx-primary-fixed/40">
                    Platform resources
                  </span>
                  <h1 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tight text-alx-on-surface leading-tight">
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
              <div className="bg-alx-surface-container-lowest border border-alx-outline-variant rounded-lg p-5 space-y-4">
                <h3 className="alx-label text-xs font-bold text-alx-on-surface-variant border-b border-alx-outline-variant pb-2">
                  Related Resources
                </h3>
                <div className="space-y-3">
                  {relatedResources.map((r, idx) => (
                    <Link
                      key={idx}
                      href={`/resources/${r.slug}`}
                      className="block text-xs text-alx-on-surface-variant hover:text-alx-primary transition-all truncate cursor-pointer"
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
    </MarketingShell>
  );
}
