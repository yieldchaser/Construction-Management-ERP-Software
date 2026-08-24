"use client";

/**
 * Real, interactive construction calculators for the public Resources pages.
 *
 * These replace the dead, injected-HTML "tools" that never computed anything
 * (React strips inline onclick from dangerouslySetInnerHTML). Every formula
 * here mirrors the in-app civil-engineering calculators
 * (src/app/c/[company_id]/d/reports/calculators/page.tsx): IS 456 dry-volume
 * factor 1.54, IS 1786 rebar unit weight d^2 / 162.2, standard brick/mortar and
 * finishes takeoff. All results are live, validated (no NaN / negatives) and
 * theme-token styled so they work in both light and dark themes.
 */

import React from "react";

/* ------------------------------------------------------------------ helpers */

const num = (v: string | number, min = 0): number => {
  const n = typeof v === "number" ? v : parseFloat(v);
  if (!isFinite(n) || isNaN(n)) return min;
  return n < min ? min : n;
};

const fmt = (n: number, d = 2): string => {
  if (!isFinite(n) || isNaN(n)) return "0";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: d,
  });
};

const inputCls =
  "w-full bg-alx-surface-container-lowest border border-alx-outline-variant rounded-lg px-3 py-2.5 text-sm text-alx-on-surface focus:outline-none focus:ring-2 focus:ring-alx-primary/25 focus:border-alx-primary transition-colors";
const labelCls = "text-xs font-semibold text-alx-on-surface-variant";
const fieldCls = "space-y-1.5";

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className={fieldCls}>
      <label className={labelCls}>{label}</label>
      {children}
      {hint ? <p className="text-[11px] text-alx-on-surface-variant/80">{hint}</p> : null}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min = 0,
  step = "any",
  suffix,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  step?: string;
  suffix?: string;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(num(e.target.value, min))}
        className={inputCls + (suffix ? " pr-14" : "")}
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-alx-on-surface-variant">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

/**
 * When true, Shell omits its own eyebrow/title/subtitle. Set by CalcArticle,
 * which renders the page-level serif H1 above a full-width console and would
 * otherwise duplicate the heading.
 */
const HideConsoleHeaderContext = React.createContext(false);

