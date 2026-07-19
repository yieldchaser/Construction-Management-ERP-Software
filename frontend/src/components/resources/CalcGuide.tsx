import React from "react";
import type { CalcGuideStep } from "@/lib/calcTypes";
import ProductIcon from "@/components/marketing/product/icons";

/**
 * Tasteful in-code placeholder for a guide step illustration. Renders
 * whenever step.imageSlot is null (the common case until real diagrams
 * exist), never a broken <img>.
 */
function GuideImagePlaceholder() {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-alx-outline-variant/40 bg-alx-surface-container-lowest p-10 text-center shadow-sm">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-alx-primary-fixed text-alx-primary">
        <ProductIcon name="architecture" className="h-6 w-6" />
      </span>
      <p className="alx-label text-[11px] text-alx-on-surface-variant">Illustration coming soon</p>
      <div className="flex gap-1.5">
        <span className="h-1.5 w-8 rounded-full bg-alx-outline-variant/50" />
        <span className="h-1.5 w-5 rounded-full bg-alx-outline-variant/50" />
        <span className="h-1.5 w-8 rounded-full bg-alx-outline-variant/50" />
      </div>
    </div>
  );
}

/**
 * Numbered, alternating-side "how to use this calculator" guide, matching
 * the stitch layout: step number + heading + body on one side, an
 * illustration slot (real image or placeholder) on the other, flipping
 * sides every row.
 */
export default function CalcGuide({ steps }: { steps: CalcGuideStep[] }) {
  return (
    <div className="space-y-14">
      {steps.map((step, idx) => (
        <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className={`space-y-3 ${idx % 2 === 1 ? "md:order-2" : ""}`}>
            <span className="font-headline inline-flex h-9 w-9 items-center justify-center rounded-full bg-alx-primary text-sm font-bold text-alx-on-primary">
              {idx + 1}
            </span>
            <h3 className="font-headline text-xl md:text-2xl font-extrabold text-alx-on-surface leading-tight">
              {step.title}
            </h3>
            <p className="font-body text-sm md:text-base text-alx-on-surface-variant leading-relaxed">
              {step.body}
            </p>
          </div>
          <div className={idx % 2 === 1 ? "md:order-1" : ""}>
            {step.imageSlot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={step.imageSlot}
                alt={step.title}
                className="w-full h-auto rounded-xl border border-alx-outline-variant/40 shadow-sm object-cover"
              />
            ) : (
              <GuideImagePlaceholder />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
