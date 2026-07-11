import Link from "next/link";

const PILLARS = [
  {
    icon: "📐",
    title: "Engineering math, done properly",
    body: "Concrete mix, rebar weight, and brickwork quantities follow IS 456, IS 1786, IS 516 and CPWD. The outputs are real civil-engineering numbers, not a calculator toy that rounds the wrong way.",
  },
  {
    icon: "🔗",
    title: "One record, from field to ledger",
    body: "A daily progress photo, a geofenced punch, a goods receipt, and a vendor invoice all land in the same project. The site and the accounts read from one source, so they stop disagreeing.",
  },
  {
    icon: "🇮🇳",
    title: "Built for Indian compliance",
    body: "GST, TDS under 194C and 194Q, PF, ESI and BOCW sit inside the workflow. Tally Prime and Zoho Books sync out of the box, because that is where Indian finance teams already work.",
  },
];

const PROOF_POINTS = [
  { value: "16", label: "operational modules, one workspace" },
  { value: "2", label: "native accounting integrations (Tally, Zoho)" },
  { value: "IS", label: "456 · 1786 · 516 & CPWD compliant math" },
  { value: "PWA", label: "with GPS-geofenced attendance" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden relative">
      {/* Background glow elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-primary opacity-5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[50vw] w-[50vw] rounded-full bg-primary opacity-5 blur-[120px]" />
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-card border border-border-custom rounded-lg border-b border-border-custom px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-tr bg-primary font-sans font-bold text-white shadow-md">
            S
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Site<span className="text-primary">Flow</span>
          </span>
        </div>

        {/* Center nav links */}
        <nav className="hidden lg:flex items-center gap-6">
          <Link href="/products" className="text-sm text-muted hover:text-foreground transition-all">Products</Link>
          <Link href="/about" className="text-sm text-primary hover:text-foreground transition-all">About</Link>
          <Link href="/who-we-serve" className="text-sm text-muted hover:text-foreground transition-all">Who We Serve</Link>
          <Link href="/resources" className="text-sm text-muted hover:text-foreground transition-all">Resources</Link>
          <Link href="/blog" className="text-sm text-muted hover:text-foreground transition-all">Blog</Link>
          <Link href="/SiteFlow-pricing" className="text-sm text-muted hover:text-foreground transition-all">Pricing</Link>
          <Link href="/contact" className="text-sm text-muted hover:text-foreground transition-all">Contact</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/help"
            className="hidden md:flex items-center justify-center rounded-md bg-white/[0.03] border border-border-custom px-4 py-2 text-sm font-semibold hover:bg-primary/10 hover:border-white/20 transition-all cursor-pointer"
          >
            Help
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center rounded-md bg-white/[0.03] border border-border-custom px-4 py-2 text-sm font-semibold hover:bg-primary/10 hover:border-white/20 transition-all cursor-pointer"
          >
            Log In
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/10 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
          >
            Free Trial
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-6 py-24 text-center max-w-4xl mx-auto space-y-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary border border-primary/20">
          ✨ About SiteFlow
        </span>

        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
          The operations workspace <br />
          <span className="text-gradient-accent">Indian construction was missing</span>
        </h1>

        <p className="text-muted text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          SiteFlow replaces the spreadsheet and WhatsApp stack with one connected record, from the
          first site punch to the final client invoice.
        </p>
      </section>

      {/* Why SiteFlow exists */}
      <section className="max-w-3xl mx-auto px-6 py-10 space-y-4">
        <h2 className="text-3xl font-extrabold text-white">Why SiteFlow exists</h2>
        <p className="text-muted text-base leading-relaxed">
          Most Indian sites still run on spreadsheets and WhatsApp groups. That works for one small
          job. It breaks the moment a project scales. Progress lives in one place, payments in
          another, and the ledger somewhere else entirely. Site records and finance ledgers drift
          apart because nothing is connected. By the time anyone notices, the numbers no longer agree.
        </p>
      </section>

      {/* What SiteFlow is */}
      <section className="max-w-3xl mx-auto px-6 py-10 space-y-4">
        <h2 className="text-3xl font-extrabold text-white">What SiteFlow is</h2>
        <p className="text-muted text-base leading-relaxed">
          SiteFlow is one workspace that connects planning, daily progress, procurement, and project
          finance. It is built for Indian statutory reality, with works-contract GST, TDS, PF and ESI,
          and engineering math to IS and CPWD specifications. This is not a generic project tool with a
          construction skin applied on top. The calculations, the compliance, and the workflows come
          from how Indian sites actually operate.
        </p>
      </section>

      {/* Product philosophy */}
      <section className="max-w-6xl mx-auto px-6 py-12 space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold text-white">How we build it</h2>
          <p className="text-muted text-base max-w-xl mx-auto">
            Three principles shape every module, from planning to final invoice.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PILLARS.map((p, i) => (
            <div key={i} className="rounded-lg bg-card border border-border-custom p-7 space-y-3">
              <div className="text-2xl">{p.icon}</div>
              <h3 className="font-semibold text-white text-base leading-snug">{p.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Proof strip, same claim set as homepage and pricing (no invented numbers) */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-lg border border-border-custom bg-border-custom overflow-hidden">
          {PROOF_POINTS.map((t, i) => (
            <div key={i} className="bg-card px-4 py-6 text-center space-y-1">
              <div className="text-2xl font-extrabold text-white">{t.value}</div>
              <div className="text-xs text-muted">{t.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="rounded-md bg-radial bg-primary border border-border-custom p-12 text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-cover opacity-10 pointer-events-none" />
          <h2 className="text-3xl font-bold text-white">See the workspace for yourself</h2>
          <p className="text-white/70 text-sm max-w-md mx-auto">
            Start a free trial and explore planning, progress, procurement and project finance in one place.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-secondary/15 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-custom px-6 py-8 text-muted">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs">
            SiteFlow is an independent construction operations platform. All product names, logos, and brands are property of their respective owners.
          </p>
          <div className="flex items-center gap-6 text-xs">
            <Link href="/blog" className="hover:text-muted transition-all">Blog</Link>
            <Link href="/help" className="hover:text-muted transition-all">Help Center</Link>
            <Link href="/resources/construction-terms-meanings" className="hover:text-muted transition-all">Glossary</Link>
          <Link href="/resources/construction-calculators" className="hover:text-muted transition-all">Calculators</Link>
          <Link href="/who-we-serve" className="hover:text-muted transition-all">Who We Serve</Link>
          <Link href="/terms" className="hover:text-muted transition-all">Terms</Link>
            <Link href="/privacy" className="hover:text-muted transition-all">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
