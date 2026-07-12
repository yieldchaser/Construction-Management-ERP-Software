# SiteFlow frontend

The Next.js 16 application for SiteFlow. It serves both the authenticated console and the public marketing site, and acts as the installable PWA shell.

## Stack

- Next.js 16.2.9 (App Router), React 19.2.4, TypeScript 5, Tailwind CSS v4
- firebase 11.10.0 (browser-side phone auth)
- No charting library: dashboard charts are inline SVG

## Scripts

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint
```

## Structure

```
frontend/src/
├── app/
│   ├── page.tsx                      # public landing
│   ├── products/ blog/ resources/ integrations/   # marketing content
│   ├── login/ onboarding/ auth/callback/
│   └── c/[company_id]/...            # company console
│       └── p/[project_id]/...        # project console
├── components/                       # Sidebar, ThemeToggle, PWA, marketing
├── context/                          # CompanySettingsContext, ProjectContext
├── lib/                              # api.ts (host resolver), firebase.ts, siteflow.ts, units.ts
└── content/                          # JSON-driven marketing/help/blog/articles
```

## API host resolution

`lib/api.ts` resolves the backend at runtime: in development it uses `http://localhost:8000`; on any non-local hostname it targets the production Render backend. `NEXT_PUBLIC_API_URL` is read only by the PWA bootstrap (`components/pwa/PwaBootstrap.tsx`).

## Environment variables (build-time)

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Used by the PWA bootstrap; the main client resolves the host at runtime. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` / `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` / `NEXT_PUBLIC_FIREBASE_PROJECT_ID` / `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase phone auth in the browser. |

## Theming

Dark by default. Light theme adds a `light-theme` class to `<html>` (see `components/ThemeToggle.tsx`). Colors are CSS custom properties in `app/globals.css` (dark background `#111113`, card `#19191C`, primary `#7C3AED`; light background `#F3F4F6`, card `#FFFFFF`).

## PWA

`public/manifest.json` and `public/sw.js` provide installability and an offline punch queue. `components/pwa/PwaBootstrap.tsx` registers the service worker.

## Deploy

Deployed on Vercel, configured to build from this `frontend/` directory on pushes to `main`.
