"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const getPageTitle = () => {
    if (pathname.includes("/d/home")) return "Project Hub";
    if (pathname.includes("/d/library")) return "Library Hub";
    if (pathname.includes("/d/team-action")) return "Team Schedule";
    if (pathname.includes("/d/todo")) return "To-Do List";
    if (pathname.includes("/d/payment-approval")) return "Payment Approvals";
    if (pathname.includes("/dashboard")) return "Company Dashboard";
    if (pathname.includes("/settings")) return "Settings";
    return "Workspace";
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      {/* Reusable Sidebar */}
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
  );
}
