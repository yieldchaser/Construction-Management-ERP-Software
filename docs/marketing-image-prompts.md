# SiteFlow marketing image-generation prompts (all in one place)

Generate each image in Google AI Studio / Gemini (Nano Banana = Gemini 2.5 Flash Image, or Imagen) and save it to the **exact target path** listed. Once dropped in, tell Claude the path is filled and it will wire the `<img>` in (replacing the in-code mockup fallbacks). Everything currently ships as crisp in-code CSS/SVG mockups, so these images are an **upgrade**, not a blocker.

Every prompt below is written to be copy-pasted as-is into the generator. It already includes the aspect ratio, pixel size, camera angle and content, so it is one-shot ready. Still, paste the global style block first (or append it), since it carries the palette and the brand-name rule that every prompt depends on.

## Global style rules (paste into every prompt)

> Style: clean, premium, modern enterprise-SaaS product UI. Brand palette: primary blue `#094cb2`, lighter blue `#3366cc` for accents, pale blue surface `#d9e2ff` for panels and chips, archival gold `#6d5e00` used sparingly and only for tiny labels or small icons, page background `#faf9fa`, low surface `#f5f3f4`, white cards. Soft diffused shadows, generous whitespace, subtle depth, no hard black borders.
>
> The product shown in every UI mockup is called **SiteFlow**. The only wordmark or product name visible anywhere in the interface, in the sidebar header or the top bar, must read "SiteFlow" and nothing else. Do not invent or substitute any other product name, logo or watermark. Do not add a generic placeholder name like "ERP Pro" or "BuildCo".
>
> Output PNG for UI mockups (needs a transparent background in a few cases, noted per image), JPG is acceptable for photographic editorial images. Render sharp and crisp at the exact pixel size requested, no upscaling softness, no motion blur, no depth-of-field blur across UI text, every panel and number stays in focus.
>
> Use realistic Indian-construction domain data throughout: rupee amounts written like `Rs 4.2Cr` or `Rs 1.9Cr`, Indian project names such as "Riverside Tower" or "Greenfield Phase 2", IS-code style engineering terminology (RCC, WBS, RFI, GRN, BOQ, MEP), dates written in DD MMM format such as "14 Mar". All text must be spelled correctly and fully legible, no lorem ipsum, no garbled or invented glyphs. If the generator produces gibberish or broken text, regenerate the same prompt but add the line "use numbers, bars and shapes only, no word labels" to sidestep the text-rendering failure.
>
> Forbid: any competitor name or logo, any real company name, stock-photo watermarks, human faces inside UI screenshots (editorial photography images are the only place faces are acceptable), cartoon or 3D-render style, glossy plastic reflections, and dark mode. These are all marketing-site images and the marketing site is light theme; only the logged-in console is dark, and none of these prompts depict the console.

---

## 1. Landing page : `frontend/public/marketing/landing/`

### 1. `hero-dashboard.png`
- **Aspect / pixels**: 16:10, 2560x1600
- **Camera / angle**: slight isometric tilt for depth, rotated about 8 degrees on the vertical axis, tilted back about 4 degrees, viewed slightly from above
- **Framing / fit**: the dashboard fills the frame edge to edge with a 4 percent inner margin, nothing cropped at the edges
- **Safe zone**: keep the bottom-right quarter visually quiet, a headline and CTA button overlay that area on the live page
- **Content**: a large, premium SiteFlow project-dashboard screenshot. Left sidebar with the SiteFlow wordmark at the top and a module nav (Dashboard active, Planning, Procurement, BOQ, Finance, DPR, Labour). Top bar shows a project name "Riverside Tower", a search field and an avatar. A row of 4 KPI tiles: Budget Rs 4.2Cr, % Complete 68%, Open RFIs 12, Cash Position Rs 1.9Cr. A large burn-down line chart with a dashed planned line and a solid actual line. A project table with 4 rows and colored status chips (Active, On Hold).

