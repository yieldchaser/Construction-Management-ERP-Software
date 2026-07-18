# SiteFlow marketing image-generation prompts (all in one place)

Generate each image in Google AI Studio / Gemini (Nano Banana = Gemini 2.5 Flash Image, or Imagen) and save it to the **exact target path** listed. Once dropped in, tell Claude the path is filled and it will wire the `<img>` in (replacing the in-code mockup fallbacks). Everything currently ships as crisp in-code CSS/SVG mockups, so these images are an **upgrade**, not a blocker.

## Global style rules (paste into every prompt)
> Style: clean, premium, modern enterprise-SaaS product UI. Brand color primary blue **#094cb2** with lighter blue **#3366cc** accents and a small amount of archival gold **#6d5e00** for tiny labels. Light background **#faf9fa**, white surfaces, soft diffused shadows, generous whitespace, subtle depth (no hard borders). No text spelling errors, no lorem ipsum gibberish, realistic but generic data (rupee amounts like ₹4.2Cr, percentages, dates), construction/ERP domain. No competitor logos, no real company names, no watermarks. Sharp, high-resolution, photorealistic-UI (like a real screenshot of a dashboard), not cartoonish.

Aspect ratios given per image. Prefer PNG for UI mockups, JPG acceptable for photographic.

---

## 1. Landing page — `frontend/public/marketing/landing/`

| # | Target file | Aspect | Prompt (append global style rules) |
|---|-------------|--------|------|
| 1 | `hero-dashboard.png` | 16:10, ≥1600px wide | A large, premium construction-ERP project dashboard screenshot. Left sidebar with module nav (Dashboard active, Planning, Procurement, BOQ, Finance, DPR, Labour). Top bar with a project name "Riverside Tower" + search + avatar. A row of 4 KPI tiles: Budget ₹4.2Cr, % Complete 68%, Open RFIs 12, Cash Position ₹1.9Cr. A large burn-down line chart with a dashed planned line and a solid actual line. A project table with 4 rows and colored status chips (Active/On Hold). Isometric-tilted slightly for depth. |
| 2 | `feature-planning.png` | 16:10 | A Gantt / project-schedule screen: WBS task rows (Excavation, Foundation, RCC Frame, Brickwork, MEP Rough-in, Finishing), a month timeline header, horizontal bars per row, milestone diamond markers, a highlighted critical-path bar, and a baseline-vs-actual pair. |
| 3 | `feature-procurement.png` | 16:10 | A procurement & 3-way-match screen: an RFQ comparison table with 3 vendor columns, PO summary cards, and a green "Matched" badge flow (PO ↔ GRN ↔ Invoice). Status chips: Matched, In Review, Rejected. |
| 4 | `feature-finance.png` | 16:10 | A finance / cost-control screen: a P&L summary, a budget-vs-actual grouped bar chart by month, a Cash Position tile ₹1.9Cr, and a cost-code breakdown table. |
| 5 | `feature-dpr-phones.png` | 4:3, transparent bg preferred | Three modern smartphones side by side (staggered) showing a construction daily-progress app: (a) a DPR entry screen with photo thumbnails + a circular progress ring, (b) a labour attendance list with avatars + present/leave chips, (c) a geofenced GPS punch-in map screen. |

---

## 2. Product sub-pages — `frontend/public/marketing/products/`
The 20 product detail pages share one template. Generate **3 category hero dashboards** (reused across the group) — cheaper than 20. Optionally generate specific ones later.

| # | Target file | Aspect | Prompt (append global style rules) |
|---|-------------|--------|------|
| 6 | `hero-field-ops.png` | 16:10 | A construction field-operations dashboard: project timeline & milestones panel, an active-site metrics strip (labour on site, deliveries, equipment uptime), a safety-compliance ring, and a progress panel. For the Project Management / Planning / Progress / Quality / Equipment / Labour / Design modules. |
| 7 | `hero-supply-chain.png` | 16:10 | A supply-chain & materials dashboard: inventory levels by material, a procurement pipeline (RFQ → PO → GRN), vendor performance bars, and a warehouse stock table. For Supply Chain / Material / Procurement / Production / Subcontractor / Vendor-Billing modules. |
| 8 | `hero-financial.png` | 16:10 | A construction financial dashboard: P&L, budget-vs-actual, invoicing/receivables aging, cost-code breakdown, and a CRM lead funnel. For CRM / Budgeting / Invoicing / Finance / ERP / Reports modules. |

