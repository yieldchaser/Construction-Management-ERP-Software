"use client";

import React from "react";
import { usePathname, useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ProjectProvider } from "@/context/ProjectContext";
import { CompanySettingsProvider } from "@/context/CompanySettingsContext";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  // null = still verifying (renders the shell-free loader), true = session present.
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    // Reuse the app's established auth signal: the session JWT is stored as
    // `access_token` in localStorage (see lib/siteflow.ts persistAuth / authHeaders
    // and the same guard used in app/onboarding/page.tsx). No token means no
    // session, so bounce to /login before the console shell is ever shown.
    if (typeof window !== "undefined" && !localStorage.getItem("access_token")) {
      window.location.href = "/login";
      return;
    }
    setAuthed(true);
  }, []);

  if (params?.company_id === "e0000000-0000-0000-0000-000000000000") {
    if (typeof window !== "undefined") {
      const newPath = window.location.pathname.replace("e0000000-0000-0000-0000-000000000000", "demo-construction");
      window.location.replace(newPath);
    }
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-foreground font-sans">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-[10px] text-muted uppercase tracking-widest font-extrabold">Resolving Workspace...</span>
        </div>
      </div>
    );
  }

  if (authed !== true) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-foreground font-sans">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-[10px] text-muted uppercase tracking-widest font-extrabold">Verifying Session...</span>
        </div>
      </div>
    );
  }

  const getPageTitle = (): string => {
    if (pathname.includes("/enterprise")) return "Enterprise Rollup";
    if (pathname.includes("/d/home")) return "Project Hub";
    if (pathname.includes("/d/library")) return "Library Hub";
    if (pathname.includes("/d/team-action")) return "Team Schedule";
    if (pathname.includes("/d/todo")) return "To-Do List";
    if (pathname.includes("/d/payment-approval")) return "Payment Approvals";
    if (pathname.includes("/d/delete-logs")) return "Delete Logs";
    if (pathname.includes("/d/finance")) return "Finance";
    if (pathname.includes("/d/hr")) return "HR & Payroll";
    if (pathname.includes("/d/crm")) return "CRM & Quotations";
    if (pathname.includes("/d/procurement")) return "Procurement";
    if (pathname.includes("/d/dpr")) return "Daily Progress Report";
    if (pathname.includes("/d/equipment")) return "Equipment";
    if (pathname.includes("/d/production")) return "Production";
    if (pathname.includes("/d/quality")) return "Quality";
    if (pathname.includes("/d/attendance")) return "Attendance";
    if (pathname.includes("/d/towers")) return "Towers";
    if (pathname.includes("/d/subcon")) return "Subcontractor";
    if (pathname.includes("/d/labour")) return "Labour";
    if (pathname.includes("/d/drawings")) return "Drawings";
    if (pathname.includes("/d/budgeting")) return "Budgeting";
    if (pathname.includes("/d/billing")) return "Billing";
    if (pathname.includes("/d/budget")) return "Budget";
    if (pathname.includes("/d/statutory")) return "Statutory";
    if (pathname.includes("/d/safety")) return "Safety";
    if (pathname.includes("/d/wastage")) return "Wastage";
    if (pathname.includes("/d/three-way")) return "3-Way Matching";
    if (pathname.includes("/d/face-recognition")) return "Face Recognition";
    if (pathname.includes("/d/depreciation")) return "Depreciation";
    if (pathname.includes("/d/custom-fields")) return "Custom Fields";
    if (pathname.includes("/d/chat")) return "Chat";
    if (pathname.includes("/d/mom")) return "MOM";
    if (pathname.includes("/d/report-list")) return "Reports";
    if (pathname.includes("/reports")) return "Reports";
    if (pathname.includes("/analytics")) return "Analytics";
    if (pathname.includes("/dashboard")) return "Company Dashboard";
    if (pathname.includes("/settings")) return "Settings";
    return "Workspace";
  };

  return (
    <ProjectProvider>
      <CompanySettingsProvider>
        <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
        {/* Single persistent global Sidebar */}
        <Sidebar />

        {/* Main Workspace Area */}
        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          {/* Reusable PageHeader with dynamic page title */}
          <PageHeader title={getPageTitle()} />

          {/* Page Content */}
          <div className="flex-1 overflow-hidden relative flex flex-col">
            {children}
          </div>
        </main>
      </div>
      </CompanySettingsProvider>
    </ProjectProvider>
  );
}
