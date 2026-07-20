import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getContentItemBySlug, getContentItems } from "@/lib/content";
import { Metadata } from "next";
import CalculatorTools from "@/components/resources/CalculatorTools";
import CalcProse from "@/components/resources/CalcProse";
import CalcArticle from "@/components/resources/CalcArticle";
import ComparisonProse from "@/components/resources/ComparisonProse";
import ComparisonArticle from "@/components/resources/comparison/ComparisonArticle";
import ResourceIndexProse from "@/components/resources/ResourceIndexProse";
import { isCalculatorSlug } from "@/components/resources/calculatorSlugs";
import MarketingShell from "@/components/marketing/MarketingShell";
import ResourceIndexGrid from "@/components/resources/ResourceIndexGrid";

interface RouteParams {
  params: Promise<{
    slug: string[];
  }>;
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

function Breadcrumb({ trail }: { trail: BreadcrumbItem[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-alx-on-surface-variant">
      {trail.map((item, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <span>/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-alx-primary transition-all">
              {item.label}
            </Link>
          ) : (
            <span className="text-alx-on-surface truncate max-w-[240px]">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/**
 * Shared premium reading header: breadcrumb + optional eyebrow/serif H1/subtitle
 * over a subtle radial mesh backdrop. Comparison pages only pass `trail` since
 * ComparisonProse's injected HTML already ships its own hero (eyebrow, H1,
 * scorecards) directly beneath.
 */
function ReadingHero({
  trail,
  eyebrow,
  title,
  subtitle,
}: {
  trail: BreadcrumbItem[];
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}) {
  return (
    <section className="relative px-6 pt-6 pb-10 md:pb-14 overflow-hidden alx-scroll-fade is-visible">
      <div className="absolute inset-0 z-0 alx-hero-wash pointer-events-none" />
      <div className="max-w-4xl mx-auto relative z-10 space-y-4">
        <Breadcrumb trail={trail} />
        {eyebrow && (
          <span className="alx-label inline-block text-xs font-bold text-alx-primary px-2.5 py-1 rounded-md bg-alx-primary-fixed/40">
            {eyebrow}
          </span>
        )}
        {title && (
          <h1 className="font-headline text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-alx-on-surface leading-tight">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="font-body text-alx-on-surface-variant text-base md:text-lg max-w-2xl leading-relaxed pt-1">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}

function resourceSectionMeta(topSlug: string): { label: string; href: string } {
  if (topSlug === "construction-calculators") {
    return { label: "Calculators", href: "/resources/construction-calculators" };
  }
  if (topSlug === "feature-comparisons") {
    return { label: "Comparisons", href: "/resources/feature-comparisons" };
  }
  if (topSlug === "construction-terms-meanings") {
    return { label: "Glossary", href: "/resources/glossary" };
  }
  return { label: "Resources", href: "/resources" };
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
    const trail: BreadcrumbItem[] = [
      { label: "Home", href: "/" },
      { label: "Resources", href: "/resources" },
      { label: "Comparisons", href: "/resources/feature-comparisons" },
      { label: article.title },
    ];

    // Component-driven template: takes over the whole page when the loaded
    // comparison resource carries a `comparisonStructured` block. Falls back
    // to the legacy ComparisonProse body-blob rendering below for every
    // comparison that hasn't been migrated yet.
    if (article.comparisonStructured) {
      return (
        <MarketingShell>
          <ComparisonArticle structured={article.comparisonStructured} trail={trail} />
        </MarketingShell>
      );
    }

    return (
      <MarketingShell>
        <ReadingHero trail={trail} />

        <main className="relative alx-scroll-fade">
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

  // The legacy terms page is superseded by the built /resources/glossary
  // (A-Z, searchable, 200 terms). Send it there instead of serving the old
  // scraped body blob.
  if (slugPath === "construction-terms-meanings") {
    redirect("/resources/glossary");
  }

  // Structured card-grid index pages (replace the legacy body-blob prose).
  const buildIndexCards = (prefix: string) =>
    allResources
      .filter((r) => r.slug.startsWith(`${prefix}/`))
      .map((r) => ({ title: r.title, desc: r.metaDescription || "", href: `/resources/${r.slug}` }));

  if (slugPath === "construction-calculators") {
    return (
      <MarketingShell>
        <ResourceIndexGrid
          trail={[{ label: "Home", href: "/" }, { label: "Resources", href: "/resources" }, { label: "Calculators" }]}
          eyebrow="Free construction tools"
          title="Construction Calculators"
          subtitle="IS-code-based calculators for concrete, steel, brick, paint and more. Estimate quantities and costs in seconds, then bring the numbers into your projects."
          cards={buildIndexCards("construction-calculators")}
          icon="chart"
          cta={{
            heading: "Bring these numbers into one workspace",
            body: "SiteFlow links material estimates to BOQs, budgets and procurement so your quantities flow straight into execution.",
          }}
        />
      </MarketingShell>
    );
  }

  if (slugPath === "feature-comparisons") {
    return (
      <MarketingShell>
        <ResourceIndexGrid
          trail={[{ label: "Home", href: "/" }, { label: "Resources", href: "/resources" }, { label: "Comparisons" }]}
          eyebrow="Platform comparisons"
          title="SiteFlow vs the alternatives"
          subtitle="Honest, module-by-module comparisons of SiteFlow against other construction and ERP platforms, so you can choose the right fit for how your team actually works."
          cards={buildIndexCards("feature-comparisons")}
          icon="nodes"
          cta={{
            heading: "See SiteFlow on your own projects",
            body: "Book a live demo and compare it against your current tools using your real site data.",
          }}
        />
      </MarketingShell>
    );
  }

  const sectionMeta = resourceSectionMeta(slug[0]);
  const trail: BreadcrumbItem[] = [
    { label: "Home", href: "/" },
    { label: "Resources", href: "/resources" },
    { label: sectionMeta.label, href: sectionMeta.href },
    { label: article.title },
  ];

  // Component-driven template: takes over the whole page when the loaded
  // calculator resource carries a `calcStructured` block. Falls back to the
  // legacy CalcProse body-blob rendering below for every calculator that
  // hasn't been migrated yet.
  if (isCalc && article.calcStructured) {
    return (
      <MarketingShell>
        <CalcArticle
          structured={article.calcStructured}
          title={article.title}
          subtitle={article.metaDescription}
          slug={slugPath}
          trail={trail}
        />
      </MarketingShell>
    );
  }

  return (
    <MarketingShell>
      <ReadingHero
        trail={trail}
        eyebrow={isCalc ? "Free construction tool" : "Platform resources"}
        title={article.title}
        subtitle={article.metaDescription}
      />

      <section className="max-w-6xl mx-auto px-6 pb-24 alx-scroll-fade">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-12 lg:gap-16">
          {/* Main Body */}
          <main className="min-w-0 space-y-10">
            {isCalc ? (
              <>
                <CalculatorTools slug={slugPath} />
                <CalcProse html={article.body} />
              </>
            ) : isResourceIndex ? (
              <ResourceIndexProse html={article.body} />
            ) : (
              <div
                className="help-article max-w-none"
                dangerouslySetInnerHTML={{ __html: article.body }}
              />
            )}
          </main>

          {/* Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
            {relatedResources.length > 0 && (
              <div className="rounded-2xl border border-alx-outline-variant/20 bg-alx-surface-container-lowest p-5 space-y-4 alx-hover-lift">
                <h3 className="alx-label text-xs font-bold text-alx-on-surface-variant border-b border-alx-outline-variant/20 pb-2.5">
                  Related Resources
                </h3>
                <div className="space-y-3">
                  {relatedResources.map((r, idx) => (
                    <Link
                      key={idx}
                      href={`/resources/${r.slug}`}
                      className="block text-xs text-alx-on-surface-variant hover:text-alx-primary transition-all truncate cursor-pointer"
                    >
                      {r.title}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <Link
              href="/resources"
              className="inline-flex items-center gap-2 text-xs text-alx-on-surface-variant hover:text-alx-primary transition-all group"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
              Back to resources
            </Link>
          </aside>
        </div>
      </section>
    </MarketingShell>
  );
}
