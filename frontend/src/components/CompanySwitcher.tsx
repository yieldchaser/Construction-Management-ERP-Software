"use client";

import React, { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getApiHost } from "@/lib/api";

type CompanyItem = {
  id: string;
  name: string;
  slug: string | null;
  parent_company_id: string | null;
  is_enterprise: boolean;
};

export default function CompanySwitcher({
  currentCompanyId,
  fallbackName,
}: {
  currentCompanyId: string;
  fallbackName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token) return;
    fetch(`${getApiHost()}/apis/v3/auth/my-companies`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : { companies: [] }))
      .then((d) => setCompanies(Array.isArray(d.companies) ? d.companies : []))
      .catch(() => setCompanies([]));
  }, []);

  const switchTo = useCallback(
    (newId: string, newName: string) => {
      const segments = (pathname || "").split("/");
      if (segments[1] === "c") segments[2] = newId;
      if (typeof window !== "undefined") localStorage.setItem("company_name", newName);
      setOpen(false);
      router.push(segments.join("/"));
    },
    [pathname, router]
  );

  if (companies.length <= 1) {
    return (
      <span
        suppressHydrationWarning
        className="font-semibold text-sm text-foreground block truncate w-40"
      >
        {fallbackName || "Company"}
      </span>
    );
  }

  const enterprises = companies.filter((c) => c.is_enterprise);
  const childrenOf = (pid: string) =>
    companies.filter((c) => c.parent_company_id === pid);
  const standalone = companies.filter((c) => !c.parent_company_id && !c.is_enterprise);
  const current = companies.find((c) => c.id === currentCompanyId);
  const currentName = current?.name || fallbackName || "Select Company";

  const itemBase =
    "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-colors";
  const activeCls = "bg-primary/10 text-primary font-medium";
  const idleCls = "text-muted hover:text-foreground hover:bg-elevated";

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-1 py-1 rounded-md text-sm text-foreground hover:bg-elevated transition-colors"
      >
        <span className="truncate">{currentName}</span>
        <svg
          className="h-4 w-4 shrink-0 text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 right-0 mt-1 z-50 rounded-md border border-border-custom bg-sidebar shadow-lg max-h-72 overflow-y-auto">
          {enterprises.map((ent) => (
            <div key={ent.id} className="py-1 border-b border-border-custom/50 last:border-b-0">
              <button
                type="button"
                onClick={() => switchTo(ent.id, ent.name)}
                className={`${itemBase} ${ent.id === currentCompanyId ? activeCls : idleCls}`}
              >
                <span className="truncate font-semibold">{ent.name}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted shrink-0">
                  Group
                </span>
              </button>
              {childrenOf(ent.id).map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => switchTo(ch.id, ch.name)}
                  className={`${itemBase} pl-6 ${ch.id === currentCompanyId ? activeCls : idleCls}`}
                >
                  <span className="truncate">{ch.name}</span>
                </button>
              ))}
            </div>
          ))}
          {standalone.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => switchTo(c.id, c.name)}
              className={`${itemBase} ${c.id === currentCompanyId ? activeCls : idleCls}`}
            >
              <span className="truncate">{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
