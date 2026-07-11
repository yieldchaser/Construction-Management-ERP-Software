// Server-safe list of calculator slugs (no "use client"), so the resources
// route can decide which pages get an interactive React calculator.
export const CALCULATOR_SLUGS = [
  "paint-quantity-calculator",
  "brick-calculator-for-wall",
  "concrete-volume-calculator",
  "concrete-mix-calculator",
  "steel-calculator-for-construction",
  "bar-bending-schedule-calculator",
  "house-construction-cost-calculator",
] as const;

export function isCalculatorSlug(slug: string): boolean {
  const key = slug.split("/").pop() || "";
  return (CALCULATOR_SLUGS as readonly string[]).includes(key);
}
