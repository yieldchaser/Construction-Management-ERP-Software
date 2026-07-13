"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { getApiHost } from "@/lib/api";
import { useProject } from "@/context/ProjectContext";
import { usePermissions } from "@/context/PermissionsContext";
import CompanySwitcher from "@/components/CompanySwitcher";

export default function Sidebar() {
  const params = useParams();
  const pathname = usePathname();
  const rawCompanyId = params.company_id as string;
  const companyId = rawCompanyId === "e0000000-0000-0000-0000-000000000000" ? "demo-construction" : (rawCompanyId || "demo-construction");

  const { activeProjectId, setActiveProjectId, projects, projectContext } = useProject();
  const { can } = usePermissions();

  const [companyName, setCompanyName] = useState("Loading Company...");

  // Company name fetch (project context resolution now lives in ProjectContext).
  useEffect(() => {
    let isActive = true;
    const cachedName = typeof window !== "undefined" ? localStorage.getItem("company_name") : null;
    if (cachedName) {
      setCompanyName(cachedName);
      return;
    }

    if (!companyId || companyId === "e0000000-0000-0000-0000-000000000000" || companyId === "demo-construction") {
      setCompanyName("Demo Construction Ltd");
      return;
    }

    const load = async () => {
      try {
        const apiHost = getApiHost();
        const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
        const res = await fetch(`${apiHost}/apis/v3/settings/company/${companyId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (res.ok) {
          const data = await res.json();
          const resolvedCompanyName = data.name || "Demo Company Ltd";
          if (isActive) setCompanyName(resolvedCompanyName);
          if (typeof window !== "undefined") localStorage.setItem("company_name", resolvedCompanyName);
        } else if (isActive) {
          setCompanyName("Demo Construction Ltd");
        }
      } catch {
        if (isActive) setCompanyName("Demo Construction Ltd");
      }
    };
    load();

    return () => {
      isActive = false;
    };
  }, [companyId]);

  interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
    activePattern?: string;
    action?: () => void;
    // Permission key required to see this module (undefined = always visible).
    // Gating is fail-open: hidden only once permissions are loaded AND withheld.
    permission?: string;
    // Alternative: visible if ANY of these permissions is held.
    anyOf?: string[];
  }

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      href: `/c/${companyId}/dashboard`,
      permission: "dashboard:view",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      label: "Report",
      href: `/c/${companyId}/reports`,
      permission: "reports:view",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      activePattern: "/reports",
    },
    {
      label: "Project",
      href: `/c/${companyId}/projects`,
      permission: "projects:view",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
      activePattern: "/projects",
    },
    {
      label: "Team Schedule",
      href: `/c/${companyId}/d/team-action`,
      permission: "planning:view",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      activePattern: "/d/team-action",
    },
    {
      label: "Finance",
      href: `/c/${companyId}/d/finance`,
      permission: "finance:view",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      activePattern: "/finance",
    },
    {
      label: "Payroll",
      href: `/c/${companyId}/d/payroll-attendance`,
      permission: "payroll:view",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      activePattern: "/payroll-attendance",
    },
    {
      label: "CRM",
      href: `/c/${companyId}/d/crm`,
      permission: "crm:view",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      activePattern: "/crm",
    },
    {
      label: "Library",
      href: `/c/${companyId}/d/library`,
      permission: "library:view",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.168.477 4 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.168.477-4 1.253" />
        </svg>
      ),
      activePattern: "/d/library",
    },
    {
      label: "Services",
      href: `/c/${companyId}/d/services`,
      permission: "production:view",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      activePattern: "/d/services",
    },
    {
      label: "Setting",
      href: `/c/${companyId}/settings`,
      anyOf: ["settings:manage", "team:manage"],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      activePattern: "/settings",
    },
    {
      label: "Help",
      href: `/c/${companyId}/d/help`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      activePattern: "/d/help",
    },
    {
      label: "Delete Logs",
      href: `/c/${companyId}/d/delete-logs`,
      permission: "data:delete",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      activePattern: "/d/delete-logs",
    },
    {
      label: "Enterprise",
      href: `/c/${companyId}/enterprise`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1v1H9V7zm5 0h1v1h-1V7zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1z" />
        </svg>
      ),
      activePattern: "/enterprise",
    },
  ];

  return (
    <aside className="w-64 border-r border-border-custom bg-sidebar flex flex-col justify-between h-full shrink-0">
      <div className="flex flex-col overflow-y-auto flex-1">
        {/* Header */}
        <div className="p-5 flex items-center gap-3 border-b border-border-custom">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-white text-sm">
            S
          </div>
          <div className="min-w-0 flex-1">
            <CompanySwitcher currentCompanyId={companyId} fallbackName={companyName} />
            <span className="text-[11px] text-muted uppercase tracking-wider font-medium">SiteFlow Workspace</span>
          </div>
        </div>

        {/* Module Links */}
        <nav className="p-3 space-y-1 flex-1">
          {navItems
            .filter((it) => (!it.permission || can(it.permission)) && (!it.anyOf || it.anyOf.some((p) => can(p))))
            .map((item, idx) => {
            const isActive = item.activePattern
              ? pathname.includes(item.activePattern)
              : pathname === item.href;

            const content = (
              <div
                className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted hover:text-foreground hover:bg-elevated"
                }`}
                onClick={item.action}
              >
                <span className="text-sm shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </div>
            );

            const element = item.action ? (
              <div key={idx}>{content}</div>
            ) : (
              <Link href={item.href} key={idx} className="block">
                {content}
              </Link>
            );

            return (
              <React.Fragment key={idx}>
                {element}
                {(idx === 1 || idx === 3 || idx === 6 || idx === 8) && (
                  <hr className="my-1.5 border-border-custom/50" />
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer: Pinned Projects dropdown + MOM, To Do, Chat */}
      <div className="p-4 border-t border-border-custom bg-background/25">
        {/* Pinned Projects */}
        <div className="mb-4">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">
            Pinned Projects
          </label>
          <select
            value={activeProjectId}
            onChange={(e) => setActiveProjectId(e.target.value)}
            className="w-full rounded-md border border-border-custom bg-card px-2.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary cursor-pointer"
          >
            {projects.length === 0 && (
              <option value={activeProjectId}>
                {projectContext.name && projectContext.name !== "Project Context"
                  ? `${projectContext.name}${projectContext.code ? ` (${projectContext.code})` : ""}`
                  : "Loading projects..."}
              </option>
            )}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_name || p.name}
                {p.project_code || p.code ? ` (${p.project_code || p.code})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* MOM, To Do, Chat Grid */}
        <div className="grid grid-cols-3 gap-1">
          <Link
            href={`/c/${companyId}/d/mom`}
            className={`flex flex-col items-center justify-center py-2 border rounded-md text-[11px] font-medium transition-all ${
              pathname.includes("/d/mom")
                ? "bg-primary/15 border-primary text-primary"
                : "bg-card hover:bg-elevated border-border-custom text-muted hover:text-foreground"
            }`}
          >
            <span>📝</span>
            <span className="mt-0.5">MOM</span>
          </Link>
          <Link
            href={`/c/${companyId}/d/todo`}
            className={`flex flex-col items-center justify-center py-2 border rounded-md text-[11px] font-medium transition-all ${
              pathname.includes("/d/todo")
                ? "bg-primary/15 border-primary text-primary"
                : "bg-card hover:bg-elevated border-border-custom text-muted hover:text-foreground"
            }`}
          >
            <span>✅</span>
            <span className="mt-0.5">To Do</span>
          </Link>
          <Link
            href={`/c/${companyId}/d/chat`}
            className={`flex flex-col items-center justify-center py-2 border rounded-md text-[11px] font-medium transition-all ${
              pathname.includes("/d/chat")
                ? "bg-primary/15 border-primary text-primary"
                : "bg-card hover:bg-elevated border-border-custom text-muted hover:text-foreground"
            }`}
          >
            <span>💬</span>
            <span className="mt-0.5">Chat</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
