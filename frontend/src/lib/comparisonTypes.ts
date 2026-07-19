import type { ProductFaq, ProductCta, MiniUIData } from "./productTypes";

/**
 * Structured feature-comparison page shape. Optional and additive:
 * `ContentItem.comparisonStructured` (see src/lib/content.ts) is only present
 * on `resources/feature-comparisons` items that have been migrated to the
 * component-driven template (src/components/resources/comparison/). All
 * other comparisons keep rendering the legacy `body` HTML blob through
 * ComparisonProse untouched.
 *
 * Hard rule: nothing in this shape carries an invented numeric score. The
 * verdict cards communicate positioning through a badge, a short tagline,
 * and real checklist points only, never a "9.1 / 10" style score.
 */

export interface ComparisonHero {
  eyebrow: string;
  headline: string;
  subhead: string;
  chips: string[];
}

export interface ComparisonVerdict {
  name: string;
  badge: string;
  tagline: string;
  points: string[];
  highlighted: boolean;
}

/** One side of the "Two Different Approaches" band: descriptive copy plus an optional MiniUI mock console. */
export interface ComparisonApproach {
  label: string;
  title: string;
  body: string;
  bullets: string[];
  /** Reuses the same MiniUI mock console library as the product template. Omit for a plain text-only side. */
  mock?: MiniUIData;
}

/** The "What is X" supporting callout card rendered beneath each approach (real "best suited for" / "important considerations" copy only). */
export interface ComparisonWhatIs {
  name: string;
  body: string;
  bullets: string[];
}

/**
 * A matrix cell value. Plain text renders as-is. Two exact sentinels get
 * bespoke rendering in ComparisonMatrix: "check" (a filled check icon) and
 * "dash" (a muted en dash for "not available"). A value prefixed "chip:"
 * (e.g. "chip:Native ERP") renders as a small pill, matching the stitch
 * design's "Native ERP" badge cells.
 */
export type ComparisonCellValue = string;

export interface ComparisonMatrixRow {
  capability: string;
  siteflow: ComparisonCellValue;
  competitor: ComparisonCellValue;
}

export interface ComparisonMatrixGroup {
  /** Rendered as an uppercase group divider row, e.g. "PROJECT PLANNING & SCHEDULING". */
  label: string;
  rows: ComparisonMatrixRow[];
}

export interface ComparisonMatrixData {
  groups: ComparisonMatrixGroup[];
}

export interface StructuredComparison {
  hero: ComparisonHero;
  /** Always exactly two entries: SiteFlow first, then the competitor. */
  verdict: ComparisonVerdict[];
  approaches: ComparisonApproach[];
  /** Always exactly two entries: SiteFlow first, then the competitor. */
  whatIs: ComparisonWhatIs[];
  matrix: ComparisonMatrixData;
  faqs: ProductFaq[];
  cta: ProductCta;
}
