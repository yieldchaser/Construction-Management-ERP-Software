/**
 * calculators-contract.test.ts  -  fixed-input contract tests for CD-2 (R2-010).
 *
 * One shared module (frontend/src/lib/calc-shared.ts + backend/app/calc_shared.py)
 * is the single source of truth. These tests pin fixed inputs to expected
 * outputs so any drift (e.g. R2-521 steel 162.89 vs 162.0, or paint premium
 * 140 vs 135) fails the suite. Site engineers compute locally on patchy data,
 * no round-trip  -  the contract is the drift prevention.
 *
 * Run:  npx tsc --noEmit  (typecheck)  or  node --loader ts-node/esm tests/calculators-contract.test.ts
 * Also compatible with vitest if installed:  npx vitest run tests/calculators-contract.test.ts
 */

import assert from "node:assert/strict";
import {
  calcSteelBackend,
  calcSteelColumnFrontend,
  calcSlabSteelFrontend,
  calcTwoWaySlabFrontend,
  calcConcreteBackend,
  calcBrickBackend,
  calcPaint,
  calcTile,
  calcPlaster,
  calcWaterproofing,
  calcHouseCost,
  calcBilling,
  calcSplitRate,
  calcRmc,
  steelUnitWeightKgPerM,
  STEEL_DIVISOR,
  CONCRETE_DRY_FACTOR,
} from "../frontend/src/lib/calc-shared";

// Helper: tolerate floating point rounding already done by shared fns
function expectClose(actual: number, expected: number, eps = 0.01) {
  if (Math.abs(actual - expected) > eps) {
    throw new Error(`expected ${expected} but got ${actual} (delta ${Math.abs(actual - expected)})`);
  }
}

// STEEL  -  single divisor is the drift that was patched manually before
{
  assert.equal(STEEL_DIVISOR, 162.0, "steel divisor must be 162  -  R2-521");
  expectClose(steelUnitWeightKgPerM(20), 2.4691, 0.0001);
  expectClose(steelUnitWeightKgPerM(12), 0.8889, 0.0001);
  expectClose(steelUnitWeightKgPerM(8), 0.3951, 0.0001);
}

// Backend steel  -  column branch
{
  const r = calcSteelBackend({ diameter: 20, count: 4, lengthOrHeightM: 3.0, slabThicknessM: 0.15, isColumn: true, wastagePct: 5 }) as any;
  assert.equal(r.unit_weight_kg_m, 2.4691);
  assert.equal(r.total_length_m, 4.15);
  assert.equal(r.total_weight_kg, 43.04);
}

// Backend steel  -  slab branch (spacing + span)
{
  const r = calcSteelBackend({ diameter: 12, count: 1, lengthOrHeightM: 4.0, spacingM: 0.15, spanM: 4.0, wastagePct: 5 }) as any;
  assert.equal(r.unit_weight_kg_m, 0.8889);
  assert.equal(r.bar_count, 27);
  assert.equal(r.total_weight_kg, 100.8);
}

// Backend steel  -  stirrup branch
{
  const r = calcSteelBackend({ diameter: 8, count: 10, lengthOrHeightM: 3.0, mainWidthM: 0.3, mainHeightM: 0.4, coverM: 0.04, hookLengthFactor: 9, bendDeductionFactor: 2, wastagePct: 5 }) as any;
  // a=0.22 b=0.32 cutting=2*(0.54)+0.144-0.032=1.192
  assert.equal(r.cutting_length_m, 1.192);
  expectClose(r.total_weight_kg, 4.95, 0.02);
}

// Frontend steel  -  column dual-zone
{
  const r = calcSteelColumnFrontend({
    colHeightMm: 3000,
    slabThickMm: 150,
    sizeAMm: 450,
    sizeBMm: 300,
    mainBarDiaMm: 20,
    mainBarCount: 4,
    stirrupDiaMm: 8,
    stirrupSpacingMm: 150,
    colSpEndMm: 150,
    colSpMidMm: 200,
    wastagePct: 5,
    pricePerKg: 0,
  });
  expectClose(r.bar1WeightKg, 40.9876, 0.01);
  expectClose(r.stirrupWeightKg, 9.2175, 0.01);
  expectClose(r.totalWeightKg, 52.7154, 0.01);
  assert.equal(r.stirEndCount, 5);
  assert.equal(r.stirMidCount, 9);
  assert.equal(r.stirrupCount, 19);
}

