import React from "react";
import Link from "next/link";
import { getContentItems, ContentItem } from "@/lib/content";
import { HelpSearchClient } from "./HelpSearchClient";

const CATEGORY_META: Record<string, { title: string; desc: string; icon: string }> = {
  "getting-started": {
    title: "Getting Started",
    desc: "Learn how to access, log in, navigate, and understand pricing.",
    icon: "🚀",
  },
  "attendance-payroll": {
    title: "Attendance & Payroll",
    desc: "Manage salary templates, mark site worker attendance, and process payroll.",
    icon: "📅",
  },
  "billing-invoicing": {
    title: "Billing & Invoicing",
    desc: "Create sales invoices, manage subcontractor work orders, and outline policies.",
    icon: "📄",
  },
  "budgeting-cost-control": {
    title: "Budgeting & Cost Control",
    desc: "Control project estimates, budget allocations, and deduction scenarios.",
    icon: "💰",
  },
  "company-features": {
    title: "Company Features",
    desc: "Use chat groups, company dashboard panels, and project party tabs.",
    icon: "🏢",
  },
  "crm-leads": {
    title: "CRM & Leads",
    desc: "Manage customer leads, dynamic estimations, and quotation processes.",
    icon: "🤝",
  },
  "design-files": {
    title: "Design Files",
    desc: "Upload blueprints, track modifications, and coordinate design approvals.",
    icon: "📐",
  },
  "finance-transactions": {
    title: "Finance & Transactions",
    desc: "Record expenses, execute payment requests, and configure Tally integrations.",
    icon: "📈",
  },
  "mobile-app": {
    title: "Mobile App Guides",
    desc: "Punch in/out, view task tabs, and track actions on site mobile layouts.",
    icon: "📱",
  },
  "procurement-warehouse": {
    title: "Procurement & Warehouse",
    desc: "Manage material flow, set up warehouses, and issue purchase orders.",
    icon: "📦",
  },
  "project-management": {
    title: "Project Management",
    desc: "Create projects, schedule tasks, track stages, and manage approvals.",
    icon: "🏗️",
  },
  "reports": {
    title: "Reports & Analytics",
    desc: "Export attendance, inventory, party balance, and purchase reports.",
    icon: "📊",
  },
  "settings-configuration": {
    title: "Settings & Configuration",
    desc: "Add bank details, set custom fields, and configure approval workflows.",
    icon: "⚙️",
  },
  "tasks-to-dos": {
    title: "Tasks & To-Dos",
    desc: "Assign, monitor, and update construction items and tasks.",
    icon: "✅",
  },
  "user-management": {
    title: "User Management",
    desc: "Add project members, manage roles, and restrict access permissions.",
    icon: "👥",
  },
};

export default async function HelpCenterPage() {
  const helpItems = await getContentItems("help");

  // Group items by category
  const categories: Record<string, ContentItem[]> = {};
  
  // Initialize with metadata categories
  for (const cat of Object.keys(CATEGORY_META)) {
    categories[cat] = [];
  }

  for (const item of helpItems) {
    if (item.category && item.slug !== `${item.category}/${item.category}`) {
      if (!categories[item.category]) {
        categories[item.category] = [];
      }
      // Avoid adding the category index file itself to list of articles
      if (item.slug !== item.category) {
        categories[item.category].push(item);
      }
    }
  }

  // Filter out categories with no articles
  const activeCategories = Object.keys(categories).filter(
    (cat) => categories[cat].length > 0
  );

  return (
    <div className="min-h-screen bg-[#0E0C15] text-[#ededed] relative pb-20">
      {/* Background glow elements */}
      <div className="absolute top-[-10%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-[#E8184C] opacity-5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] h-[50vw] w-[50vw] rounded-full bg-[#7C5CFF] opacity-5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] font-sans font-bold text-white shadow-md">
            S
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Site<span className="text-primary">Flow</span> Help
          </span>
        </Link>
        <Link
          href="/"
          className="text-sm font-semibold text-zinc-400 hover:text-white transition-all"
        >
          Back to Main Site
        </Link>
      </header>

      {/* Hero Header */}
      <section className="relative px-6 py-16 text-center max-w-4xl mx-auto space-y-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary border border-primary/20">
          📖 SiteFlow Knowledge Base
        </span>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
          How can we help you today?
        </h1>
        <p className="text-zinc-400 text-sm max-w-xl mx-auto">
          Search detailed guides, tutorials, and operational workflows for SiteFlow modules.
        </p>
      </section>

      {/* Interactive Search Area */}
      <section className="max-w-5xl mx-auto px-6">
        <HelpSearchClient
          helpItems={helpItems}
          categories={categories}
          categoryMeta={CATEGORY_META}
          activeCategories={activeCategories}
        />
      </section>
    </div>
  );
}
