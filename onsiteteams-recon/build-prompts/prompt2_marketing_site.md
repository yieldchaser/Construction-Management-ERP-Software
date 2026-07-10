# SiteFlow — Public marketing site overhaul (pre-login pages, all sections)

## Context
Extensive competitive recon done (43 competitor marketing pages analyzed in depth). SiteFlow's marketing site already had competitor screenshots stripped and leftover brand-name artifacts fixed (prior round). This round is content/structure improvement across every public page — informed by what works on the competitor's site, what's broken on theirs (don't repeat their mistakes), and where they left whitespace SiteFlow can occupy.

**Standing instruction: do not clone their site. Tweak at every level** — structure can rhyme, copy must not match, and where they're inconsistent or sloppy, SiteFlow should be the opposite.

## What NOT to repeat (their mistakes, confirmed via recon)
1. **Inconsistent trust stats** — they use "500+" and "10,000+" interchangeably, sometimes on the same page, never reconciled. Pick ONE real number for SiteFlow (or none, if we don't have defensible numbers yet — don't invent one) and use it everywhere.
2. **Inconsistent claims generally** — demo length (10-min vs 30-min), go-live time (&lt;1 day / 3 days / 7 days) all vary unreconciled across their pages. Pick one true claim per metric, use it everywhere.
3. **Copy-paste leftover bugs** — multiple competitor pages have content from a *different* module bleeding into the wrong page (a Materials page's closing CTA is entirely about Drawings; a Procurement testimonial intro talks about "quotation cycles"). Every page must be individually read end-to-end before shipping, specifically checking that shared/templated blocks were correctly re-targeted.
4. **Recycled testimonials** — same customer name reused across multiple pages with different (sometimes contradictory) company descriptions attached. Use real, distinct customers per testimonial, or clearly-labeled illustrative examples if real customers aren't available yet — never silently recycle.
5. **Legal pages copy-pasted from an unrelated template** — their Privacy Policy references a different company by name in two places, and their Terms & Conditions use fintech/lending vocabulary ("Merchants," "KYC," "not a financial product") for what's a construction SaaS. SiteFlow's legal pages must be actually drafted for what SiteFlow does — construction project management SaaS — not adapted from a generic/wrong-vertical template. If using a template as a starting point, every clause must be reviewed for fit, not just find-replaced.
6. **Overclaiming "AI"** — their calculator page is branded "Advanced AI Construction Calculators" but is plain IS-code arithmetic, no AI involved. Don't label something AI unless it actually is.
7. **Contradictory messaging on the same concept** — they position WhatsApp as both a killer feature (native notifications) and the villain to escape from (chaotic recordkeeping), sometimes on the same page. If SiteFlow uses WhatsApp or any tool as both a notification channel and a "replaces informal use of X" pitch, articulate the distinction cleanly (e.g. "great for pinging you, useless as your system of record") rather than blurring it.

## What TO adopt (structural patterns worth building, in SiteFlow's own words/design)
1. **The ✕/✓ before-after testimonial box** — named customer + role + company + city, one headline stat if available, 5-star row, then a two-column "Before / After" comparison. Their own site applies this inconsistently (only ~1/3 of pages use the headline-stat version). Apply it **consistently** on every module/product page as a signature device — that consistency alone is a differentiator they don't have.
2. **One consistent module-page template** — hero + 3-bullet checklist → persona-segment grid ("built for X") → 4-card industry-challenges → 2-3 feature deep-dives with realistic mockup data (not placeholder-looking repeated numbers) → testimonial+before-after box → honest unfavorable-comparison section (against manual/spreadsheet processes, in SiteFlow's own voice, not copying "Excel Cannot Deliver X" phrasing) → additional-features grid (6 items) → FAQ (8-10 questions) → final CTA. Apply this same shape to every module page for consistency (they don't).
3. **A recurring named demo dataset threaded through a page's mockups** — e.g. one fictional project/company whose numbers appear consistently across a page's 2-3 feature mockups, telling one coherent story instead of disconnected screenshots. Invent SiteFlow's own dataset, don't reuse theirs.
4. **Contextually-matched mid-content CTAs** — e.g. their glossary interleaves demo-CTAs that reference the specific terms just covered, not one generic repeated banner. Worth doing on long-form content pages (glossary, blog).
5. **Category-count/scope-teaser copy on hub pages** (Help Center category cards, glossary letter-sections) — reader knows what's inside before clicking.

## Page-by-page scope

**Homepage** — hero (headline/subhead/CTA), trust bar (real numbers only), section-by-section feature walkthrough in priority order (lead with SiteFlow's actual strongest/most-complete modules), testimonials, final CTA. Check current homepage against this and rebuild sections that are thin or missing.

**About page** — competitor's About page is completely faceless (no founders, no leadership, no office address, no team) — that's real whitespace. Recommend SiteFlow's About page include an actual founder/team narrative if the user wants that differentiation; otherwise mission/principles + company facts (founding year, focus market) is the floor. Confirm with user before writing founder-story content (needs real facts, not invented ones).

**Pricing page** — tiers, feature-gating matrix, add-ons, FAQ. Base structure on what SiteFlow's product actually supports today (cross-check against the built modules — Project/Team Schedule/Finance/Payroll/CRM/Setting/Library/Services), don't copy competitor's tier boundaries verbatim.

**Comparison page** — "SiteFlow vs alternatives" hub. Only make claims that are true for SiteFlow today.

**Module/product pages** — one per major module (Project Management, Finance, Payroll, CRM, Procurement, Labour, Equipment, etc.) using the consistent template above.

**Persona/vertical pages** (optional, lower priority) — if built, follow the "named demo dataset + persona-specific pain framing" pattern, not just noun-swapped generic copy (their own "Design Software for Interior Designers" page is a cautionary example — it's just the generic Drawing-Management page with an SEO title slapped on, 7/8 of its FAQ has nothing interior-specific).

**Help Center** — already stripped of competitor screenshots (prior round), currently text-only. Category structure + article content, no images needed yet.

**Glossary / Calculators / other free tools** — optional, lower priority than core module pages. If built, ground calculators in real formulas and don't over-brand as "AI."

**Careers page** — if used, keep listings genuinely current — don't leave stale "closed" positions live indefinitely (a QA/credibility issue on their site).

**Legal pages (Privacy Policy, Terms & Conditions, Refund/Cancellation)** — must be properly drafted for a construction-SaaS business specifically. Flag to the user that these likely need actual legal review, not just AI-generated boilerplate — at minimum, self-audit for the exact class of bug found on the competitor's site (leftover wrong-company-name references, wrong-industry vocabulary, unfilled placeholder text, missing Grievance Officer contact if targeting India under IT Rules 2011).

**Contact/Channel Partner/Brand Collaboration pages** — lower priority, build only if the user wants these specific lead-gen surfaces.

## Rules
- No verbatim or near-verbatim reuse of any competitor copy — treat every "verbatim-sensitive" phrase flagged in the recon as off-limits, including headline formulas, taglines, and CTA phrasing patterns.
- Every page individually reviewed before considered done — no shared-component leftovers bleeding across pages.
- One real, consistent set of trust numbers/claims across the whole site — no page-to-page contradiction.
- Full file-touch disclosure, one page/section at a time, stop after each, report back for verification.
- If a section needs real facts SiteFlow doesn't have yet (customer count, testimonials, founder bios), flag it and ask rather than inventing numbers or fake quotes.