// Frontend slab steel  -  one-way
{
  const r = calcSlabSteelFrontend({
    slabLengthMm: 8000,
    slabWidthMm: 4000,
    mainDiaMm: 12,
    mainSpacingMm: 150,
    distDiaMm: 8,
    distSpacingMm: 200,
    devLenMm: 300,
    wastagePct: 5,
    pricePerKg: 0,
  });
  assert.equal(r.mainCount, 55);
  assert.equal(r.distCount, 21);
  expectClose(r.mainWeightKg, 224.888, 0.01);
  expectClose(r.distWeightKg, 71.348, 0.01);
  expectClose(r.totalWeightKg, 311.048, 0.01);
}

// Frontend two-way slab
{
  const r = calcTwoWaySlabFrontend({
    lxMm: 4000,
    lyMm: 5000,
    xDiaMm: 12,
    xSpacingMm: 150,
    yDiaMm: 10,
    ySpacingMm: 150,
    devLenMm: 300,
    wastagePct: 5,
    pricePerKg: 0,
  });
  assert.equal(r.xCount, 35);
  assert.equal(r.yCount, 28);
  expectClose(r.xWeightKg, 143.111, 0.01);
  expectClose(r.yWeightKg, 96.79, 0.01);
  expectClose(r.totalWeightKg, 251.896, 0.01);
}

// Concrete  -  backend canonical (1.54 dry factor)
{
  assert.equal(CONCRETE_DRY_FACTOR, 1.54);
  const r = calcConcreteBackend({ wetVolumeM3: 2.0, wastagePct: 5, grade: "M20" });
  assert.equal(r.wet_volume_m3, 2.0);
  assert.equal(r.dry_volume_m3, 3.234);
  assert.equal(r.cement_bags, 16.93);
  assert.equal(r.sand_m3, 0.882);
  assert.equal(r.aggregate_m3, 1.764);
  assert.equal(r.engineered_design_mix_required, false);
}

{
  const r = calcConcreteBackend({ wetVolumeM3: 2.0, wastagePct: 5, grade: "M7.5" });
  assert.equal(r.wet_volume_m3, 2.0);
  assert.equal(r.dry_volume_m3, 3.234);
  assert.equal(r.cement_bags, 7.16);
  assert.equal(r.sand_m3, 0.995);
  assert.equal(r.aggregate_m3, 1.99);
  assert.equal(r.engineered_design_mix_required, false);
}

{
  const r = calcConcreteBackend({ wetVolumeM3: 2.0, wastagePct: 5, grade: "M30" });
  assert.equal(r.engineered_design_mix_required, true);
}

// RMC
{
  const r = calcRmc({ pourVolumeM3: 15, mixerSizeM3: 6, wastagePct: 5 });
  assert.equal(r.totalVolumeM3, 15.75);
  assert.equal(r.mixerLoads, 3);
}

// Brick  -  backend leaves derived, mortar 20-35% band
{
  const r = calcBrickBackend({ lengthM: 5, heightM: 3, thicknessMm: 230, brickLengthMm: 190, brickWidthMm: 90, brickHeightMm: 90, jointMm: 10, wastagePct: 10 });
  assert.equal(r.leaves, 2);
  assert.equal(r.wallAreaM2, 15.0);
  assert.equal(r.wallVolumeM3, 3.45);
  assert.equal(r.bricksNeeded, 1650);
  assert.equal(r.mortarVolumeM3, 1.142);
  assert.equal(r.cementBags, 6.25);
  assert.equal(r.sandM3, 1.301);
}