function Shell({
  eyebrow,
  title,
  subtitle,
  form,
  result,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  form: React.ReactNode;
  result: React.ReactNode;
}) {
  const hideHeader = React.useContext(HideConsoleHeaderContext);
  // Every calculator here is already live: results recompute on every
  // keystroke, so "Calculate" isn't gating any math. It's a real, honest
  // affordance that scrolls the (sticky, off-screen-on-mobile) result panel
  // into view and gives a brief highlight pulse for tactile confirmation,
  // matching the stitch console's primary CTA without faking a submit step.
  const resultRef = React.useRef<HTMLDivElement>(null);
  const [pulsing, setPulsing] = React.useState(false);

  const handleCalculate = () => {
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setPulsing(true);
    window.setTimeout(() => setPulsing(false), 700);
  };

  return (
    <section className="not-prose rounded-2xl border border-alx-outline-variant/50 bg-alx-surface-container-lowest p-5 md:p-7 shadow-lg shadow-alx-on-surface/5">
      {!hideHeader && (
        <div className="mb-5">
          <span className="alx-label inline-block text-xs font-bold text-alx-primary bg-alx-primary-fixed/40 px-2.5 py-1 rounded-md">
            {eyebrow}
          </span>
          <h1 className="font-headline mt-3 text-2xl font-extrabold tracking-tight text-alx-on-surface">
            {title}
          </h1>
          <p className="font-body mt-1.5 text-sm text-alx-on-surface-variant leading-relaxed max-w-2xl">
            {subtitle}
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 space-y-5">
          {form}
          <button
            type="button"
            onClick={handleCalculate}
            className="w-full lg:hidden bg-alx-primary text-alx-on-primary font-uilabel text-sm font-bold py-3 rounded-lg hover:opacity-90 transition-all active:scale-[0.98]"
          >
            Calculate
          </button>
        </div>
        <div className="lg:col-span-2">
          <div
            ref={resultRef}
            className={
              "sticky top-24 rounded-xl border p-5 space-y-4 bg-alx-surface-container-low transition-shadow duration-300 " +
              (pulsing
                ? "border-alx-primary shadow-lg shadow-alx-primary/20"
                : "border-alx-outline-variant/40")
            }
          >
            <div className="flex items-center justify-between gap-3 border-b border-alx-outline-variant/30 pb-2.5">
              <h3 className="alx-label text-[11px] text-alx-on-surface-variant">Your Estimate</h3>
              <button
                type="button"
                onClick={handleCalculate}
                className="hidden lg:inline-flex shrink-0 items-center bg-alx-primary text-alx-on-primary font-uilabel text-[11px] font-bold px-3.5 py-1.5 rounded-full hover:opacity-90 transition-all active:scale-[0.98]"
              >
                Calculate
              </button>
            </div>
            {result}
          </div>
        </div>
      </div>
      <p className="mt-5 text-[11px] text-alx-on-surface-variant/80 leading-relaxed">
        Estimates are indicative and follow standard Indian construction
        practice (IS 456, IS 1786, CPWD). Always verify against your site
        conditions, drawings and supplier data sheets before purchasing.
      </p>
    </section>
  );
}

function Stat({
  label,
  value,
  unit,
  big,
  note,
}: {
  label: string;
  value: string;
  unit?: string;
  big?: boolean;
  note?: string;
}) {
  return (
    <div className="rounded-lg border border-alx-outline-variant/40 bg-alx-surface-container-lowest p-3.5">
      <span className="alx-label block text-[10px] text-alx-on-surface-variant">
        {label}
      </span>
      <strong
        className={
          (big ? "text-2xl text-alx-primary" : "text-lg text-alx-on-surface") +
          " font-headline mt-1 block font-black"
        }
      >
        {value}
        {unit ? <span className="text-sm font-bold"> {unit}</span> : null}
      </strong>
      {note ? (
        <span className="mt-0.5 block text-[10px] italic text-alx-on-surface-variant">
          {note}
        </span>
      ) : null}
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={
            "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors " +
            (value === o.value
              ? "bg-alx-primary-fixed/50 border-alx-primary text-alx-primary"
              : "border-alx-outline-variant text-alx-on-surface-variant hover:text-alx-on-surface hover:border-alx-outline")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------- 1. Paint quantity */

interface Room {
  l: number;
  w: number;
  h: number;
}

const PAINT_COVERAGE: Record<string, number> = {
  economy: 120,
  premium: 140,
  luxury: 155,
  texture: 80,
  exterior: 120,
  "exterior-premium": 140,
  acrylic: 95,
};

function PaintCalculator() {
  const [mode, setMode] = React.useState<"interior" | "exterior">("interior");
  const [rooms, setRooms] = React.useState<Room[]>([{ l: 15, w: 12, h: 10 }]);
  const [deductDoors, setDeductDoors] = React.useState(true);
  const [deductWindows, setDeductWindows] = React.useState(true);
  const [includeCeiling, setIncludeCeiling] = React.useState(false);
  const [doors, setDoors] = React.useState(2);
  const [windows, setWindows] = React.useState(3);
  const [coats, setCoats] = React.useState(2);
  const [paintType, setPaintType] = React.useState("premium");
  const [primer, setPrimer] = React.useState(true);
  const [putty, setPutty] = React.useState(false);

  const setRoom = (i: number, key: keyof Room, v: number) =>
    setRooms((r) => r.map((room, idx) => (idx === i ? { ...room, [key]: v } : room)));

  const wallArea = rooms.reduce((s, r) => s + 2 * (r.l + r.w) * r.h, 0);
  const ceilingArea = rooms.reduce((s, r) => s + r.l * r.w, 0);
  const doorArea = deductDoors ? doors * 21 : 0;
  const windowArea = deductWindows ? windows * 12 : 0;
  const gross = wallArea + (includeCeiling ? ceilingArea : 0);
  const paintable = Math.max(0, gross - doorArea - windowArea);
  const coverage =
    PAINT_COVERAGE[mode === "exterior" ? "exterior-premium" : paintType] || 140;
  const litres = (paintable / coverage) * coats * 1.1;
  const primerL = primer ? (paintable / 175) * 1.05 : 0;
  const puttyKg = putty ? (paintable / 100) * 2.25 * 1.1 : 0;

  return (
    <Shell
      eyebrow="Free Construction Tool"
      title="Paint Quantity Calculator"
      subtitle="Enter your room dimensions to instantly estimate litres of paint, primer and putty for interior or exterior walls."
      form={
        <>
          <Field label="Wall type">
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: "interior", label: "Interior walls" },
                { value: "exterior", label: "Exterior walls" },
              ]}
            />
          </Field>

          <Field label="Rooms (feet)">
            <div className="space-y-2">
              {rooms.map((r, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                  <NumberInput value={r.l} onChange={(v) => setRoom(i, "l", v)} suffix="L ft" />
                  <NumberInput value={r.w} onChange={(v) => setRoom(i, "w", v)} suffix="W ft" />
                  <NumberInput value={r.h} onChange={(v) => setRoom(i, "h", v)} suffix="H ft" />
                  <button
                    type="button"
                    aria-label="Remove room"
                    disabled={rooms.length === 1}
                    onClick={() => setRooms((rr) => rr.filter((_, idx) => idx !== i))}
                    className="h-[38px] px-3 rounded-lg border border-alx-outline-variant text-alx-on-surface-variant hover:text-alx-on-surface disabled:opacity-40"
                  >
                    −
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setRooms((r) => [...r, { l: 12, w: 10, h: 10 }])}
                className="text-xs font-semibold text-alx-primary hover:underline"
              >
                + Add another room
              </button>
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Number of doors">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={deductDoors} onChange={(e) => setDeductDoors(e.target.checked)} className="h-4 w-4 accent-[var(--color-alx-primary)]" />
                <NumberInput value={doors} onChange={setDoors} suffix="× 21 sqft" />
              </div>
            </Field>
            <Field label="Number of windows">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={deductWindows} onChange={(e) => setDeductWindows(e.target.checked)} className="h-4 w-4 accent-[var(--color-alx-primary)]" />
                <NumberInput value={windows} onChange={setWindows} suffix="× 12 sqft" />
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Paint grade (single-coat coverage)">
              <select value={paintType} onChange={(e) => setPaintType(e.target.value)} className={inputCls} disabled={mode === "exterior"}>
                <option value="economy">Economy emulsion (120 sqft/L)</option>
                <option value="premium">Premium emulsion (140 sqft/L)</option>
                <option value="luxury">Luxury / sheen (155 sqft/L)</option>
                <option value="texture">Texture paint (80 sqft/L)</option>
                {mode === "exterior" && <option value="exterior-premium">Exterior premium (140 sqft/L)</option>}
              </select>
            </Field>
            <Field label="Number of coats">
              <Segmented
                value={String(coats)}
                onChange={(v) => setCoats(Number(v))}
                options={[
                  { value: "1", label: "1 coat" },
                  { value: "2", label: "2 coats" },
                  { value: "3", label: "3 coats" },
                ]}
              />
            </Field>
          </div>

          <Field label="Extras">
            <div className="flex flex-wrap gap-4 text-xs text-alx-on-surface-variant">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={includeCeiling} onChange={(e) => setIncludeCeiling(e.target.checked)} className="h-4 w-4 accent-[var(--color-alx-primary)]" />
                Include ceiling
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={primer} onChange={(e) => setPrimer(e.target.checked)} className="h-4 w-4 accent-[var(--color-alx-primary)]" />
                Wall primer
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={putty} onChange={(e) => setPutty(e.target.checked)} className="h-4 w-4 accent-[var(--color-alx-primary)]" />
                Wall putty
              </label>
            </div>
          </Field>
        </>
      }
      result={
        <div className="space-y-3">
          <Stat label="Paintable area" value={fmt(paintable, 0)} unit="sqft" note={`Gross ${fmt(gross, 0)} sqft less ${fmt(doorArea + windowArea, 0)} sqft openings`} />
          <Stat label={`Paint (${coats} ${coats === 1 ? "coat" : "coats"}, +10% wastage)`} value={fmt(litres, 1)} unit="litres" big />
          <div className="grid grid-cols-2 gap-3">
            {primer ? <Stat label="Primer (1 coat)" value={fmt(primerL, 1)} unit="L" /> : null}
            {putty ? <Stat label="Putty (2 coats)" value={fmt(puttyKg, 0)} unit="kg" /> : null}
          </div>
        </div>
      }
    />
  );
}

/* ------------------------------------------------------------- 2. Brick wall */

function BrickCalculator() {
  const [l, setL] = React.useState(5);
  const [h, setH] = React.useState(3);
  const [thickness, setThickness] = React.useState(230); // mm -> leaves
  const [preset, setPreset] = React.useState<"india" | "india_trad" | "uk" | "us">("india");
  const [ratio, setRatio] = React.useState("1:6");
  const [wastage, setWastage] = React.useState(10);
  const [mortarJoint, setMortarJoint] = React.useState(10); // mm — editable
  const [pricePerBrick, setPricePerBrick] = React.useState(0);

  const BRICK_PRESETS: Record<string, [number, number, number]> = {
    india: [190, 90, 90],
    india_trad: [230, 110, 75],
    uk: [215, 102, 65],
    us: [203, 92, 95],
  };
  const [bl, bw, bh] = BRICK_PRESETS[preset] || BRICK_PRESETS.india;
  // Same rule as the server brick calculator: leaves are derived from the
  // wall thickness over one nominal leaf (brick width + joint); a supplied
  // count never overrides it.
  const leaves = Math.max(1, Math.round(thickness / (bw + mortarJoint)));
  const faceArea = ((bl + mortarJoint) / 1000) * ((bh + mortarJoint) / 1000);
  const wallArea = l * h;
  const bricks = Math.ceil((wallArea / faceArea) * leaves * (1 + wastage / 100));

  const wallVol = wallArea * (thickness / 1000);
  const brickVol = (bl / 1000) * (bw / 1000) * (bh / 1000);
  const netBricks = (wallArea / faceArea) * leaves;
  const mortarVol = Math.max(0, wallVol - netBricks * brickVol);
  // Same sanity guard as the server: real masonry has roughly 20-35% mortar
  // by volume, so anything outside the band is flagged instead of quoted.
  const mortarShare = wallVol > 0 ? mortarVol / wallVol : 0;
  const geometryOk = wallArea > 0 && mortarShare >= 0.2 && mortarShare <= 0.35;
  const dryMortar = mortarVol * 1.33;
  const [cp, sp] = ratio.split(":").map((x) => parseFloat(x));
  const total = cp + sp;
  const cementBags = (dryMortar * (cp / total) * 1440) / 50;
  const sandM3 = dryMortar * (sp / total);
  const estimatedCost = pricePerBrick > 0 ? bricks * pricePerBrick : 0;

  return (
    <Shell
      eyebrow="Free Construction Tool"
      title="Brick Calculator for Walls"
      subtitle="Estimate the number of bricks and the cement / sand mortar required for a masonry wall using India, UK (BS 3921) or US (ASTM) brick sizes."
      form={
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Wall length"><NumberInput value={l} onChange={setL} suffix="m" /></Field>
            <Field label="Wall height"><NumberInput value={h} onChange={setH} suffix="m" /></Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Wall thickness">
              <select value={thickness} onChange={(e) => setThickness(Number(e.target.value))} className={inputCls}>
                <option value={115}>115 mm, 4.5&quot; half brick (single leaf)</option>
                <option value={230}>230 mm, 9&quot; full brick (double leaf)</option>
              </select>
            </Field>
            <Field label="Brick size standard">
              <select value={preset} onChange={(e) => setPreset(e.target.value as any)} className={inputCls}>
                <option value="india">India Modular — 190 × 90 × 90 mm</option>
                <option value="india_trad">India Traditional — 230 × 110 × 75 mm</option>
                <option value="uk">UK (BS 3921) — 215 × 102 × 65 mm</option>
                <option value="us">US (ASTM) — 203 × 92 × 95 mm</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Mortar joint" hint="Standard 10 mm">
              <NumberInput value={mortarJoint} onChange={setMortarJoint} suffix="mm" />
            </Field>
            <Field label="Mortar mix (cement : sand)">
              <select value={ratio} onChange={(e) => setRatio(e.target.value)} className={inputCls}>
                <option value="1:3">1:3 (high strength)</option>
                <option value="1:4">1:4 (external walls)</option>
                <option value="1:6">1:6 (internal walls)</option>
              </select>
            </Field>
            <Field label="Wastage buffer"><NumberInput value={wastage} onChange={setWastage} suffix="%" /></Field>
          </div>
          <Field label="Price per brick (optional)" hint="Enter to see estimated cost">
            <NumberInput value={pricePerBrick} onChange={setPricePerBrick} suffix="₹" />
          </Field>
        </>
      }
      result={
        geometryOk ? (
          <div className="space-y-3">
            <Stat label="Bricks required" value={fmt(bricks, 0)} unit="nos" big note={`${leaves}-leaf wall from ${thickness} mm thickness, incl. ${wastage}% wastage`} />
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Cement" value={fmt(cementBags, 1)} unit="bags" />
              <Stat label="Sand" value={fmt(sandM3, 2)} unit="m³" />
            </div>
            <Stat label="Dry mortar volume" value={fmt(dryMortar, 3)} unit="m³" />
            {estimatedCost > 0 && <Stat label="Estimated brick cost" value={"₹" + fmt(estimatedCost, 0)} note={`${fmt(bricks, 0)} × ₹${fmt(pricePerBrick, 1)}`} />}
          </div>
        ) : (
          <p className="rounded-lg bg-alx-error-container text-alx-on-error-container text-xs leading-relaxed p-3.5">
            Inconsistent brickwork geometry: mortar works out to {fmt(mortarShare * 100, 0)}% of
            wall volume but should be between 20% and 35%. Check that the wall thickness matches
            the selected brick size (derived leaves: {leaves}). No estimate shown.
          </p>
        )
      }
    />
  );
}

/* --------------------------------------------------------- 3. Concrete volume */

function ConcreteVolumeCalculator() {
  const [shape, setShape] = React.useState<"slab" | "column" | "circular" | "footing" | "beam" | "stair">("slab");
  const [a, setA] = React.useState(5);
  const [b, setB] = React.useState(3);
  const [c, setC] = React.useState(0.15);
  const [wastage, setWastage] = React.useState(5);
  // Circular column
  const [circDia, setCircDia] = React.useState(0.45);
  const [circHeight, setCircHeight] = React.useState(3);
  const [circCount, setCircCount] = React.useState(1);
  // Stairs
  const [stairSteps, setStairSteps] = React.useState(14);
  const [stairWidth, setStairWidth] = React.useState(1.2);
  const [stairRiser, setStairRiser] = React.useState(0.15);
  const [stairTread, setStairTread] = React.useState(0.25);
  const [stairWaist, setStairWaist] = React.useState(0.15);

  const dims: Record<string, [string, string, string]> = {
    slab: ["Length (m)", "Width (m)", "Thickness (m)"],
    column: ["Width (m)", "Depth (m)", "Height (m)"],
    footing: ["Length (m)", "Width (m)", "Depth (m)"],
    beam: ["Length (m)", "Width (m)", "Depth (m)"],
  } as const;

  let wet = 0;
  if (shape === "circular") {
    wet = (Math.PI / 4) * circDia * circDia * circHeight * circCount;
  } else if (shape === "stair") {
    const stepsVol = stairSteps * stairWidth * ((stairRiser * stairTread) / 2);
    const waistLen = Math.sqrt(stairRiser ** 2 + stairTread ** 2);
    const waistVol = stairWaist * stairWidth * waistLen * stairSteps;
    wet = stepsVol + waistVol;
  } else {
    wet = a * b * c;
  }
  const dry = wet * 1.54 * (1 + wastage / 100);

  const showStandardDims = shape !== "circular" && shape !== "stair";
  const [la, lb, lc] = showStandardDims ? (dims[shape] || dims.slab) : ["", "", ""];

  return (
    <Shell
      eyebrow="Free Construction Tool"
      title="Concrete Volume Calculator"
      subtitle="Calculate wet concrete volume for a slab, column, circular column, footing, beam or staircase, and the dry material volume using the IS 456 factor of 1.54."
      form={
        <>
          <Field label="Element shape">
            <Segmented
              value={shape}
              onChange={setShape}
              options={[
                { value: "slab", label: "Slab" },
                { value: "column", label: "Column" },
                { value: "circular", label: "Circular Col." },
                { value: "footing", label: "Footing" },
                { value: "beam", label: "Beam" },
                { value: "stair", label: "Stairs" },
              ]}
            />
          </Field>
          {showStandardDims && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label={la}><NumberInput value={a} onChange={setA} /></Field>
              <Field label={lb}><NumberInput value={b} onChange={setB} /></Field>
              <Field label={lc}><NumberInput value={c} onChange={setC} /></Field>
            </div>
          )}
          {shape === "circular" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Diameter (m)"><NumberInput value={circDia} onChange={setCircDia} /></Field>
              <Field label="Height (m)"><NumberInput value={circHeight} onChange={setCircHeight} /></Field>
              <Field label="No. of columns"><NumberInput value={circCount} onChange={setCircCount} min={1} /></Field>
            </div>
          )}
          {shape === "stair" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Steps count"><NumberInput value={stairSteps} onChange={setStairSteps} min={1} /></Field>
              <Field label="Flight width (m)"><NumberInput value={stairWidth} onChange={setStairWidth} /></Field>
              <Field label="Riser height (m)"><NumberInput value={stairRiser} onChange={setStairRiser} /></Field>
              <Field label="Tread depth (m)"><NumberInput value={stairTread} onChange={setStairTread} /></Field>
              <Field label="Waist slab thickness (m)"><NumberInput value={stairWaist} onChange={setStairWaist} /></Field>
            </div>
          )}
          <Field label="Wastage buffer"><NumberInput value={wastage} onChange={setWastage} suffix="%" /></Field>
        </>
      }
      result={
        <div className="space-y-3">
          <Stat label="Wet concrete volume" value={fmt(wet, 3)} unit="m³" big />
          <Stat label="Dry material volume (× 1.54)" value={fmt(dry, 3)} unit="m³" note={`Includes ${wastage}% wastage`} />
        </div>
      }
    />
  );
}

/* ------------------------------------------------------------ 4. Concrete mix */

const MIX: Record<string, { ratio: string; parts: [number, number, number] }> = {
  M5: { ratio: "1:5:10", parts: [1, 5, 10] },
  M7_5: { ratio: "1:4:8", parts: [1, 4, 8] },
  M10: { ratio: "1:3:6", parts: [1, 3, 6] },
  M15: { ratio: "1:2:4", parts: [1, 2, 4] },
  M20: { ratio: "1:1.5:3", parts: [1, 1.5, 3] },
  M25: { ratio: "1:1:2", parts: [1, 1, 2] },
};

function ConcreteMixCalculator() {
  const [grade, setGrade] = React.useState("M20");
  const [wet, setWet] = React.useState(1);
  const [wcRatio, setWcRatio] = React.useState(0.5);
  const [cementRate, setCementRate] = React.useState(0); // per bag
  const [sandRate, setSandRate] = React.useState(0); // per m³
  const [aggRate, setAggRate] = React.useState(0); // per m³

  const { ratio, parts } = MIX[grade];
  const sum = parts[0] + parts[1] + parts[2];
  const dry = wet * 1.54;
  const cementVol = (dry * parts[0]) / sum;
  const cementKg = cementVol * 1440;
  const bags = cementKg / 50;
  const sandM3 = (dry * parts[1]) / sum;
  const aggM3 = (dry * parts[2]) / sum;
  const waterL = cementKg * wcRatio;
  const materialCost = (cementRate > 0 ? Math.ceil(bags) * cementRate : 0) + (sandRate > 0 ? sandM3 * sandRate : 0) + (aggRate > 0 ? aggM3 * aggRate : 0);
  const showCost = cementRate > 0 || sandRate > 0 || aggRate > 0;

  return (
    <Shell
      eyebrow="Free Construction Tool"
      title="Concrete Mix Calculator"
      subtitle="Work out cement (bags), sand, aggregate and water for a nominal concrete mix from the grade ratio and wet volume, using the 1.54 dry-volume factor."
      form={
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Concrete grade">
              <select value={grade} onChange={(e) => setGrade(e.target.value)} className={inputCls}>
                {Object.entries(MIX).map(([g, m]) => (
                  <option key={g} value={g}>{g.replace("_", ".")} ({m.ratio})</option>
                ))}
              </select>
            </Field>
            <Field label="Wet concrete volume"><NumberInput value={wet} onChange={setWet} suffix="m³" /></Field>
          </div>
          <Field label="Water–cement ratio" hint="Typical 0.4–0.6 for nominal mixes">
            <NumberInput value={wcRatio} onChange={setWcRatio} step="0.05" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Cement rate / bag" hint="Optional"><NumberInput value={cementRate} onChange={setCementRate} suffix="₹" /></Field>
            <Field label="Sand rate / m³" hint="Optional"><NumberInput value={sandRate} onChange={setSandRate} suffix="₹" /></Field>
            <Field label="Aggregate rate / m³" hint="Optional"><NumberInput value={aggRate} onChange={setAggRate} suffix="₹" /></Field>
          </div>
        </>
      }
      result={
        <div className="space-y-3">
          <Stat label={`Cement (${ratio})`} value={fmt(bags, 1)} unit="bags" big note={`${fmt(cementKg, 0)} kg`} />
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Sand" value={fmt(sandM3, 2)} unit="m³" />
            <Stat label="Aggregate" value={fmt(aggM3, 2)} unit="m³" />
          </div>
          <Stat label="Water" value={fmt(waterL, 0)} unit="litres" note={`Dry volume ${fmt(dry, 2)} m³`} />
          {showCost && <Stat label="Estimated material cost" value={"₹" + fmt(materialCost, 0)} big />}
        </div>
      }
    />
  );
}

/* ------------------------------------------------------------ 5. Steel weight */

interface Bar {
  dia: number;
  length: number;
  qty: number;
}

function SteelCalculator() {
  const [mode, setMode] = React.useState<"quick" | "column" | "oneway" | "twoway">("quick");
  const [rate, setRate] = React.useState(62);
  const [wastage, setWastage] = React.useState(5);

  // Quick weight table
  const [bars, setBars] = React.useState<Bar[]>([{ dia: 12, length: 12, qty: 10 }]);
  const setBar = (i: number, key: keyof Bar, v: number) =>
    setBars((b) => b.map((bar, idx) => (idx === i ? { ...bar, [key]: v } : bar)));

  // Column mode
  const [colA, setColA] = React.useState(450);
  const [colB, setColB] = React.useState(300);
  const [colH, setColH] = React.useState(3000);
  const [colSlab, setColSlab] = React.useState(150);
  const [colCover, setColCover] = React.useState(40);
  const [colBar1Dia, setColBar1Dia] = React.useState(20);
  const [colBar1Count, setColBar1Count] = React.useState(4);
  const [colBar2Dia, setColBar2Dia] = React.useState(16);
  const [colBar2Count, setColBar2Count] = React.useState(4);
  const [colStirDia, setColStirDia] = React.useState(8);
  const [colSpEnd, setColSpEnd] = React.useState(150);
  const [colSpMid, setColSpMid] = React.useState(200);

  // Slab shared
  const [slabLx, setSlabLx] = React.useState(4000);
  const [slabLy, setSlabLy] = React.useState(8000);
  const [slabDevLen, setSlabDevLen] = React.useState(300);
  const [slabMainDia, setSlabMainDia] = React.useState(12);
  const [slabMainSp, setSlabMainSp] = React.useState(150);
  const [slabDistDia, setSlabDistDia] = React.useState(8);
  const [slabDistSp, setSlabDistSp] = React.useState(200);

  // Two-way extra
  const [tw2Lx, setTw2Lx] = React.useState(4000);
  const [tw2Ly, setTw2Ly] = React.useState(5000);
  const [tw2XDia, setTw2XDia] = React.useState(12);
  const [tw2XSp, setTw2XSp] = React.useState(150);
  const [tw2YDia, setTw2YDia] = React.useState(10);
  const [tw2YSp, setTw2YSp] = React.useState(150);
  const [tw2DevLen, setTw2DevLen] = React.useState(300);

  // ---- Calculations ----
  // Quick weight
  const qRows = bars.map((b) => { const u = (b.dia * b.dia) / 162.2; return { ...b, unit: u, weight: u * b.length * b.qty }; });
  const qTotal = qRows.reduce((s, r) => s + r.weight, 0);

  // Column
  const uw1 = (colBar1Dia * colBar1Dia) / 162.2;
  const cutLen1 = (colH + colSlab + 50 * colBar1Dia) / 1000;
  const bar1W = uw1 * cutLen1 * colBar1Count;
  const uw2 = colBar2Dia > 0 ? (colBar2Dia * colBar2Dia) / 162.2 : 0;
  const cutLen2 = colBar2Dia > 0 ? (colH + colSlab + 50 * colBar2Dia) / 1000 : 0;
  const bar2W = uw2 * cutLen2 * colBar2Count;
  const stirUW = (colStirDia * colStirDia) / 162.2;
  const stirCutLen = (2 * ((colA - 2 * colCover) + (colB - 2 * colCover)) + 2 * 10 * colStirDia) / 1000;
  const lo = Math.max(colH / 6, Math.max(colA, colB), 450);
  const stirEnd = Math.ceil(lo / colSpEnd) + 1;
  const stirMid = Math.max(0, Math.floor((colH - 2 * lo) / colSpMid) - 1);
  const stirCount = 2 * stirEnd + stirMid;
  const stirW = stirUW * stirCutLen * stirCount;
  const colNet = bar1W + bar2W + stirW;
  const colTotal = colNet * (1 + wastage / 100);

  // One-way slab
  const ow1UW = (slabMainDia * slabMainDia) / 162.2;
  const owMainCount = Math.ceil(slabLy / slabMainSp) + 1;
  const owMainCutLen = (slabLx + 2 * slabDevLen) / 1000;
  const owMainW = ow1UW * owMainCutLen * owMainCount;
  const owDistUW = (slabDistDia * slabDistDia) / 162.2;
  const owDistCount = Math.ceil(slabLx / slabDistSp) + 1;
  const owDistCutLen = (slabLy + 2 * slabDevLen) / 1000;
  const owDistW = owDistUW * owDistCutLen * owDistCount;
  const owNet = owMainW + owDistW;
  const owTotal = owNet * (1 + wastage / 100);
  const owArea = (slabLx / 1000) * (slabLy / 1000);

  // Two-way slab
  const twXUW = (tw2XDia * tw2XDia) / 162.2;
  const twXCount = Math.ceil(tw2Ly / tw2XSp) + 1;
  const twXCutLen = (tw2Lx + 2 * tw2DevLen) / 1000;
  const twXW = twXUW * twXCutLen * twXCount;
  const twYUW = (tw2YDia * tw2YDia) / 162.2;
  const twYCount = Math.ceil(tw2Lx / tw2YSp) + 1;
  const twYCutLen = (tw2Ly + 2 * tw2DevLen) / 1000;
  const twYW = twYUW * twYCutLen * twYCount;
  const twNet = twXW + twYW;
  const twTotal = twNet * (1 + wastage / 100);
  const twArea = (tw2Lx / 1000) * (tw2Ly / 1000);

  // Active total for cost
  const activeTotal = mode === "quick" ? qTotal : mode === "column" ? colTotal : mode === "oneway" ? owTotal : twTotal;

  return (
    <Shell
      eyebrow="Free Construction Tool"
      title="Steel Calculator for Construction"
      subtitle="Calculate reinforcement steel weight for columns (IS 13920 dual-zone stirrups), one-way slabs, two-way slabs, or a quick bar-weight table using d² ÷ 162.2."
      form={
        <>
          <Field label="Calculation mode">
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: "quick", label: "Quick Weight" },
                { value: "column", label: "Column" },
                { value: "oneway", label: "One-Way Slab" },
                { value: "twoway", label: "Two-Way Slab" },
              ]}
            />
          </Field>

          {mode === "quick" && (
            <Field label="Reinforcement bars">
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-[10px] font-semibold uppercase tracking-wide text-alx-on-surface-variant px-1">
                  <span>Dia (mm)</span><span>Length (m)</span><span>Qty (nos)</span><span></span>
                </div>
                {bars.map((b, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                    <select value={b.dia} onChange={(e) => setBar(i, "dia", Number(e.target.value))} className={inputCls}>
                      {[6, 8, 10, 12, 16, 20, 25, 32, 40].map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <NumberInput value={b.length} onChange={(v) => setBar(i, "length", v)} />
                    <NumberInput value={b.qty} onChange={(v) => setBar(i, "qty", v)} />
                    <button type="button" aria-label="Remove bar" disabled={bars.length === 1} onClick={() => setBars((bb) => bb.filter((_, idx) => idx !== i))} className="h-[38px] px-3 rounded-lg border border-alx-outline-variant text-alx-on-surface-variant hover:text-alx-on-surface disabled:opacity-40">−</button>
                  </div>
                ))}
                <button type="button" onClick={() => setBars((b) => [...b, { dia: 16, length: 12, qty: 4 }])} className="text-xs font-semibold text-alx-primary hover:underline">
                  + Add bar size
                </button>
              </div>
            </Field>
          )}

          {mode === "column" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Column size A (mm)"><NumberInput value={colA} onChange={setColA} suffix="mm" /></Field>
                <Field label="Column size B (mm)"><NumberInput value={colB} onChange={setColB} suffix="mm" /></Field>
                <Field label="Column height (mm)"><NumberInput value={colH} onChange={setColH} suffix="mm" /></Field>
                <Field label="Slab thickness (mm)"><NumberInput value={colSlab} onChange={setColSlab} suffix="mm" /></Field>
                <Field label="Clear cover (mm)"><NumberInput value={colCover} onChange={setColCover} suffix="mm" /></Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Main bar 1 diameter">
                  <select value={colBar1Dia} onChange={(e) => setColBar1Dia(Number(e.target.value))} className={inputCls}>
                    {[8, 10, 12, 16, 20, 25, 32].map((d) => <option key={d} value={d}>{d} mm</option>)}
                  </select>
                </Field>
                <Field label="Main bar 1 count"><NumberInput value={colBar1Count} onChange={setColBar1Count} /></Field>
                <Field label="Main bar 2 diameter (optional)">
                  <select value={colBar2Dia} onChange={(e) => setColBar2Dia(Number(e.target.value))} className={inputCls}>
                    <option value={0}>None</option>
                    {[8, 10, 12, 16, 20, 25].map((d) => <option key={d} value={d}>{d} mm</option>)}
                  </select>
                </Field>
                <Field label="Main bar 2 count"><NumberInput value={colBar2Count} onChange={setColBar2Count} /></Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Stirrup diameter">
                  <select value={colStirDia} onChange={(e) => setColStirDia(Number(e.target.value))} className={inputCls}>
                    {[6, 8, 10, 12].map((d) => <option key={d} value={d}>{d} mm</option>)}
                  </select>
                </Field>
                <Field label="End zone spacing (l/4)" hint="IS 13920 confining zone"><NumberInput value={colSpEnd} onChange={setColSpEnd} suffix="mm" /></Field>
                <Field label="Mid-span spacing"><NumberInput value={colSpMid} onChange={setColSpMid} suffix="mm" /></Field>
              </div>
            </>
          )}

          {mode === "oneway" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Shorter span Lx (mm)" hint="Main bars direction"><NumberInput value={slabLx} onChange={setSlabLx} suffix="mm" /></Field>
                <Field label="Longer span Ly (mm)" hint="Distribution bars direction"><NumberInput value={slabLy} onChange={setSlabLy} suffix="mm" /></Field>
                <Field label="Development length Ld (per end)"><NumberInput value={slabDevLen} onChange={setSlabDevLen} suffix="mm" /></Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Main bar diameter">
                  <select value={slabMainDia} onChange={(e) => setSlabMainDia(Number(e.target.value))} className={inputCls}>
                    {[8, 10, 12, 16, 20].map((d) => <option key={d} value={d}>{d} mm</option>)}
                  </select>
                </Field>
                <Field label="Main bar spacing c/c"><NumberInput value={slabMainSp} onChange={setSlabMainSp} suffix="mm" /></Field>
                <Field label="Distribution bar diameter">
                  <select value={slabDistDia} onChange={(e) => setSlabDistDia(Number(e.target.value))} className={inputCls}>
                    {[8, 10, 12, 16].map((d) => <option key={d} value={d}>{d} mm</option>)}
                  </select>
                </Field>
                <Field label="Distribution bar spacing c/c"><NumberInput value={slabDistSp} onChange={setSlabDistSp} suffix="mm" /></Field>
              </div>
            </>
          )}

          {mode === "twoway" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Shorter span Lx (mm)" hint="Bottom bars — more steel"><NumberInput value={tw2Lx} onChange={setTw2Lx} suffix="mm" /></Field>
                <Field label="Longer span Ly (mm)" hint="Top bars — less steel"><NumberInput value={tw2Ly} onChange={setTw2Ly} suffix="mm" /></Field>
                <Field label="Development length Ld (per end)"><NumberInput value={tw2DevLen} onChange={setTw2DevLen} suffix="mm" /></Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Shorter span bar diameter">
                  <select value={tw2XDia} onChange={(e) => setTw2XDia(Number(e.target.value))} className={inputCls}>
                    {[8, 10, 12, 16, 20].map((d) => <option key={d} value={d}>{d} mm</option>)}
                  </select>
                </Field>
                <Field label="Shorter span spacing c/c"><NumberInput value={tw2XSp} onChange={setTw2XSp} suffix="mm" /></Field>
                <Field label="Longer span bar diameter">
                  <select value={tw2YDia} onChange={(e) => setTw2YDia(Number(e.target.value))} className={inputCls}>
                    {[8, 10, 12, 16].map((d) => <option key={d} value={d}>{d} mm</option>)}
                  </select>
                </Field>
                <Field label="Longer span spacing c/c"><NumberInput value={tw2YSp} onChange={setTw2YSp} suffix="mm" /></Field>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mode !== "quick" && <Field label="Wastage buffer"><NumberInput value={wastage} onChange={setWastage} suffix="%" /></Field>}
            <Field label="Steel rate (optional)"><NumberInput value={rate} onChange={setRate} suffix="₹/kg" /></Field>
          </div>
        </>
      }
      result={
        <div className="space-y-3">
          {mode === "quick" && (
            <>
              {qRows.map((r, i) => (
                <div key={i} className="flex justify-between text-xs text-alx-on-surface-variant">
                  <span>{r.dia} mm × {fmt(r.length, 1)} m × {r.qty}</span>
                  <span className="font-semibold text-alx-on-surface">{fmt(r.weight, 1)} kg</span>
                </div>
              ))}
              <Stat label="Total steel weight" value={fmt(qTotal, 1)} unit="kg" big />
            </>
          )}
          {mode === "column" && (
            <>
              <Stat label="Main bar 1 weight" value={fmt(bar1W, 2)} unit="kg" note={`${colBar1Count} × ${colBar1Dia}mm, ${fmt(cutLen1, 2)}m each`} />
              {colBar2Dia > 0 && <Stat label="Main bar 2 weight" value={fmt(bar2W, 2)} unit="kg" note={`${colBar2Count} × ${colBar2Dia}mm`} />}
              <Stat label="Stirrups weight" value={fmt(stirW, 2)} unit="kg" note={`${stirCount} stirrups (end ${stirEnd}×2 + mid ${stirMid})`} />
              <Stat label="Total column steel" value={fmt(colTotal, 1)} unit="kg" big note={`Net ${fmt(colNet, 1)} kg + ${wastage}% wastage`} />
            </>
          )}
          {mode === "oneway" && (
            <>
              <Stat label="Main bars" value={fmt(owMainW, 1)} unit="kg" note={`${owMainCount} bars × ${slabMainDia}mm`} />
              <Stat label="Distribution bars" value={fmt(owDistW, 1)} unit="kg" note={`${owDistCount} bars × ${slabDistDia}mm`} />
              <Stat label="Total slab steel" value={fmt(owTotal, 1)} unit="kg" big note={`${fmt(owNet / owArea, 1)} kg/m² · Area ${fmt(owArea, 1)} m²`} />
            </>
          )}
          {mode === "twoway" && (
            <>
              <Stat label="Shorter span bars (Lx)" value={fmt(twXW, 1)} unit="kg" note={`${twXCount} bars × ${tw2XDia}mm`} />
              <Stat label="Longer span bars (Ly)" value={fmt(twYW, 1)} unit="kg" note={`${twYCount} bars × ${tw2YDia}mm`} />
              <Stat label="Total slab steel" value={fmt(twTotal, 1)} unit="kg" big note={`${fmt(twNet / twArea, 1)} kg/m² · Area ${fmt(twArea, 1)} m²`} />
            </>
          )}
          {rate > 0 ? <Stat label="Estimated cost" value={"₹" + fmt(activeTotal * rate, 0)} /> : null}
        </div>
      }
    />
  );
}

