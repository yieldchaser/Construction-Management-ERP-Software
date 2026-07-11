"use client";

import React from "react";

/**
 * Renders the trusted, build-time educational prose that surrounds a calculator
 * (formula, worked example, reference tables, FAQ, CTA) and wires up a generic
 * accordion for the bespoke FAQ markup each source file ships with.
 *
 * The FAQ patterns differ per file (button- or div-triggered, class prefixes
 * fqi / faq-item / f-item / d-item), so instead of matching every variant we
 * detect FAQ items structurally, tag them with normalized classes
 * (cp-faq-item / cp-faq-trigger / cp-open) and style those in globals.css.
 * Native <details> FAQs (paint) are left alone and styled via CSS.
 * Progressive: with JS off the answers simply render expanded.
 */
export default function CalcProse({ html }: { html: string }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const cleanups: Array<() => void> = [];

    const candidates = root.querySelectorAll<HTMLElement>(
      '[class*="faq-item"],[class*="fqi"],[class*="f-item"],[class*="d-item"]'
    );

    candidates.forEach((item) => {
      // Skip icons / nested non-item matches and native <details>.
      if (item.tagName === "DETAILS") return;
      const cls = item.className || "";
      if (/icon/i.test(cls)) return;
      const trigger = item.firstElementChild as HTMLElement | null;
      if (!trigger) return;
      // A trigger must plausibly be the question row (button or a div holding text).
      const looksLikeTrigger =
        trigger.tagName === "BUTTON" ||
        /(-q\b|faq-q|fqq|-q$|\bq\b)/i.test(trigger.className || "");
      if (!looksLikeTrigger) return;
      if (item.querySelectorAll(":scope > *").length < 2) return;

      item.classList.add("cp-faq-item");
      trigger.classList.add("cp-faq-trigger");
      if (trigger.tagName !== "BUTTON") trigger.setAttribute("role", "button");
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

    // Tabbed sections: buttons with data-panel inside a [role="tablist"] that
    // reveal a panel by id. Progressive: without JS all panels stay visible.
    root.querySelectorAll<HTMLElement>('[role="tablist"]').forEach((list) => {
      const tabs = Array.from(
        list.querySelectorAll<HTMLElement>("[data-panel]")
      );
      if (tabs.length < 2) return;
      const panels = tabs
        .map((t) => {
          const id = t.getAttribute("data-panel");
          return id ? root.querySelector<HTMLElement>(`#${CSS.escape(id)}`) : null;
        })
        .filter((p): p is HTMLElement => !!p);
      if (panels.length !== tabs.length) return;

      const activate = (idx: number) => {
        tabs.forEach((t, i) => {
          t.classList.toggle("cp-tab-active", i === idx);
          t.setAttribute("aria-selected", String(i === idx));
        });
        panels.forEach((p, i) => p.classList.toggle("cp-tab-hide", i !== idx));
      };
      tabs.forEach((t, i) => {
        const h = () => activate(i);
        t.addEventListener("click", h);
        cleanups.push(() => t.removeEventListener("click", h));
      });
      activate(0);
    });

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