### 2. `feature-planning.png`
- **Aspect / pixels**: 16:10, 2400x1500
- **Camera / angle**: flat-on, straight-ahead screenshot with zero perspective distortion, so it reads as a real captured screen
- **Framing / fit**: the panel fills the frame edge to edge with a 3 percent inner margin
- **Safe zone**: leave the top-left corner clean, a small caption chip sits there on the live page
- **Content**: a SiteFlow Gantt / project-schedule screen. WBS task rows (Excavation, Foundation, RCC Frame, Brickwork, MEP Rough-in, Finishing), a month timeline header, horizontal bars per row, milestone diamond markers, a highlighted critical-path bar, and a baseline-vs-actual bar pair. SiteFlow wordmark visible in the top bar.

### 3. `feature-procurement.png`
- **Aspect / pixels**: 16:10, 2400x1500
- **Camera / angle**: flat-on, straight screenshot, no tilt
- **Framing / fit**: fills the frame edge to edge with a 3 percent inner margin
- **Safe zone**: keep the lower-right quiet, a stat callout overlays there on the live page
- **Content**: a SiteFlow procurement and 3-way-match screen. An RFQ comparison table with 3 vendor columns, PO summary cards, and a green "Matched" badge flow showing PO to GRN to Invoice. Status chips read Matched, In Review, Rejected. SiteFlow wordmark visible in the top bar.

### 4. `feature-finance.png`
- **Aspect / pixels**: 16:10, 2400x1500
- **Camera / angle**: flat-on, straight screenshot, no tilt
- **Framing / fit**: fills the frame edge to edge with a 3 percent inner margin
- **Safe zone**: keep the top strip quiet, a section label overlays there on the live page
- **Content**: a SiteFlow finance and cost-control screen. A P&L summary panel, a budget-vs-actual grouped bar chart by month, a Cash Position tile reading Rs 1.9Cr, and a cost-code breakdown table. SiteFlow wordmark visible in the top bar.

### 5. `feature-dpr-phones.png`
- **Aspect / pixels**: 4:3, 2400x1800, transparent background
- **Camera / angle**: staggered three-quarter view, each phone rotated a few degrees differently so they read as a natural fan, not perfectly aligned
- **Framing / fit**: the three phones occupy the central 80 percent of the frame with even negative space margins, drop shadows only, no background scene
- **Safe zone**: keep a thin margin around all three devices clear so nothing is clipped when composited into the page
- **Content**: three modern smartphones side by side showing the SiteFlow field app. Phone one shows a DPR entry screen with photo thumbnails and a circular progress ring. Phone two shows a labour attendance list with avatars and present/leave chips. Phone three shows a geofenced GPS punch-in map screen. The SiteFlow wordmark appears small in the status/header area of at least one phone screen.

---

## 2. Product sub-pages : `frontend/public/marketing/products/`
The 20 product detail pages share one template and read from `heroImageSlot` in `frontend/src/lib/productTypes.ts`. Generate **3 category hero dashboards** (reused across the group), cheaper than 20 unique renders. Optionally generate specific ones later.

### 6. `hero-field-ops.png`
- **Aspect / pixels**: 16:10, 2560x1600
- **Camera / angle**: flat-on, straight screenshot, no tilt, reads as a real captured screen
- **Framing / fit**: fills the frame edge to edge with a 4 percent inner margin
- **Safe zone**: keep the right third quiet, a feature-list callout sits over that area on the live page
- **Content**: a SiteFlow field-operations dashboard: a timeline and milestones panel, an active-site metrics strip (labour on site, deliveries, equipment uptime), a safety-compliance ring, and a progress panel. Used across the Project Management, Planning, Progress, Quality, Equipment, Labour and Design product pages. SiteFlow wordmark visible in the sidebar.

### 7. `hero-supply-chain.png`
- **Aspect / pixels**: 16:10, 2560x1600
- **Camera / angle**: flat-on, straight screenshot, no tilt
- **Framing / fit**: fills the frame edge to edge with a 4 percent inner margin
- **Safe zone**: keep the right third quiet, a feature-list callout sits over that area on the live page
- **Content**: a SiteFlow supply-chain and materials dashboard: inventory levels by material, a procurement pipeline showing RFQ to PO to GRN, vendor performance bars, and a warehouse stock table. Used across the Supply Chain, Material, Procurement, Production, Subcontractor and Vendor-Billing product pages. SiteFlow wordmark visible in the sidebar.

