"use client";

import React from "react";

/**
 * EmberSparks: AC Valhalla-inspired floating micro-spark particle field.
 * Renders 16 glowing white/cyan embers that gently float upward, shimmer,
 * and fade in the hero background.
 *
 * 100% GPU compositor accelerated (transform + opacity), pointer-events: none,
 * zero main-thread CPU overhead on scroll.
 */
export default function EmberSparks({
  className = "absolute inset-0 pointer-events-none overflow-hidden z-0",
}: {
  className?: string;
}) {
  // Pre-calculated deterministic properties for 16 embers (left %, animation duration, delay, size px)
  const embers = [
    { left: "8%", duration: "6.2s", delay: "0.2s", size: "3px", opacity: 0.8 },
    { left: "18%", duration: "7.5s", delay: "1.4s", size: "2px", opacity: 0.6 },
    { left: "27%", duration: "5.8s", delay: "0.8s", size: "4px", opacity: 0.9 },
    { left: "36%", duration: "8.1s", delay: "2.1s", size: "2.5px", opacity: 0.75 },
    { left: "44%", duration: "6.7s", delay: "3.2s", size: "3.5px", opacity: 0.85 },
    { left: "53%", duration: "7.2s", delay: "0.5s", size: "2px", opacity: 0.7 },
    { left: "62%", duration: "5.9s", delay: "1.9s", size: "4px", opacity: 0.95 },
    { left: "71%", duration: "8.4s", delay: "2.8s", size: "3px", opacity: 0.8 },
    { left: "79%", duration: "6.4s", delay: "1.1s", size: "2.5px", opacity: 0.75 },
    { left: "88%", duration: "7.8s", delay: "3.6s", size: "3.5px", opacity: 0.85 },
    { left: "12%", duration: "8.6s", delay: "4.1s", size: "3px", opacity: 0.7 },
    { left: "31%", duration: "6.9s", delay: "4.8s", size: "2px", opacity: 0.8 },
    { left: "49%", duration: "7.3s", delay: "5.2s", size: "4px", opacity: 0.9 },
    { left: "67%", duration: "6.1s", delay: "3.9s", size: "2.5px", opacity: 0.75 },
    { left: "84%", duration: "7.7s", delay: "4.4s", size: "3px", opacity: 0.85 },
    { left: "93%", duration: "8.3s", delay: "1.6s", size: "3.5px", opacity: 0.8 },
  ];

  return (
    <div className={`alx-ember-field ${className}`} aria-hidden="true">
      {embers.map((ember, i) => (
        <span
          key={i}
          className="alx-spark"
          style={{
            left: ember.left,
            width: ember.size,
            height: ember.size,
            opacity: ember.opacity,
            animationDuration: ember.duration,
            animationDelay: ember.delay,
          }}
        />
      ))}
    </div>
  );
}
