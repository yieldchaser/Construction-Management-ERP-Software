# D-017 — pre-login index page, measured

Measured 2026-08-30 against a **production build** (`next build` + `next start -p 3100`), not the dev
server. Page: `/` (landing).

## Fully-loaded page, after scrolling the whole page

| Metric | Value |
|---|---|
| Total transferred | **771.8 KB** |
| Images (via `next/image`) | **323.8 KB** across 7 requests |
| JS | 240.4 KB |
| Fonts | 110.0 KB |
| CSS | 42.9 KB |
| DOMContentLoaded | 390 ms |
| Load | 1002 ms |
| CLS | **0** |
| Long tasks | **0** |
| Broken images | **0** of 5 `<img>` tags |

Image requests actually served:

```
hero-dashboard.webp      w=1080 ->  34.0 KB
hero-dashboard.webp      w=1200 ->  39.4 KB
hero-dashboard.webp      w=1920 ->  57.7 KB
feature-planning.webp    w=1920 ->  38.4 KB
feature-procurement.webp w=1920 ->  61.6 KB
feature-dpr-phones.webp  w=750  ->  35.0 KB
feature-finance.webp     w=1920 ->  57.7 KB
```

## Important correction to the run-3 headline

Run 3 reported *"25.50 MB → 1.39 MB (-94.5%)"*. That is **source-file size on disk, not user-facing
transfer**, and the two are not the same here:

- Every landing-page image is served through `next/image`
  (`/_next/image?url=...&w=1920&q=75`), which re-encodes to the requested width at request time. The
  browser **never downloaded the 8.5 MB or 4.1 MB originals** — Next was already downscaling them.
- So the re-encode did **not** save users ~24 MB of download. What it genuinely saves is the
  optimizer's work: transforming a 0.5 MB source instead of an 8.5 MB one is far faster and cheaper on
  first request (and image optimization is billed on Vercel), plus a smaller repo and deploy upload.

The re-encode was worth doing. The number just describes a different thing than it appears to.

**Scope note:** of the 9 images re-encoded, only **`feature-dpr-phones`** is on the index page. The
other 8 (`construction-hero`, `cat-*`, `mock-*`) belong to the glossary, blog and mockup pages. Those
are real wins for those pages, but D-017 was scoped to the index.

## Still open on the asset front

| Item | Size | Note |
|---|---|---|
| Orphaned rasters in `frontend/public` | **47.9 MB across 44 files** | Not referenced from any source file. Dead weight in the repo and every deploy upload. Safe to delete after a reference check. |
| Referenced rasters still large | **21.5 MB across 9 files** | Served on non-index pages. Same re-encode treatment would apply. |

## Not verifiable in this environment

The off-screen pause added to `TypewriterText` could not be exercised: a freshly-created
`IntersectionObserver` on that element **never fires** in the automated browser pane, so the
transition is unobservable there. The code was verified by inspection against `CountUp`, which ships
the same pattern. The failure mode is safe — if the observer never fires, `offscreen` stays `false`
and behaviour is identical to before the change.

Lighthouse/LCP/INP/TBT were likewise not captured: the pane exposes resource timing and layout-shift
data but no Lighthouse run. The numbers above come from the Performance Resource Timing API and are
real, but they are not a Lighthouse score.
