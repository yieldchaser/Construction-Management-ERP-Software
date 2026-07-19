import type { ProductFaq, ProductCta, ProductDataTable } from "./productTypes";

/**
 * Structured construction-calculator page shape. Optional and additive:
 * `ContentItem.calcStructured` (see src/lib/content.ts) is only present on
 * construction-calculator resources that have been migrated to the
 * component-driven light template (src/components/resources/CalcArticle.tsx).
 * All other calculators keep rendering the legacy `body` HTML blob through
 * CalcProse untouched.
 *
 * Shares ProductFaq / ProductCta / ProductDataTable with the products
 * template (src/lib/productTypes.ts) since the shapes are identical and the
 * same FaqAccordion / CtaBand / DataTable components render both.
 */

export interface CalcFormulaStat {
  /** A real engineering constant or factor (e.g. "1.54"). Never an invented marketing %. */
  value: string;
  caption: string;
}

export interface CalcGuideStep {
  title: string;
  body: string;
  /** Public path to a real illustration. Null renders an in-code placeholder, never a broken <img>. */
  imageSlot: string | null;
}

export interface StructuredCalculator {
  formulaStrip: CalcFormulaStat[];
  guide: CalcGuideStep[];
  referenceTable: ProductDataTable;
  faqs: ProductFaq[];
  cta: ProductCta;
}
