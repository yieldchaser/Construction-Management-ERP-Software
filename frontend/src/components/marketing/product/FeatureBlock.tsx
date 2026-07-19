import React from "react";
import type { ProductFeature } from "@/lib/productTypes";
import ProductIcon, { ProductIconName } from "./icons";
import MiniUI from "./MiniUI";

const DEFAULT_ICON: ProductIconName = "resources";

/**
 * Two-column feature row: text (icon chip, headline, body, bullets) on one
 * side, a MiniUI mock card on the other. `reverse` swaps which side the
 * MiniUI card sits on, so a list of features can alternate left/right.
 */
export default function FeatureBlock({
  feature,
  reverse = false,
}: {
  feature: ProductFeature;
  reverse?: boolean;
}) {
  const iconName = (feature.icon as ProductIconName) ?? DEFAULT_ICON;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
      <div className={`space-y-4 ${reverse ? "lg:order-2" : ""}`}>
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-alx-primary-fixed text-alx-primary">
          <ProductIcon name={iconName} className="h-6 w-6" />
        </div>
        <h3 className="font-headline text-2xl md:text-3xl font-extrabold text-alx-on-surface leading-tight">
          {feature.title}
        </h3>
        <p className="font-body text-alx-on-surface-variant text-sm md:text-base leading-relaxed">{feature.body}</p>
        {feature.bullets.length > 0 && (
          <ul className="space-y-2.5 pt-1">
            {feature.bullets.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm text-alx-on-surface-variant">
                <ProductIcon name="arrowRight" className="h-[18px] w-[18px] mt-0.5 shrink-0 text-alx-primary" />
                {bullet}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={reverse ? "lg:order-1" : ""}>
        <MiniUI mock={feature.mock} />
      </div>
    </div>
  );
}
