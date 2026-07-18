import Link from "next/link";
import Icon from "./Icon";

const FOOTER_COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "Products", href: "/products" },
      { label: "Pricing", href: "/SiteFlow-pricing" },
      { label: "Integrations", href: "/integrations" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "Glossary", href: "/resources/construction-terms-meanings" },
      { label: "Calculators", href: "/resources/construction-calculators" },
      { label: "Help Center", href: "/help" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Who We Serve", href: "/who-we-serve" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="relative w-full bg-alx-surface-container-low border-t border-alx-outline-variant/30 pt-20 pb-10 overflow-hidden">
      <div className="absolute top-0 left-0 h-px w-full alx-bg-gradient-primary opacity-70" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 px-12 max-w-7xl mx-auto">
        <div className="lg:col-span-1">
          <Link className="flex items-center gap-2 mb-4 group" href="/">
            <Icon
              name="architecture"
              className="w-6 h-6 text-alx-primary group-hover:scale-110 transition-transform"
            />
            <span className="font-headline text-xl font-bold tracking-tight">
              <span className="text-alx-on-surface">Site</span>
              <span className="text-alx-primary">Flow</span>
            </span>
          </Link>
          <p className="font-body text-sm text-alx-on-surface-variant opacity-80 leading-relaxed">
            Construction management, built for how Indian sites actually work.
          </p>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <div key={column.heading} className="space-y-5">
            <h4 className="font-uilabel font-bold text-alx-on-surface text-xs uppercase tracking-[0.16em]">
              {column.heading}
            </h4>
            <ul className="space-y-3.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    className="font-body text-alx-on-surface-variant hover:text-alx-primary transition-colors opacity-80 hover:opacity-100 text-sm"
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="max-w-7xl mx-auto px-12 mt-16 pt-8 border-t border-alx-outline-variant/30 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="font-body text-sm text-alx-on-surface-variant opacity-70">
          &copy; {new Date().getFullYear()} SiteFlow. All rights reserved.
        </p>
        <div className="flex items-center gap-6">
          <Link
            href="/privacy"
            className="font-uilabel text-xs uppercase tracking-wide text-alx-on-surface-variant hover:text-alx-primary transition-colors opacity-80 hover:opacity-100"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="font-uilabel text-xs uppercase tracking-wide text-alx-on-surface-variant hover:text-alx-primary transition-colors opacity-80 hover:opacity-100"
          >
            Terms
          </Link>
          <p className="font-body text-sm text-alx-on-surface-variant opacity-70">
            Built for Indian construction
          </p>
        </div>
      </div>
    </footer>
  );
}
