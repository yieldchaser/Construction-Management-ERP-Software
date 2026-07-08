"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { ProjectProvider } from "@/context/ProjectContext";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const getPageTitle = (): string => {
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
    </ProjectProvider>
  );
}
