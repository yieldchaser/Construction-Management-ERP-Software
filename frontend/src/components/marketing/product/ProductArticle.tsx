import React from "react";
import Link from "next/link";
import type { StructuredProduct } from "@/lib/productTypes";
import ProductHero from "./ProductHero";
import StatStrip from "./StatStrip";
import FeatureBlock from "./FeatureBlock";
import DataTable from "./DataTable";
import FaqAccordion from "./FaqAccordion";
import CtaBand from "./CtaBand";

/**
 * Composes the full component-driven product page: breadcrumb -> hero ->
 * stat strip -> intro -> optional personas -> alternating feature blocks ->
 * data table -> FAQ -> closing CTA. Rendered inside <MarketingShell> by
 * app/products/[slug]/page.tsx whenever the loaded article carries a
 * `structured` block.
 */
export default function ProductArticle({
  structured,
  title,
  breadcrumbLabel = "Products",
  breadcrumbHref = "/products",
}: {
  structured: StructuredProduct;
  title: string;
  /** Breadcrumb ancestor label. Defaults to "Products" for the /products route. */
  breadcrumbLabel?: string;
  /** Breadcrumb ancestor href. Defaults to "/products" for the /products route. */
  breadcrumbHref?: string;
}) {
  const { hero, stats, intro, personas, features, dataTable, faqs, cta } = structured;

  return (
    <>
      {/* Breadcrumb + Hero */}
      <section className="relative px-6 pt-6 pb-16 overflow-hidden alx-scroll-fade is-visible">
        <div className="absolute inset-0 z-0 alx-hero-wash pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex items-center gap-2 text-xs text-alx-on-surface-variant mb-8">
            <Link href="/" className="hover:text-alx-primary transition-all">
              Home
            </Link>
            <span>/</span>
            <Link href={breadcrumbHref} className="hover:text-alx-primary transition-all">
              {breadcrumbLabel}
            </Link>
            <span>/</span>
            <span className="text-alx-on-surface-variant truncate max-w-[300px]">{title}</span>
          </div>
          <ProductHero hero={hero} />
        </div>
      </section>

      {/* Stat strip */}
      {stats.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 pb-16 alx-scroll-fade">
          <StatStrip stats={stats} />
        </section>
      )}

      {/* Intro */}
      {intro && (
        <section className="max-w-3xl mx-auto px-6 pb-14 text-center space-y-4 alx-scroll-fade">
          <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-alx-on-surface leading-tight">
            {intro.heading}
          </h2>
          <p className="font-body text-alx-on-surface-variant text-sm md:text-base leading-relaxed">{intro.body}</p>
        </section>
      )}

      {/* Personas (optional) */}
      {personas && personas.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 pb-20 alx-scroll-fade">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {personas.map((persona, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-alx-outline-variant/25 bg-alx-surface-container-lowest p-6 space-y-3 alx-hover-lift"
              >
                <span className="font-headline text-2xl font-extrabold text-alx-primary/40">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <h3 className="font-headline text-lg font-bold text-alx-on-surface">{persona.title}</h3>
                <p className="font-body text-sm text-alx-on-surface-variant leading-relaxed">{persona.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Feature blocks */}
      {features.length > 0 && (
        <section id="features" className="bg-alx-surface-container-low/60 py-20 px-6 alx-scroll-fade">
          <div className="max-w-6xl mx-auto space-y-20">
            {features.map((feature, idx) => (
              <FeatureBlock key={idx} feature={feature} reverse={idx % 2 === 1} />
            ))}
          </div>
        </section>
      )}

      {/* Data table */}
      <section className="max-w-6xl mx-auto px-6 py-20 alx-scroll-fade">
        <DataTable table={dataTable} />
      </section>

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="max-w-3xl mx-auto px-6 pb-20 alx-scroll-fade">
          <div className="text-center space-y-3 mb-8">
            <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-alx-on-surface leading-tight">
              FAQs
            </h2>
            <p className="font-body text-alx-on-surface-variant text-sm md:text-base">
              Answers to common questions about SiteFlow ERP.
            </p>
          </div>
          <FaqAccordion faqs={faqs} />
        </section>
      )}

      {/* Closing CTA */}
      <section className="px-6 pb-28 alx-scroll-fade">
        <div className="max-w-4xl mx-auto">
          <CtaBand cta={cta} />
        </div>
      </section>
    </>
  );
}
