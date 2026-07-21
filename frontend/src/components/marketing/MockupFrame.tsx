type MockupVariant = "procurement" | "mobile" | "finance" | "planning" | "hero";

function NavItem({ label, active }: { label: string; active?: boolean }) {
  return (
    <div
      className={
        active
          ? "flex items-center gap-1.5 rounded-md bg-alx-primary-fixed px-2 py-1 text-[7.5px] font-semibold text-alx-on-primary-fixed"
          : "flex items-center gap-1.5 rounded-md px-2 py-1 text-[7.5px] text-alx-on-surface-variant"
      }
    >
      <span
        className={
          active
            ? "h-1.5 w-1.5 rounded-full bg-alx-on-primary-fixed"
            : "h-1.5 w-1.5 rounded-full bg-alx-outline-variant"
        }
      />
      {label}
    </div>
  );
}

function StatusChip({ label, tone }: { label: string; tone: "primary" | "gold" | "error" }) {
  const toneClass =
    tone === "primary"
      ? "bg-alx-primary-fixed text-alx-on-primary-fixed"
      : tone === "gold"
        ? "bg-alx-tertiary-fixed text-alx-on-tertiary-fixed"
        : "bg-alx-error-container text-alx-on-error-container";
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[6.5px] font-semibold ${toneClass}`}>
      {label}
    </span>
  );
}

function KpiTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "gold" | "neutral";
}) {
  const toneClass =
    tone === "primary"
      ? "bg-alx-primary-fixed text-alx-on-primary-fixed"
      : tone === "gold"
        ? "bg-alx-tertiary-fixed text-alx-on-tertiary-fixed"
        : "bg-alx-surface-container-high text-alx-on-surface";
  return (
    <div className={`rounded-lg p-2 shadow-sm shadow-alx-on-surface/5 ${toneClass}`}>
      <p className="text-[6.5px] font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-0.5 text-[13px] font-bold leading-none">{value}</p>
    </div>
  );
}

function ProcurementBody() {
  const rows = [
    { vendor: "Shree Steel Traders", amount: "₹18.4L", status: "Matched" as const, tone: "primary" as const },
    { vendor: "Apex Cement Supplies", amount: "₹9.2L", status: "In Review" as const, tone: "gold" as const },
    { vendor: "Bharat Electricals Pvt Ltd", amount: "₹4.6L", status: "Matched" as const, tone: "primary" as const },
    { vendor: "Konkan Aggregates Co.", amount: "₹2.1L", status: "Rejected" as const, tone: "error" as const },
  ];
  return (
    <div className="flex h-full">
      <div className="flex w-[26%] flex-col gap-2 bg-alx-surface-container-low p-2.5">
        <div className="h-2 w-14 rounded-sm bg-alx-primary" />
        <div className="mt-1 flex flex-col gap-1">
          <NavItem label="Planning" />
          <NavItem label="Procurement" active />
          <NavItem label="BOQ" />
          <NavItem label="Finance" />
          <NavItem label="DPR" />
          <NavItem label="Labour" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 bg-alx-surface-container-lowest p-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold text-alx-on-surface">Purchase Orders</p>
          <span className="rounded-md bg-alx-primary px-2 py-1 text-[6.5px] font-semibold text-alx-on-primary">
            + New PO
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <KpiTile label="Open POs" value="128" tone="primary" />
          <KpiTile label="Pending" value="₹1.8Cr" tone="gold" />
          <KpiTile label="Matched" value="94%" tone="neutral" />
        </div>
        <div className="flex flex-1 flex-col gap-1 overflow-hidden rounded-lg bg-alx-surface-container-low p-1.5">
          {rows.map((row) => (
            <div
              key={row.vendor}
              className="flex items-center justify-between rounded-md bg-alx-surface-container-lowest px-1.5 py-1"
            >
              <span className="truncate text-[7px] font-medium text-alx-on-surface">{row.vendor}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[7px] text-alx-on-surface-variant">{row.amount}</span>
                <StatusChip label={row.status} tone={row.tone} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FinanceBody() {
  const bars = [
    { month: "Feb", planned: 55, actual: 48 },
    { month: "Mar", planned: 68, actual: 71 },
    { month: "Apr", planned: 62, actual: 58 },
    { month: "May", planned: 80, actual: 92 },
    { month: "Jun", planned: 74, actual: 66 },
    { month: "Jul", planned: 90, actual: 85 },
  ];
  const budgetLines = [
    { label: "Planning", pct: 82 },
    { label: "Procurement", pct: 64 },
    { label: "Labour", pct: 91 },
    { label: "Finance", pct: 47 },
  ];
  return (
    <div className="flex h-full gap-2.5 bg-alx-surface-container-lowest p-3">
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[6.5px] font-medium uppercase tracking-wide text-alx-on-surface-variant">
              Cash Position
            </p>
            <p className="text-[13px] font-bold leading-none text-alx-on-surface">₹4.2Cr</p>
          </div>
          <div className="flex gap-1">
            <span className="flex items-center gap-1 text-[6.5px] text-alx-on-surface-variant">
              <span className="h-1.5 w-1.5 rounded-full bg-alx-primary" /> Planned
            </span>
            <span className="flex items-center gap-1 text-[6.5px] text-alx-on-surface-variant">
              <span className="h-1.5 w-1.5 rounded-full bg-alx-tertiary-fixed" /> Actual
            </span>
          </div>
        </div>
        <div className="flex flex-1 items-end gap-2 rounded-lg bg-alx-surface-container-low p-2">
          {bars.map((bar) => (
            <div key={bar.month} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-16 w-full items-end justify-center gap-0.5">
                <div className="w-1.5 rounded-t bg-alx-primary" style={{ height: `${bar.planned}%` }} />
                <div className="w-1.5 rounded-t bg-alx-tertiary-fixed" style={{ height: `${bar.actual}%` }} />
              </div>
              <span className="text-[6px] text-alx-on-surface-variant">{bar.month}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex w-[34%] flex-col gap-2">
        <KpiTile label="Open RFIs" value="12" tone="gold" />
        <div className="flex flex-1 flex-col gap-1.5 rounded-lg bg-alx-surface-container-high p-2">
          <p className="text-[6.5px] font-semibold uppercase tracking-wide text-alx-on-surface-variant">
            Budget Utilised
          </p>
          {budgetLines.map((line) => (
            <div key={line.label} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-[6.5px] text-alx-on-surface">
                <span>{line.label}</span>
                <span className="text-alx-on-surface-variant">{line.pct}%</span>
              </div>
              <div className="h-1 w-full rounded-full bg-alx-surface-container-lowest">
                <div
                  className="h-1 rounded-full bg-alx-primary"
                  style={{ width: `${line.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlanningBody() {
  const months = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const rows = [
    { task: "Excavation", left: 2, width: 12, tone: "primary" as const, pct: "100%" },
    { task: "Foundation", left: 10, width: 16, tone: "primary" as const, pct: "100%" },
    { task: "RCC Frame", left: 22, width: 30, tone: "critical" as const, pct: "68%" },
    { task: "Brickwork", left: 40, width: 22, tone: "tertiary" as const, pct: "34%" },
    { task: "MEP Rough-in", left: 52, width: 24, tone: "tertiary" as const, pct: "12%" },
    { task: "Finishing", left: 70, width: 26, tone: "neutral" as const, pct: "0%" },
  ];
  const barTone: Record<string, string> = {
    primary: "bg-alx-primary",
    critical: "bg-alx-on-error-container",
    tertiary: "bg-alx-tertiary-fixed",
    neutral: "bg-alx-outline-variant",
  };
  return (
    <div className="flex h-full bg-alx-surface-container-lowest">
      <div className="flex w-[26%] flex-col border-r border-alx-outline-variant/20 bg-alx-surface-container-low">
        <div className="flex items-center justify-between border-b border-alx-outline-variant/20 px-2.5 py-2">
          <span className="text-[8px] font-semibold text-alx-on-surface">WBS Schedule</span>
          <span className="rounded-full bg-alx-error-container px-1.5 py-0.5 text-[6px] font-semibold text-alx-on-error-container">
            Critical
          </span>
        </div>
        <div className="flex flex-1 flex-col">
          {rows.map((row) => (
            <div
              key={row.task}
              className="flex flex-1 items-center justify-between border-b border-alx-outline-variant/10 px-2.5"
            >
              <span className="truncate text-[6.5px] font-medium text-alx-on-surface">{row.task}</span>
              <span className="text-[6px] text-alx-on-surface-variant">{row.pct}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="relative flex flex-1 flex-col">
        <div className="flex items-center border-b border-alx-outline-variant/20 bg-alx-surface-container-lowest px-2 py-2">
          {months.map((month) => (
            <span
              key={month}
              className="flex-1 text-center text-[6.5px] font-medium uppercase tracking-wide text-alx-on-surface-variant"
            >
              {month}
            </span>
          ))}
        </div>
        <div className="relative flex flex-1 flex-col">
          {rows.map((row, i) => (
            <div key={row.task} className="relative flex flex-1 items-center border-b border-alx-outline-variant/10">
              {i === 2 && (
                <div
                  className="absolute top-1 h-1 rounded-full bg-alx-outline-variant/60"
                  style={{ left: `${row.left}%`, width: `${row.width}%` }}
                />
              )}
              <div
                className={`absolute h-3 rounded-md shadow-sm shadow-alx-on-surface/10 ${barTone[row.tone]}`}
                style={{ left: `${row.left}%`, width: `${row.width}%` }}
              />
              {i === 1 && (
                <span
                  className="absolute h-2.5 w-2.5 rotate-45 rounded-[2px] bg-alx-tertiary-fixed shadow-sm shadow-alx-on-surface/10"
                  style={{ left: `calc(${row.left + row.width}% - 5px)` }}
                />
              )}
              {i === 4 && (
                <span
                  className="absolute h-2.5 w-2.5 rotate-45 rounded-[2px] bg-alx-primary shadow-sm shadow-alx-on-surface/10"
                  style={{ left: `calc(${row.left + row.width}% - 5px)` }}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 border-t border-alx-outline-variant/20 bg-alx-surface-container-low px-2.5 py-1.5">
          <span className="flex items-center gap-1 text-[6px] text-alx-on-surface-variant">
            <span className="h-1.5 w-1.5 rounded-sm bg-alx-primary" /> On track
          </span>
          <span className="flex items-center gap-1 text-[6px] text-alx-on-surface-variant">
            <span className="h-1.5 w-1.5 rounded-sm bg-alx-on-error-container" /> Critical path
          </span>
          <span className="flex items-center gap-1 text-[6px] text-alx-on-surface-variant">
            <span className="h-1.5 w-1.5 rounded-sm bg-alx-outline-variant/60" /> Baseline
          </span>
        </div>
      </div>
    </div>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const radius = 15.5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  return (
    <svg viewBox="0 0 36 36" className="h-11 w-11">
      <circle cx="18" cy="18" r={radius} fill="none" strokeWidth="3.5" className="stroke-alx-surface-container-high" />
      <circle
        cx="18"
        cy="18"
        r={radius}
        fill="none"
        strokeWidth="3.5"
        strokeLinecap="round"
        className="stroke-alx-primary"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 18 18)"
      />
      <text x="18" y="20.5" textAnchor="middle" className="fill-alx-on-surface text-[8px] font-bold">
        {pct}%
      </text>
    </svg>
  );
}

function MobileBody() {
  const crew = [
    { name: "R. Mehta", role: "Mason", status: "Present" as const, tone: "primary" as const },
    { name: "S. Iyer", role: "Electrician", status: "Present" as const, tone: "primary" as const },
    { name: "A. Khan", role: "Fitter", status: "Leave" as const, tone: "error" as const },
  ];
  return (
    <div className="flex h-full items-center justify-center bg-alx-surface-container-low p-3">
      <div className="flex h-full w-[62%] flex-col overflow-hidden rounded-[1.4rem] bg-alx-surface-container-lowest shadow-xl shadow-alx-on-surface/10">
        <div className="flex items-center justify-between px-3 pt-2 text-[6.5px] font-medium text-alx-on-surface">
          <span>9:41</span>
          <div className="flex gap-1">
            <span className="h-1 w-3 rounded-full bg-alx-on-surface-variant" />
            <span className="h-1 w-1.5 rounded-full bg-alx-on-surface-variant" />
          </div>
        </div>
        <div className="flex items-center justify-between px-3 pt-1.5">
          <div>
            <p className="text-[6px] font-medium uppercase tracking-wide text-alx-on-surface-variant">SiteFlow</p>
            <p className="text-[8px] font-semibold text-alx-on-surface">Riverside Tower, Site A</p>
          </div>
          <span className="h-4 w-4 rounded-full bg-alx-primary-fixed" />
        </div>
        <div className="mx-3 mt-2 flex items-center gap-2.5 rounded-xl bg-alx-surface-container-high p-2">
          <ProgressRing pct={68} />
          <div className="flex flex-col gap-0.5">
            <p className="text-[6.5px] font-medium uppercase tracking-wide text-alx-on-surface-variant">
              % Complete
            </p>
            <p className="text-[7px] text-alx-on-surface">Slab casting on schedule</p>
            <span className="w-fit rounded-full bg-alx-primary-fixed px-1.5 py-0.5 text-[6px] font-semibold text-alx-on-primary-fixed">
              On track
            </span>
          </div>
        </div>
        <div className="mx-3 mt-2 grid grid-cols-3 gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-square rounded-lg bg-alx-surface-container-high" />
          ))}
        </div>
        <div className="mx-3 mt-2 flex flex-1 flex-col gap-1 overflow-hidden">
          <p className="text-[6px] font-semibold uppercase tracking-wide text-alx-on-surface-variant">
            Attendance Today
          </p>
          {crew.map((member) => (
            <div
              key={member.name}
              className="flex items-center justify-between rounded-lg bg-alx-surface-container-low px-1.5 py-1"
            >
              <div className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded-full bg-alx-primary-fixed" />
                <div>
                  <p className="text-[6.5px] font-medium leading-none text-alx-on-surface">{member.name}</p>
                  <p className="text-[5.5px] leading-none text-alx-on-surface-variant">{member.role}</p>
                </div>
              </div>
              <StatusChip label={member.status} tone={member.tone} />
            </div>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-around border-t border-alx-outline-variant/20 bg-alx-surface-container-lowest px-2 py-1.5">
          {["Home", "DPR", "Labour", "More"].map((tab, i) => (
            <div key={tab} className="flex flex-col items-center gap-0.5">
              <span
                className={
                  i === 0
                    ? "h-1.5 w-1.5 rounded-full bg-alx-primary"
                    : "h-1.5 w-1.5 rounded-full bg-alx-outline-variant"
                }
              />
              <span
                className={
                  i === 0
                    ? "text-[5.5px] font-semibold text-alx-primary"
                    : "text-[5.5px] text-alx-on-surface-variant"
                }
              >
                {tab}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroBody() {
  const kpis: { label: string; value: string; tone: "primary" | "gold" | "neutral" }[] = [
    { label: "Budget", value: "₹4.2Cr", tone: "primary" },
    { label: "% Complete", value: "68%", tone: "gold" },
    { label: "Open RFIs", value: "12", tone: "neutral" },
    { label: "Cash Position", value: "₹1.9Cr", tone: "primary" },
  ];
  const rows = [
    { project: "Riverside Tower, Site A", stage: "RCC Frame", tone: "primary" as const, pct: "68%" },
    { project: "Orchid Business Park", stage: "Finishing", tone: "gold" as const, pct: "84%" },
    { project: "Konkan Coastal Villas", stage: "Foundation", tone: "primary" as const, pct: "22%" },
    { project: "Metro Link Phase 2", stage: "On Hold", tone: "error" as const, pct: "41%" },
  ];
  // Burn-down: planned vs actual, plotted across a 320x96 chart area.
  const planned = [92, 78, 66, 52, 40, 26, 12];
  const actual = [92, 84, 70, 58, 48, 34, 22];
  const toPoints = (series: number[]) =>
    series
      .map((v, i) => `${(i / (series.length - 1)) * 320},${96 - (v / 100) * 96}`)
      .join(" ");
  return (
    <div className="flex h-full bg-alx-surface-container-lowest">
      <div className="flex w-[17%] flex-col gap-1 border-r border-alx-outline-variant/20 bg-alx-surface-container-low p-2.5">
        <div className="mb-1 flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-md bg-alx-primary" />
          <span className="text-[8px] font-bold text-alx-on-surface">SiteFlow</span>
        </div>
        <NavItem label="Dashboard" active />
        <NavItem label="Planning" />
        <NavItem label="Procurement" />
        <NavItem label="BOQ" />
        <NavItem label="Finance" />
        <NavItem label="DPR" />
        <NavItem label="Labour" />
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-alx-outline-variant/20 px-3 py-2">
          <div>
            <p className="text-[6px] font-medium uppercase tracking-wide text-alx-on-surface-variant">Project</p>
            <p className="text-[8.5px] font-semibold text-alx-on-surface">Riverside Tower, Site A</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full bg-alx-surface-container-high px-2 py-1 text-[6.5px] text-alx-on-surface-variant">
              <span className="h-1.5 w-1.5 rounded-full bg-alx-outline-variant" />
              Search
            </div>
            <span className="h-4.5 w-4.5 rounded-full bg-alx-primary-fixed" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1.5 px-3 pt-2.5">
          {kpis.map((kpi) => (
            <KpiTile key={kpi.label} label={kpi.label} value={kpi.value} tone={kpi.tone} />
          ))}
        </div>
        <div className="mx-3 mt-2.5 flex flex-1 flex-col gap-1 rounded-lg bg-alx-surface-container-low p-2">
          <div className="flex items-center justify-between">
            <p className="text-[6.5px] font-semibold uppercase tracking-wide text-alx-on-surface-variant">
              Burn-down
            </p>
            <div className="flex gap-1.5">
              <span className="flex items-center gap-1 text-[6px] text-alx-on-surface-variant">
                <span className="h-1.5 w-1.5 rounded-full bg-alx-outline-variant" /> Planned
              </span>
              <span className="flex items-center gap-1 text-[6px] text-alx-on-surface-variant">
                <span className="h-1.5 w-1.5 rounded-full bg-alx-primary" /> Actual
              </span>
            </div>
          </div>
          <svg viewBox="0 0 320 96" preserveAspectRatio="none" className="h-16 w-full">
            <line x1="0" y1="0" x2="0" y2="96" className="stroke-alx-outline-variant/40" strokeWidth="1" />
            <line x1="0" y1="96" x2="320" y2="96" className="stroke-alx-outline-variant/40" strokeWidth="1" />
            <polyline
              points={toPoints(planned)}
              fill="none"
              className="stroke-alx-outline-variant"
              strokeWidth="2"
              strokeDasharray="4 3"
            />
            <polyline points={toPoints(actual)} fill="none" className="stroke-alx-primary" strokeWidth="2.5" />
            {actual.map((v, i) => (
              <circle
                key={i}
                cx={(i / (actual.length - 1)) * 320}
                cy={96 - (v / 100) * 96}
                r="2.6"
                className="fill-alx-primary"
              />
            ))}
          </svg>
        </div>
        <div className="mx-3 my-2.5 flex flex-1 flex-col gap-1 overflow-hidden rounded-lg bg-alx-surface-container-low p-1.5">
          {rows.map((row) => (
            <div
              key={row.project}
              className="flex items-center justify-between rounded-md bg-alx-surface-container-lowest px-1.5 py-1"
            >
              <span className="truncate text-[7px] font-medium text-alx-on-surface">{row.project}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[6.5px] text-alx-on-surface-variant">{row.stage}</span>
                <span className="text-[6.5px] font-semibold text-alx-on-surface">{row.pct}</span>
                <StatusChip label={row.stage === "On Hold" ? "On Hold" : "Active"} tone={row.tone} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MockupFrame({
  variant = "procurement",
  src,
  alt,
}: {
  variant?: MockupVariant;
  src?: string;
  alt?: string;
}) {
  if (src) {
    // Transparent device art (phones) renders bare, without the browser-frame chrome.
    if (variant === "mobile") {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt ?? "SiteFlow mobile app screens"} className="w-full h-auto max-w-full" loading="lazy" />
      );
    }
    return (
      <div className="rounded-xl bg-alx-surface-container-lowest shadow-xl shadow-alx-on-surface/5 overflow-hidden aspect-[16/10]">
        <div className="flex items-center gap-1.5 border-b border-alx-outline-variant/20 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-alx-surface-dim" />
          <span className="h-2.5 w-2.5 rounded-full bg-alx-surface-dim" />
          <span className="h-2.5 w-2.5 rounded-full bg-alx-surface-dim" />
        </div>
        <div className="h-[calc(100%-2.75rem)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt ?? "SiteFlow dashboard screenshot"} className="h-full w-full object-contain" loading="lazy" />
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-alx-surface-container-lowest shadow-xl shadow-alx-on-surface/5 overflow-hidden aspect-[16/10]">
      <div className="flex items-center gap-1.5 border-b border-alx-outline-variant/20 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-alx-surface-dim" />
        <span className="h-2.5 w-2.5 rounded-full bg-alx-surface-dim" />
        <span className="h-2.5 w-2.5 rounded-full bg-alx-surface-dim" />
      </div>
      <div className="h-[calc(100%-2.75rem)]">
        {variant === "procurement" && <ProcurementBody />}
        {variant === "mobile" && <MobileBody />}
        {variant === "finance" && <FinanceBody />}
        {variant === "planning" && <PlanningBody />}
        {variant === "hero" && <HeroBody />}
      </div>
    </div>
  );
}
