"use client";

import React from "react";

export type PageShellWidth = "wide" | "form" | "full";

export interface PageShellProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  width?: PageShellWidth;
  className?: string;
}

const WIDTH_CLASSES: Record<PageShellWidth, string> = {
  wide: "max-w-7xl mx-auto w-full",
  form: "max-w-4xl mx-auto w-full",
  full: "w-full",
};

export default function PageShell({
  children,
  width = "wide",
  className = "",
  ...props
}: PageShellProps) {
  const widthClass = WIDTH_CLASSES[width] || WIDTH_CLASSES.wide;

  return (
    <div
      className={`min-h-0 flex-1 px-4 sm:px-6 lg:px-8 py-6 space-y-6 transition-colors ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
