"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  GLOSSARY_TERMS,
  GLOSSARY_LETTERS,
  GLOSSARY_FEATURED,
  type GlossaryTerm,
} from "./glossary-data";

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

export default function GlossaryClient({ heroImage }: { heroImage?: string }) {
  const [query, setQuery] = useState("");
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const q = normalize(query.trim());

  const filtered = useMemo(() => {
    if (!q) return GLOSSARY_TERMS;
    return GLOSSARY_TERMS.filter(
      (t) =>
        normalize(t.term).includes(q) ||
        normalize(t.definition).includes(q) ||
        (t.seeAlso ? normalize(t.seeAlso).includes(q) : false)
    );
  }, [q]);

  // Letters that currently have at least one visible term.
  const availableLetters = useMemo(() => {
    const set = new Set(filtered.map((t) => t.letter));
    return GLOSSARY_LETTERS.filter((l) => set.has(l));
  }, [filtered]);

  // Group filtered terms by letter, preserving A-Z order.
  const grouped = useMemo(() => {
    const map: Record<string, GlossaryTerm[]> = {};
    for (const t of filtered) {
      (map[t.letter] ??= []).push(t);
    }
    return GLOSSARY_LETTERS.filter((l) => map[l]).map((l) => ({
      letter: l,
      terms: map[l],
    }));
  }, [filtered]);

  function jumpTo(letter: string) {
    setActiveLetter(letter);
    const el = sectionRefs.current[letter];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function onLetterClick(letter: string) {
    if (!availableLetters.includes(letter)) return;
    setQuery("");
    jumpTo(letter);
  }

  // Clicking a cross-ref filters the list to that term.
  function onSeeAlso(see: string) {
    setQuery(see);
    setActiveLetter(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-12">
      {/* Featured terms band */}
      <section aria-label="Featured terms" className="alx-scroll-fade">
        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-alx-outline-variant/15">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-alx-primary-fixed text-alx-primary shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
              <path d="M12 2l2.4 7.4H22l-6 4.4 2.3 7.2L12 16.6 5.7 21l2.3-7.2-6-4.4h7.6z" />
            </svg>
          </div>
          <div>
            <h2 className="font-headline text-lg font-extrabold text-alx-on-surface">Featured terms</h2>
            <p className="font-body text-xs text-alx-on-surface-variant">The ERP-linked anchors construction teams reach for first.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {GLOSSARY_FEATURED.map((f) => (
            <article key={f.term} className="rounded-2xl bg-alx-surface-container-lowest p-5 flex flex-col justify-between shadow-xl shadow-alx-on-surface/5 alx-hover-lift transition-all border border-alx-outline-variant/10">
              <div className="space-y-2">
                <span className="alx-label inline-flex items-center gap-1 text-[10px] font-bold text-alx-on-primary px-2 py-0.5 rounded-full alx-bg-gradient-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-alx-on-primary" />
                  In SiteFlow
                </span>
                <h3 className="font-headline text-base font-extrabold text-alx-on-surface leading-snug pt-1">{f.term}</h3>
                <p className="font-body text-xs text-alx-on-surface-variant leading-relaxed line-clamp-4">{f.definition}</p>
              </div>
              <p className="font-body text-xs text-alx-primary leading-relaxed mt-3 pt-3 border-t border-alx-outline-variant/15">
                <span className="font-bold">How SiteFlow automates this:</span> {f.automation}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Formula spotlight */}
      <section aria-label="Formula spotlight" className="alx-scroll-fade">
        <div className="rounded-3xl bg-gradient-to-br from-alx-primary-fixed via-alx-surface-container-lowest to-alx-surface-container p-7 md:p-9 border border-alx-outline-variant/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--alx-primary-container)_0%,transparent_60%)] opacity-25 pointer-events-none" />
          <div className="relative z-10">
            <span className="alx-label inline-block text-xs font-bold text-alx-primary px-2.5 py-1 rounded-md bg-alx-primary-fixed/40">Formula Spotlight</span>
            <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-alx-on-surface mt-3">Retention Money Release</h2>
            <p className="font-body text-sm text-alx-on-surface-variant max-w-2xl mt-2 leading-relaxed">
              On a running-account bill, the client holds back a retention percentage. The net amount released is the held retention less any agreed deductions.
            </p>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-alx-surface-container-lowest/90 border border-alx-outline-variant/15 p-4">
                <p className="alx-label text-[10px] font-bold text-alx-on-surface-variant">Retention held</p>
                <p className="font-headline text-lg font-extrabold text-alx-on-surface mt-1">R_held = P_certified × R_rate</p>
                <p className="font-body text-xs text-alx-on-surface-variant mt-1">P_certified is the certified bill value; R_rate is the agreed retention percentage.</p>
              </div>
              <div className="rounded-2xl bg-alx-surface-container-lowest/90 border border-alx-outline-variant/15 p-4">
                <p className="alx-label text-[10px] font-bold text-alx-on-surface-variant">Net released</p>
                <p className="font-headline text-lg font-extrabold text-alx-on-surface mt-1">R_net = R_held − D_deductions</p>
                <p className="font-body text-xs text-alx-on-surface-variant mt-1">D_deductions covers any other amounts withheld at the time of release.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky toolbar: search + A-Z rail */}
      <div className="sticky top-4 z-30 -mx-6 px-6 pt-3 pb-3 bg-alx-surface-container-lowest/85 backdrop-blur-md border-b border-alx-outline-variant/15">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-alx-on-surface-variant" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveLetter(null);
              }}
              placeholder="Search 200 construction & ERP terms..."
              aria-label="Search glossary terms"
              className="w-full rounded-full bg-alx-surface-container-lowest border border-alx-outline-variant/30 py-3 pl-12 pr-4 font-body text-sm text-alx-on-surface placeholder:text-alx-on-surface-variant/70 focus:outline-none focus:border-alx-primary focus:ring-2 focus:ring-alx-primary-fixed/40"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <nav aria-label="Jump to letter" className="flex flex-wrap gap-1.5">
              {GLOSSARY_LETTERS.map((l) => {
                const enabled = availableLetters.includes(l);
                const isActive = activeLetter === l;
                return (
                  <button
                    key={l}
                    type="button"
                    disabled={!enabled}
                    onClick={() => onLetterClick(l)}
                    aria-pressed={isActive}
                    className={[
                      "h-8 w-8 rounded-lg font-uilabel text-xs font-bold transition-all",
                      enabled
                        ? "bg-alx-surface-container-lowest text-alx-on-surface border border-alx-outline-variant/25 hover:border-alx-primary hover:text-alx-primary cursor-pointer"
                        : "bg-alx-surface-container-lowest/40 text-alx-outline-variant/50 border border-transparent cursor-not-allowed",
                      isActive ? "ring-2 ring-alx-primary text-alx-primary border-alx-primary" : "",
                    ].join(" ")}
                  >
                    {l}
                  </button>
                );
              })}
            </nav>
            <p className="font-uilabel text-xs font-bold text-alx-on-surface-variant shrink-0" aria-live="polite">
              {filtered.length} {filtered.length === 1 ? "term" : "terms"}
              {q ? " found" : " A–Z"}
            </p>
          </div>
        </div>
      </div>

      {/* A-Z term list */}
      {grouped.length === 0 ? (
        <div className="text-center py-20">
          <p className="font-headline text-xl font-extrabold text-alx-on-surface">No terms match &ldquo;{query}&rdquo;</p>
          <p className="font-body text-sm text-alx-on-surface-variant mt-2">Try a shorter keyword or clear the search.</p>
          <button type="button" onClick={() => setQuery("")} className="mt-5 inline-flex items-center justify-center rounded-full bg-alx-primary text-alx-on-primary font-uilabel text-sm font-bold px-6 py-3 hover:opacity-90 transition active:scale-95">
            Clear search
          </button>
        </div>
      ) : (
        <div className="space-y-12">
          {grouped.map(({ letter, terms }) => (
            <section
              key={letter}
              ref={(el) => {
                sectionRefs.current[letter] = el;
              }}
              className="alx-scroll-fade scroll-mt-32"
            >
              <div className="flex items-end gap-4 mb-5">
                <span className="font-headline text-5xl md:text-6xl font-extrabold text-alx-primary leading-none">{letter}</span>
                <div className="flex-1 border-b border-alx-outline-variant/20 pb-2 flex items-center justify-between">
                  <span className="sr-only">{terms.length} terms</span>
                  <span className="font-uilabel text-xs font-bold text-alx-on-surface-variant">{terms.length} {terms.length === 1 ? "term" : "terms"}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {terms.map((t) => (
                  <article key={t.term} className="rounded-2xl bg-alx-surface-container-lowest p-5 border border-alx-outline-variant/10 hover:border-alx-primary/40 transition-all shadow-sm shadow-alx-on-surface/5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-headline text-base font-extrabold text-alx-on-surface leading-snug">{t.term}</h3>
                      {t.inSiteFlow && (
                        <span className="alx-label inline-flex items-center gap-1 text-[10px] font-bold text-alx-on-primary px-2 py-0.5 rounded-full alx-bg-gradient-primary shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-alx-on-primary" />
                          In SiteFlow
                        </span>
                      )}
                    </div>
                    {t.seeAlso ? (
                      <button
                        type="button"
                        onClick={() => onSeeAlso(t.seeAlso as string)}
                        className="mt-2 font-body text-sm text-alx-primary hover:underline text-left"
                      >
                        See {t.seeAlso}
                      </button>
                    ) : (
                      <p className="font-body text-sm text-alx-on-surface-variant leading-relaxed mt-1.5">{t.definition}</p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Closing blue CTA */}
      <section className="py-16 px-6 bg-alx-surface-container-lowest alx-scroll-fade">
        <div className="max-w-4xl mx-auto alx-bg-gradient-primary rounded-[2.5rem] p-10 md:p-14 text-center relative overflow-hidden border border-alx-outline-variant/20 shadow-2xl shadow-alx-primary/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.18)_0%,transparent_60%)] opacity-60" />
          <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-alx-on-primary leading-tight mb-4 relative z-10">
            Put the glossary to work in your projects
          </h2>
          <p className="font-body text-alx-on-primary/90 text-sm max-w-md mx-auto mb-7 relative z-10 leading-relaxed">
            SiteFlow turns these terms into live data: BOQs, RA bills, retention, attendance, and reporting, all in one connected workspace for the office and the site.
          </p>
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="bg-alx-on-primary text-alx-primary px-7 py-3 rounded-full font-uilabel text-sm font-bold tracking-wide hover:shadow-xl transition-all active:scale-95 inline-flex items-center justify-center"
            >
              Get Started Free
            </Link>
            <Link
              href="/contact"
              className="border border-alx-on-primary/40 text-alx-on-primary px-7 py-3 rounded-full font-uilabel text-sm font-bold tracking-wide hover:bg-alx-on-primary/10 transition-all active:scale-95 inline-flex items-center justify-center"
            >
              Request a Demo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
