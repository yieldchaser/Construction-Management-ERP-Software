import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import PremiumFX from "./PremiumFX";

export default function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="alexandria bg-alx-surface-container-lowest text-alx-on-surface font-body min-h-screen antialiased">
      <PremiumFX />
      {/* No whole-site ambient wash. It sat above the page background but
          below the content, so any section painting its own opaque surface
          hid it while a section with no background let it through. Every
          boundary between those two became a visible horizontal tint step.
          Heroes keep their own contained radial tint instead. */}
      <div className="alx-grain fixed inset-0 z-0" aria-hidden="true" />
      <div className="relative z-10 flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-1 pt-24">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}
