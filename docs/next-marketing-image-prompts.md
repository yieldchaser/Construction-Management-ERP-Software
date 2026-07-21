# SiteFlow next marketing image-generation prompts (all in one place)

Generate each image in ChatGPT (with DALL-E 3) or Gemini (Imagen 3) and save it. Once dropped in, SiteFlow will automatically wire these images into the guides and dashboards.

Everything follows the same high-standard, light-theme design system.

---

## Global style rules (paste into every prompt)

> Style: clean, premium, modern enterprise-SaaS product UI. Brand palette: primary blue `#094cb2`, lighter blue `#3366cc` for accents, pale blue surface `#d9e2ff` for panels and chips, page background `#faf9fa`, low surface `#f5f3f4`, white cards. Soft diffused shadows, generous whitespace, subtle depth, no hard black borders.
>
> All text must be spelled correctly and fully legible, no lorem ipsum, no garbled or invented glyphs. If the generator produces gibberish or broken text, regenerate the same prompt but add the line "use numbers, bars and shapes only, no word labels" to sidestep the text-rendering failure.
>
> Use realistic Indian-construction domain data throughout: rupee amounts written like `Rs 4.2Cr` or `Rs 1.9Cr`, Indian project names such as "Riverside Tower" or "Greenfield Phase 2", IS-code style engineering terminology (RCC, WBS, RFI, GRN, BOQ, MEP), dates written in DD MMM format such as "14 Mar".
>
> Output PNG for UI mockups (transparent background where noted), JPG for photographic editorial images.

---

## 1. Calculator Diagrams (21 missing assets)

These must look like clean, technical engineering diagrams on a white or `#faf9fa` background, not like product screenshots. They use thin `#094cb2` blue lines, precise arrowheads, and small numeric labels.

* **Destination folder**: `frontend/public/marketing/calculators/`
* **Aspect / pixels**: 4:3 (use 1600x1200)
* **Camera / angle**: Flat-on, straight orthographic 2D view, no perspective distortion, no vanishing points, line weights consistent at 1.5pt.
* **Framing / fit**: The diagram sits centered with at least 15 percent inner margin padding on all sides.

---

### Family A: Bar Bending Schedule

#### 1. `bar-bending-schedule-calculator-2.png` (Step 2: Diameter, span, cover, bar count)
* **Content**: 2D elevation drawing of a horizontal reinforced concrete beam. Inside, show a main steel rebar highlighted in dark blue. Draw dimension lines with arrowheads: a span dimension indicating "Span = 4.0m", end-cover dimension gaps indicating "Cover = 25mm", and callout text pointing to the rebar saying "Main Bar: d = 12mm, Qty = 12".

#### 2. `bar-bending-schedule-calculator-3.png` (Step 3: Generate schedule metrics)
* **Content**: 2D technical diagram showing a single bent-up rebar with hooks (cranked bar). Label each segment with dimension lines: the hook length as "9d", the straight length as "L_clear", and the bent-up crank height. Below the bar, show the math equation in clear typography: "Cutting Length = L_clear + 2 × (9d) - 2 × (2d)".

#### 3. `bar-bending-schedule-calculator-4.png` (Step 4: Verify against weight table)
* **Content**: Simple technical table listing unit weights. Header: "IS 1786 Bar Weights". Rows: "8mm \| 0.395 kg/m", "10mm \| 0.617 kg/m", "12mm \| 0.888 kg/m", "16mm \| 1.58 kg/m". Beside it, show a cross-section of a 12mm rebar with a callout pointing to the formula: "W = D² / 162.2".

---

### Family B: Brick Wall Calculator

#### 4. `brick-calculator-for-wall-2.png` (Step 2: Pick brick size and mortar mix)
* **Content**: Side-by-side comparison of brick sizes. Draw a 3D isometric outline of a "Modular Brick" showing labels "190 mm", "90 mm", "90 mm". Beside it, draw a "Traditional Brick" showing labels "230 mm", "110 mm", "75 mm". Include a callout block showing a cement-mortar trowel mixing mortar, with a mix label "Mix Ratio = 1:6".

#### 5. `brick-calculator-for-wall-3.png` (Step 3: Apply wastage buffer)
* **Content**: Technical diagram showing brick wastage allocation. Draw a stack of bricks on a wooden pallet, with a subset of bricks on the side showing fractured lines and cut edges. Circle the damaged pile with a callout label reading "Wastage Buffer: +10% Allowance".

