"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const getPageTitle = () => {
    if (pathname.includes("/d/home")) return "Projects";
    if (pathname.includes("/d/library")) return "Library Hub";
    if (pathname.includes("/d/team-action")) return "Team Schedule";
    if (pathname.includes("/d/todo")) return "To-Do List";
    if (pathname.includes("/d/payment-approval")) return "Payment Approvals";
    if (pathname.includes("/dashboard")) return "Analytics Dashboard";
    if (pathname.includes("/settings")) return "Settings";
    return "Workspace";
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      {/* Reusable Sidebar */}
      <Sidebar onShowToast={showToast} />

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Reusable PageHeader with dynamic page title */}
        <PageHeader title={getPageTitle()} />

        {/* Page Content */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {children}
        </div>

        {/* Global Toast Message */}
        {toastMessage && (
          <div className="absolute bottom-6 right-6 bg-card border border-success/30 rounded-lg px-4 py-3 text-xs text-success shadow-lg flex items-center gap-2 z-50 transition-all">
            <span>⚡</span>
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}
      </main>
    </div>
  );
}
