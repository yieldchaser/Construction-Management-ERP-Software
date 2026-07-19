"use client";

import { useState } from "react";

// Optional hero photo for the glossary header. Renders nothing (so the
// in-code placeholder band in the parent shows through) until a real image
// is supplied at the given public path. The onError guard guarantees we
// never display a broken-image icon.
export default function HeroPhoto({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) return null;
  return (
    <img
      src={src}
      alt={alt}
      className="absolute inset-0 h-full w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}