#### 6. `brick-calculator-for-wall-4.png` (Step 4: Read output)
* **Content**: Visual output summary flow. On the left, draw a brick stack icon labelled "4,250 Bricks". In the center, draw 3 bags of cement stacked, labelled "12 Bags (50 kg)". On the right, draw a pile of sand with a cubic volume box, labelled "1.8 m³ Sand". Connect all three back to a central wall blueprint outline.

---

### Family C: Concrete Mix Calculator

#### 7. `concrete-mix-calculator-2.png` (Step 2: Enter wet concrete volume)
* **Content**: 3D perspective wireframe of a concrete floor slab mold. Show the slab height (T), width (W), and length (L) annotated with dimension lines. Shuttering boards are indicated on the sides. The center shows the text "Volume = L × W × T".

#### 8. `concrete-mix-calculator-3.png` (Step 3: Set water-cement ratio)
* **Content**: Water-cement ratio technical illustration. Draw a graduated beaker representing water volume (litres) on the left, and a cement bag representing cement weight (kg) on the right. Draw a balance scale in between, balancing them at a ratio of "W/C = 0.50".

#### 9. `concrete-mix-calculator-4.png` (Step 4: Read live material estimate)
* **Content**: Dry-to-wet conversion diagram. On the left, show a dry volume container of loose cement, sand, and stone, labelled "Dry Volume = 1.54 m³". On the right, show a compacted, wet concrete slab volume labelled "Wet Volume = 1.0 m³". Connect them with a compression arrow showing "-35% packing reduction".

---

### Family D: Concrete Volume Calculator

#### 10. `concrete-volume-calculator-2.png` (Step 2: Enter dimensions and quantity)
* **Content**: Drawing showing various structural elements: a flat roof slab wireframe, a square column wireframe, and a circular pile wireframe. Each element is annotated with its respective dimensions (length, height, diameter) and quantity multiplication labels like "Quantity = 18".

#### 11. `concrete-volume-calculator-3.png` (Step 3: Pick concrete grade)
* **Content**: Compressive strength comparison bars. Draw three vertical concrete cubes side-by-side, textured with fine and coarse aggregate. Label them: "M10 (Blinding)", "M20 (Residential Slabs)", "M25 (Heavy RCC)". Add a strength meter above showing "10 MPa", "20 MPa", "25 MPa" respectively.

#### 12. `concrete-volume-calculator-4.png` (Step 4: Read outputs)
* **Content**: Visual breakdown diagram of concrete composition. Draw a concrete cube of "1.0 m³". Below it, show a horizontal bar chart breaking down the volumetric components: "Coarse Aggregate (60%)", "Sand (30%)", "Cement (10%)", with exact volume tags.

---

### Family E: House Construction Cost Calculator

#### 13. `house-construction-cost-calculator-2.png` (Step 2: Select specification tier)
* **Content**: Spec-tier comparison layout. Draw three simple 2D house elevations side-by-side. Under the first, label "Budget (Standard paint, basic fittings)". Under the second, "Standard (Premium paint, verified tiles)". Under the third, "Premium (Granite flooring, high-end fixtures)".

#### 14. `house-construction-cost-calculator-3.png` (Step 3: Calculate estimated cost)
* **Content**: A calculator displaying a large total cost figure: "Rs 45,50,000". Next to the calculator, draw a blueprint house floor-plan outline showing a square area dimension: "Built-up Area = 1,500 sq ft".

#### 15. `house-construction-cost-calculator-4.png` (Step 4: Review phase split)
* **Content**: Cost distribution chart. Draw a single horizontal bar chart divided into three segments: "Civil Works (55%)" in dark blue, "Finishes (30%)" in lighter blue, and "MEP & Services (15%)" in gold. Label each section clearly with percentages.

---

### Family F: Paint Quantity Calculator

#### 16. `paint-quantity-calculator-2.png` (Step 2: Enter room dimensions)
* **Content**: Room paint area wireframe. Draw an isometric layout of a room with 4 walls highlighted. Show dimension lines for Wall Length (L) and Room Height (H) in feet. Add a label in the center reading "Total Wall Area = 2 × (L + W) × H".

#### 17. `paint-quantity-calculator-3.png` (Step 3: Deduct doors and windows)
* **Content**: Wall elevation diagram showing deductions. Draw a rectangular wall. In the middle, show a door cutout labelled "Door (Deduct 21 sq ft)" and a window cutout labelled "Window (Deduct 12 sq ft)". Highlight the remaining net paintable area in blue.

