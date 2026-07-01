"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type CalcCategory = "steel" | "concrete" | "masonry" | "finishes" | "finance";
type CalcType =
  | "steel_column"
  | "steel_slab"
  | "concrete"
  | "rmc"
  | "bricks"
  | "paint"
  | "tile"
  | "plaster"
  | "waterproofing"
  | "house_cost";

export default function CalculatorsPage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const projectId = params?.project_id as string;

  const [activeCategory, setActiveCategory] = useState<CalcCategory>("steel");
  const [activeCalc, setActiveCalc] = useState<CalcType>("steel_column");
  const [calculating, setCalculating] = useState(false);

  // --- STATE DECLARATIONS ---

  // 1. Column Steel
  const [colHeight, setColHeight] = useState(3000); // mm
  const [slabThick, setSlabThick] = useState(150); // mm
  const [sizeA, setSizeA] = useState(450); // mm
  const [sizeB, setSizeB] = useState(300); // mm
  const [mainBarDia, setMainBarDia] = useState(20); // mm
  const [mainBarCount, setMainBarCount] = useState(4); // nos
  const [stirrupDia, setStirrupDia] = useState(8); // mm
  const [stirrupSpacing, setStirrupSpacing] = useState(150); // mm
  const [steelPrice, setSteelPrice] = useState(62); // ₹/kg
  const [steelWastage, setSteelWastage] = useState(5); // %

  // 2. Slab Steel
  const [slabLength, setSlabLength] = useState(8000); // mm (Ly)
  const [slabWidth, setSlabWidth] = useState(4000); // mm (Lx)
  const [slabMainDia, setSlabMainDia] = useState(12); // mm
  const [slabMainSpacing, setSlabMainSpacing] = useState(150); // mm
  const [slabDistDia, setSlabDistDia] = useState(8); // mm
  const [slabDistSpacing, setSlabDistSpacing] = useState(200); // mm

  // 3. Concrete Volume & Mix
  const [concreteForm, setConcreteForm] = useState<"slab" | "column" | "footing" | "stair">("slab");
  const [concreteL, setConcreteL] = useState(5.0); // m
  const [concreteW, setConcreteW] = useState(3.0); // m
  const [concreteD, setConcreteD] = useState(0.15); // m
  const [concreteGrade, setConcreteGrade] = useState("M20");
  const [concreteWastage, setConcreteWastage] = useState(5); // %
  const [stairSteps, setStairSteps] = useState(14);
  const [stairWidth, setStairWidth] = useState(1.2); // m
  const [stairRiser, setStairRiser] = useState(0.15); // m
  const [stairTread, setStairTread] = useState(0.25); // m
  const [stairWaist, setStairWaist] = useState(0.15); // m

  // 4. RMC Transit Mixer
  const [rmcVolume, setRmcVolume] = useState(15.0); // m3
  const [rmcMixerSize, setRmcMixerSize] = useState(6.0); // m3
  const [rmcWastage, setRmcWastage] = useState(5); // %

  // 5. Bricks & Mortar
  const [brickWallL, setBrickWallL] = useState(5.0); // m
  const [brickWallH, setBrickWallH] = useState(3.0); // m
  const [brickThickness, setBrickThickness] = useState(230); // mm
  const [brickSizePreset, setBrickSizePreset] = useState("modular"); // modular / traditional
  const [brickMortarRatio, setBrickMortarRatio] = useState("1:6");
  const [brickLeaves, setBrickLeaves] = useState(2); // 1 = 4.5", 2 = 9"
  const [brickWastage, setBrickWastage] = useState(10); // %

  // 6. Paint Quantity
  const [roomL, setRoomL] = useState(15.0); // ft
  const [roomW, setRoomW] = useState(12.0); // ft
  const [ceilingH, setCeilingH] = useState(10.0); // ft
  const [paintCeiling, setPaintCeiling] = useState(true);
  const [doorsCount, setDoorsCount] = useState(2);
  const [windowsCount, setWindowsCount] = useState(3);
  const [paintCoats, setPaintCoats] = useState(2);
  const [paintQuality, setPaintQuality] = useState("premium"); // economy / premium / luxury

  // 7. Tile Flooring
  const [tileRoomL, setTileRoomL] = useState(12.0); // ft
  const [tileRoomW, setTileRoomW] = useState(10.0); // ft
  const [tileLInch, setTileLInch] = useState(24.0); // inch
  const [tileWInch, setTileWInch] = useState(24.0); // inch
  const [tileGrout, setTileGrout] = useState(2.0); // mm
  const [tileWastage, setTileWastage] = useState(10); // %

  // 8. Plastering
  const [plasterArea, setPlasterArea] = useState(50.0); // m2
  const [plasterThick, setPlasterThick] = useState(12.0); // mm
  const [plasterRatio, setPlasterRatio] = useState("1:4");
  const [plasterWastage, setPlasterWastage] = useState(10); // %

  // 9. Waterproofing
  const [wpArea, setWpArea] = useState(250.0); // sqft
  const [wpCoverage, setWpCoverage] = useState(60.0); // sqft/litre per coat
  const [wpCoats, setWpCoats] = useState(2);
  const [wpWastage, setWpWastage] = useState(5); // %

  // 10. House Cost
  const [houseArea, setHouseArea] = useState(1500); // sqft
  const [houseFloors, setHouseFloors] = useState(1); // G
  const [houseQuality, setHouseQuality] = useState<"budget" | "standard" | "premium">("standard");
  const [houseCurrency, setHouseCurrency] = useState<"INR" | "USD" | "AED">("INR");
  const [houseCompoundWall, setHouseCompoundWall] = useState(120); // ft
  const [houseContingency, setHouseContingency] = useState(10); // %

  // --- CALCULATION LOGIC ---

  // 1. Steel Column Calculations (D² / 162 standard)
  const columnMainUnitW = (mainBarDia * mainBarDia) / 162.0;
  const colHeightM = colHeight / 1000;
  const colSlabM = slabThick / 1000;
  const colLapM = (50 * mainBarDia) / 1000;
  const colTotalMainLen = (colHeightM + colSlabM + colLapM) * mainBarCount;
  const colMainWeight = colTotalMainLen * columnMainUnitW * (1 + steelWastage / 100);

  const colStirrupUnitW = (stirrupDia * stirrupDia) / 162.0;
  const colStirrupLen = (2 * ((sizeA - 80) + (sizeB - 80)) + 24 * stirrupDia) / 1000; // 40mm cover
  const colStirrupCount = Math.ceil(colHeight / stirrupSpacing) + 1;
  const colStirrupWeight = colStirrupLen * colStirrupCount * colStirrupUnitW * (1 + steelWastage / 100);
  const colTotalWeight = colMainWeight + colStirrupWeight;
  const colCost = colTotalWeight * steelPrice;

  // 2. Slab Steel Calculations
  const slabMainUnitW = (slabMainDia * slabMainDia) / 162.0;
  const slabMainCount = Math.ceil(slabLength / slabMainSpacing) + 1;
  const slabMainWeight = (slabWidth / 1000) * slabMainCount * slabMainUnitW * 1.05; // 5% waste default

  const slabDistUnitW = (slabDistDia * slabDistDia) / 162.0;
  const slabDistCount = Math.ceil(slabWidth / slabDistSpacing) + 1;
  const slabDistWeight = (slabLength / 1000) * slabDistCount * slabDistUnitW * 1.05;
  const slabTotalWeight = slabMainWeight + slabDistWeight;
  const slabCost = slabTotalWeight * steelPrice;

  // 3. Concrete Volume & Mix
  let concVolume = concreteL * concreteW * concreteD;
  if (concreteForm === "column") {
    concVolume = (sizeA / 1000) * (sizeB / 1000) * (colHeight / 1000);
  } else if (concreteForm === "stair") {
    const stepsVol = stairSteps * stairWidth * ((stairRiser * stairTread) / 2.0);
    const waistLen = Math.sqrt(stairRiser ** 2 + stairTread ** 2);
    const waistVol = stairWaist * stairWidth * waistLen * stairSteps;
    concVolume = stepsVol + waistVol;
  }
  const concDryVol = concVolume * 1.54 * (1 + concreteWastage / 100);

  const mixLibrary: Record<string, [number, number, number]> = {
    M10: [4.4, 0.46, 0.92],
    M15: [6.3, 0.44, 0.88],
    M20: [8.2, 0.42, 0.84],
    M25: [11.1, 0.38, 0.76],
  };
  const [cementFactor, sandFactor, aggFactor] = mixLibrary[concreteGrade] || mixLibrary.M20;
  const concCementBags = concVolume * cementFactor * (1 + concreteWastage / 100);
  const concSandM3 = concVolume * sandFactor * (1 + concreteWastage / 100);
  const concAggM3 = concVolume * aggFactor * (1 + concreteWastage / 100);

  // 4. RMC Transit Mixer
  const rmcTotalVol = rmcVolume * (1 + rmcWastage / 100);
  const rmcTrucks = Math.ceil(rmcTotalVol / rmcMixerSize);

  // 5. Bricks & Mortar
  const bPresetLen = brickSizePreset === "modular" ? 190 : 230;
  const bPresetW = brickSizePreset === "modular" ? 90 : 110;
  const bPresetH = brickSizePreset === "modular" ? 90 : 75;
  const bJoint = 10;
  const bFaceArea = ((bPresetLen + bJoint) / 1000.0) * ((bPresetH + bJoint) / 1000.0);
  const brickWallArea = brickWallL * brickWallH;
  const bricksNeeded = Math.ceil((brickWallArea / bFaceArea) * brickLeaves * (1 + brickWastage / 100));

  const brickWallVol = brickWallArea * (brickThickness / 1000.0);
  const brickActualVol = (bPresetLen / 1000.0) * (bPresetW / 1000.0) * (bPresetH / 1000.0);
  const netBricksNoWaste = (brickWallArea / bFaceArea) * brickLeaves;
  const brickMortarVol = Math.max(0, brickWallVol - netBricksNoWaste * brickActualVol);
  const brickDryMortarVol = brickMortarVol * 1.33;

  const parts = brickMortarRatio.split(":");
  const cParts = parseFloat(parts[0]) || 1.0;
  const sParts = parseFloat(parts[1]) || 6.0;
  const totalParts = cParts + sParts;
  const brickCementBags = ((brickDryMortarVol * (cParts / totalParts)) * 1440.0) / 50.0;
  const brickSandM3 = brickDryMortarVol * (sParts / totalParts);

  // 6. Paint Quantity
  const paintWallArea = 2 * (roomL + roomW) * ceilingH + (paintCeiling ? roomL * roomW : 0);
  const paintableArea = Math.max(0, paintWallArea - doorsCount * 21.0 - windowsCount * 12.0);
  const paintCoverage = paintQuality === "economy" ? 115.0 : paintQuality === "luxury" ? 155.0 : 135.0;
  const paintLitres = (paintableArea / paintCoverage) * paintCoats * 1.10;
  const paintPuttyKg = (paintableArea / 100.0) * 2.25 * 1.10;
  const paintPrimerL = (paintableArea / 175.0) * 1.05;

  // 7. Tile Flooring
  const tileRoomArea = tileRoomL * tileRoomW;
  const groutIn = tileGrout / 25.4;
  const tileLenFt = (tileLInch + groutIn) / 12.0;
  const tileWidFt = (tileWInch + groutIn) / 12.0;
  const tileTiles = Math.ceil((tileRoomArea / (tileLenFt * tileWidFt)) * (1 + tileWastage / 100));

  // 8. Plastering
  const plasterWetVol = plasterArea * (plasterThick / 1000.0);
  const plasterDryVol = plasterWetVol * 1.33 * (1 + plasterWastage / 100);
  const pParts = plasterRatio.split(":");
  const pC = parseFloat(pParts[0]) || 1.0;
  const pS = parseFloat(pParts[1]) || 4.0;
  const plasterCementBags = ((plasterDryVol * (pC / (pC + pS))) * 1440.0) / 50.0;
  const plasterSandM3 = plasterDryVol * (pS / (pC + pS));

  // 9. Waterproofing
  const wpLitres = (wpArea / wpCoverage) * wpCoats * (1 + wpWastage / 100);

  // 10. House Construction Cost
  const currencySymbol = houseCurrency === "INR" ? "₹" : houseCurrency === "AED" ? "AED " : "$";
  const baseRates = {
    budget: houseCurrency === "INR" ? 1600 : houseCurrency === "AED" ? 180 : 50,
    standard: houseCurrency === "INR" ? 2200 : houseCurrency === "AED" ? 240 : 65,
    premium: houseCurrency === "INR" ? 3400 : houseCurrency === "AED" ? 380 : 100,
  };
  const houseBaseRate = baseRates[houseQuality];
  let houseConstructionCost = 0.0;
  for (let f = 0; f < houseFloors; f++) {
    const multiplier = 1.0 + 0.12 * f;
    houseConstructionCost += houseArea * (houseBaseRate * multiplier);
  }
  const houseCompoundCost = houseCompoundWall * (houseBaseRate * 0.35);
  const houseSubtotal = houseConstructionCost + houseCompoundCost;
  const houseContingencyCost = houseSubtotal * (houseContingency / 100);
  const houseTotalCost = houseSubtotal + houseContingencyCost;

  const houseSplits = [
    { name: "Structure & Civil (40%)", percentage: 0.40, color: "bg-[#7C5CFF]" },
    { name: "Finishing & Masonry (25%)", percentage: 0.25, color: "bg-[#E8184C]" },
    { name: "MEP & Fittings (15%)", percentage: 0.15, color: "bg-[#00E5A3]" },
    { name: "Interior & Carpentry (12%)", percentage: 0.12, color: "bg-amber-500" },
    { name: "Consultants & Permits (8%)", percentage: 0.08, color: "bg-zinc-500" },
  ];

  const handleTriggerCalc = () => {
    setCalculating(true);
    setTimeout(() => {
      setCalculating(false);
    }, 150);
  };

  return (
    <div className="flex h-screen bg-[#0E0C15] text-[#ededed] overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-white/5 bg-[#0B0910] flex flex-col justify-between h-full shrink-0">
        <div className="flex flex-col overflow-y-auto flex-1">
          {/* Brand Header */}
          <div className="p-6 flex items-center gap-3 border-b border-white/5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] font-sans font-bold text-white shadow-lg shadow-primary/10">
              S
            </div>
            <span className="font-bold text-white tracking-tight text-sm">SiteFlow Console</span>
          </div>

          {/* Sidebar Nav group */}
          <nav className="p-4 space-y-4">
            <Link
              href={`/c/${companyId}/dashboard`}
              className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-500 hover:text-white hover:bg-white/[0.03] rounded-lg transition-all"
            >
              ← Dashboard
            </Link>

            {/* Steel Category */}
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest block px-3 mb-2">
                Steel & BBS
              </span>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setActiveCategory("steel");
                    setActiveCalc("steel_column");
                    handleTriggerCalc();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-all ${
                    activeCalc === "steel_column"
                      ? "bg-white/[0.06] text-white font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                  }`}
                >
                  <span>🔩</span> Column Steel BBS
                </button>
                <button
                  onClick={() => {
                    setActiveCategory("steel");
                    setActiveCalc("steel_slab");
                    handleTriggerCalc();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-all ${
                    activeCalc === "steel_slab"
                      ? "bg-white/[0.06] text-white font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                  }`}
                >
                  <span>🕸️</span> Slab Steel BBS
                </button>
              </div>
            </div>

            {/* Concrete Category */}
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest block px-3 mb-2">
                Concrete Mix
              </span>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setActiveCategory("concrete");
                    setActiveCalc("concrete");
                    handleTriggerCalc();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-all ${
                    activeCalc === "concrete"
                      ? "bg-white/[0.06] text-white font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                  }`}
                >
                  <span>🧪</span> Concrete Mix Vol
                </button>
                <button
                  onClick={() => {
                    setActiveCategory("concrete");
                    setActiveCalc("rmc");
                    handleTriggerCalc();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-all ${
                    activeCalc === "rmc"
                      ? "bg-white/[0.06] text-white font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                  }`}
                >
                  <span>🚛</span> Transit Mixer Load
                </button>
              </div>
            </div>

            {/* Masonry Category */}
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest block px-3 mb-2">
                Masonry & Walls
              </span>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setActiveCategory("masonry");
                    setActiveCalc("bricks");
                    handleTriggerCalc();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-all ${
                    activeCalc === "bricks"
                      ? "bg-white/[0.06] text-white font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                  }`}
                >
                  <span>🧱</span> Brick Wall Est
                </button>
                <button
                  onClick={() => {
                    setActiveCategory("masonry");
                    setActiveCalc("plaster");
                    handleTriggerCalc();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-all ${
                    activeCalc === "plaster"
                      ? "bg-white/[0.06] text-white font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                  }`}
                >
                  <span>📐</span> Wall Plastering
                </button>
              </div>
            </div>

            {/* Finishes Category */}
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest block px-3 mb-2">
                Finishes
              </span>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setActiveCategory("finishes");
                    setActiveCalc("paint");
                    handleTriggerCalc();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-all ${
                    activeCalc === "paint"
                      ? "bg-white/[0.06] text-white font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                  }`}
                >
                  <span>🎨</span> Paint & Putty
                </button>
                <button
                  onClick={() => {
                    setActiveCategory("finishes");
                    setActiveCalc("tile");
                    handleTriggerCalc();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-all ${
                    activeCalc === "tile"
                      ? "bg-white/[0.06] text-white font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                  }`}
                >
                  <span>🔲</span> Tile Flooring
                </button>
                <button
                  onClick={() => {
                    setActiveCategory("finishes");
                    setActiveCalc("waterproofing");
                    handleTriggerCalc();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-all ${
                    activeCalc === "waterproofing"
                      ? "bg-white/[0.06] text-white font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                  }`}
                >
                  <span>💧</span> Waterproofing
                </button>
              </div>
            </div>

            {/* Cost Planner Category */}
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest block px-3 mb-2">
                Cost Estimator
              </span>
              <button
                onClick={() => {
                  setActiveCategory("finance");
                  setActiveCalc("house_cost");
                  handleTriggerCalc();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-all ${
                  activeCalc === "house_cost"
                    ? "bg-white/[0.06] text-white font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                }`}
              >
                <span>🏠</span> House Cost Planner
              </button>
            </div>
          </nav>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col overflow-hidden h-full">
        {/* Header */}
        <header className="h-16 border-b border-white/5 px-8 flex items-center justify-between bg-[#0B0910] shrink-0">
          <div>
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">
              {activeCalc.replace("_", " ")} Quantity Estimator
            </h1>
            <p className="text-[10px] text-zinc-500">IS 456 & CPWD standard quantity takeoff engine</p>
          </div>
          {calculating && (
            <span className="text-[10px] font-mono text-[#E8184C] animate-pulse">Calculating...</span>
          )}
        </header>

        {/* Content Panel */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* CALCULATOR PANELS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* INPUT PANEL */}
            <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-[#0B0910] p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h3 className="font-bold text-sm uppercase tracking-wider text-white">
                  Takeoff Parameters
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Active Formula
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                {/* 1. Steel Column Inputs */}
                {activeCalc === "steel_column" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Column Height (mm)</label>
                      <input
                        type="number"
                        value={colHeight}
                        onChange={(e) => {
                          setColHeight(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Slab Thickness (mm)</label>
                      <input
                        type="number"
                        value={slabThick}
                        onChange={(e) => {
                          setSlabThick(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Column Size A (mm)</label>
                      <input
                        type="number"
                        value={sizeA}
                        onChange={(e) => {
                          setSizeA(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Column Size B (mm)</label>
                      <input
                        type="number"
                        value={sizeB}
                        onChange={(e) => {
                          setSizeB(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Main Bar Diameter (mm)</label>
                      <select
                        value={mainBarDia}
                        onChange={(e) => {
                          setMainBarDia(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                      >
                        {[8, 10, 12, 16, 20, 25, 32].map((d) => (
                          <option key={d} value={d}>
                            {d} mm
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Main Bars Count (nos)</label>
                      <input
                        type="number"
                        value={mainBarCount}
                        onChange={(e) => {
                          setMainBarCount(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Stirrup Spacing (mm)</label>
                      <input
                        type="number"
                        value={stirrupSpacing}
                        onChange={(e) => {
                          setStirrupSpacing(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Wastage Buffer (%)</label>
                      <input
                        type="number"
                        value={steelWastage}
                        onChange={(e) => {
                          setSteelWastage(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                      />
                    </div>
                  </>
                )}

                {/* 2. Slab Steel Inputs */}
                {activeCalc === "steel_slab" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Slab Length Ly (mm)</label>
                      <input
                        type="number"
                        value={slabLength}
                        onChange={(e) => {
                          setSlabLength(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Slab Width Lx (mm)</label>
                      <input
                        type="number"
                        value={slabWidth}
                        onChange={(e) => {
                          setSlabWidth(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Main Bar Dia (mm)</label>
                      <select
                        value={slabMainDia}
                        onChange={(e) => {
                          setSlabMainDia(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      >
                        {[8, 10, 12, 16].map((d) => (
                          <option key={d} value={d}>
                            {d} mm
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Main Bar Spacing (mm)</label>
                      <input
                        type="number"
                        value={slabMainSpacing}
                        onChange={(e) => {
                          setSlabMainSpacing(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Distribution Bar Dia (mm)</label>
                      <select
                        value={slabDistDia}
                        onChange={(e) => {
                          setSlabDistDia(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      >
                        {[8, 10, 12].map((d) => (
                          <option key={d} value={d}>
                            {d} mm
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Distribution Bar Spacing (mm)</label>
                      <input
                        type="number"
                        value={slabDistSpacing}
                        onChange={(e) => {
                          setSlabDistSpacing(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                  </>
                )}

                {/* 3. Concrete Volume & Mix */}
                {activeCalc === "concrete" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Element Category</label>
                      <select
                        value={concreteForm}
                        onChange={(e) => {
                          setConcreteForm(e.target.value as any);
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="slab">Flat Slab / Beam</option>
                        <option value="column">Column / Pedestal</option>
                        <option value="stair">Staircase Flight</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Concrete Grade</label>
                      <select
                        value={concreteGrade}
                        onChange={(e) => {
                          setConcreteGrade(e.target.value);
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="M10">M10 (Nominal PCC 1:3:6)</option>
                        <option value="M15">M15 (Nominal PCC 1:2:4)</option>
                        <option value="M20">M20 (Standard RCC 1:1.5:3)</option>
                        <option value="M25">M25 (High Strength 1:1:2)</option>
                      </select>
                    </div>

                    {concreteForm === "slab" && (
                      <>
                        <div className="space-y-1">
                          <label className="text-zinc-400">Slab Length (m)</label>
                          <input
                            type="number"
                            value={concreteL}
                            onChange={(e) => {
                              setConcreteL(Number(e.target.value));
                              handleTriggerCalc();
                            }}
                            className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-zinc-400">Slab Width (m)</label>
                          <input
                            type="number"
                            value={concreteW}
                            onChange={(e) => {
                              setConcreteW(Number(e.target.value));
                              handleTriggerCalc();
                            }}
                            className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                        <div className="space-y-1 col-span-2">
                          <label className="text-zinc-400">Slab Thickness / Depth (m)</label>
                          <input
                            type="number"
                            value={concreteD}
                            onChange={(e) => {
                              setConcreteD(Number(e.target.value));
                              handleTriggerCalc();
                            }}
                            className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                      </>
                    )}

                    {concreteForm === "column" && (
                      <>
                        <div className="space-y-1">
                          <label className="text-zinc-400">Column Size A (mm)</label>
                          <input
                            type="number"
                            value={sizeA}
                            onChange={(e) => {
                              setSizeA(Number(e.target.value));
                              handleTriggerCalc();
                            }}
                            className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-zinc-400">Column Size B (mm)</label>
                          <input
                            type="number"
                            value={sizeB}
                            onChange={(e) => {
                              setSizeB(Number(e.target.value));
                              handleTriggerCalc();
                            }}
                            className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                        <div className="space-y-1 col-span-2">
                          <label className="text-zinc-400">Column Height (mm)</label>
                          <input
                            type="number"
                            value={colHeight}
                            onChange={(e) => {
                              setColHeight(Number(e.target.value));
                              handleTriggerCalc();
                            }}
                            className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                      </>
                    )}

                    {concreteForm === "stair" && (
                      <>
                        <div className="space-y-1">
                          <label className="text-zinc-400">Steps Count</label>
                          <input
                            type="number"
                            value={stairSteps}
                            onChange={(e) => {
                              setStairSteps(Number(e.target.value));
                              handleTriggerCalc();
                            }}
                            className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-zinc-400">Flight Width (m)</label>
                          <input
                            type="number"
                            value={stairWidth}
                            onChange={(e) => {
                              setStairWidth(Number(e.target.value));
                              handleTriggerCalc();
                            }}
                            className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-zinc-400">Riser Height (m)</label>
                          <input
                            type="number"
                            value={stairRiser}
                            onChange={(e) => {
                              setStairRiser(Number(e.target.value));
                              handleTriggerCalc();
                            }}
                            className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-zinc-400">Tread Depth (m)</label>
                          <input
                            type="number"
                            value={stairTread}
                            onChange={(e) => {
                              setStairTread(Number(e.target.value));
                              handleTriggerCalc();
                            }}
                            className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                        <div className="space-y-1 col-span-2">
                          <label className="text-zinc-400">Waist Slab Thickness (m)</label>
                          <input
                            type="number"
                            value={stairWaist}
                            onChange={(e) => {
                              setStairWaist(Number(e.target.value));
                              handleTriggerCalc();
                            }}
                            className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* 4. RMC Transit Mixer */}
                {activeCalc === "rmc" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Pour Volume (m³)</label>
                      <input
                        type="number"
                        value={rmcVolume}
                        onChange={(e) => {
                          setRmcVolume(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Mixer Truck Size (m³)</label>
                      <select
                        value={rmcMixerSize}
                        onChange={(e) => {
                          setRmcMixerSize(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      >
                        <option value={6}>6 m³ (Standard India)</option>
                        <option value={7}>7 m³ (Standard GCC)</option>
                        <option value={8}>8 m³ (Heavy Infra)</option>
                      </select>
                    </div>
                  </>
                )}

                {/* 5. Bricks Wall */}
                {activeCalc === "bricks" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Wall Length (m)</label>
                      <input
                        type="number"
                        value={brickWallL}
                        onChange={(e) => {
                          setBrickWallL(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Wall Height (m)</label>
                      <input
                        type="number"
                        value={brickWallH}
                        onChange={(e) => {
                          setBrickWallH(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Brick Size Standard</label>
                      <select
                        value={brickSizePreset}
                        onChange={(e) => {
                          setBrickSizePreset(e.target.value);
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="modular"> modular (190 x 90 x 90 mm)</option>
                        <option value="traditional">traditional (230 x 110 x 75 mm)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Wall Thickness (mm)</label>
                      <select
                        value={brickThickness}
                        onChange={(e) => {
                          setBrickThickness(Number(e.target.value));
                          setBrickLeaves(Number(e.target.value) > 115 ? 2 : 1);
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      >
                        <option value={115}>4.5 inch (Half Brick - Single Leaf)</option>
                        <option value={230}>9 inch (Full Brick - Double Leaf)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Mortar Mix Ratio</label>
                      <select
                        value={brickMortarRatio}
                        onChange={(e) => {
                          setBrickMortarRatio(e.target.value);
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="1:3">1:3 (High Strength)</option>
                        <option value="1:4">1:4 (External Walls)</option>
                        <option value="1:6">1:6 (Internal Walls)</option>
                      </select>
                    </div>
                  </>
                )}

                {/* 6. Paint & Putty */}
                {activeCalc === "paint" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Room Length (ft)</label>
                      <input
                        type="number"
                        value={roomL}
                        onChange={(e) => {
                          setRoomL(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Room Width (ft)</label>
                      <input
                        type="number"
                        value={roomW}
                        onChange={(e) => {
                          setRoomW(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Ceiling Height (ft)</label>
                      <input
                        type="number"
                        value={ceilingH}
                        onChange={(e) => {
                          setCeilingH(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Paint Quality</label>
                      <select
                        value={paintQuality}
                        onChange={(e) => {
                          setPaintQuality(e.target.value);
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="economy">Economy Emulsion</option>
                        <option value="premium">Premium Emulsion</option>
                        <option value="luxury">Luxury Emulsion</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Doors Count (Standard Deductions)</label>
                      <input
                        type="number"
                        value={doorsCount}
                        onChange={(e) => {
                          setDoorsCount(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Windows Count (Deductions)</label>
                      <input
                        type="number"
                        value={windowsCount}
                        onChange={(e) => {
                          setWindowsCount(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-4 col-span-2">
                      <input
                        type="checkbox"
                        checked={paintCeiling}
                        onChange={(e) => {
                          setPaintCeiling(e.target.checked);
                          handleTriggerCalc();
                        }}
                        className="h-4 w-4 bg-[#15121F] rounded"
                      />
                      <label className="text-zinc-400">Include Ceiling Area</label>
                    </div>
                  </>
                )}

                {/* 7. Tile Flooring */}
                {activeCalc === "tile" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Room Length (ft)</label>
                      <input
                        type="number"
                        value={tileRoomL}
                        onChange={(e) => {
                          setTileRoomL(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Room Width (ft)</label>
                      <input
                        type="number"
                        value={tileRoomW}
                        onChange={(e) => {
                          setTileRoomW(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Tile Size (Length - Inch)</label>
                      <input
                        type="number"
                        value={tileLInch}
                        onChange={(e) => {
                          setTileLInch(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Tile Size (Width - Inch)</label>
                      <input
                        type="number"
                        value={tileWInch}
                        onChange={(e) => {
                          setTileWInch(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                  </>
                )}

                {/* 8. Plastering */}
                {activeCalc === "plaster" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Wall Area (m²)</label>
                      <input
                        type="number"
                        value={plasterArea}
                        onChange={(e) => {
                          setPlasterArea(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Plaster Thickness (mm)</label>
                      <input
                        type="number"
                        value={plasterThick}
                        onChange={(e) => {
                          setPlasterThick(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Plaster Mix Ratio (Cement:Sand)</label>
                      <select
                        value={plasterRatio}
                        onChange={(e) => {
                          setPlasterRatio(e.target.value);
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="1:3">1:3 (Ceilings / Wet areas)</option>
                        <option value="1:4">1:4 (Internal plaster standard)</option>
                        <option value="1:6">1:6 (External/Rough plaster)</option>
                      </select>
                    </div>
                  </>
                )}

                {/* 9. Waterproofing */}
                {activeCalc === "waterproofing" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Waterproofing Area (sqft)</label>
                      <input
                        type="number"
                        value={wpArea}
                        onChange={(e) => {
                          setWpArea(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Coverage per Litre (sqft/L)</label>
                      <input
                        type="number"
                        value={wpCoverage}
                        onChange={(e) => {
                          setWpCoverage(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                  </>
                )}

                {/* 10. House Cost Estimator */}
                {activeCalc === "house_cost" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Built-Up Area (sqft)</label>
                      <input
                        type="number"
                        value={houseArea}
                        onChange={(e) => {
                          setHouseArea(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Floors Count</label>
                      <select
                        value={houseFloors}
                        onChange={(e) => {
                          setHouseFloors(Number(e.target.value));
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      >
                        <option value={1}>G floor (1 floor)</option>
                        <option value={2}>G+1 (2 floors)</option>
                        <option value={3}>G+2 (3 floors)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Construction Grade</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["budget", "standard", "premium"] as const).map((q) => (
                          <button
                            key={q}
                            onClick={() => {
                              setHouseQuality(q);
                              handleTriggerCalc();
                            }}
                            className={`py-1.5 border rounded-lg uppercase text-[10px] font-bold transition-all ${
                              houseQuality === q
                                ? "bg-[#E8184C]/10 border-[#E8184C] text-[#E8184C]"
                                : "border-white/10 text-zinc-400"
                            }`}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Currency Mode</label>
                      <select
                        value={houseCurrency}
                        onChange={(e) => {
                          setHouseCurrency(e.target.value as any);
                          handleTriggerCalc();
                        }}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="INR">India (₹)</option>
                        <option value="AED">UAE (AED)</option>
                        <option value="USD">International ($)</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* RESULTS OUTPUT PANEL */}
            <div className="rounded-2xl border border-white/5 bg-[#0B0910] p-6 space-y-6 flex flex-col justify-between">
              <div className="space-y-5">
                <div className="border-b border-white/5 pb-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Calculated Result
                  </h4>
                </div>

                {/* 1. Steel Column Results */}
                {activeCalc === "steel_column" && (
                  <div className="space-y-4">
                    <div className="bg-[#14111E] p-4 rounded-xl border border-white/5">
                      <span className="text-zinc-500 text-[10px] uppercase font-bold block">
                        Main Vertical Steel
                      </span>
                      <strong className="text-lg font-black text-white mt-1 block">
                        {colMainWeight.toFixed(2)} kg
                      </strong>
                      <span className="text-[10px] text-zinc-500 italic block mt-0.5">
                        Includes {mainBarCount} nos main bars with overlaps and {steelWastage}% wastage
                      </span>
                    </div>
                    <div className="bg-[#14111E] p-4 rounded-xl border border-white/5">
                      <span className="text-zinc-500 text-[10px] uppercase font-bold block">
                        Stirrups / Ties Steel
                      </span>
                      <strong className="text-lg font-black text-white mt-1 block">
                        {colStirrupWeight.toFixed(2)} kg
                      </strong>
                      <span className="text-[10px] text-zinc-500 italic block mt-0.5">
                        Includes {colStirrupCount} stirrups (8D hook deductions as per SP-34)
                      </span>
                    </div>
                    <div className="bg-[#14111E] p-4 rounded-xl border border-white/5">
                      <span className="text-zinc-500 text-[10px] uppercase font-bold block">
                        Total Column Steel Weight
                      </span>
                      <strong className="text-2xl font-black text-[#00E5A3] mt-1 block">
                        {colTotalWeight.toFixed(2)} kg
                      </strong>
                    </div>
                    <div className="pt-4 border-t border-white/5 bg-[#14111E] p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-zinc-500 text-[10px] uppercase font-bold block">
                          Est. Material Cost
                        </span>
                        <strong className="text-xl font-black text-[#E8184C] mt-1 block">
                          ₹{colCost.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Slab Steel Results */}
                {activeCalc === "steel_slab" && (
                  <div className="space-y-4">
                    <div className="bg-[#14111E] p-4 rounded-xl border border-white/5">
                      <span className="text-zinc-500 text-[10px] uppercase font-bold block">
                        Main Reinforcement
                      </span>
                      <strong className="text-lg font-black text-white mt-1 block">
                        {slabMainWeight.toFixed(2)} kg
                      </strong>
                      <span className="text-[10px] text-zinc-500 italic block mt-0.5">
                        {slabMainCount} main bars of {slabMainDia}mm diameter
                      </span>
                    </div>
                    <div className="bg-[#14111E] p-4 rounded-xl border border-white/5">
                      <span className="text-zinc-500 text-[10px] uppercase font-bold block">
                        Distribution Reinforcement
                      </span>
                      <strong className="text-lg font-black text-white mt-1 block">
                        {slabDistWeight.toFixed(2)} kg
                      </strong>
                      <span className="text-[10px] text-zinc-500 italic block mt-0.5">
                        {slabDistCount} distribution bars of {slabDistDia}mm diameter
                      </span>
                    </div>
                    <div className="bg-[#14111E] p-4 rounded-xl border border-white/5">
                      <span className="text-zinc-500 text-[10px] uppercase font-bold block">
                        Total Slab Steel Weight
                      </span>
                      <strong className="text-2xl font-black text-[#00E5A3] mt-1 block">
                        {slabTotalWeight.toFixed(2)} kg
                      </strong>
                    </div>
                  </div>
                )}

                {/* 3. Concrete Volume Results */}
                {activeCalc === "concrete" && (
                  <div className="space-y-4">
                    <div className="bg-[#14111E] p-4 rounded-xl border border-white/5">
                      <span className="text-zinc-500 text-[10px] uppercase font-bold block">
                        Wet Concrete Volume
                      </span>
                      <strong className="text-xl font-black text-white mt-1 block">
                        {concVolume.toFixed(3)} m³
                      </strong>
                    </div>
                    <div className="bg-[#14111E] p-4 rounded-xl border border-white/5">
                      <span className="text-zinc-500 text-[10px] uppercase font-bold block">
                        Dry Mix Materials (1.54 Factor)
                      </span>
                      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                        <div className="bg-black/30 p-2 rounded">
                          <strong className="text-sm font-bold text-white block">
                            {Math.ceil(concCementBags)}
                          </strong>
                          <span className="text-[9px] text-zinc-500 uppercase">Cement Bags</span>
                        </div>
                        <div className="bg-black/30 p-2 rounded">
                          <strong className="text-sm font-bold text-white block">
                            {concSandM3.toFixed(2)}
                          </strong>
                          <span className="text-[9px] text-zinc-500 uppercase">Sand (m³)</span>
                        </div>
                        <div className="bg-black/30 p-2 rounded">
                          <strong className="text-sm font-bold text-white block">
                            {concAggM3.toFixed(2)}
                          </strong>
                          <span className="text-[9px] text-zinc-500 uppercase">Aggregate (m³)</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-500 italic block">
                      * Cement bags rounded up to nearest whole bag. Nominal Mix proportions: {concreteGrade}.
                    </span>
                  </div>
                )}

                {/* 4. RMC Transit Mixer Truck Results */}
                {activeCalc === "rmc" && (
                  <div className="space-y-4">
                    <div className="bg-[#14111E] p-4 rounded-xl border border-white/5 text-center">
                      <span className="text-zinc-500 text-[10px] uppercase font-bold block">
                        Transit Mixer Dispatches Needed
                      </span>
                      <strong className="text-4xl font-black text-[#00E5A3] mt-2 block">
                        {rmcTrucks} Trucks
                      </strong>
                      <span className="text-[10px] text-zinc-500 block mt-2">
                        For a total wet pour of {rmcTotalVol.toFixed(2)} m³ (including {rmcWastage}% waste)
                      </span>
                    </div>
                  </div>
                )}

                {/* 5. Brick Wall Results */}
                {activeCalc === "bricks" && (
                  <div className="space-y-4">
                    <div className="bg-[#14111E] p-4 rounded-xl border border-white/5 text-center">
                      <span className="text-zinc-500 text-[10px] uppercase font-bold block">
                        Bricks Required
                      </span>
                      <strong className="text-3xl font-black text-[#00E5A3] mt-1 block">
                        {bricksNeeded.toLocaleString()} nos
                      </strong>
                      <span className="text-[10px] text-zinc-500 block mt-1">
                        Includes {brickWastage}% cutting wastage buffer
                      </span>
                    </div>
                    <div className="bg-[#14111E] p-4 rounded-xl border border-white/5">
                      <span className="text-zinc-500 text-[10px] uppercase font-bold block">
                        Dry Mortar Material Split
                      </span>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <div className="bg-black/30 p-2 rounded text-center">
                          <strong className="text-sm font-bold text-white block">
                            {brickCementBags.toFixed(1)}
                          </strong>
                          <span className="text-[9px] text-zinc-500 uppercase">Cement Bags</span>
                        </div>
                        <div className="bg-black/30 p-2 rounded text-center">
                          <strong className="text-sm font-bold text-white block">
                            {brickSandM3.toFixed(2)}
                          </strong>
                          <span className="text-[9px] text-zinc-500 uppercase">Sand (m³)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. Paint & Putty Results */}
                {activeCalc === "paint" && (
                  <div className="space-y-4">
                    <div className="bg-[#14111E] p-4 rounded-xl border border-white/5">
                      <span className="text-zinc-500 text-[10px] uppercase font-bold block">
                        Paintable Wall Area
                      </span>
                      <strong className="text-lg font-black text-white mt-1 block">
                        {paintableArea.toFixed(0)} sqft
                      </strong>
                      <span className="text-[10px] text-zinc-500 italic block mt-0.5">
                        After deducting {doorsCount} doors and {windowsCount} windows
                      </span>
                    </div>
                    <div className="bg-[#14111E] p-4 rounded-xl border border-white/5 grid grid-cols-3 gap-2 text-center">
                      <div className="bg-black/30 p-2 rounded">
                        <strong className="text-sm font-bold text-white block">
                          {paintLitres.toFixed(1)} L
                        </strong>
                        <span className="text-[9px] text-zinc-500 uppercase">Paint</span>
                      </div>
                      <div className="bg-black/30 p-2 rounded">
                        <strong className="text-sm font-bold text-white block">
                          {paintPuttyKg.toFixed(0)} kg
                        </strong>
                        <span className="text-[9px] text-zinc-500 uppercase">Putty</span>
                      </div>
                      <div className="bg-black/30 p-2 rounded">
                        <strong className="text-sm font-bold text-white block">
                          {paintPrimerL.toFixed(1)} L
                        </strong>
                        <span className="text-[9px] text-zinc-500 uppercase">Primer</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 7. Tile Flooring Results */}
                {activeCalc === "tile" && (
                  <div className="space-y-4">
                    <div className="bg-[#14111E] p-4 rounded-xl border border-white/5 text-center">
                      <span className="text-zinc-500 text-[10px] uppercase font-bold block">
                        Total Room Area
                      </span>
                      <strong className="text-xl font-black text-white mt-1 block">
                        {tileRoomArea.toFixed(1)} sqft
                      </strong>
                    </div>
                    <div className="bg-[#14111E] p-4 rounded-xl border border-white/5 text-center">
                      <span className="text-zinc-500 text-[10px] uppercase font-bold block">
                        Tiles Needed
                      </span>
                      <strong className="text-3xl font-black text-[#00E5A3] mt-2 block">
                        {tileTiles} tiles
                      </strong>
                      <span className="text-[10px] text-zinc-500 block mt-1">
                        Includes {tileWastage}% breakage wastage buffer
                      </span>
                    </div>
                  </div>
                )}

                {/* 8. Plastering Results */}
                {activeCalc === "plaster" && (
                  <div className="space-y-4">
                    <div className="bg-[#14111E] p-4 rounded-xl border border-white/5">
                      <span className="text-zinc-500 text-[10px] uppercase font-bold block">
                        Plaster Wet Volume
                      </span>
                      <strong className="text-base font-black text-white mt-1 block">
                        {plasterWetVol.toFixed(3)} m³
                      </strong>
                    </div>
                    <div className="bg-[#14111E] p-4 rounded-xl border border-white/5 grid grid-cols-2 gap-3 text-center">
                      <div>
                        <span className="text-zinc-500 text-[10px] uppercase font-bold block">
                          Cement Bags
                        </span>
                        <strong className="text-xl font-black text-[#00E5A3] mt-1 block">
                          {plasterCementBags.toFixed(1)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-zinc-500 text-[10px] uppercase font-bold block">
                          Sand Volume
                        </span>
                        <strong className="text-xl font-black text-[#00E5A3] mt-1 block">
                          {plasterSandM3.toFixed(2)} m³
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* 9. Waterproofing Results */}
                {activeCalc === "waterproofing" && (
                  <div className="space-y-4 border border-white/5 bg-[#14111E] p-5 rounded-xl text-center">
                    <span className="text-zinc-500 text-[10px] uppercase font-bold block">
                      Chemicals Needed
                    </span>
                    <strong className="text-3xl font-black text-[#00E5A3] mt-2 block">
                      {wpLitres.toFixed(1)} Litres
                    </strong>
                    <span className="text-[10px] text-zinc-500 block mt-1">
                      For {wpCoats} coats with {wpWastage}% application wastage
                    </span>
                  </div>
                )}

                {/* 10. House Cost Estimator Results */}
                {activeCalc === "house_cost" && (
                  <div className="space-y-4">
                    <div className="bg-[#14111E] p-4 rounded-xl border border-white/5 text-center">
                      <span className="text-zinc-500 text-[10px] uppercase font-bold block">
                        Estimated Budget
                      </span>
                      <strong className="text-2xl font-black text-[#00E5A3] mt-1 block">
                        {currencySymbol}
                        {houseTotalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </strong>
                      <span className="text-[9px] text-zinc-500 block mt-1">
                        Includes {houseContingency}% contingency buffer ({currencySymbol}
                        {houseContingencyCost.toLocaleString(undefined, { maximumFractionDigits: 0 })})
                      </span>
                    </div>

                    <div className="space-y-3 pt-2">
                      <h5 className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                        Materials & Labor Split
                      </h5>
                      {houseSplits.map((item, i) => {
                        const itemVal = houseTotalCost * item.percentage;
                        return (
                          <div key={i} className="space-y-1 text-[11px]">
                            <div className="flex justify-between text-zinc-400">
                              <span>{item.name}</span>
                              <span className="font-semibold text-white">
                                {currencySymbol}
                                {itemVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`${item.color} h-full`}
                                style={{ width: `${item.percentage * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* IS-CODE / CPWD COMPLIANT CIVIL NOTE */}
          <div className="rounded-2xl border border-white/5 bg-[#0B0910] p-6 space-y-3">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-2">
              Engineering & Takeoff Reference Notes
            </h4>
            <div className="text-[11px] text-zinc-500 space-y-1.5 leading-relaxed font-mono">
              {activeCategory === "steel" && (
                <>
                  <div>• IS 456:2000 compliant unit weight formula: Weight (kg/m) = D² ÷ 162.</div>
                  <div>• Column Main longitudinal reinforcement includes 50D lap length.</div>
                  <div>• Stirrups cutting lengths account for 2 hooks of 10D and bend deductions: 90° = 2d, 135° = 3d.</div>
                  <div>• Slabs main reinforcement spans shorter direction; distribution steel spans longer direction.</div>
                </>
              )}
              {activeCategory === "concrete" && (
                <>
                  <div>• Dry-to-Wet volume expansion factor: 1.54 (compressibility coefficient).</div>
                  <div>• Staircase volume formula accounts for waist slab and triangular step wedges: V = Steps × Width × [ (Riser × Tread / 2) + Waist × √(Riser² + Tread²) ].</div>
                  <div>• Nominal PCC/RCC mix ratios follow IS 456. Design mixes are recommended for M30 and above.</div>
                </>
              )}
              {activeCategory === "masonry" && (
                <>
                  <div>• Modular Brick dimensions: 190 x 90 x 90 mm. Traditional Brick: 230 x 110 x 75 mm.</div>
                  <div>• Standard mortar joint thickness is 10 mm (horizontal and vertical).</div>
                  <div>• Mortar volume constitutes ~30% of total brick wall volume.</div>
                </>
              )}
              {activeCategory === "finishes" && (
                <>
                  <div>• Standard door deduction is 21 sqft (3x7 ft). Window deduction is 12 sqft (3x4 ft).</div>
                  <div>• Putty rate: 2.25 kg per 100 sqft for 2 coats. Primer rate: 1L per 175 sqft.</div>
                  <div>• Tile quantities account for grout width additions prior to area division.</div>
                </>
              )}
              {activeCategory === "finance" && (
                <>
                  <div>• Floor cost multipliers: Ground floor = 1.0, Floor 2 = 1.12, Floor 3 = 1.24.</div>
                  <div>• Compound wall base rate is budgeted at 35% of building base rate.</div>
                  <div>• Contingency buffer accommodates steel/cement volatility spikes.</div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
