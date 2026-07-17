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
    <footer className="w-full bg-alx-surface-container border-t border-alx-outline-variant/20 py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 px-12 max-w-7xl mx-auto">
        <div className="lg:col-span-1">
          <Link className="flex items-center gap-2 mb-6" href="/">
            <Icon name="architecture" className="w-6 h-6 text-alx-secondary" />
            <span className="font-headline text-xl text-alx-secondary font-bold tracking-tight">
              SiteFlow
            </span>
          </Link>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <div key={column.heading} className="space-y-4">
            <h4 className="font-uilabel font-bold text-alx-on-surface text-sm uppercase tracking-widest">
              {column.heading}
            </h4>
            <ul className="space-y-3">
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
      <div className="max-w-7xl mx-auto px-12 mt-16 pt-8 border-t border-alx-outline-variant/20 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="font-body text-sm text-alx-on-surface-variant opacity-80">
          &copy; {new Date().getFullYear()} SiteFlow. All rights reserved.
        </p>
        <p className="font-body text-sm text-alx-on-surface-variant opacity-80">
          Built for Indian construction
        </p>
      </div>
    </footer>
  );
}
