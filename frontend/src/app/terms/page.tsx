/* Legal contact values (kept in one place for easy update):
   brand/operator name "SiteFlow", contact email puwork09@gmail.com,
   jurisdiction New Delhi, India, effective date 01-01-2026. A formal
   registered legal entity name and address can be substituted for
   "SiteFlow" here once incorporated. */
import Link from "next/link";

const SECTIONS = [
  {
    title: "Acceptance of Terms",
    body: "These Terms of Service (the Terms) govern your access to and use of the SiteFlow platform, including our website, application programming interfaces, and related services (the Service). The Service is operated by SiteFlow (we, us, our). By creating an account or using the Service, you agree to be bound by these Terms and by our Privacy Policy. If you do not agree, do not use the Service.",
  },
  {
    title: "Description of Service",
    body: "SiteFlow is a construction operations platform that connects project planning, daily progress tracking, procurement, and project finance. The Service is provided on an as available basis and may change over time. We may add, modify, or discontinue features at our discretion. Descriptions of features are for general information and do not create a commitment that any particular feature will remain available.",
  },
  {
    title: "Account Responsibilities",
    body: "You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must provide accurate information when registering and keep it current. You are responsible for managing user access within your organization, including assigning appropriate roles and revoking access when needed. You agree to notify us promptly of any unauthorized use of your account.",
  },
  {
    title: "Subscription and Billing",
    body: "Paid plans are billed in advance on a recurring basis as selected at checkout. Fees are exclusive of applicable taxes unless stated otherwise. Taxes, including GST, are charged where required by law. Subscription fees are non refundable except where required by applicable law. We may change pricing on notice, and changes apply to subsequent billing periods. Failure to pay may result in suspension or termination of access.",
  },
  {
    title: "Acceptable Use",
    body: "You agree not to misuse the Service. You will not attempt to gain unauthorized access, interfere with the Service, copy or resell it except as permitted, upload unlawful or infringing material, or use it to violate any law or third party right. We may suspend or terminate accounts that breach this section.",
  },
  {
    title: "Data Ownership",
    body: "You retain all rights and ownership in the data you upload or create through the Service, including project plans, progress records, financial data, and files (Your Data). We do not claim ownership of Your Data. You grant us a limited license to process Your Data solely to provide and improve the Service. You are responsible for the lawfulness of Your Data and for obtaining any necessary consents.",
  },
  {
    title: "Intellectual Property",
    body: "The SiteFlow software, branding, documentation, and related materials are owned by SiteFlow or its licensors and are protected by applicable law. These Terms do not grant you any rights in our intellectual property except the limited right to use the Service as permitted. Feedback you provide may be used by us without obligation.",
  },
  {
    title: "Limitation of Liability",
    body: "The Service is provided as is and as available, without warranties of any kind, to the maximum extent permitted by law. We are not liable for indirect, incidental, or consequential damages, or for any loss of data, profits, or business arising from your use of the Service. Our total liability is limited to the amount you paid for the Service in the twelve months before the event giving rise to the claim.",
  },
  {
    title: "Termination",
    body: "You may cancel your account at any time through the Service or by contacting us. We may suspend or terminate your access for material breach of these Terms, non payment, or legal or security reasons, with notice where practicable. Upon termination, your right to use the Service ends, and we will handle Your Data as described in our Privacy Policy and applicable law.",
  },
  {
    title: "Governing Law",
    body: "These Terms are governed by the laws of India. The courts of New Delhi, India have exclusive jurisdiction over any dispute arising from these Terms or the Service, subject to mandatory consumer protection provisions. If any provision is unenforceable, the remaining provisions continue in effect.",
  },
  {
    title: "Changes to these Terms",
    body: "We may update these Terms from time to time. Material changes will be communicated through the Service or by email. Continued use after changes take effect constitutes acceptance of the updated Terms.",
  },
  {
    title: "Contact",
    body: "Questions about these Terms can be directed to puwork09@gmail.com.",
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden relative">
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

      {/* Content */}
      <section className="relative px-6 py-16 max-w-3xl mx-auto space-y-10">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white">Terms of Service</h1>
          <p className="text-xs text-muted">Last updated: 01-01-2026</p>
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
          <div className="flex items-center flex-wrap gap-x-6 gap-y-2 text-xs">
            <Link href="/blog" className="hover:text-muted transition-all whitespace-nowrap">Blog</Link>
            <Link href="/help" className="hover:text-muted transition-all whitespace-nowrap">Help Center</Link>
            <Link href="/resources/construction-terms-meanings" className="hover:text-muted transition-all whitespace-nowrap">Glossary</Link>
            <Link href="/resources/construction-calculators" className="hover:text-muted transition-all whitespace-nowrap">Calculators</Link>
            <Link href="/terms" className="hover:text-muted transition-all whitespace-nowrap">Terms</Link>
            <Link href="/privacy" className="hover:text-muted transition-all whitespace-nowrap">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
