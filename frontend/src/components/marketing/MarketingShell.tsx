import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import PremiumFX from "./PremiumFX";
import Aurora from "./Aurora";

export default function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="alexandria bg-alx-surface-container-lowest text-alx-on-surface font-body min-h-screen antialiased">
      <PremiumFX />
      {/* Whole-site ambient wash. Sits behind the grain and all content.
          The header/main/footer wrapper below is given its own stacking
          context (relative z-10) so it reliably paints above both fixed
          z-0 layers regardless of DOM-order stacking nuance. */}
      <Aurora variant="ambient" className="fixed inset-0 z-0" />
      <div className="alx-grain fixed inset-0 z-0" aria-hidden="true" />
      <div className="relative z-10 flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-1 pt-24">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}
