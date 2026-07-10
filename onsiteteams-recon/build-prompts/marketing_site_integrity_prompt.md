# SiteFlow — Public marketing site content-integrity fixes (urgent, pre-launch blocker)

## Context
Auditing the public marketing site content (`frontend/src/content/{help,blog,products,resources,pages}` + `frontend/public/images/recon/`) found two real problems that must be fixed before this site goes live. This is separate from and higher priority than the in-app tab-by-tab build.

## Fix 1 — Strip all competitor screenshots (critical)
`frontend/public/images/recon/` contains 398 raw screenshots scraped from the competitor's actual live product during recon. These are referenced across 173 content JSON files (Help: 60, Blog: 65, Products: 20, Resources: 23, Pages: 5) via `<img src="/images/recon/...">` / `<figure class="wp-block-image">` blocks.

Confirmed severity: at least one image (`3-29-1024x576.jpg`, used in blog content) shows the competitor's literal sidebar branding **"© Onsite Teams | v8.11.0"** plus what appears to be a real customer's company name ("Dhruv Construction Admin") and a real customer project ("Onsite Interior") with actual progress/financial figures. This is competitor trademark use plus likely a third party's private business data, published on our own site.

**Do this now:**
1. Find every content JSON file referencing `/images/recon/` (grep `src="/images/recon/` across `frontend/src/content/`).
2. Remove the image block (`<figure class="wp-block-image">...</figure>` or bare `<img>` tag) from each article's `body` HTML — don't just swap the src to a broken path, remove the element cleanly so the article still reads well without it.
3. Do NOT attempt to crop/blur/reuse any of these images in any form — the underlying screenshot content and layout are the competitor's, not ours to adapt.
4. After stripping, delete `frontend/public/images/recon/` entirely (or move it out of the public-served tree if you want to keep it for later reference — but it must not be reachable via any public URL).
5. Sanity-check a sample of 5-10 affected articles after stripping — confirm they still read coherently without the images (headings/lists/tables should carry the content fine on their own).

Real SiteFlow screenshots can be added back later once the app is stable enough to screenshot — that's a separate, lower-priority future task, not this one. Text-only help docs are acceptable for now.

## Fix 2 — Remove leftover competitor brand name from anchor-ID slugs
48 content files (mostly `blog/`, some `products/`/`resources/`) have table-of-contents anchor IDs (pattern: `<span class="ez-toc-section" id="How_Onsites_Construction_Procurement...">` or similar `id="..."` attributes on heading spans) that still contain the literal string "Onsite" or "Onsites" — leftover from the original heading text before the SiteFlow rebrand, e.g. an ID like `id="How_Onsites_Work_Order_Management_Software..."`.

**Important distinction:** the *visible* heading text in these same files has already been correctly rewritten to say "SiteFlow" — this is confirmed clean. Only the invisible `id` attribute retained the old text. But these IDs are still exposed: they show up in the browser URL bar when a reader clicks a "jump to section" table-of-contents link (`.../article-slug#How_Onsites_...`), and in page source.

**Do this now:**
1. Grep all content files for `id="[^"]*[Oo]nsite[^"]*"` (case-insensitive) to find every affected anchor ID.
2. Regenerate each affected ID from its actual current (already-correct) visible heading text, using whatever slug-generation convention the rest of the ID's format follows (appears to be: heading text → replace spaces with underscores, strip punctuation). Do NOT just find-replace "Onsite"→"SiteFlow" inside the existing ID — regenerate it fresh from the real heading text so it's fully consistent, in case there are other subtle leftovers in the same ID string.
3. Verify no internal links elsewhere in the same file point to the old ID via `href="#old-id"` — if any do, update those too so in-page jump links still work.

## Verification
- After both fixes: re-run the grep checks above (recon image refs, Onsite-containing IDs) and confirm zero hits.
- Spot-check 5+ articles render fine (no broken image icons, no dead jump-links).
- Report back: exact count of files touched for each fix, and confirm the two greps return zero afterward.

## Scope boundary
This is content-only (JSON files in `src/content/` + the `public/images/recon/` asset folder). Do not touch the app tabs, the help-page React components, or anything under `frontend/src/app/`. Report back when done — don't continue to other work without checking in first, this is a scoped fix.
