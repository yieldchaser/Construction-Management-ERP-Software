import React from "react";
import Image from "next/image";
import { getContentItems, ContentItem } from "@/lib/content";
import { HelpSearchClient } from "./HelpSearchClient";
import MarketingShell from "@/components/marketing/MarketingShell";
import Icon from "@/components/marketing/Icon";
import Link from "next/link";

const CATEGORY_META: Record<string, { title: string; desc: string; icon: string }> = {
  "getting-started": {
    title: "Getting Started",
    desc: "Learn how to access, log in, navigate, and understand pricing.",
    icon: "rocket",
  },
  "attendance-payroll": {
    title: "Attendance & Payroll",
    desc: "Manage salary templates, mark site worker attendance, and process payroll.",
    icon: "calendar",
  },
  "billing-invoicing": {
    title: "Billing & Invoicing",
    desc: "Create sales invoices, manage subcontractor work orders, and outline policies.",
    icon: "description",
  },
  "budgeting-cost-control": {
    title: "Budgeting & Cost Control",
    desc: "Control project estimates, budget allocations, and deduction scenarios.",
    icon: "payments",
  },
  "company-features": {
    title: "Company Features",
    desc: "Use chat groups, company dashboard panels, and project party tabs.",
    icon: "domain",
  },
  "crm-leads": {
    title: "CRM & Leads",
    desc: "Manage customer leads, dynamic estimations, and quotation processes.",
    icon: "handshake",
  },
  "design-files": {
    title: "Design Files",
    desc: "Upload blueprints, track modifications, and coordinate design approvals.",
    icon: "architecture_drawing",
  },
  "finance-transactions": {
    title: "Finance & Transactions",
    desc: "Record expenses, execute payment requests, and configure Tally integrations.",
    icon: "trending_up",
  },
  "mobile-app": {
    title: "Mobile App Guides",
    desc: "Punch in/out, view task tabs, and track actions on site mobile layouts.",
    icon: "smartphone",
  },
  "procurement-warehouse": {
    title: "Procurement & Warehouse",
    desc: "Manage material flow, set up warehouses, and issue purchase orders.",
    icon: "inventory",
  },
  "project-management": {
    title: "Project Management",
    desc: "Create projects, schedule tasks, track stages, and manage approvals.",
    icon: "construction",
  },
  "reports": {
    title: "Reports & Analytics",
    desc: "Export attendance, inventory, party balance, and purchase reports.",
    icon: "bar_chart",
  },
  "settings-configuration": {
    title: "Settings & Configuration",
    desc: "Add bank details, set custom fields, and configure approval workflows.",
    icon: "settings",
  },
  "tasks-to-dos": {
    title: "Tasks & To-Dos",
    desc: "Assign, monitor, and update construction items and tasks.",
    icon: "check",
  },
  "user-management": {
    title: "User Management",
    desc: "Add project members, manage roles, and restrict access permissions.",
    icon: "group",
  },
};

export default async function HelpCenterPage() {
  const helpItems = await getContentItems("help");

  // Group items by category and count REAL guides (derived from content, never invented).
  const categories: Record<string, ContentItem[]> = {};
  for (const cat of Object.keys(CATEGORY_META)) {
    categories[cat] = [];
  }
  for (const item of helpItems) {
    if (item.category && item.slug !== `${item.category}/${item.category}`) {
      if (!categories[item.category]) {
        categories[item.category] = [];
      }
      if (item.slug !== item.category) {
        categories[item.category].push(item);
      }
    }
  }

  const activeCategories = Object.keys(categories).filter(
    (cat) => categories[cat].length > 0
  );

  const totalGuides = activeCategories.reduce(
    (sum, cat) => sum + categories[cat].length,
    0
  );

  return (
    <MarketingShell>
      {/* Hero Header */}
      <section className="relative px-6 pt-16 pb-16 text-center overflow-hidden alx-scroll-fade">
        <div className="absolute inset-0 z-0 alx-hero-wash pointer-events-none" />
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
          <Image
            src="/marketing/help/help-hero.webp"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-center"
            priority
          />
        </div>
        <div className="max-w-4xl mx-auto relative z-10 space-y-6">
          <span className="alx-label alx-badge-gold inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs">
            <Icon name="book" className="w-3.5 h-3.5" />
            SiteFlow Knowledge Base
          </span>
          <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight text-alx-on-surface leading-tight">
            How can we help you today?
          </h1>
          <p className="font-body text-alx-on-surface-variant text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Search the {totalGuides} guides below for step-by-step workflows across every SiteFlow
            module. If something is missing, our team is one message away.
          </p>
        </div>
      </section>

      {/* Interactive Search Area */}
      <section className="max-w-5xl mx-auto px-6 pb-20 alx-scroll-fade">
        <HelpSearchClient
          helpItems={helpItems}
          categories={categories}
          categoryMeta={CATEGORY_META}
          activeCategories={activeCategories}
          totalGuides={totalGuides}
        />
      </section>

      {/* Contact Support band */}
      <section className="max-w-5xl mx-auto px-6 pb-24 alx-scroll-fade">
        <div className="rounded-2xl alx-bg-gradient-primary p-8 md:p-10 text-alx-on-primary shadow-lg shadow-alx-primary/25 alx-hover-lift flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <h2 className="font-headline text-2xl font-bold">Still need a hand?</h2>
            <p className="text-sm text-alx-on-primary/85 max-w-xl leading-relaxed">
              Can&apos;t find the answer you need? Reach out and the SiteFlow team will help you get
              unblocked.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 bg-alx-surface-container-lowest text-alx-primary font-bold text-sm px-5 py-3 rounded-lg hover:opacity-90 transition whitespace-nowrap"
            >
              Contact Support
            </Link>
            <Link
              href="/help"
              className="inline-flex items-center justify-center gap-2 border border-alx-on-primary/30 text-alx-on-primary font-bold text-sm px-5 py-3 rounded-lg hover:bg-alx-on-primary/10 transition whitespace-nowrap"
            >
              Browse all guides
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
