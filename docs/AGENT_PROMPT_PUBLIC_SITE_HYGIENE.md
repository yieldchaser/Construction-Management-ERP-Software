> **SUPERSEDED. Do not run this file.** Everything in it, plus two further defects, is in `docs/AGENT_PROMPT_COMBINED_PRESENTATION_AND_PUBLIC_SITE.md`. Run that instead.

# AGENT PROMPT: an internal page in production, no robots, no sitemap, duplicate titles

Four items on the public site. Found by loading the public routes in a browser against production, a surface none of the earlier sweeps had touched.

Report as before: command, exit code, one sentence. No pasted output. "Not run" is acceptable.

---

# PART 1: an internal developer page is live in production

`https://site-flow-omega.vercel.app/dev/icons` returns **200 to anyone**, with no authentication. It renders:

> INTERNAL DEVELOPMENT REFERENCE
> Icon sheet. Every icon in the stroke-icon set (`frontend/src/components/marketing/...`)

Its own source comment at `frontend/src/app/dev/icons/page.tsx` says:

> Internal development reference only. Not linked from any user-facing navigation.

**Not linked is not the same as not reachable.** The URL is short and guessable, there is no `robots.txt` to discourage a crawler (Part 2), and the page prints internal source paths to the public.

## The fix, decided

**Delete the route.** It was scaffolding for the emoji conversion, which finished long ago, and its own comment says as much. Do not gate it behind an env check and do not move it: an internal reference page has no reason to exist in a production bundle at all.

If the icon sheet is still genuinely useful for development, say so in your report and it can come back as a Storybook-style local-only tool later. Do not build that in this run.

Then check for siblings: report whether anything else under `src/app/dev/` exists, and whether any other route renders text containing "INTERNAL" or a `frontend/src/` path.

---

# PART 2: there is no robots.txt

`GET /robots.txt` returns **404**. No `robots.ts` or `robots.txt` exists anywhere in the frontend.

So every crawler is free to index everything, including `/dev/icons` while it exists, the `/c/**` console routes, and the auth pages.

Add a `robots.ts` in the Next app directory. It should allow the marketing surface and **disallow the application surface**, which has no business being indexed:

```
Disallow: /c/
Disallow: /login
Disallow: /onboarding
Disallow: /auth/
Disallow: /profile/
```

and point at the sitemap from Part 3.

---

# PART 3: there is no sitemap.xml

`GET /sitemap.xml` returns **404**, and no `sitemap.ts` exists.

This matters here more than on most products. The marketing site is a real content investment: a glossary with **200 terms**, a knowledge base, a blog, product pages, comparison pages and calculators. None of it is being offered to a crawler in a structured way.

Add a `sitemap.ts` that emits the public marketing routes, including the dynamic ones that are already generated: `/blog/[slug]`, `/products/[slug]`, `/who-we-serve/[segment]`, `/resources/[...slug]`, `/help/[...slug]`, and the glossary. Read how those slugs are enumerated at build time and reuse that source rather than hardcoding a list that will rot.

Exclude everything `robots.ts` disallows.

---

# PART 4: seven public pages share one generic title and description

Fetched from production. **Seven of twelve** public pages emit the root layout's metadata verbatim:

| Page | Title |
|---|---|
| `/` | SiteFlow \| Premium Construction Management & Operations Portal |
| `/SiteFlow-pricing` | same |
| `/about` | same |
| `/contact` | same |
| `/who-we-serve` | same |
| `/help` | same |
| `/privacy`, `/terms` | same |

All share one description too: "Next-generation site tracking, resource coordination, and re...".

Five pages already do this properly and are the model to copy: `/products`, `/resources`, `/blog`, `/integrations` and the glossary each carry a distinct title and description.

**Pricing and help are the expensive ones to get wrong.** They are the highest-intent pages on the site, and both currently look identical to the homepage in a search result.

Give each of the seven a `metadata` export with a distinct title and a description written for that page. Follow the voice of the five that are already correct.

**Do not touch the marketing help article JSON `body` fields.** Those are rendered with `dangerouslySetInnerHTML` and parsed by `annotateHeadingsForToc()`, so editing the markup silently breaks the in-page table of contents. Title and description fields are safe; body is not.

---

# Rules

- No authoring scripts.
- No em dashes in any copy you write.
- Do not change the console. This run is the public site only.
- Do not add tracking, analytics or third-party scripts.

# Definition of done

- [ ] `/dev/icons` no longer exists. Report what `curl -o /dev/null -w "%{http_code}" https://site-flow-omega.vercel.app/dev/icons` returns after deploy, and whether any sibling dev route was found.
- [ ] `/robots.txt` returns 200 and disallows `/c/`, `/login`, `/onboarding`, `/auth/`, `/profile/`.
- [ ] `/sitemap.xml` returns 200 and lists the marketing routes including the dynamic ones. Report how many URLs it contains.
- [ ] All seven pages carry a distinct title and description. Report the twelve titles as a list so the duplicates are visibly gone.
- [ ] No marketing help article `body` field was modified. Confirm with a diff summary.
- [ ] `cd frontend && npx tsc --noEmit` and `npm run build` both run and both clean.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` still **1152 passed, 4 skipped**. This run should not touch it.
- [ ] `python scripts/verification/verify_help_claims.py` still `[PASS]` at 37 / 38 / 73 / 116.
- [ ] **Commit and push to `origin/main`.**
