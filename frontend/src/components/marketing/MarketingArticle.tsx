"use client";

import React from "react";

/**
 * Renders trusted, build-time marketing HTML (from src/content) and wires up
 * the accordion interactions the bespoke markup expects. Two patterns are
 * supported:
 *   - who-we-serve FAQ: <button class="owwf-btn" aria-expanded> with an
 *     adjacent <div class="owwf-body"> sibling (CSS reveals on aria-expanded).
 *   - tally FAQ: <button class="osit-q-btn" data-q="id"> controlling the
 *     <div class="osit-q-ans" id="id"> panel (toggles an .open class).
 * Everything is progressive: with JS off the content is still in the DOM for
 * SEO; JS only adds expand/collapse.
 */
export default function MarketingArticle({ html }: { html: string }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const cleanups: Array<() => void> = [];

    // Pattern A: aria-expanded buttons (sibling body revealed via CSS).
    root.querySelectorAll<HTMLButtonElement>(".owwf-btn").forEach((btn) => {
      const handler = () => {
        const open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!open));
      };
      btn.addEventListener("click", handler);
      cleanups.push(() => btn.removeEventListener("click", handler));
    });

    // Pattern B: data-q buttons controlling a panel by id.
    root.querySelectorAll<HTMLButtonElement>(".osit-q-btn").forEach((btn) => {
      const id = btn.getAttribute("data-q");
      const panel = id ? root.querySelector<HTMLElement>(`#${CSS.escape(id)}`) : null;
      if (!btn.hasAttribute("aria-expanded")) btn.setAttribute("aria-expanded", "false");
      const handler = () => {
        const open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!open));
        if (panel) panel.classList.toggle("open", !open);
      };
      btn.addEventListener("click", handler);
      cleanups.push(() => btn.removeEventListener("click", handler));
    });

    return () => cleanups.forEach((c) => c());
  }, [html]);

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}
