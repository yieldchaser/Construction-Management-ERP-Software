"use client";

import React from "react";

/**
 * Client component for the plain "help-article" resource index / glossary
 * pages (construction-calculators, construction-terms-meanings) which
 * otherwise ship with no client JS and leave their filter buttons and FAQ
 * accordions inert.
 *
 * It wires two interactive regions that the generic dangerouslySetInnerHTML
 * branch ignores:
 *
 *  - Category filter: .osclg-fbtn[data-filter] buttons filter the
 *    .res-idx-card grid by each card's data-category ("all" shows everything).
 *  - FAQ accordions: .osclf-item (calculators index) and .oterm3-item
 *    (glossary) are normalized to .cp-faq-item / .cp-faq-trigger and collapse
 *    by default, reusing the unified .calc-prose chevron so every resources
 *    FAQ looks identical (a single chevron, no bespoke "+" doubling up).
 *
 * Progressive enhancement: without JS the filter is a no-op (all cards stay
 * visible) and the FAQ answers render expanded; once mounted they collapse
 * and toggle.
 */
export default function ResourceIndexProse({ html }: { html: string }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const cleanups: Array<() => void> = [];

    // --- FAQ accordions ---
    root
      .querySelectorAll<HTMLElement>(".osclf-item, .oterm3-item")
      .forEach((item) => {
        const trigger = item.querySelector<HTMLElement>("button");
        if (!trigger) return;
        const body = trigger.nextElementSibling as HTMLElement | null;
        if (!body) return;

        item.classList.add("cp-faq-item");
        trigger.classList.add("cp-faq-trigger");
        trigger.setAttribute("tabindex", "0");
        trigger.setAttribute("aria-expanded", "false");

        const toggle = () => {
          const open = item.classList.toggle("cp-open");
          trigger.setAttribute("aria-expanded", String(open));
        };
        const onKey = (e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        };
        trigger.addEventListener("click", toggle);
        trigger.addEventListener("keydown", onKey as EventListener);
        cleanups.push(() => {
          trigger.removeEventListener("click", toggle);
          trigger.removeEventListener("keydown", onKey as EventListener);
        });
      });

    // --- Category filter (calculators index) ---
    const filterBtns = Array.from(
      root.querySelectorAll<HTMLElement>(".osclg-fbtn[data-filter]")
    );
    if (filterBtns.length) {
      const grid = root.querySelector<HTMLElement>("#osclg-grid");
      const cards = grid
        ? Array.from(grid.querySelectorAll<HTMLElement>(".res-idx-card"))
        : [];
      filterBtns.forEach((btn) => {
        const onClick = () => {
          const filter = btn.getAttribute("data-filter");
          filterBtns.forEach((b) => b.classList.toggle("osclg-on", b === btn));
          cards.forEach((card) => {
            const cat = card.getAttribute("data-category");
            const show = filter === "all" || cat === filter;
            card.style.display = show ? "" : "none";
          });
        };
        btn.addEventListener("click", onClick);
        cleanups.push(() => btn.removeEventListener("click", onClick));
      });
    }

    return () => cleanups.forEach((c) => c());
  }, [html]);

  return (
    <div
      ref={ref}
      className="help-article calc-prose"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
