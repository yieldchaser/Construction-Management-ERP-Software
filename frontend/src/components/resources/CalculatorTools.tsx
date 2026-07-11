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
  "w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors";
const labelCls = "text-xs font-medium text-muted";
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
      {hint ? <p className="text-[11px] text-muted/80">{hint}</p> : null}
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
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

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
  return (
    <section className="not-prose rounded-2xl border border-border-custom bg-card p-5 md:p-7 shadow-sm">
      <div className="mb-5">
        <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded">
          {eyebrow}
        </span>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-1.5 text-sm text-muted leading-relaxed max-w-2xl">
          {subtitle}
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 space-y-5">{form}</div>
        <div className="lg:col-span-2">
          <div className="sticky top-24 rounded-xl border border-border-custom bg-input/60 p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground border-b border-border-custom pb-2.5">
              Your Estimate
            </h3>
            {result}
          </div>
        </div>
      </div>
      <p className="mt-5 text-[11px] text-muted/80 leading-relaxed">
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
    <div className="rounded-lg border border-border-custom bg-card p-3.5">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
        {label}
      </span>
      <strong
        className={
          (big ? "text-2xl text-success" : "text-lg text-foreground") +
          " mt-1 block font-black"
        }
      >
        {value}
        {unit ? <span className="text-sm font-bold"> {unit}</span> : null}
      </strong>
      {note ? (
        <span className="mt-0.5 block text-[10px] italic text-muted">
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
              ? "bg-primary/10 border-primary text-primary"
              : "border-border-custom text-muted hover:text-foreground")
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
                    className="h-[38px] px-3 rounded-lg border border-border-custom text-muted hover:text-foreground disabled:opacity-40"
                  >
                    −
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setRooms((r) => [...r, { l: 12, w: 10, h: 10 }])}
                className="text-xs font-semibold text-primary hover:underline"
              >
                + Add another room
              </button>
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Number of doors">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={deductDoors} onChange={(e) => setDeductDoors(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
                <NumberInput value={doors} onChange={setDoors} suffix="× 21 sqft" />
              </div>
            </Field>
            <Field label="Number of windows">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={deductWindows} onChange={(e) => setDeductWindows(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
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
            <div className="flex flex-wrap gap-4 text-xs text-muted">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={includeCeiling} onChange={(e) => setIncludeCeiling(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
                Include ceiling
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={primer} onChange={(e) => setPrimer(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
                Wall primer
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={putty} onChange={(e) => setPutty(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
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
  const [preset, setPreset] = React.useState<"modular" | "traditional">("modular");
  const [ratio, setRatio] = React.useState("1:6");
  const [wastage, setWastage] = React.useState(10);

  const leaves = thickness > 115 ? 2 : 1;
  const [bl, bw, bh] =
    preset === "modular" ? [190, 90, 90] : [230, 110, 75];
  const joint = 10;
  const faceArea = ((bl + joint) / 1000) * ((bh + joint) / 1000);
  const wallArea = l * h;
  const bricks = Math.ceil((wallArea / faceArea) * leaves * (1 + wastage / 100));

  const wallVol = wallArea * (thickness / 1000);
  const brickVol = (bl / 1000) * (bw / 1000) * (bh / 1000);
  const netBricks = (wallArea / faceArea) * leaves;
  const mortarVol = Math.max(0, wallVol - netBricks * brickVol);
  const dryMortar = mortarVol * 1.33;
  const [cp, sp] = ratio.split(":").map((x) => parseFloat(x));
  const total = cp + sp;
  const cementBags = (dryMortar * (cp / total) * 1440) / 50;
  const sandM3 = dryMortar * (sp / total);

  return (
    <Shell
      eyebrow="Free Construction Tool"
      title="Brick Calculator for Walls"
      subtitle="Estimate the number of bricks and the cement / sand mortar required for a masonry wall using standard brick sizes and a 10 mm mortar joint."
      form={
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Wall length"><NumberInput value={l} onChange={setL} suffix="m" /></Field>
            <Field label="Wall height"><NumberInput value={h} onChange={setH} suffix="m" /></Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Wall thickness">
              <select value={thickness} onChange={(e) => setThickness(Number(e.target.value))} className={inputCls}>
                <option value={115}>115 mm — 4.5&quot; half brick (single leaf)</option>
                <option value={230}>230 mm — 9&quot; full brick (double leaf)</option>
              </select>
            </Field>
            <Field label="Brick size">
              <select value={preset} onChange={(e) => setPreset(e.target.value as "modular" | "traditional")} className={inputCls}>
                <option value="modular">Modular 190 × 90 × 90 mm</option>
                <option value="traditional">Traditional 230 × 110 × 75 mm</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Mortar mix (cement : sand)">
              <select value={ratio} onChange={(e) => setRatio(e.target.value)} className={inputCls}>
                <option value="1:3">1:3 (high strength)</option>
                <option value="1:4">1:4 (external walls)</option>
                <option value="1:6">1:6 (internal walls)</option>
              </select>
            </Field>
            <Field label="Wastage buffer"><NumberInput value={wastage} onChange={setWastage} suffix="%" /></Field>
          </div>
        </>
      }
      result={
        <div className="space-y-3">
          <Stat label="Bricks required" value={fmt(bricks, 0)} unit="nos" big note={`${leaves === 2 ? "Double" : "Single"} leaf, incl. ${wastage}% wastage`} />
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Cement" value={fmt(cementBags, 1)} unit="bags" />
            <Stat label="Sand" value={fmt(sandM3, 2)} unit="m³" />
          </div>
          <Stat label="Dry mortar volume" value={fmt(dryMortar, 3)} unit="m³" />
        </div>
      }
    />
  );
}

/* --------------------------------------------------------- 3. Concrete volume */

function ConcreteVolumeCalculator() {
  const [shape, setShape] = React.useState<"slab" | "column" | "footing" | "beam">("slab");
  const [a, setA] = React.useState(5);
  const [b, setB] = React.useState(3);
  const [c, setC] = React.useState(0.15);
  const [wastage, setWastage] = React.useState(5);

  const dims: Record<typeof shape, [string, string, string]> = {
    slab: ["Length (m)", "Width (m)", "Thickness (m)"],
    column: ["Width (m)", "Depth (m)", "Height (m)"],
    footing: ["Length (m)", "Width (m)", "Depth (m)"],
    beam: ["Length (m)", "Width (m)", "Depth (m)"],
  } as const;
  const [la, lb, lc] = dims[shape];

  const wet = a * b * c;
  const dry = wet * 1.54 * (1 + wastage / 100);

  return (
    <Shell
      eyebrow="Free Construction Tool"
      title="Concrete Volume Calculator"
      subtitle="Calculate wet concrete volume for a slab, column, footing or beam, and the dry material volume using the IS 456 dry-volume factor of 1.54."
      form={
        <>
          <Field label="Element shape">
            <Segmented
              value={shape}
              onChange={setShape}
              options={[
                { value: "slab", label: "Slab" },
                { value: "column", label: "Column" },
                { value: "footing", label: "Footing" },
                { value: "beam", label: "Beam" },
              ]}
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label={la}><NumberInput value={a} onChange={setA} /></Field>
            <Field label={lb}><NumberInput value={b} onChange={setB} /></Field>
            <Field label={lc}><NumberInput value={c} onChange={setC} /></Field>
          </div>
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

  const { ratio, parts } = MIX[grade];
  const sum = parts[0] + parts[1] + parts[2];
  const dry = wet * 1.54;
  const cementVol = (dry * parts[0]) / sum;
  const cementKg = cementVol * 1440;
  const bags = cementKg / 50;
  const sandM3 = (dry * parts[1]) / sum;
  const aggM3 = (dry * parts[2]) / sum;
  const waterL = cementKg * wcRatio;

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
  const [bars, setBars] = React.useState<Bar[]>([{ dia: 12, length: 12, qty: 10 }]);
  const [rate, setRate] = React.useState(62);

  const setBar = (i: number, key: keyof Bar, v: number) =>
    setBars((b) => b.map((bar, idx) => (idx === i ? { ...bar, [key]: v } : bar)));

  const rows = bars.map((b) => {
    const unit = (b.dia * b.dia) / 162.2; // kg/m
    const weight = unit * b.length * b.qty;
    return { ...b, unit, weight };
  });
  const total = rows.reduce((s, r) => s + r.weight, 0);
  const cost = total * rate;

  return (
    <Shell
      eyebrow="Free Construction Tool"
      title="Steel Weight Calculator"
      subtitle="Calculate the weight of reinforcement steel by bar diameter using the IS 1786 unit-weight formula, weight (kg/m) = d² ÷ 162.2."
      form={
        <>
          <Field label="Reinforcement bars">
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted px-1">
                <span>Dia (mm)</span><span>Length (m)</span><span>Qty (nos)</span><span></span>
              </div>
              {bars.map((b, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                  <select value={b.dia} onChange={(e) => setBar(i, "dia", Number(e.target.value))} className={inputCls}>
                    {[6, 8, 10, 12, 16, 20, 25, 32, 40].map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <NumberInput value={b.length} onChange={(v) => setBar(i, "length", v)} />
                  <NumberInput value={b.qty} onChange={(v) => setBar(i, "qty", v)} />
                  <button
                    type="button"
                    aria-label="Remove bar"
                    disabled={bars.length === 1}
                    onClick={() => setBars((bb) => bb.filter((_, idx) => idx !== i))}
                    className="h-[38px] px-3 rounded-lg border border-border-custom text-muted hover:text-foreground disabled:opacity-40"
                  >−</button>
                </div>
              ))}
              <button type="button" onClick={() => setBars((b) => [...b, { dia: 16, length: 12, qty: 4 }])} className="text-xs font-semibold text-primary hover:underline">
                + Add bar size
              </button>
            </div>
          </Field>
          <Field label="Steel rate (optional)"><NumberInput value={rate} onChange={setRate} suffix="₹/kg" /></Field>
        </>
      }
      result={
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={i} className="flex justify-between text-xs text-muted">
              <span>{r.dia} mm × {fmt(r.length, 1)} m × {r.qty}</span>
              <span className="font-semibold text-foreground">{fmt(r.weight, 1)} kg</span>
            </div>
          ))}
          <Stat label="Total steel weight" value={fmt(total, 1)} unit="kg" big />
          {rate > 0 ? <Stat label="Estimated cost" value={"₹" + fmt(cost, 0)} /> : null}
        </div>
      }
    />
  );
}

/* -------------------------------------------------- 6. Bar bending schedule */

function BarBendingScheduleCalculator() {
  const [dia, setDia] = React.useState(12);
  const [clearLen, setClearLen] = React.useState(3000); // mm
  const [bends90, setBends90] = React.useState(2);
  const [bends135, setBends135] = React.useState(0);
  const [hooks, setHooks] = React.useState(0);
  const [qty, setQty] = React.useState(20);

  // Cutting length = clear length + hook allowances (9d each) - bend deductions
  // (90 deg = 2d, 135 deg = 3d), per SP 34 / IS 2502.
  const hookAllow = hooks * 9 * dia;
  const bendDeduct = bends90 * 2 * dia + bends135 * 3 * dia;
  const cutting = Math.max(0, clearLen + hookAllow - bendDeduct); // mm
  const cuttingM = cutting / 1000;
  const unit = (dia * dia) / 162.2;
  const weightEach = unit * cuttingM;
  const totalLen = cuttingM * qty;
  const totalWeight = weightEach * qty;

  return (
    <Shell
      eyebrow="Free Construction Tool"
      title="Bar Bending Schedule Calculator"
      subtitle="Compute cutting length and steel weight for a bar with standard hook (9d) and bend deductions (90° = 2d, 135° = 3d), using weight = d² ÷ 162.2."
      form={
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Bar diameter">
              <select value={dia} onChange={(e) => setDia(Number(e.target.value))} className={inputCls}>
                {[6, 8, 10, 12, 16, 20, 25, 32].map((d) => <option key={d} value={d}>{d} mm</option>)}
              </select>
            </Field>
            <Field label="Clear / straight length"><NumberInput value={clearLen} onChange={setClearLen} suffix="mm" /></Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="90° bends"><NumberInput value={bends90} onChange={setBends90} /></Field>
            <Field label="135° bends"><NumberInput value={bends135} onChange={setBends135} /></Field>
            <Field label="Hooks (9d)"><NumberInput value={hooks} onChange={setHooks} /></Field>
          </div>
          <Field label="Number of bars"><NumberInput value={qty} onChange={setQty} suffix="nos" /></Field>
        </>
      }
      result={
        <div className="space-y-3">
          <Stat label="Cutting length (each)" value={fmt(cutting, 0)} unit="mm" note={`+${fmt(hookAllow, 0)} hooks, −${fmt(bendDeduct, 0)} bends`} />
          <Stat label="Weight (each)" value={fmt(weightEach, 3)} unit="kg" />
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

function HouseCostCalculator() {
  const [area, setArea] = React.useState(1500);
  const [floors, setFloors] = React.useState(1);
  const [tier, setTier] = React.useState<"budget" | "standard" | "premium">("standard");
  const [currency, setCurrency] = React.useState<"INR" | "AED" | "USD">("INR");
  const [contingency, setContingency] = React.useState(10);

  const rate = HOUSE_RATES[currency][tier];
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
      subtitle="Get an illustrative build cost from built-up area, number of floors and specification tier. Rates are market averages — treat the output as a planning estimate, not a quotation."
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
            <Field label="Currency">
              <select value={currency} onChange={(e) => setCurrency(e.target.value as "INR" | "AED" | "USD")} className={inputCls}>
                <option value="INR">India (₹)</option>
                <option value="AED">UAE (AED)</option>
                <option value="USD">International ($)</option>
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
                <div className="flex justify-between text-[11px] text-muted">
                  <span>{s.name} ({Math.round(s.pct * 100)}%)</span>
                  <span className="font-semibold text-foreground">{sym}{fmt(totalCost * s.pct, 0)}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-border-custom overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${s.pct * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
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
};

export default function CalculatorTools({ slug }: { slug: string }) {
  const key = slug.split("/").pop() || "";
  const Cmp = CALCULATORS[key];
  if (!Cmp) return null;
  return <Cmp />;
}
