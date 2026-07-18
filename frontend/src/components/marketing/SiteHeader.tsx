"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";

const NAV_LINKS = [
  { label: "Products", href: "/products" },
  { label: "Who We Serve", href: "/who-we-serve" },
  { label: "Resources", href: "/resources" },
  { label: "Blog", href: "/blog" },
];

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <header
      className={`fixed top-0 w-full z-50 backdrop-blur-md border-b transition-all duration-300 ${
        scrolled
          ? "bg-alx-surface-container-lowest/95 border-alx-outline-variant/40 shadow-lg shadow-alx-on-surface/5"
          : "bg-alx-surface-container-lowest/80 border-alx-outline-variant/40 shadow-none"
      }`}
    >
      <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
        <Link className="flex items-center gap-2 group" href="/" onClick={closeMenu}>
          <Icon
            name="architecture"
            className="w-8 h-8 text-alx-primary group-hover:scale-110 transition-transform"
          />
          <span className="font-headline text-2xl font-bold tracking-tight">
            <span className="text-alx-on-surface">Site</span>
            <span className="text-alx-primary">Flow</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`group relative py-1 font-uilabel text-sm tracking-wide uppercase transition-colors ${
                isActive(link.href)
                  ? "text-alx-primary"
                  : "text-alx-on-surface-variant hover:text-alx-primary"
              }`}
            >
              {link.label}
              <span
                className={`absolute -bottom-1 left-0 h-px bg-alx-primary transition-all duration-300 ${
                  isActive(link.href) ? "w-full" : "w-0 group-hover:w-full"
                }`}
              />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="hidden md:flex font-uilabel text-sm tracking-wide uppercase text-alx-on-surface-variant hover:text-alx-primary transition-colors"
          >
            Log In
          </Link>
          <Link
            href="/login"
            className="alx-bg-gradient-primary text-alx-on-primary px-6 py-2.5 rounded-full font-uilabel text-sm font-bold tracking-wide hover:shadow-lg hover:shadow-alx-primary/30 transition-all active:scale-95 relative overflow-hidden group"
          >
            <span className="relative z-10">Start Free Trial</span>
            <div className="absolute inset-0 alx-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>

          <button
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg bg-alx-surface-container-high text-alx-on-surface hover:text-alx-primary transition-colors"
          >
            <Icon name={menuOpen ? "close" : "menu"} className="w-6 h-6" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-alx-surface-container-lowest/95 backdrop-blur-xl border-t border-alx-outline-variant/40 shadow-lg shadow-alx-on-surface/5 px-8 pb-6">
          <nav className="flex flex-col gap-1 pt-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`rounded-lg px-3 py-2.5 font-uilabel text-sm tracking-wide uppercase transition-colors ${
                  isActive(link.href)
                    ? "text-alx-primary bg-alx-surface-container-high"
                    : "text-alx-on-surface-variant hover:text-alx-primary hover:bg-alx-surface-container-high"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/login"
              onClick={closeMenu}
              className="flex items-center justify-center rounded-full bg-alx-surface-container-high text-alx-primary px-4 py-2.5 font-uilabel text-sm font-bold tracking-wide"
            >
              Log In
            </Link>
            <Link
              href="/login"
              onClick={closeMenu}
              className="alx-bg-gradient-primary text-alx-on-primary flex items-center justify-center rounded-full px-4 py-2.5 font-uilabel text-sm font-bold tracking-wide shadow-sm"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