### 8. `hero-financial.png`
- **Aspect / pixels**: 16:10, 2560x1600
- **Camera / angle**: flat-on, straight screenshot, no tilt
- **Framing / fit**: fills the frame edge to edge with a 4 percent inner margin
- **Safe zone**: keep the right third quiet, a feature-list callout sits over that area on the live page
- **Content**: a SiteFlow financial dashboard: P&L, budget-vs-actual, an invoicing and receivables aging panel, a cost-code breakdown, and a CRM lead funnel. Used across the CRM, Budgeting, Invoicing, Finance, ERP and Reports product pages. SiteFlow wordmark visible in the sidebar.

Two small in-feature mockup cards per product (RFI status list, task-card stream, etc.) stay as **in-code** mockups, no image needed for those.

---

## 3. Who We Serve : `frontend/public/marketing/who-we-serve/`
Currently uses in-code MockupFrame per segment. Optional upgrade to real renders.

### 9. `segment-builders.png`
- **Aspect / pixels**: 16:10, 2400x1500
- **Camera / angle**: flat-on, straight screenshot, no tilt
- **Framing / fit**: fills the frame edge to edge with a 4 percent inner margin
- **Safe zone**: keep the bottom strip quiet, a segment label chip overlays there on the live page
- **Content**: a SiteFlow builders and developers project dashboard: BOQ value Rs 2.4Cr, spent-to-date, margin percentage, structural-work progress bars, procurement percentage, and a unit-sales panel. SiteFlow wordmark visible in the sidebar or top bar.

### 10. `segment-civil.png`
- **Aspect / pixels**: 16:10, 2400x1500
- **Camera / angle**: flat-on, straight screenshot, no tilt
- **Framing / fit**: fills the frame edge to edge with a 4 percent inner margin
- **Safe zone**: keep the bottom strip quiet, a segment label chip overlays there on the live page
- **Content**: a SiteFlow civil-contractor site dashboard: daily target metrics (tasks completed 78%, hours worked, safety compliance 100%), a GPS attendance map, and equipment tracking panel. SiteFlow wordmark visible in the sidebar or top bar.

### 11. `segment-interior.png`
- **Aspect / pixels**: 16:10, 2400x1500
- **Camera / angle**: flat-on, straight screenshot, no tilt
- **Framing / fit**: fills the frame edge to edge with a 4 percent inner margin
- **Safe zone**: keep the bottom strip quiet, a segment label chip overlays there on the live page
- **Content**: a SiteFlow interior and fit-out project dashboard: a scope-change tracker, a client-approval pipeline, a snag list, and room-by-room progress bars. SiteFlow wordmark visible in the sidebar or top bar.

### 12. `segment-infrastructure.png`
- **Aspect / pixels**: 16:10, 2400x1500
- **Camera / angle**: flat-on, straight screenshot, no tilt
- **Framing / fit**: fills the frame edge to edge with a 4 percent inner margin
- **Safe zone**: keep the bottom strip quiet, a segment label chip overlays there on the live page
- **Content**: a SiteFlow multi-site infrastructure and EPC dashboard: consolidated progress across sites, a cost overview panel, a delay early-warning panel, and a map with multiple project pins. SiteFlow wordmark visible in the sidebar or top bar.

---

## 4. Blog article headers : `frontend/public/marketing/blog/`
Currently category-tinted gradient bands (in-code). Optional: 6 reusable category header images (the index maps each post to a category). These are photographic and editorial, brand-neutral, no SiteFlow wordmark or UI chrome required, do not force a logo into them.

### 13. `cat-financial-ledger.png`
- **Aspect / pixels**: 16:9, 2400x1350
- **Camera / angle**: eye-level desk shot, standard 50mm lens feel, shallow but not extreme depth of field on the background props only, the desk surface stays sharp
- **Framing / fit**: subject sits center-left, right half is calmer negative space
- **Safe zone**: keep the upper-center to right band low-contrast and slightly darkened, a large white headline sits over that area
- **Content**: construction finance and ledger theme. A laptop showing a generic P&L-style chart on its screen, sitting on a desk beside rolled blueprints, warm professional lighting, no readable brand names on the laptop screen.

