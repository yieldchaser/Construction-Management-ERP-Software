"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";

interface TutorialCard {
  title: string;
  category: string;
}

export default function HelpPage() {
  const params = useParams();
  const companyId = params?.company_id as string || "e0000000-0000-0000-0000-000000000000";

  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categoriesList = [
    { id: "all", label: "All Topics" },
    { id: "procurement", label: "Procurement" },
    { id: "warehouse", label: "Warehouse" },
    { id: "finance", label: "Finance & Payroll" },
    { id: "general", label: "General" },
  ];

  const tutorials: TutorialCard[] = [
    { title: "RFQ Tutorial", category: "procurement" },
    { title: "Procurement - PO Management", category: "procurement" },
    { title: "Warehouse Management", category: "warehouse" },
    { title: "Material Transfer", category: "warehouse" },
    { title: "Material Return & Debit Note", category: "warehouse" },
    { title: "Petty Cash Management to Supervisor", category: "finance" },
    { title: "Company Dashboard", category: "general" },
    { title: "ToDo Management", category: "general" },
    { title: "BOQ/Budgeting and Invoicing", category: "finance" },
    { title: "Payroll", category: "finance" },
    { title: "Staff Payroll", category: "finance" },
    { title: "Attendance & Salary Management", category: "finance" },
  ];

  const filtered = tutorials.filter(
    (t) => activeCategory === "all" || t.category === activeCategory
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-elevated/10">
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Banner Section */}
        <div className="relative rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-border-custom p-8 overflow-hidden">
          <div className="max-w-2xl relative z-10 space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Video Tutorials</h1>
            <p className="text-xs text-muted">
              Welcome to the SiteFlow Help Center! Watch step-by-step video guides to streamline your construction ERP operations.
            </p>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-primary/5 to-transparent blur-3xl pointer-events-none"></div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          {categoriesList.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-primary border-primary text-white shadow-sm shadow-primary/20"
                  : "bg-card border-border-custom text-muted hover:text-foreground hover:border-border-custom/80"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Tutorial Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t, idx) => (
            <div
              key={idx}
              className="group bg-card border border-border-custom rounded-xl overflow-hidden cursor-pointer hover:border-primary/40 transition-all"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center overflow-hidden">
                <span className="absolute inset-0 bg-radial from-primary/10 to-transparent opacity-60"></span>
                <div className="h-12 w-12 rounded-full bg-white/90 shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
              {/* Title */}
              <div className="px-4 py-3">
                <h3 className="text-xs font-bold text-foreground leading-snug">{t.title}</h3>
                <p className="text-[10px] text-muted mt-1 uppercase tracking-wider">
                  {categoriesList.find((c) => c.id === t.category)?.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 border border-dashed border-border-custom rounded-xl bg-card">
            <span className="text-2xl">🎬</span>
            <h3 className="text-sm font-bold text-foreground mt-2">No tutorials in this category</h3>
            <p className="text-xs text-muted mt-1">Check back later or switch to another topic.</p>
          </div>
        )}
      </div>
    </div>
  );
}
