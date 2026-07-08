"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";

interface FAQItem {
  question: string;
  category: "projects" | "finance" | "reports" | "settings";
  answer: React.ReactNode;
}

export default function HelpPage() {
  const params = useParams();
  const companyId = params?.company_id as string || "e0000000-0000-0000-0000-000000000000";

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      question: "How to add team members to a project?",
      category: "projects",
      answer: (
        <div className="space-y-2 text-muted">
          <p>To assign project access and roles to your workforce and staff:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Navigate to the <strong>Project Hub</strong> (under Projects in your sidebar).</li>
            <li>Select the desired project from the project context dropdown or list.</li>
            <li>Click the <strong>Manage Access</strong> option (indicated by the user plus icon) at the top-right of the page.</li>
            <li>Select the staff name from the party directory, choose their authorization role, and click <strong>Assign Role</strong>.</li>
          </ol>
        </div>
      ),
    },
    {
      question: "How to delete a project?",
      category: "projects",
      answer: (
        <div className="space-y-2 text-muted">
          <p>Projects can be deleted permanently from the company settings by authorized administrators:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Go to the <strong>Delete Logs / Danger Zone</strong> section of your active project dashboard.</li>
            <li>Scroll down to find the <strong>Delete Project</strong> option.</li>
            <li>Type the project code to confirm deletion (this action is irreversible and deletes all associated DPRs, materials ledgers, and transactions).</li>
            <li>Click <strong>Permanently Delete</strong>.</li>
          </ol>
        </div>
      ),
    },
    {
      question: "Where to add project value?",
      category: "projects",
      answer: (
        <div className="space-y-2 text-muted">
          <p>Defining contract value is essential for tracking budget burn rates and cash flow analytics:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Navigate to <strong>Settings</strong> &gt; <strong>Branch &amp; Projects</strong>.</li>
            <li>Click on the <strong>Edit</strong> icon for the target project (or use the <em>Project Creator Wizard</em> on the Dashboard).</li>
            <li>Locate the <strong>Contract Value (INR)</strong> field and input the gross contract amount.</li>
            <li>Save changes. This value will now feed the financial widgets and BOQ percentage calculations.</li>
          </ol>
        </div>
      ),
    },
    {
      question: "How to lock back data entry?",
      category: "settings",
      answer: (
        <div className="space-y-2 text-muted">
          <p>To prevent field users from recording or modifying entries in past dates (back-dating):</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Navigate to the <strong>Settings</strong> panel from the sidebar.</li>
            <li>Find the <strong>Back Data Entry Lock</strong> configuration card.</li>
            <li>Configure the allowed days threshold:
              <ul className="list-disc pl-5 mt-1">
                <li>Setting the value to <code>0</code> unlocks back data entry completely.</li>
                <li>Setting it to <code>1</code> or more limits entries (e.g., DPR, material transactions, attendance logs) to only the specified number of past days.</li>
              </ul>
            </li>
            <li>Click <strong>Save Lock Rules</strong>.</li>
          </ol>
        </div>
      ),
    },
    {
      question: "How to download/export reports?",
      category: "reports",
      answer: (
        <div className="space-y-2 text-muted">
          <p>Generate, filter, and export tabular company reports in Microsoft Excel or PDF format:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Go to the <strong>Reports Hub</strong> using the sidebar.</li>
            <li>Search or browse categories (Sales, Payments, Purchase, Assets) and click the <strong>View icon (👁️)</strong> on the desired report card.</li>
            <li>Use the header filter row (Project, Date Range, Client, Item) to isolate the target dataset.</li>
            <li>Click the **Download Excel (📥)** or **Download PDF (📄)** button at the top-right of the control bar to save the report to your device.</li>
          </ol>
        </div>
      ),
    },
    {
      question: "How to set approval limit for manager expenses?",
      category: "finance",
      answer: (
        <div className="space-y-2 text-muted">
          <p>Manage delegation of authority and enforce expense gates:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Go to the <strong>Settings</strong> page and select the <strong>Approval Workflows</strong> tab.</li>
            <li>In the Expense Threshold limits section, set the maximum amount that a Project Manager can approve directly.</li>
            <li>Any logged expense exceeding this limit will automatically hold status as <em>Pending</em> and route to the executive <strong>Payment Approvals</strong> queue for approval.</li>
          </ol>
        </div>
      ),
    },
  ];

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory = activeCategory === "all" || faq.category === activeCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categoriesList = [
    { id: "all", label: "All Topics" },
    { id: "projects", label: "Projects & Team" },
    { id: "finance", label: "Finance & Billing" },
    { id: "reports", label: "DPR & Reports" },
    { id: "settings", label: "Configuration & Locks" },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-elevated/10">
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* Banner Section */}
        <div className="relative rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-border-custom p-8 overflow-hidden">
          <div className="max-w-2xl relative z-10 space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">How Can We Help?</h1>
            <p className="text-xs text-muted">
              Welcome to the SiteFlow Help Center! Find step-by-step guides and solutions to streamline your construction ERP operations.
            </p>
          </div>
          {/* Decorative Background Blob */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-primary/5 to-transparent blur-3xl pointer-events-none"></div>
        </div>

        {/* Categories Tab and Search Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {categoriesList.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setOpenIndex(null);
                }}
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

          {/* Search Input */}
          <div className="relative w-full md:w-80 shrink-0">
            <input
              type="text"
              placeholder="Search help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border-custom rounded-lg pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-primary transition-all"
            />
            <span className="absolute left-3 top-2 text-muted text-sm select-none pointer-events-none">🔍</span>
          </div>
        </div>

        {/* FAQs Accordion Grid */}
        <div className="space-y-3 max-w-4xl">
          <h2 className="text-sm font-bold text-foreground mb-4">FAQ Articles</h2>
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={idx}
                  className={`bg-card border rounded-xl overflow-hidden transition-all ${
                    isOpen ? "border-primary/40 shadow-sm" : "border-border-custom hover:border-border-custom/80"
                  }`}
                >
                  {/* Accordion Trigger Header */}
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left cursor-pointer transition-colors"
                  >
                    <span className="text-xs font-bold text-foreground">{faq.question}</span>
                    <span className={`text-muted text-xs transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                      ▼
                    </span>
                  </button>

                  {/* Accordion Content Panel */}
                  <div
                    className={`transition-all duration-200 ease-in-out overflow-hidden ${
                      isOpen ? "max-h-96 border-t border-border-custom/50" : "max-h-0"
                    }`}
                  >
                    <div className="p-6 text-xs bg-elevated/5 leading-relaxed">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 border border-dashed border-border-custom rounded-xl bg-card">
              <span className="text-2xl">🔍</span>
              <h3 className="text-sm font-bold text-foreground mt-2">No matching help articles</h3>
              <p className="text-xs text-muted mt-1">Try checking another category or refining your search keywords.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
