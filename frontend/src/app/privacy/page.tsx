/* Legal contact values (kept in one place for easy update):
   controller/brand name "SiteFlow", contact + grievance email
   puwork09@gmail.com, effective date 01-01-2026. A formal registered
   legal entity name can be substituted for "SiteFlow" once incorporated. */
import MarketingShell from "@/components/marketing/MarketingShell";

const SECTIONS = [
  {
    title: "Introduction",
    body: "This Privacy Policy explains how SiteFlow (we, us, our) collects, uses, and protects information when you use SiteFlow (the Service). It applies to users in India and is written to align with the Digital Personal Data Protection Act, 2023 (DPDP Act). By using the Service, you consent to the practices described here.",
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
    body: "We may update this Privacy Policy from time to time. Material changes will be communicated through the Service or by email. The current version is effective as of 01-01-2026.",
  },
  {
    title: "Contact and Grievances",
    body: "For privacy questions, to exercise your rights, or to raise a grievance about how your data is handled, contact us at puwork09@gmail.com. We will acknowledge and address complaints in line with the DPDP Act, 2023.",
  },
];

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function PrivacyPage() {
  return (
    <MarketingShell>
      {/* Page header */}
      <section className="px-6 pt-8 pb-12 max-w-5xl mx-auto">
        <div className="max-w-2xl space-y-3">
          <span className="alx-label alx-badge-gold inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs">
            Legal
          </span>
          <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight text-alx-on-surface leading-tight">
            Privacy Policy
          </h1>
          <p className="font-body text-sm text-alx-on-surface-variant">Last updated: 01-01-2026</p>
        </div>
      </section>

      {/* Content with table of contents */}
      <section className="px-6 pb-24 max-w-5xl mx-auto">
        <div className="md:grid md:grid-cols-[220px_1fr] md:gap-12">
          <nav className="hidden md:block">
            <div className="sticky top-32 space-y-1 border-l border-alx-outline-variant/30 pl-4">
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
              <section key={i} id={slugify(s.title)} className="space-y-3 scroll-mt-32">
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
