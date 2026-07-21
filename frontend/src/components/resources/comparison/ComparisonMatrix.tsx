import React from "react";
import type { ComparisonMatrixData, ComparisonCellValue } from "@/lib/comparisonTypes";
import ProductIcon from "@/components/marketing/product/icons";

/**
 * Renders a single matrix cell. Two exact sentinels get bespoke treatment:
 * "check" -> filled check icon, "dash" -> muted en dash "not available". A "chip:Label"
 * value renders as a small pill (e.g. "chip:Native ERP"). Everything else
 * renders as plain text, matching the stitch design's "Manual Mapping" /
 * "Requires Add-on" style descriptive cells.
 */
function MatrixCell({ value, emphasis }: { value: ComparisonCellValue; emphasis: boolean }) {
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();

  if (lower === "check") {
    return (
      <span className="inline-flex items-center justify-center">
        <ProductIcon
          name="checkCircle"
          className={`h-5 w-5 ${emphasis ? "text-alx-primary" : "text-alx-on-surface-variant"}`}
        />
      </span>
    );
  }

  if (lower === "dash") {
    return (
      <span
        className="text-alx-outline-variant text-base font-bold select-none"
        aria-label="Not available"
      >
        &ndash;
      </span>
    );
  }

  if (trimmed.toLowerCase().startsWith("chip:")) {
    const label = trimmed.slice(trimmed.indexOf(":") + 1).trim();
    return (
      <span className="inline-flex items-center rounded-full bg-alx-primary-fixed px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-alx-primary whitespace-nowrap">
        {label}
      </span>
    );
  }

  return (
    <span className={`text-sm leading-snug ${emphasis ? "text-alx-on-surface font-medium" : "text-alx-on-surface-variant"}`}>
      {trimmed}
    </span>
  );
}

/**
 * Grouped module-based comparison table: an uppercase group divider row
 * followed by capability rows, each rendering SiteFlow vs the competitor.
 * Horizontally scrollable on narrow viewports so the three columns never
 * get crushed.
 */
export default function ComparisonMatrix({
  matrix,
  competitorName,
}: {
  matrix: ComparisonMatrixData;
  competitorName: string;
}) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-alx-outline-variant/40 bg-alx-surface-container-lowest shadow-lg shadow-alx-on-surface/5">
      <table className="w-full min-w-[720px] text-left border-collapse">
        <thead>
          <tr className="border-b border-alx-outline-variant/40">
            <th className="p-5 text-center alx-label text-[11px] text-alx-on-surface font-bold w-1/3 border-r border-alx-outline-variant/20">
              Capability
            </th>
            <th className="p-5 text-center alx-label text-[11px] text-alx-primary font-bold w-1/3 border-r border-alx-outline-variant/20">
              SiteFlow
            </th>
            <th className="p-5 text-center alx-label text-[11px] text-alx-on-surface font-bold w-1/3">
              {competitorName}
            </th>
          </tr>
        </thead>
        <tbody className="font-body text-sm">
          {matrix.groups.map((group, gIdx) => (
            <React.Fragment key={gIdx}>
              <tr className="bg-alx-surface-container-low border-b border-alx-outline-variant/30">
                <td
                  colSpan={3}
                  className="py-3 px-6 text-center alx-label text-[11px] font-bold text-alx-on-surface-variant uppercase tracking-wider"
                >
                  {group.label}
                </td>
              </tr>
              {group.rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="border-b border-alx-outline-variant/20 last:border-0 hover:bg-alx-surface-container-low/60 transition-colors"
                >
                  <td className="p-4 px-6 font-medium text-alx-on-surface border-r border-alx-outline-variant/20">
                    {row.capability}
                  </td>
                  <td className="p-4 px-6 text-center border-r border-alx-outline-variant/20">
                    <MatrixCell value={row.siteflow} emphasis />
                  </td>
                  <td className="p-4 px-6 text-center">
                    <MatrixCell value={row.competitor} emphasis={false} />
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
