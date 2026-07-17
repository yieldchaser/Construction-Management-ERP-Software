import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

export default function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="alexandria bg-alx-surface-container-lowest text-alx-on-surface font-body min-h-screen flex flex-col antialiased">
      <SiteHeader />
      <main className="flex-1 pt-24">{children}</main>
      <SiteFooter />
    </div>
  );
}
