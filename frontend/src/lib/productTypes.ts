/**
 * Structured product page shape. Optional and additive: `ContentItem.structured`
 * (see src/lib/content.ts) is only present on products that have been migrated
 * to the component-driven template (src/components/marketing/product/). All
 * other products keep rendering the legacy `body` HTML blob untouched.
 *
 * Every mock.type in MiniUIMockType must be handled by MiniUI's switch. New
 * mock types can be added here as new product pages need richer widgets; the
 * switch renders a tasteful generic placeholder for anything not yet given a
 * bespoke implementation.
 */

export type MiniUITone = "primary" | "gold" | "neutral" | "error";

export type MiniUIMockType =
  | "statusList"
  | "checklist"
  | "ticket"
  | "progressBars"
  | "lineChart"
  | "ganttBars"
  | "dependencyGraph"
  | "ledgerRow";

/** A single row inside a "statusList" mini UI card. */
export interface MiniUIStatusRow {
  label: string;
  /** Optional secondary line under the label (e.g. "78% Complete"). */
  meta?: string;
  /** Status text shown as a pill, e.g. "Verified", "Processing". */
  status?: string;
  tone?: MiniUITone;
  /** 0-100. When present the row renders a progress bar instead of a pill. */
  progress?: number;
}

/** A single row inside a "progressBars" mini UI card. */
export interface MiniUIProgressRow {
  label: string;
  /** 0-100. */
  progress: number;
}

export interface MiniUIData {
  type: MiniUIMockType;
  /** Card header, e.g. "Execution Console". */
  title?: string;
  /** Used by statusList. */
  rows?: MiniUIStatusRow[];
  /** Used by checklist and progressBars (checklist reads item strings only). */
  items?: string[];
  /** Used by progressBars. */
  progressRows?: MiniUIProgressRow[];
}

export interface ProductFeature {
  /** Icon key understood by ProductIcon in components/marketing/product/icons.tsx. */
  icon?: string;
  title: string;
  body: string;
  bullets: string[];
  mock: MiniUIData;
}

export interface ProductStat {
  /** A qualitative value-prop phrase. Never an invented %, currency, or multiplier. */
  value: string;
  caption: string;
  description?: string;
}

export interface ProductPersona {
  title: string;
  body: string;
}

export interface ProductDataTable {
  title: string;
  subtitle?: string;
  columns: string[];
  /** Illustrative sample rows only, clearly presented as sample data. */
  rows: string[][];
}

export interface ProductFaq {
  q: string;
  a: string;
}

export interface ProductCta {
  heading: string;
  body: string;
}

export interface ProductHeroData {
  eyebrow?: string;
  headline: string;
  subhead: string;
  checklist: string[];
  /** Public path to a real product screenshot. Null renders the in-code MockupFrame placeholder. */
  heroImageSlot: string | null;
}

export interface StructuredProduct {
  hero: ProductHeroData;
  stats: ProductStat[];
  intro?: { heading: string; body: string };
  features: ProductFeature[];
  personas?: ProductPersona[];
  dataTable: ProductDataTable;
  faqs: ProductFaq[];
  cta: ProductCta;
}
