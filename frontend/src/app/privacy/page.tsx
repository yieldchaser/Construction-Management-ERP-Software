/* Legal placeholders to fill before go-live (do not ship with brackets):
   [Company Legal Name], [Registered Address], [Contact Email],
   [Grievance Officer Name/Contact], [Effective Date]. */
import Link from "next/link";

const SECTIONS = [
  {
    title: "Introduction",
    body: "This Privacy Policy explains how [Company Legal Name] (we, us, our) collects, uses, and protects information when you use SiteFlow (the Service). It applies to users in India and is written to align with the Digital Personal Data Protection Act, 2023 (DPDP Act). By using the Service, you consent to the practices described here.",
  },
  {
    title: "Information We Collect",
    body: "We collect the following categories of information. Account information includes your name, email address, phone number, organization name, and login credentials. Project data includes the information you enter into the Service, such as project plans, daily progress records, procurement and finance data, files, and team member details. Usage analytics includes information about how you use the Service, such as feature usage, device and browser type, and log data. Usage analytics are used in aggregate to operate and improve the Service.",
  },
  {
    title: "How We Use Information",
    body: "We use your information to provide and secure the Service, authenticate users, process subscriptions, respond to support requests, send service related communications, and improve the product. We do not sell your personal data. We use project data only to deliver the features you request.",
  },
  {
    title: "Data Storage and Security",
    body: "Your data is stored on infrastructure provided by our hosting partners, with access controls, encryption in transit, and company scoped isolation between tenants. We apply reasonable technical and organizational measures to protect your information. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.",
  },
  {
    title: "Third-Party Sharing",
    body: "We do not share your personal data with third parties for their own marketing. We share data only where necessary to provide the Service. The only current integrations that transmit your data to external systems are Tally Prime and Zoho Books, and only when you connect those accounts. Those connections are initiated by you and governed by the respective provider's terms. We may use service providers for hosting, analytics, and email delivery under contractual confidentiality.",
  },
  {
    title: "Your Rights",
    body: "Subject to the DPDP Act and other applicable law, you have the right to access your data, correct inaccuracies, withdraw consent, and request deletion of your account and associated data. You can exercise these rights through the Service settings or by contacting us. We will respond within the timeframes required by law.",
  },
  {
    title: "Data Retention",
    body: "We retain your account information and project data for as long as your account is active. After cancellation or termination, we retain data for a limited period to meet legal and contractual obligations, after which it is deleted or anonymized. You may request earlier deletion where permitted by law.",
  },
  {
    title: "India Focus and the DPDP Act",
    body: "This Service is intended for businesses and professional users, and is not directed to children. As an India focused product, we handle the personal data of Indian users in accordance with the Digital Personal Data Protection Act, 2023, and other applicable Indian law.",
  },
  {
    title: "Changes to this Policy",
    body: "We may update this Privacy Policy from time to time. Material changes will be communicated through the Service or by email. The current version is effective as of [Effective Date].",
  },
  {
    title: "Contact and Grievance Officer",
    body: "For privacy questions or to exercise your rights, contact [Contact Email]. You may also reach our Grievance Officer at [Grievance Officer Name/Contact]. We will acknowledge and address complaints in line with the DPDP Act, 2023.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden relative">
      <div className="absolute top-[-10%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-primary opacity-5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] h-[50vw] w-[50vw] rounded-full bg-primary opacity-5 blur-[120px] pointer-events-none" />

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

        <nav className="hidden lg:flex items-center gap-6">
          <Link href="/products" className="text-sm text-muted hover:text-foreground transition-all">Products</Link>
          <Link href="/about" className="text-sm text-muted hover:text-foreground transition-all">About</Link>
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
            className="flex items-center justify-center rounded-md bg-white/[0.03] border border-border-custom px-4 py-2 text-sm font-semibold hover:text-muted hover:bg-primary/10 hover:border-white/20 transition-all cursor-pointer"
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

      {/* Content */}
      <section className="relative px-6 py-16 max-w-3xl mx-auto space-y-10">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white">Privacy Policy</h1>
          <p className="text-xs text-muted">Last updated: [Effective Date]</p>
        </div>

        {SECTIONS.map((s, i) => (
          <section key={i} className="space-y-3">
            <h2 className="text-xl font-bold text-white">{s.title}</h2>
            <p className="text-sm text-muted leading-relaxed">{s.body}</p>
          </section>
        ))}
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
            <Link href="/terms" className="hover:text-muted transition-all">Terms</Link>
            <Link href="/privacy" className="hover:text-muted transition-all">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
