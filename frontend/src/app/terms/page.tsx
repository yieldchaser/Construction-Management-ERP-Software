/* Legal contact values (kept in one place for easy update):
   brand/operator name "SiteFlow", contact email puwork09@gmail.com,
   jurisdiction New Delhi, India, effective date 01-01-2026. A formal
   registered legal entity name and address can be substituted for
   "SiteFlow" here once incorporated. */
import MarketingShell from "@/components/marketing/MarketingShell";

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

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function TermsPage() {
  return (
    <MarketingShell>
      {/* Page header */}
      <section className="relative px-6 pt-8 pb-12 overflow-hidden alx-scroll-fade is-visible">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-alx-primary-fixed/30 via-alx-surface-container-lowest to-alx-surface-container-lowest pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="max-w-2xl space-y-3">
            <span className="alx-label alx-badge-gold inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs">
              Legal
            </span>
            <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight text-alx-on-surface leading-tight">
              Terms of Service
            </h1>
            <p className="font-body text-sm text-alx-on-surface-variant">Last updated: 01-01-2026</p>
          </div>
        </div>
      </section>

      {/* Content with table of contents */}
      <section className="px-6 pb-24 max-w-5xl mx-auto">
        <div className="md:grid md:grid-cols-[220px_1fr] md:gap-12">
          <nav className="hidden md:block">
            <div className="sticky top-32 space-y-1 rounded-2xl border-l border-alx-outline-variant/30 bg-alx-surface-container-lowest pl-4 py-4 shadow-md shadow-alx-on-surface/5">
              <p className="font-uilabel text-xs font-semibold uppercase tracking-widest text-alx-on-surface-variant mb-3">
                On this page
              </p>
              {SECTIONS.map((s, i) => (
                <a
                  key={i}
                  href={`#${slugify(s.title)}`}
                  className="block text-sm text-alx-on-surface-variant hover:text-alx-primary transition-colors py-1"
                >
                  {s.title}
                </a>
              ))}
            </div>
          </nav>

          <div className="max-w-2xl space-y-10">
            {SECTIONS.map((s, i) => (
              <section
                key={i}
                id={slugify(s.title)}
                className="space-y-3 scroll-mt-32 alx-scroll-fade"
              >
                <h2 className="font-headline text-xl font-bold text-alx-on-surface">{s.title}</h2>
                <p className="font-body text-sm text-alx-on-surface-variant leading-relaxed">{s.body}</p>
              </section>
            ))}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
