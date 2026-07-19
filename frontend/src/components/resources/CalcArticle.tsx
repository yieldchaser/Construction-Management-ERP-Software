import React from "react";
import Link from "next/link";
import type { StructuredCalculator } from "@/lib/calcTypes";
import CalculatorTools from "./CalculatorTools";
import StatStrip from "@/components/marketing/product/StatStrip";
import DataTable from "@/components/marketing/product/DataTable";
import FaqAccordion from "@/components/marketing/product/FaqAccordion";
import CtaBand from "@/components/marketing/product/CtaBand";
import CalcGuide from "./CalcGuide";

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
 * Composes the full component-driven calculator page: breadcrumb -> hero
 * (serif H1/subhead left, live console right, mirroring the stitch
 * "Calculator Console" layout) -> formula/factor strip -> numbered guide ->
 * reference table -> FAQ -> closing CTA. Rendered inside <MarketingShell> by
 * app/resources/[...slug]/page.tsx whenever the loaded calculator resource
 * carries a `calcStructured` block.
 */
export default function CalcArticle({
  structured,
  title,
  subtitle,
  slug,
  trail,
}: {
  structured: StructuredCalculator;
  title: string;
  subtitle?: string;
  slug: string;
  trail: BreadcrumbItem[];
}) {
  return (
    <>
      {/* Breadcrumb + Hero: title/subhead left, calculator console right */}
      <section className="relative px-6 pt-6 pb-16 overflow-hidden alx-scroll-fade is-visible">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-alx-primary-fixed/25 via-alx-surface-container-lowest to-alx-surface-container-lowest pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10 space-y-8">
          <Breadcrumb trail={trail} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div className="space-y-4 lg:pt-4">
              <span className="alx-label inline-block text-xs font-bold text-alx-primary px-2.5 py-1 rounded-md bg-alx-primary-fixed/40">
                Free construction tool
              </span>
              <h1 className="font-headline text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-alx-on-surface leading-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="font-body text-alx-on-surface-variant text-base md:text-lg max-w-xl leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
            <div className="alx-hover-lift">
              <CalculatorTools slug={slug} />
            </div>
          </div>
        </div>
      </section>

      {/* Formula / factor strip */}
      {structured.formulaStrip.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 pb-16 alx-scroll-fade">
          <StatStrip stats={structured.formulaStrip} />
        </section>
      )}

      {/* Guide */}
      {structured.guide.length > 0 && (
        <section className="bg-alx-surface-container-low/60 py-20 px-6 alx-scroll-fade">
          <div className="max-w-6xl mx-auto space-y-16">
            <div className="max-w-2xl mx-auto text-center space-y-3">
              <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-alx-on-surface leading-tight">
                Guide to using this calculator
              </h2>
              <p className="font-body text-alx-on-surface-variant text-sm md:text-base leading-relaxed">
                Step-by-step instructions for precise material estimation.
              </p>
            </div>
            <CalcGuide steps={structured.guide} />
          </div>
        </section>
      )}

      {/* Reference table */}
      <section className="max-w-6xl mx-auto px-6 py-20 alx-scroll-fade">
        <DataTable table={structured.referenceTable} />
      </section>

      {/* FAQ */}
      {structured.faqs.length > 0 && (
        <section className="max-w-3xl mx-auto px-6 pb-20 alx-scroll-fade">
          <div className="text-center space-y-3 mb-8">
            <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-alx-on-surface leading-tight">
              FAQs
            </h2>
            <p className="font-body text-alx-on-surface-variant text-sm md:text-base">
              Common questions about this calculator.
            </p>
          </div>
          <FaqAccordion faqs={structured.faqs} />
        </section>
      )}

      {/* Closing CTA */}
      <section className="px-6 pb-28 alx-scroll-fade">
        <div className="max-w-4xl mx-auto">
          <CtaBand cta={structured.cta} />
        </div>
      </section>
    </>
  );
}
