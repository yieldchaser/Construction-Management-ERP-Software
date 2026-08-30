"use client";

import React from "react";

interface TypewriterTextProps {
  /** Phrases to cycle through. The first one is server rendered for first paint. */
  phrases: string[];
  className?: string;
  typeSpeed?: number;
  deleteSpeed?: number;
  holdTime?: number;
}

/**
 * Types, holds, deletes and cycles through a short list of phrases.
 * The full first phrase is present in the server rendered HTML (good for SEO
 * and first paint); the animation only takes over after hydration. Under
 * prefers-reduced-motion the first phrase is shown statically with no caret.
 *
 * D-017: pauses when the tab is hidden (visibilitychange) and resumes when
 * visible, so no timer budget is consumed while the user is on another tab.
 */
export default function TypewriterText({
  phrases,
  className,
  typeSpeed = 55,
  deleteSpeed = 28,
  holdTime = 2200,
}: TypewriterTextProps) {
  const first = phrases[0] ?? "";

  const [text, setText] = React.useState(first);
  const [animate, setAnimate] = React.useState(false);

  React.useEffect(() => {
    // Respect reduced motion: keep the static first phrase, no animation.
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || phrases.length <= 1) return;
    setAnimate(true);
  }, [phrases.length]);

  React.useEffect(() => {
    if (!animate) return;

    let phraseIndex = 0;
    let charIndex = first.length;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    // When the page is hidden we stop scheduling new ticks; when it becomes
    // visible again we resume from where we were.
    let paused = false;

    const tick = () => {
      if (paused) return; // tab is hidden — don't reschedule until resume
      const current = phrases[phraseIndex];

      if (!deleting) {
        charIndex += 1;
        setText(current.slice(0, charIndex));
        if (charIndex >= current.length) {
          deleting = true;
          timer = setTimeout(tick, holdTime);
          return;
        }
        timer = setTimeout(tick, typeSpeed);
      } else {
        charIndex -= 1;
        setText(current.slice(0, Math.max(0, charIndex)));
        if (charIndex <= 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
          timer = setTimeout(tick, typeSpeed);
          return;
        }
        timer = setTimeout(tick, deleteSpeed);
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        paused = true;
        clearTimeout(timer);
      } else {
        paused = false;
        tick(); // resume from current state
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    // Hold on the server rendered first phrase before starting to delete it.
    timer = setTimeout(tick, holdTime);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [animate, first, phrases, typeSpeed, deleteSpeed, holdTime]);

  return (
    <span className={`tw-line${className ? ` ${className}` : ""}`}>
      {text}
      {animate && <span className="typewriter-caret" aria-hidden="true" />}
    </span>
  );
}