/* -------------------------------------------------- 6. Bar bending schedule */

function BarBendingScheduleCalculator() {
  const [dia, setDia] = React.useState(12);
  const [clearLen, setClearLen] = React.useState(3000); // mm
  const [dimB, setDimB] = React.useState(450); // mm — for stirrup/L-bend
  const [bends90, setBends90] = React.useState(2);
  const [bends135, setBends135] = React.useState(0);
  const [hooks, setHooks] = React.useState(0);
  const [qty, setQty] = React.useState(20);
  const [hookStd, setHookStd] = React.useState<"is2502" | "is13920">("is2502");
  const [shape, setShape] = React.useState("straight");
  const [cover, setCover] = React.useState(25);
  const [laps, setLaps] = React.useState(0);
  // Project metadata
  const [projName, setProjName] = React.useState("");
  const [drawingNo, setDrawingNo] = React.useState("");
  const [preparedBy, setPreparedBy] = React.useState("");

  const hookD = hookStd === "is13920" ? 12 : 9;
  const hookLabel = hookStd === "is13920" ? "IS 13920 (12d seismic)" : "IS 2502 (9d standard)";

  // Shape presets auto-calculate cutting length
  let cutting = 0;
  let formulaNote = "";
  if (shape === "straight") {
    const hookAllow = hooks * hookD * dia;
    const bendDeduct = bends90 * 2 * dia + bends135 * 3 * dia;
    const lapAdd = laps * 50 * dia;
    cutting = Math.max(0, clearLen + hookAllow - bendDeduct + lapAdd);
    formulaNote = `Clear ${clearLen}mm + ${hooks}×${hookD}d hooks − ${bends90}×2d − ${bends135}×3d bends + ${laps}×50d laps`;
  } else if (shape === "rect_stirrup") {
    const hookAllow = 2 * hookD * dia;
    const bendDeduct = 4 * 2 * dia;
    cutting = Math.max(0, 2 * (clearLen + dimB) - bendDeduct + hookAllow - 4 * cover);
    formulaNote = `2(${clearLen}+${dimB}) − 4×2d bends + 2×${hookD}d hooks − 4×${cover}mm cover`;
  } else if (shape === "l_bend") {
    const hookAllow = hooks * hookD * dia;
    cutting = Math.max(0, clearLen + dimB - 2 * dia + hookAllow);
    formulaNote = `A(${clearLen}) + B(${dimB}) − 2d corner + ${hooks}×${hookD}d hooks`;
  } else if (shape === "u_bar") {
    const hookAllow = 2 * hookD * dia;
    cutting = Math.max(0, clearLen + 2 * dimB - 4 * dia + hookAllow);
    formulaNote = `A(${clearLen}) + 2×B(${dimB}) − 2×2d bends + 2×${hookD}d hooks`;
  } else if (shape === "cranked") {
    const rise = dimB; // rise = slab depth - covers - dia
    cutting = Math.max(0, clearLen + 2 * 0.42 * rise - 2 * dia);
    formulaNote = `Straight(${clearLen}) + 2×0.42×rise(${rise}) − 2×1d per SP34`;
  } else if (shape === "circular") {
    const meanDia = clearLen - 2 * cover - dia; // clearLen = element diameter
    const overlap = 2 * hookD * dia;
    cutting = Math.max(0, Math.PI * meanDia + overlap);
    formulaNote = `π × mean dia (${fmt(meanDia, 0)}mm) + ${hookD}d overlap each end`;
  }

  const cuttingM = cutting / 1000;
  const unit = (dia * dia) / 162.2;
  const weightEach = unit * cuttingM;
  const totalLen = cuttingM * qty;
  const totalWeight = weightEach * qty;

  return (
    <Shell
      eyebrow="Free Construction Tool"
      title="Bar Bending Schedule Calculator"
      subtitle="Compute cutting length and steel weight for bars of various shapes (straight, stirrup, L-bend, U-bar, cranked, circular) with IS 2502 or IS 13920 hook standards."
      form={
        <>
          {/* Project Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Project name (optional)">
              <input type="text" value={projName} onChange={(e) => setProjName(e.target.value)} placeholder="e.g. Villa B-12" className={inputCls} />
            </Field>
            <Field label="Drawing no.">
              <input type="text" value={drawingNo} onChange={(e) => setDrawingNo(e.target.value)} placeholder="DWG-001" className={inputCls} />
            </Field>
            <Field label="Prepared by">
              <input type="text" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} placeholder="Engineer name" className={inputCls} />
            </Field>
          </div>

          <Field label="Bar shape">
            <Segmented
              value={shape}
              onChange={setShape}
              options={[
                { value: "straight", label: "Straight" },
                { value: "rect_stirrup", label: "Rect. Stirrup" },
                { value: "l_bend", label: "L-Bend" },
                { value: "u_bar", label: "U-Bar" },
                { value: "cranked", label: "Cranked" },
                { value: "circular", label: "Circular" },
              ]}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Bar diameter">
              <select value={dia} onChange={(e) => setDia(Number(e.target.value))} className={inputCls}>
                {[6, 8, 10, 12, 16, 20, 25, 32].map((d) => <option key={d} value={d}>{d} mm</option>)}
              </select>
            </Field>
            <Field label={shape === "circular" ? "Element diameter (mm)" : "Dim A / clear length (mm)"}>
              <NumberInput value={clearLen} onChange={setClearLen} suffix="mm" />
            </Field>
          </div>

          {(shape === "rect_stirrup" || shape === "l_bend" || shape === "u_bar" || shape === "cranked") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={shape === "cranked" ? "Rise height (mm)" : "Dim B (mm)"}>
                <NumberInput value={dimB} onChange={setDimB} suffix="mm" />
              </Field>
              <Field label="Clear cover (mm)"><NumberInput value={cover} onChange={setCover} suffix="mm" /></Field>
            </div>
          )}

          {shape === "straight" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="90° bends"><NumberInput value={bends90} onChange={setBends90} /></Field>
              <Field label="135° bends"><NumberInput value={bends135} onChange={setBends135} /></Field>
              <Field label="Hooks"><NumberInput value={hooks} onChange={setHooks} /></Field>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Hook standard">
              <Segmented
                value={hookStd}
                onChange={setHookStd}
                options={[
                  { value: "is2502", label: "IS 2502 (9d)" },
                  { value: "is13920", label: "IS 13920 (12d)" },
                ]}
              />
            </Field>
            <Field label="Laps (50d each)"><NumberInput value={laps} onChange={setLaps} /></Field>
          </div>

          <Field label="Number of bars"><NumberInput value={qty} onChange={setQty} suffix="nos" /></Field>
        </>
      }
      result={
        <div className="space-y-3">
          {(projName || drawingNo) && (
            <div className="text-[10px] text-alx-on-surface-variant border-b border-alx-outline-variant/30 pb-2 mb-1">
              {projName && <span className="block"><strong>Project:</strong> {projName}</span>}
              {drawingNo && <span className="block"><strong>Dwg:</strong> {drawingNo}</span>}
              {preparedBy && <span className="block"><strong>By:</strong> {preparedBy}</span>}
            </div>
          )}
          <Stat label="Cutting length (each)" value={fmt(cutting, 0)} unit="mm" note={formulaNote} />
          <Stat label="Weight (each)" value={fmt(weightEach, 3)} unit="kg" note={`Hook std: ${hookLabel}`} />
          <Stat label={`Total steel (${qty} bars)`} value={fmt(totalWeight, 2)} unit="kg" big note={`${fmt(totalLen, 1)} m total length`} />
        </div>
      }
    />
  );
}

/* ---------------------------------------------- 7. House construction cost */

const HOUSE_RATES: Record<string, Record<string, number>> = {
  INR: { budget: 1600, standard: 2200, premium: 3400 },
  AED: { budget: 180, standard: 240, premium: 380 },
  USD: { budget: 50, standard: 65, premium: 100 },
};
const CURRENCY: Record<string, string> = { INR: "₹", AED: "AED ", USD: "$" };

const CITY_MULTIPLIERS: Record<string, { label: string; group: string; mult: number; cur: string }> = {
  "default_inr": { label: "Other Indian city", group: "india", mult: 1.0, cur: "INR" },
  "mumbai": { label: "Mumbai", group: "metro", mult: 1.25, cur: "INR" },
  "delhi": { label: "Delhi NCR", group: "metro", mult: 1.20, cur: "INR" },
  "bengaluru": { label: "Bengaluru", group: "metro", mult: 1.18, cur: "INR" },
  "hyderabad": { label: "Hyderabad", group: "metro", mult: 1.10, cur: "INR" },
  "chennai": { label: "Chennai", group: "metro", mult: 1.12, cur: "INR" },
  "pune": { label: "Pune", group: "metro", mult: 1.15, cur: "INR" },
  "ahmedabad": { label: "Ahmedabad", group: "metro", mult: 1.05, cur: "INR" },
  "kolkata": { label: "Kolkata", group: "metro", mult: 1.02, cur: "INR" },
  "jaipur": { label: "Jaipur", group: "tier2", mult: 0.95, cur: "INR" },
  "surat": { label: "Surat", group: "tier2", mult: 0.98, cur: "INR" },
  "lucknow": { label: "Lucknow", group: "tier2", mult: 0.90, cur: "INR" },
  "nagpur": { label: "Nagpur", group: "tier2", mult: 0.92, cur: "INR" },
  "coimbatore": { label: "Coimbatore", group: "tier2", mult: 0.94, cur: "INR" },
  "kochi": { label: "Kochi", group: "tier2", mult: 0.96, cur: "INR" },
  "indore": { label: "Indore", group: "tier2", mult: 0.90, cur: "INR" },
  "dubai": { label: "Dubai, UAE", group: "gcc", mult: 1.0, cur: "AED" },
  "abudhabi": { label: "Abu Dhabi, UAE", group: "gcc", mult: 1.06, cur: "AED" },
  "riyadh": { label: "Riyadh, Saudi Arabia", group: "gcc", mult: 0.90, cur: "USD" },
  "doha": { label: "Doha, Qatar", group: "gcc", mult: 1.02, cur: "USD" },
};

function HouseCostCalculator() {
  const [area, setArea] = React.useState(1500);
  const [floors, setFloors] = React.useState(1);
  const [tier, setTier] = React.useState<"budget" | "standard" | "premium">("standard");
  const [city, setCity] = React.useState("default_inr");
  const [contingency, setContingency] = React.useState(10);

  const cityData = CITY_MULTIPLIERS[city] || CITY_MULTIPLIERS["default_inr"];
  const currency = cityData.cur as "INR" | "AED" | "USD";
  const rate = (HOUSE_RATES[currency]?.[tier] || 2200) * cityData.mult;
  let construction = 0;
  for (let f = 0; f < floors; f++) construction += area * (rate * (1 + 0.12 * f));
  const contingencyCost = construction * (contingency / 100);
  const totalCost = construction + contingencyCost;
  const sym = CURRENCY[currency];

  const splits = [
    { name: "Structure & civil", pct: 0.4 },
    { name: "Finishing & masonry", pct: 0.25 },
    { name: "MEP & fittings", pct: 0.15 },
    { name: "Interior & carpentry", pct: 0.12 },
    { name: "Consultants & permits", pct: 0.08 },
  ];

  return (
    <Shell
      eyebrow="Free Construction Tool"
      title="House Construction Cost Calculator"
      subtitle="Get an illustrative build cost from built-up area, number of floors and specification tier. Rates are market averages, so treat the output as a planning estimate, not a quotation."
      form={
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Built-up area"><NumberInput value={area} onChange={setArea} suffix="sqft" /></Field>
            <Field label="Floors">
              <select value={floors} onChange={(e) => setFloors(Number(e.target.value))} className={inputCls}>
                <option value={1}>Ground floor (1)</option>
                <option value={2}>G+1 (2)</option>
                <option value={3}>G+2 (3)</option>
                <option value={4}>G+3 (4)</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Specification tier">
              <Segmented
                value={tier}
                onChange={setTier}
                options={[
                  { value: "budget", label: "Budget" },
                  { value: "standard", label: "Standard" },
                  { value: "premium", label: "Premium" },
                ]}
              />
            </Field>
            <Field label="City / region">
              <select value={city} onChange={(e) => setCity(e.target.value)} className={inputCls}>
                <optgroup label="Metro Cities">
                  {Object.entries(CITY_MULTIPLIERS).filter(([,v]) => v.group === "metro").map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Tier-2 Cities">
                  {Object.entries(CITY_MULTIPLIERS).filter(([,v]) => v.group === "tier2").map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Other India">
                  <option value="default_inr">Other Indian city</option>
                </optgroup>
                <optgroup label="GCC / Middle East">
                  {Object.entries(CITY_MULTIPLIERS).filter(([,v]) => v.group === "gcc").map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </optgroup>
              </select>
            </Field>
          </div>
          <Field label="Contingency buffer"><NumberInput value={contingency} onChange={setContingency} suffix="%" /></Field>
        </>
      }
      result={
        <div className="space-y-3">
          <Stat label="Estimated build cost" value={sym + fmt(totalCost, 0)} big note={`Incl. ${contingency}% contingency (${sym}${fmt(contingencyCost, 0)})`} />
          <div className="space-y-2 pt-1">
            {splits.map((s) => (
              <div key={s.name} className="space-y-1">
                <div className="flex justify-between text-[11px] text-alx-on-surface-variant">
                  <span>{s.name} ({Math.round(s.pct * 100)}%)</span>
                  <span className="font-semibold text-alx-on-surface">{sym}{fmt(totalCost * s.pct, 0)}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-alx-surface-container-high overflow-hidden">
                  <div className="h-full bg-alx-primary" style={{ width: `${s.pct * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      }
    />
  );
}

/* ---------------------------------------------------- 8. RMC Calculator */

const RMC_GRADES: { grade: string; advisory: string }[] = [
  { grade: "M15", advisory: "PCC, non-structural" },
  { grade: "M20", advisory: "Lintels, PCC, mild exposure" },
  { grade: "M25", advisory: "Standard residential slabs & beams" },
  { grade: "M30", advisory: "Columns, commercial floors" },
  { grade: "M35", advisory: "High-rise columns, bridges" },
  { grade: "M40", advisory: "Marine, heavy infra, GCC high-spec" },
  { grade: "M45", advisory: "Ultra high-spec, precast" },
];

function RMCCalculator() {
  const [tab, setTab] = React.useState<"slab" | "column" | "beam" | "footing">("slab");
  const [grade, setGrade] = React.useState("M25");
  const [wastage, setWastage] = React.useState(5);
  const [mixerSize, setMixerSize] = React.useState(7);
  const [rmcRate, setRmcRate] = React.useState(0);

  // Slab
  const [slabL, setSlabL] = React.useState(10);
  const [slabW, setSlabW] = React.useState(6);
  const [slabT, setSlabT] = React.useState(150); // mm
  // Column
  const [colA, setColA] = React.useState(450);
  const [colB, setColB] = React.useState(300);
  const [colH, setColH] = React.useState(3);
  const [colCount, setColCount] = React.useState(4);
  // Beam
  const [beamL, setBeamL] = React.useState(6);
  const [beamW, setBeamW] = React.useState(230); // mm
  const [beamD, setBeamD] = React.useState(450); // mm
  const [beamCount, setBeamCount] = React.useState(2);
  // Footing
  const [footL, setFootL] = React.useState(1.5);
  const [footW, setFootW] = React.useState(1.5);
  const [footD, setFootD] = React.useState(0.4);
  const [footCount, setFootCount] = React.useState(6);

  let netVol = 0;
  if (tab === "slab") netVol = slabL * slabW * (slabT / 1000);
  else if (tab === "column") netVol = (colA / 1000) * (colB / 1000) * colH * colCount;
  else if (tab === "beam") netVol = beamL * (beamW / 1000) * (beamD / 1000) * beamCount;
  else if (tab === "footing") netVol = footL * footW * footD * footCount;

  const totalVol = netVol * (1 + wastage / 100);
  const trucks = Math.ceil(totalVol / mixerSize);
  const rmcCost = rmcRate > 0 ? totalVol * rmcRate : 0;

  return (
    <Shell
      eyebrow="Free Construction Tool"
      title="Ready Mix Concrete (RMC) Calculator"
      subtitle="Calculate the RMC volume to order and transit mixer dispatches needed for slabs, columns, beams or footings, including wastage buffer."
      form={
        <>
          <Field label="Structure type">
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: "slab", label: "Slab" },
                { value: "column", label: "Column" },
                { value: "beam", label: "Beam" },
                { value: "footing", label: "Footing" },
              ]}
            />
          </Field>

          {tab === "slab" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Slab length (m)"><NumberInput value={slabL} onChange={setSlabL} suffix="m" /></Field>
              <Field label="Slab width (m)"><NumberInput value={slabW} onChange={setSlabW} suffix="m" /></Field>
              <Field label="Thickness (mm)" hint="Residential 125–150mm"><NumberInput value={slabT} onChange={setSlabT} suffix="mm" /></Field>
            </div>
          )}
          {tab === "column" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Column size A (mm)"><NumberInput value={colA} onChange={setColA} suffix="mm" /></Field>
              <Field label="Column size B (mm)"><NumberInput value={colB} onChange={setColB} suffix="mm" /></Field>
              <Field label="Height (m)"><NumberInput value={colH} onChange={setColH} suffix="m" /></Field>
              <Field label="No. of columns"><NumberInput value={colCount} onChange={setColCount} min={1} /></Field>
            </div>
          )}
          {tab === "beam" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Beam length (m)"><NumberInput value={beamL} onChange={setBeamL} suffix="m" /></Field>
              <Field label="Beam width (mm)"><NumberInput value={beamW} onChange={setBeamW} suffix="mm" /></Field>
              <Field label="Beam depth (mm)"><NumberInput value={beamD} onChange={setBeamD} suffix="mm" /></Field>
              <Field label="No. of beams"><NumberInput value={beamCount} onChange={setBeamCount} min={1} /></Field>
            </div>
          )}
          {tab === "footing" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Footing length (m)"><NumberInput value={footL} onChange={setFootL} suffix="m" /></Field>
              <Field label="Footing width (m)"><NumberInput value={footW} onChange={setFootW} suffix="m" /></Field>
              <Field label="Footing depth (m)"><NumberInput value={footD} onChange={setFootD} suffix="m" /></Field>
              <Field label="No. of footings"><NumberInput value={footCount} onChange={setFootCount} min={1} /></Field>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Concrete grade">
              <select value={grade} onChange={(e) => setGrade(e.target.value)} className={inputCls}>
                {RMC_GRADES.map((g) => (
                  <option key={g.grade} value={g.grade}>{g.grade} — {g.advisory}</option>
                ))}
              </select>
            </Field>
            <Field label="Transit mixer capacity">
              <select value={mixerSize} onChange={(e) => setMixerSize(Number(e.target.value))} className={inputCls}>
                <option value={6}>6 m³ (Standard India)</option>
                <option value={7}>7 m³ (UAE / GCC)</option>
                <option value={8}>8 m³ (Large mixer)</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Wastage buffer"><NumberInput value={wastage} onChange={setWastage} suffix="%" /></Field>
            <Field label="RMC rate per m³ (optional)"><NumberInput value={rmcRate} onChange={setRmcRate} suffix="₹" /></Field>
          </div>
        </>
      }
      result={
        <div className="space-y-3">
          <Stat label="Net volume" value={fmt(netVol, 3)} unit="m³" note={`${tab} — ${grade}`} />
          <Stat label="RMC to order (incl. wastage)" value={fmt(totalVol, 2)} unit="m³" big note={`+${wastage}% wastage`} />
          <Stat label="Transit mixer loads" value={String(trucks)} unit={`× ${mixerSize} m³`} />
          {rmcCost > 0 && <Stat label="Estimated RMC cost" value={"₹" + fmt(rmcCost, 0)} note={`${fmt(totalVol, 2)} m³ × ₹${fmt(rmcRate, 0)}`} />}
        </div>
      }
    />
  );
}

/* ------------------------------------------------------------------ registry */

const CALCULATORS: Record<string, React.ComponentType> = {
  "paint-quantity-calculator": PaintCalculator,
  "brick-calculator-for-wall": BrickCalculator,
  "concrete-volume-calculator": ConcreteVolumeCalculator,
  "concrete-mix-calculator": ConcreteMixCalculator,
  "steel-calculator-for-construction": SteelCalculator,
  "bar-bending-schedule-calculator": BarBendingScheduleCalculator,
  "house-construction-cost-calculator": HouseCostCalculator,
  "ready-mix-concrete-calculator": RMCCalculator,
};

export default function CalculatorTools({
  slug,
  hideHeader = false,
}: {
  slug: string;
  hideHeader?: boolean;
}) {
  const key = slug.split("/").pop() || "";
  const Cmp = CALCULATORS[key];
  if (!Cmp) return null;
  return (
    <HideConsoleHeaderContext.Provider value={hideHeader}>
      <Cmp />
    </HideConsoleHeaderContext.Provider>
  );
}
