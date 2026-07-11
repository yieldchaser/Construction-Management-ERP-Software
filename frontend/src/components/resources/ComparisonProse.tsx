"use client";

import React from "react";

/**
 * Renders a trusted, build-time feature-comparison page (bespoke HTML that has
 * been cleaned + normalised to the canonical "ovc" class vocabulary) and wires
 * up its two interactive regions:
 *
 *  - Key-differences tabs: buttons with [role="tab"] + data-block that reveal
 *    the matching #ovc3-block-N panel (toggling .ovc3-active).
 *  - FAQ accordion: buttons with [aria-expanded] inside .ovc6-item.
 *
 * Wiring is attribute-based (stem-agnostic) so it works across every
 * competitor file. Progressive enhancement: with JS off the first key-diff
 * block shows and every FAQ answer renders expanded; the .cp-js class (added on
 * mount) is what activates the collapsed accordion styling in globals.css.
 */
export default function ComparisonProse({ html }: { html: string }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.classList.add("cp-js");
    const cleanups: Array<() => void> = [];

    // --- Key-differences tabs ---
    root.querySelectorAll<HTMLElement>('[role="tablist"]').forEach((list) => {
      const tabs = Array.from(
        list.querySelectorAll<HTMLElement>('[role="tab"][data-block]')
      );
      if (tabs.length < 2) return;
      const activeCls =
        (tabs[0].className.match(/[\w-]*tab-active/) || ["ovc3-tab-active"])[0];

      const blockFor = (n: string | null) =>
        n ? root.querySelector<HTMLElement>(`[id$="-block-${n}"]`) : null;
      const blockActiveCls = (() => {
        const first = root.querySelector<HTMLElement>('[id*="-block-"]');
        const m = first?.className.match(/[\w-]*3-active|[\w-]*-active/);
        return m ? m[0] : "ovc3-active";
      })();

      const activate = (block: string | null) => {
        tabs.forEach((t) => {
          const on = t.getAttribute("data-block") === block;
          t.classList.toggle(activeCls, on);
          t.setAttribute("aria-selected", String(on));
        });
        tabs.forEach((t) => {
          const b = blockFor(t.getAttribute("data-block"));
          if (b) b.classList.toggle(blockActiveCls, t.getAttribute("data-block") === block);
        });
      };

      tabs.forEach((t) => {
        const h = () => activate(t.getAttribute("data-block"));
        t.addEventListener("click", h);
        cleanups.push(() => t.removeEventListener("click", h));
      });
    });

    // --- FAQ accordion ---
    root
      .querySelectorAll<HTMLElement>("button[aria-expanded]")
      .forEach((btn) => {
        const item =
          btn.closest<HTMLElement>('[class*="-item"]') ||
          (btn.parentElement as HTMLElement | null);
        if (!item) return;
        const toggle = () => {
          const open = item.classList.toggle("cp-open");
          btn.setAttribute("aria-expanded", String(open));
        };
        btn.addEventListener("click", toggle);
        cleanups.push(() => btn.removeEventListener("click", toggle));
      });

    return () => cleanups.forEach((c) => c());
  }, [html]);

  return (
    <div
      ref={ref}
      className="comparison-article"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
