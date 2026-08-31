import React from "react";
import type { ComparisonVerdict } from "@/lib/comparisonTypes";
import ProductIcon from "@/components/marketing/product/icons";

/**
 * One side of the verdict panel: badge + tagline + checklist points only.
 * Deliberately carries no numeric score (see comparisonTypes.ts). The
 * highlighted (SiteFlow) card gets a top accent bar and a filled badge; the
 * competitor card stays neutral.
 */
function VerdictCard({ verdict }: { verdict: ComparisonVerdict }) {
  return (
    <div
      className={`flex-1 p-6 md:p-8 flex flex-col relative ${
        verdict.highlighted ? "bg-alx-primary-fixed/15" : ""
      }`}
    >
      {verdict.highlighted && (
        <div className="absolute top-0 left-0 w-full h-1 alx-bg-gradient-primary" aria-hidden="true" />
      )}
      <div className="flex items-start justify-between gap-3 mb-5">
        <span className="font-headline text-lg md:text-xl font-bold text-alx-on-surface">{verdict.name}</span>
        <span
          className={`alx-label text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider whitespace-nowrap ${
            verdict.highlighted
              ? "bg-alx-primary text-alx-on-primary"
              : "bg-alx-surface-container-high text-alx-on-surface-variant"
          }`}
        >
          {verdict.badge}
        </span>
      </div>
      <p className="font-body text-sm md:text-base text-alx-on-surface-variant leading-relaxed mb-6">
        {verdict.tagline}
      </p>
      <ul className="space-y-3 mt-auto pt-2">
        {verdict.points.map((point, idx) => (
          <li key={idx} className="flex items-start gap-3 text-sm text-alx-on-surface leading-relaxed">
            <ProductIcon
              name="checkCircle"
              className={`h-[18px] w-[18px] mt-0.5 shrink-0 ${
                verdict.highlighted ? "text-alx-primary" : "text-alx-on-surface-variant"
              }`}
            />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Two side-by-side verdict cards (SiteFlow highlighted + competitor), the
 * component-driven replacement for the stitch design's scorecard band. No
 * numeric score anywhere, per founder directive: badge, tagline, and
 * checklist points communicate the verdict instead.
 */
export default function VerdictCards({ verdict }: { verdict: ComparisonVerdict[] }) {
  return (
    <div className="rounded-2xl border border-alx-outline-variant/30 bg-alx-surface-container-lowest overflow-hidden flex flex-col md:flex-row lg:flex-col divide-y md:divide-y-0 md:divide-x lg:divide-x-0 lg:divide-y divide-alx-outline-variant/25">
      {verdict.map((v, idx) => (
        <VerdictCard key={idx} verdict={v} />
      ))}
    </div>
  );
}