Two small in-feature mockup cards per product (RFI status list, task-card stream, etc.) stay as **in-code** mockups — no image needed.

---

## 3. Who We Serve — `frontend/public/marketing/who-we-serve/`
Currently uses in-code MockupFrame per segment. Optional upgrade to real renders.

| # | Target file | Aspect | Prompt (append global style rules) |
|---|-------------|--------|------|
| 9 | `segment-builders.png` | 16:10 | A builders/developers project dashboard: BOQ value ₹2.4Cr, spent-to-date, margin %, structural-work progress bars, procurement %, unit-sales panel. |
| 10 | `segment-civil.png` | 16:10 | A civil-contractor site dashboard: daily target metrics (tasks completed 78%, hours worked, safety compliance 100%), GPS attendance map, equipment tracking. |
| 11 | `segment-interior.png` | 16:10 | An interior/fit-out project dashboard: scope-change tracker, client-approval pipeline, snag list, room-by-room progress. |
| 12 | `segment-infrastructure.png` | 16:10 | A multi-site infrastructure/EPC dashboard: consolidated progress across sites, cost overview, delay early-warning panel, a map with multiple project pins. |

---

## 4. Blog article headers — `frontend/public/marketing/blog/`
Currently category-tinted gradient bands (in-code). Optional: 6 reusable category header images (the index maps each post to a category).

| # | Target file | Aspect | Prompt (append global style rules) |
|---|-------------|--------|------|
| 13 | `cat-financial-ledger.png` | 16:9 | Editorial header image: construction finance & ledger theme — a laptop showing a P&L dashboard on a desk with blueprints, warm professional lighting. |
| 14 | `cat-procurement.png` | 16:9 | Editorial header: construction procurement & materials — a warehouse / material stockyard with a tablet showing a procurement app. |
| 15 | `cat-compliance.png` | 16:9 | Editorial header: construction compliance & workforce — site workers in safety gear with a supervisor holding a tablet, orderly jobsite. |
| 16 | `cat-technology.png` | 16:9 | Editorial header: construction technology — an abstract glowing blue network/data-mesh over a faint construction-site silhouette. |
| 17 | `cat-site-execution.png` | 16:9 | Editorial header: site execution — reinforcement steel / RCC frame work with an engineer reviewing a digital jobsite dashboard on a tablet. |
| 18 | `cat-insights.png` | 16:9 | Editorial header: general construction-tech insights — a clean modern construction site at golden hour with a subtle data-overlay. |

---

## 5. Help center article header — `frontend/public/marketing/help/`

| # | Target file | Aspect | Prompt (append global style rules) |
|---|-------------|--------|------|
| 19 | `help-hero.png` | 21:9 | A calm, premium knowledge-base hero: soft blue gradient mesh background with a faint isometric line-art of an ERP interface, plenty of negative space (a search bar sits over it in the UI). |

---

## 6. Resources — `frontend/public/marketing/resources/`
Calculator & comparison pages use in-code visuals; optional hero.

| # | Target file | Aspect | Prompt (append global style rules) |
|---|-------------|--------|------|
| 20 | `resources-hero.png` | 21:9 | A premium "free tools & intelligence" hero: soft blue mesh with faint line-art of a calculator, a comparison table, and a glossary book, lots of whitespace. |

---

## Notes
- **Naming matters** — keep the exact filenames/paths above so Claude can wire them without asking.
- If Gemini adds gibberish text on UI mockups, regenerate or ask for "no text labels, only shapes/bars/numbers".
- Prioritize **1–5 (landing)** and **6–8 (product heroes)** — highest visibility. The rest are polish.
- After you drop a batch, tell Claude which files are filled; it swaps the in-code mockup for the `<img>` and keeps the mockup as a fallback.
