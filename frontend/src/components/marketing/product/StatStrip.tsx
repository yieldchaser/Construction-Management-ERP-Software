import React from "react";
import type { ProductStat } from "@/lib/productTypes";

/**
 * 3-column qualitative value-prop strip with hairline dividers, matching the
 * stitch metrics band but with the invented percentages replaced by
 * qualitative phrases (see ProductStat.value in src/lib/productTypes.ts).
 */
export default function StatStrip({ stats }: { stats: ProductStat[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-alx-outline-variant/25 border-y border-alx-outline-variant/25">
      {stats.map((stat, idx) => (
        <div key={idx} className="px-2 md:px-8 py-8 space-y-2 text-center md:text-left">
          <p className="font-headline text-xl md:text-2xl font-extrabold text-alx-primary leading-snug">
            {stat.value}
          </p>
          <p className="alx-label text-[11px] text-alx-on-surface">{stat.caption}</p>
          {stat.description && (
            <p className="font-body text-sm text-alx-on-surface-variant leading-relaxed">{stat.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}
