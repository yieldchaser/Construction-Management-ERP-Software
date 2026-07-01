---
name: design-taste-frontend
description: Taste Skill for eliminating generic AI frontend slop and implementing premium, designer-grade visual UI/UX standards.
---

# design-taste-frontend Skill (Taste Skill)

This skill establishes a design operating standard for removing repetitive UI decisions, default SaaS patterns, and frontend AI slop from a project. It enforces a higher design bar, ensuring every interface feels intentional, premium, opinionated, polished, and clearly designed by someone with taste.

## Design Philosophy

1. **Simplicity Without Blandness**: Avoid minimalist designs that end up looking like wireframes. Simplicity should feel premium, achieved through refined typography, subtle gradients, high-quality spacing, and responsive interactive feedback.
2. **Functionality Without Visual Clutter**: Do not add unnecessary decorative elements or borders. Let spacing, hierarchy, and color define boundaries.
3. **The Designer Question**: Before implementing any UI layout, component, motion, or color choice, always pause and ask:
   > "Would an experienced product designer intentionally make this decision?"
   If the answer is no, refine and improve the design before writing code.

---

## What to Avoid (Slop Detection Checklist)

* **Cookie-Cutter SaaS Dashboards**: Avoid generic grids with plain white cards and basic drop shadows.
* **Excessive Cards Everywhere**: Do not nest cards inside cards or group every single element in its own border. Use white space and type hierarchy to group content.
* **Default Tailwind Aesthetics**: Avoid default, saturated palette colors (e.g. pure `#FF0000`, standard `#0000FF`) or plain dark modes (`#111827`). Curate custom theme colors (e.g., deep charcoal, rich slate, vibrant customized HSL/OKLCH gradients).
* **Weak Typography System**: Avoid using a single font size or standard browser typography. Use modern typography weights, sizes, letter-spacing, and line-heights.
* **Random Spacing**: Do not mix spacing constants. Align items to a cohesive layout grid (e.g. 4px, 8px, 12px, 16px, 24px, 32px increments).
* **Visual Noise & Templates**: Avoid generic templates, random background decorations, and gradients that serve no structural purpose.

---

## Taste Standards to Generate

* **Strong Visual Hierarchy**: The most important information must capture attention immediately. Use typography scale, weight, and contrast.
* **Exceptional Typography**: Make deliberate choices for headline vs. body copy. Adjust tracking (`letter-spacing`) for capitals and large headings.
* **Deliberate Spacing & Rhythm**: Establish clear vertical rhythm. Use consistent padding and margins to let layouts "breathe."
* **Premium Product Aesthetics**: Use high-end visual systems (glassmorphism, subtle borders, custom icons, micro-gradients, tailored dark modes).
* **Meaningful Animations & Transitions**: Add micro-interactions and transitions (e.g., smooth focus transitions, hover expansions, slide-ins).
* **Intentional Color Systems**: Curate custom color palettes with high-contrast, harmonious brand details.

---

## Step-by-Step Optimization Workflow

1. **Audit the Project**: Review all pages for visual slop and low-quality UI patterns.
2. **Rank Improvements**: List and rank changes by expected impact. Give priority to hierarchy, clarity, typography, and polish.
3. **Implement Revisions**: Rewrite components, colors, spacing, and layouts to meet these taste standards.
4. **Verify**: Ensure the interface is responsive, high-performance, accessible, and looks designer-built.