#### 18. `paint-quantity-calculator-4.png` (Step 4: Calculate and read output)
* **Content**: Material requirement summary. Draw a paint bucket icon labelled "Finish Paint: 35 Litres" and a primer can icon labelled "Primer: 15 Litres". An arrow points to a wall icon showing two paint layers, labelled "2 Coats Finish + 1 Coat Primer".

---

### Family G: Steel Weight Calculator

#### 19. `steel-calculator-for-construction-2.png` (Step 2: Enter bar diameter and length)
* **Content**: Steel rebar specification diagram. Draw a bundle of three rebars. Point to their cross-section showing different diameter labels: "d = 10mm", "d = 12mm", "d = 16mm". Add a dimension line showing the total running length: "Total Length = 150 metres".

#### 20. `steel-calculator-for-construction-3.png` (Step 3: Apply wastage margin)
* **Content**: Rebar joining and cutting diagram. Show two steel rebars overlapping. The overlap zone is annotated with "Lap Length = 50 × d". The cut-off scrap end on the side is highlighted and labelled "Wastage Allowance = 5%".

#### 21. `steel-calculator-for-construction-4.png` (Step 4: Read weight and cost)
* **Content**: Weight and cost estimation card. Draw a weighing scale showing "Weight = 1,240 kg". Next to it, show a price calculation box: "1,240 kg × Rs 65/kg = Rs 80,600 Total Cost".

---

## 2. Glossary Hero Photo (1 missing asset)

* **Filename**: `construction-hero.jpg`
* **Destination folder**: `frontend/public/resources/glossary/`
* **Aspect ratio**: 21:9 (use 2520x1080)
* **Prompt**: Editorial professional photograph of a modern construction site during golden hour. In the foreground, an architect's desk with rolled-up blueprints, a safety hardhat, and a digital tablet showing a construction management dashboard. In the background, soft focus view of high-rise building structures and cranes against a warm sunset sky. Professional color grading, high detail, no text or logos.

---

## 3. Generic UI Mockup Cards (4 generic widgets)

Generate these as modern, premium SaaS UI widget components on a clean transparent background (using PNG) so they can overlay features on product pages.

* **Destination folder**: `frontend/public/marketing/mocks/`
* **Aspect / pixels**: 4:3 (use 1200x900)
* **Camera / angle**: Flat-on, straight screenshot, no tilt.
* **Framing / fit**: Fills the frame edge-to-edge with a 5 percent inner margin, soft drop shadow around the card edges.

#### 1. `mock-ticket.png` (RFI & Approvals Ticket)
* **Prompt**: A premium SaaS interface card showing an Approval Ticket for a construction purchase order. The card header reads "Material PO-2026-981". The status is a green badge "Approved (Level 2)". The body lists "TMT Steel Rebars - 12 Tons", a total amount of "Rs 7,80,000", and an approval workflow showing three checklist circles with supervisor checkmarks. Modern clean typography, soft shadows, transparent background.

#### 2. `mock-line-chart.png` (Trend Analytics & Reports)
* **Prompt**: A premium SaaS interface card showing a line chart for material spend trends. The card title reads "Monthly Spend Analysis". The chart shows a solid blue line tracking budget limits and a dashed line tracking actual material consumption, with data points labelled by month. A numeric summary shows "Rs 1.8Cr Spent" and a green "+4.2% Variance" chip. Transparent background.

#### 3. `mock-gantt-bars.png` (Gantt Schedule Timeline)
* **Prompt**: A premium SaaS interface card showing a Gantt chart timeline segment. The card header reads "Critical Path: Phase 2". The body shows horizontal timeline progress bars in blue and gold for tasks: "Excavation (100% Completed)", "RCC Foundation (72% Active)", and "Brickwork (Upcoming)". A vertical dashed line represents "Today". Transparent background.

#### 4. `mock-dependency-graph.png` (Task Dependency Map)
* **Prompt**: A premium SaaS interface card showing a task dependency node network. Draw three rectangular cards connected by curved directional arrows: Node 1 "Procure Rebar (Approved)" points to Node 2 "Fabricate BBS (Active)", which points to Node 3 "Pour Concrete (Blocked)". The connections are highlighted in green and red. Clean, transparent background.
