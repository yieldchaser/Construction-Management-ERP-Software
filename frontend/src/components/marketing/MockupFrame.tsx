type MockupVariant = "procurement" | "mobile" | "finance";

function ProcurementBody() {
  return (
    <div className="flex h-full gap-3 p-4">
      <div className="w-1/4 rounded-lg bg-alx-surface-container-high p-2 space-y-2">
        <div className="h-2 w-3/4 rounded bg-alx-primary-fixed" />
        <div className="h-2 w-full rounded bg-alx-surface-dim" />
        <div className="h-2 w-2/3 rounded bg-alx-surface-dim" />
        <div className="h-2 w-full rounded bg-alx-surface-dim" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-end gap-1.5 h-16">
          <div className="w-4 rounded-t bg-alx-primary" style={{ height: "60%" }} />
          <div className="w-4 rounded-t bg-alx-primary-fixed" style={{ height: "85%" }} />
          <div className="w-4 rounded-t bg-alx-primary" style={{ height: "40%" }} />
          <div className="w-4 rounded-t bg-alx-primary-fixed" style={{ height: "70%" }} />
          <div className="w-4 rounded-t bg-alx-primary" style={{ height: "95%" }} />
        </div>
        <div className="h-2.5 w-full rounded bg-alx-surface-container-high" />
        <div className="h-2.5 w-5/6 rounded bg-alx-surface-container-high" />
        <div className="h-2.5 w-2/3 rounded bg-alx-surface-container-high" />
      </div>
    </div>
  );
}

function MobileBody() {
  return (
    <div className="flex h-full items-center justify-center gap-3 p-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-full w-1/4 rounded-2xl bg-alx-surface-container-high border border-alx-outline-variant/30 p-2 flex flex-col gap-1.5"
        >
          <div className="h-1.5 w-1/2 rounded bg-alx-outline-variant" />
          <div className="mt-1 h-8 w-full rounded-lg bg-alx-primary-fixed" />
          <div className="h-1.5 w-full rounded bg-alx-surface-dim" />
          <div className="h-1.5 w-2/3 rounded bg-alx-surface-dim" />
        </div>
      ))}
    </div>
  );
}

function FinanceBody() {
  return (
    <div className="flex h-full gap-3 p-4">
      <div className="flex-1 space-y-2">
        <div className="h-2.5 w-1/2 rounded bg-alx-primary-fixed" />
        <div className="h-2.5 w-full rounded bg-alx-surface-container-high" />
        <div className="h-2.5 w-4/5 rounded bg-alx-surface-container-high" />
        <div className="flex items-end gap-1.5 h-14 pt-2">
          <div className="w-4 rounded-t bg-alx-primary" style={{ height: "50%" }} />
          <div className="w-4 rounded-t bg-alx-primary" style={{ height: "80%" }} />
          <div className="w-4 rounded-t bg-alx-primary-fixed" style={{ height: "35%" }} />
          <div className="w-4 rounded-t bg-alx-primary" style={{ height: "65%" }} />
        </div>
      </div>
      <div className="w-1/3 rounded-lg bg-alx-surface-container-high p-2 space-y-2">
        <div className="h-2 w-3/4 rounded bg-alx-primary" />
        <div className="h-2 w-full rounded bg-alx-surface-dim" />
        <div className="h-2 w-2/3 rounded bg-alx-surface-dim" />
      </div>
    </div>
  );
}

export default function MockupFrame({ variant = "procurement" }: { variant?: MockupVariant }) {
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
      </div>
    </div>
  );
}