### 14. `cat-procurement.png`
- **Aspect / pixels**: 16:9, 2400x1350
- **Camera / angle**: eye-level wide shot, standard lens feel, everything reasonably in focus
- **Framing / fit**: subject occupies the right two thirds, left third is clean negative space
- **Safe zone**: keep the left third and upper band low-contrast, a large white headline sits over that area
- **Content**: construction procurement and materials theme. A warehouse or material stockyard with stacked pallets and a person holding a tablet showing a generic procurement-style app screen, no readable brand names.

### 15. `cat-compliance.png`
- **Aspect / pixels**: 16:9, 2400x1350
- **Camera / angle**: eye-level mid-shot, standard lens feel, sharp focus throughout
- **Framing / fit**: subjects centered, even margins on both sides
- **Safe zone**: keep the top band low-contrast, a large white headline sits over that area
- **Content**: construction compliance and workforce theme. Site workers in safety gear on an orderly jobsite, a supervisor holding a tablet, natural daylight, no readable brand names or logos on any gear.

### 16. `cat-technology.png`
- **Aspect / pixels**: 16:9, 2400x1350
- **Camera / angle**: straight-on abstract composition, no camera perspective since this is a graphic, not a photo
- **Framing / fit**: the glowing mesh fills the frame, faint construction silhouette anchored bottom
- **Safe zone**: keep the upper-center band darker and lower-detail, a large white headline sits over that area
- **Content**: construction technology theme. An abstract glowing blue network and data-mesh pattern in the brand blue tones, layered over a faint construction-site silhouette, dark navy background, no text, no logos.

### 17. `cat-site-execution.png`
- **Aspect / pixels**: 16:9, 2400x1350
- **Camera / angle**: eye-level mid-shot, standard lens feel, sharp focus
- **Framing / fit**: subject occupies the right two thirds, left third is clean negative space
- **Safe zone**: keep the left third and top band low-contrast, a large white headline sits over that area
- **Content**: site execution theme. Reinforcement steel and RCC frame work in progress, an engineer in the foreground reviewing a generic dashboard-style screen on a tablet, no readable brand names or logos.

### 18. `cat-insights.png`
- **Aspect / pixels**: 16:9, 2400x1350
- **Camera / angle**: eye-level wide shot at golden hour, warm low-angle sun, standard lens feel
- **Framing / fit**: horizon sits in the lower third, sky and site fill the rest
- **Safe zone**: keep the upper-center sky band low-contrast, a large white headline sits over that area
- **Content**: general construction-tech insights theme. A clean modern construction site at golden hour, a subtle faint blue data-overlay graphic layered over part of the sky, no readable text or logos.

---

## 5. Help center article header : `frontend/public/marketing/help/`

### 19. `help-hero.png`
- **Aspect / pixels**: 21:9, 2520x1080
- **Camera / angle**: straight-on graphic composition, no camera perspective
- **Framing / fit**: heavy central negative space, the mesh and line-art sit toward the edges, the center third is calm and nearly empty
- **Safe zone**: keep the full center band clear, a search bar and a headline sit directly over it on the live page
- **Content**: a calm, premium knowledge-base hero. A soft blue gradient mesh background in the brand blue tones, a faint isometric line-art sketch of a SiteFlow-style ERP interface pushed toward the left and right edges, plenty of negative space in the middle, no readable text, no wordmark needed since this is a background graphic.

---

## 6. Resources : `frontend/public/marketing/resources/`
Calculator and comparison pages use in-code visuals; optional hero.

### 20. `resources-hero.png`
- **Aspect / pixels**: 21:9, 2520x1080
- **Camera / angle**: straight-on graphic composition, no camera perspective
- **Framing / fit**: heavy central negative space, the icon elements sit toward the edges, the center third is calm and nearly empty
- **Safe zone**: keep the full center band clear, a headline and CTA sit directly over it on the live page
- **Content**: a premium "free tools and intelligence" hero. A soft blue mesh background in the brand blue tones, faint line-art of a calculator, a comparison table, and a glossary book, pushed toward the left and right edges, lots of whitespace in the middle, no readable text.

