"use client";

import React from "react";

export default function ProjectTabPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary text-xl font-bold">
          {title.charAt(0)}
        </div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted">
          This module is part of the Project Tab roadmap and is coming soon. The nav
          entry is wired so it is reachable in-context.
        </p>
      </div>
    </div>
  );
}