// Paint  -  unified coverage premium 135 (frontend was 140 drift, backend 135)
{
  const r = calcPaint({ roomLengthFt: 12, roomWidthFt: 10, ceilingHeightFt: 10, paintCeiling: true, doorsCount: 1, windowsCount: 2, coats: 2, quality: "premium" });
  assert.equal(r.paintableAreaSqft, 515.0);
  // 515/135*2*1.10 = 8.388
  assert.equal(r.paintLitres, 8.39);
  assert.equal(r.puttyKg, 12.75);
  assert.equal(r.primerLitres, 3.09);
}

{
  const rTexture = calcPaint({ roomLengthFt: 10, roomWidthFt: 10, ceilingHeightFt: 10, paintCeiling: false, doorsCount: 0, windowsCount: 0, coats: 1, quality: "texture" });
  // wall 400, coverage 80 => 5*1.10=5.5
  assert.equal(rTexture.paintLitres, 5.5);
}

// Tile
{
  const r = calcTile({ lengthFt: 10, widthFt: 10, tileLengthInch: 24, tileWidthInch: 24, groutMm: 2, wastagePct: 10 });
  assert.equal(r.roomAreaSqft, 100.0);
  assert.equal(r.tilesNeeded, 28);
}

// Plaster
{
  const r = calcPlaster({ wallAreaM2: 50, thicknessMm: 12, mixRatio: "1:4", wastagePct: 10 });
  assert.equal(r.wetVolumeM3, 0.6);
  assert.equal(r.dryVolumeM3, 0.8778);
  assert.equal(r.cementBags, 5.06);
  assert.equal(r.sandM3, 0.702);
}

// Waterproofing
{
  const r = calcWaterproofing({ areaSqft: 200, coverageSqftPerLitre: 60, coats: 2, wastagePct: 5 });
  assert.equal(r.litresNeeded, 7.0);
}

// House cost  -  commercial multiplier, 0.12 per floor, 0.35 compound, 12% contingency
{
  const r = calcHouseCost({ areaSqft: 1000, baseRate: 2000, floors: 2, isCommercial: false, compoundWallLengthFt: 100, contingencyPct: 12 });
  assert.equal(r.baseConstructionCost, 4240000.0);
  assert.equal(r.compoundWallCost, 70000.0);
  assert.equal(r.totalProjectCost, 4310000.0);
  assert.equal(r.contingencyBuffer, 517200.0);
  assert.equal(r.splits.structure, 1724000.0);
}

// Billing  -  post-tax (default) and pre-tax
{
  const r = calcBilling({ subtotal: 100000, gstPct: 18, deductions: [{ type: "pct_item_subtotal", val: 10 }], retentions: [{ type: "pct", val: 5 }], preTaxDeductions: false });
  // gst 18000 total 118000 ded 10000 ret 5900 net 102100
  assert.equal(r.gstAmount, 18000.0);
  assert.equal(r.totalDeductions, 10000.0);
  assert.equal(r.totalRetention, 5900.0);
  assert.equal(r.netPayable, 102100.0);
}
{
  const r = calcBilling({ subtotal: 100000, gstPct: 18, deductions: [{ type: "pct_item_subtotal", val: 10 }], retentions: [{ type: "pct", val: 5 }], preTaxDeductions: true });
  // taxable 85000 gst 15300 net 100300
  assert.equal(r.gstAmount, 15300.0);
  assert.equal(r.netPayable, 100300.0);
}

// Split rate  -  item tax vs 18% flat
{
  const r = calcSplitRate({ quantity: 10, supplyRate: 150, installationRate: 50, supplyTaxPct: 18, installationTaxPct: 12, isItemTax: true });
  assert.equal(r.grossSupply, 1500.0);
  assert.equal(r.grossInstallation, 500.0);
  assert.equal(r.totalTax, 330.0);
  assert.equal(r.totalAmount, 2330.0);
}
{
  const r = calcSplitRate({ quantity: 10, supplyRate: 150, installationRate: 50, supplyTaxPct: 18, installationTaxPct: 12, isItemTax: false });
  assert.equal(r.totalTax, 360.0);
  assert.equal(r.totalAmount, 2360.0);
}

console.log("calculators-contract: all fixed-input assertions passed  -  shared module is drift-free");