---

## 7. Calculator illustration diagrams : `frontend/public/marketing/calculators/`
`CalcGuide.tsx` currently renders an "Illustration coming soon" placeholder for the `imageSlot` field defined on the calculator template in `frontend/src/lib/calcTypes.ts`. These seven images fill that slot. They must NOT look like dashboard screenshots. They are clean instructional line-art diagrams in the brand blue on a light background, labelled with real measured dimensions, in the style of a modern engineering textbook figure. No UI chrome, no wordmark needed, this is a technical diagram, not a product screenshot.

- **Aspect / pixels for all seven**: 4:3, 1600x1200
- **Camera / angle for all seven**: flat-on straight orthographic view, no perspective, no vanishing point, elevation and section drawn true to scale conventions
- **Framing / fit for all seven**: the diagram sits centered with generous margins on all sides, at least 12 percent clear space around the drawing, since it renders inside a bordered card roughly 220px tall minimum and must stay legible small
- **Line and label style for all seven**: thin, precise line-art in `#094cb2` on a `#faf9fa` or white background, dimension lines with arrowheads and small numeric labels in a clean sans-serif, no shading, no gradients, no photorealism

### 21. `bar-bending-schedule-calculator.png`
- **Content**: a bent steel reinforcement bar shown in elevation, annotated with the straight length, two hook lengths at each end, the bend angle, and the bend deduction value called out with a small dimension line, labelled in millimeters, in the style of a bar-bending-schedule textbook figure.

### 22. `brick-calculator-for-wall.png`
- **Content**: a wall shown in elevation on the left and in cross-section on the right, with dimension lines for length, height and thickness, plus a zoomed callout detail showing a single brick with a mortar joint labelled with its thickness in millimeters.

### 23. `concrete-mix-calculator.png`
- **Content**: a labelled mix-ratio diagram showing three material piles (cement, sand, aggregate) in proportion, each pile labelled with its ratio number such as 1:2:4, plus a small water-cement ratio callout box beside it.

### 24. `concrete-volume-calculator.png`
- **Content**: a rectangular concrete slab or footing shown in isometric-free orthographic elevation and plan side by side, with dimension lines for length, width and depth, and the resulting volume formula written beneath in small clean text.

### 25. `house-construction-cost-calculator.png`
- **Content**: a simple house floor-plan outline with a built-up area dimension line labelled in square feet, alongside a small stacked bar breaking the cost into structure, finishing and MEP shares, each segment labelled with a percentage.

### 26. `paint-quantity-calculator.png`
- **Content**: a wall elevation with height and width dimension lines, a door and window cut-out shown with their own dimension lines subtracted from the net area, and a small paint-can icon with a coverage-per-litre label beside the wall.

### 27. `steel-calculator-for-construction.png`
- **Content**: a reinforced concrete column or beam shown in cross-section with individual reinforcement bars marked as small circles, each bar diameter labelled in millimeters, and a small weight-per-metre reference table beside the section.

---

## Notes
- **Naming matters.** Keep the exact filenames and paths above so Claude can wire them without asking.
- **Wiring is already built.** The product template exposes `heroImageSlot` in `frontend/src/lib/productTypes.ts` and the calculator template exposes `imageSlot` in `frontend/src/lib/calcTypes.ts`. Dropping a file at the exact target path turns wiring into a content-data edit, not a component change.
- If Gemini adds gibberish text on UI mockups or diagrams, regenerate the same prompt with the extra line "use numbers, bars and shapes only, no word labels".
- Prioritize **1 to 5 (landing)** and **6 to 8 (product heroes)**, highest visibility. **21 to 27 (calculator diagrams)** are next since they currently show a bare placeholder. The rest are polish.
- After you drop a batch, tell Claude which files are filled; it swaps the in-code mockup for the `<img>` and keeps the mockup as a fallback.
