import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import PremiumFX from "./PremiumFX";

export default function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="alexandria bg-alx-surface-container-lowest text-alx-on-surface font-body min-h-screen flex flex-col antialiased">
      <PremiumFX />
      <div className="alx-grain fixed inset-0 z-0" aria-hidden="true" />
      <SiteHeader />
      <main className="flex-1 pt-24">{children}</main>
      <SiteFooter />
    </div>
  );
}
