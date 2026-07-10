// Shared unit-of-measurement list for Indian construction. Used by any form
// that captures a material/line-item unit (Transaction line items, BOQ line
// items, Material master, Library Material/Rate presets) so the value is
// consistent across the app instead of being free-typed per form.
//
// Abbreviations: cft = cubic feet, cum = cubic meter, MT = metric ton,
// sqft = square feet, sqm = square meter.
export const UNITS: string[] = [
  "Barrel",
  "Brass",
  "Bag",
  "Box",
  "cft",
  "cum",
  "Dozen",
  "Gallon",
  "kg",
  "Kilometer",
  "Liter",
  "Meter",
  "MT",
  "Nos",
  "Pair",
  "Quintal",
  "Roll",
  "Set",
  "sqft",
  "sqm",
  "tonne",
  "Trip",
];
