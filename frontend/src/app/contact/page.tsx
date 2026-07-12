"use client";

import React, { useState } from "react";
import Link from "next/link";

const OFFICES = [
  { city: "Delhi (HQ)", address: "SiteFlow Offices, New Delhi, India", flag: "🇮🇳" },
  { city: "Dubai", address: "Serving UAE, Qatar & Saudi Arabia clients", flag: "🇦🇪" },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", company: "", phone: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-primary opacity-5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[50vw] w-[50vw] rounded-full bg-primary opacity-5 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border border-border-custom rounded-lg border-b border-border-custom px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-tr bg-primary font-sans font-bold text-white shadow-md">S</div>
          <span className="text-lg font-bold tracking-tight text-white">Site<span className="text-primary">Flow</span></span>
        </Link>
        <div className="flex items-center gap-5">
          <Link href="/SiteFlow-pricing" className="hidden md:block text-sm text-muted hover:text-foreground transition-all">Pricing</Link>
          <Link href="/about" className="hidden md:block text-sm text-muted hover:text-foreground transition-all">About</Link>
          <Link href="/login" className="rounded-md bg-primary px-5 py-2 text-sm font-bold text-white hover:opacity-90 transition-all">
            Get Demo
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-6 py-16 text-center max-w-2xl mx-auto space-y-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-4 py-1.5 text-xs font-semibold text-secondary border border-secondary/20">
          💬 Talk to Us
        </span>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Get in touch with SiteFlow
        </h1>
        <p className="text-muted text-sm">
          Whether you want a product demo, have a sales question, or need support, we're reachable on WhatsApp and respond same day.
        </p>
      </section>

      {/* Main Grid */}
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* Contact Info Panel */}
        <aside className="lg:col-span-2 space-y-5">
          {/* Quick channels */}
          <div className="bg-card border border-border-custom rounded-lg rounded-lg p-6 border border-border-custom space-y-5">
            <h2 className="text-sm font-bold text-muted uppercase tracking-widest">Fastest ways to reach us</h2>
            {[
              { icon: "💬", label: "WhatsApp (Fastest)", value: "+91 76673 59544", sub: "Usually responds in < 2 hours" },
              { icon: "📧", label: "Email", value: "puwork09@gmail.com", sub: "Response within 1 business day" },
              { icon: "📞", label: "Phone", value: "+91 76673 59544", sub: "Mon-Sat, 9 AM to 7 PM IST" },
            ].map((c, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{c.icon}</span>
                <div>
                  <div className="text-xs font-semibold text-muted">{c.label}</div>
                  <div className="text-sm font-bold text-white">{c.value}</div>
                  <div className="text-[10px] text-muted mt-0.5">{c.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Offices */}
          <div className="bg-card border border-border-custom rounded-lg rounded-lg p-6 border border-border-custom space-y-4">
            <h2 className="text-sm font-bold text-muted uppercase tracking-widest">Offices</h2>
            {OFFICES.map((o, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-xl">{o.flag}</span>
                <div>
                  <div className="text-sm font-bold text-white">{o.city}</div>
                  <div className="text-xs text-muted leading-relaxed">{o.address}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Response promise */}
          <div className="bg-card border border-border-custom rounded-lg rounded-lg p-5 border border-primary/20 bg-primary/5 space-y-2">
            <div className="text-sm font-bold text-primary">🚀 Our promise</div>
            <p className="text-xs text-muted leading-relaxed">
              Every inquiry gets a real response, not an auto-reply. If you fill the form, your dedicated rep will call or WhatsApp you within 4 business hours.
            </p>
          </div>
        </aside>

        {/* Contact Form */}
        <main className="lg:col-span-3">
          {submitted ? (
            <div className="bg-card border border-border-custom rounded-lg shadow-sm rounded-md p-12 border border-border-custom text-center space-y-5 h-full flex flex-col items-center justify-center">
              <div className="text-5xl">🎉</div>
              <h2 className="text-2xl font-extrabold text-white">Message received!</h2>
              <p className="text-muted text-sm max-w-xs">
                Your dedicated onboarding rep will reach out within 4 hours. Check your WhatsApp.
              </p>
              <Link href="/" className="text-sm text-primary hover:underline">← Back to Home</Link>
            </div>
          ) : (
            <div className="bg-card border border-border-custom rounded-lg shadow-sm rounded-md p-8 border border-border-custom space-y-6">
              <h2 className="text-lg font-extrabold text-white">Send us a message</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: "name", label: "Your Name *", placeholder: "Rajesh Kumar", type: "text", required: true },
                    { id: "company", label: "Company Name *", placeholder: "ABC Contractors Pvt Ltd", type: "text", required: true },
                  ].map((f) => (
                    <div key={f.id} className="space-y-1.5">
                      <label htmlFor={f.id} className="text-xs font-semibold text-muted">{f.label}</label>
                      <input
                        id={f.id}
                        type={f.type}
                        required={f.required}
                        placeholder={f.placeholder}
                        value={form[f.id as keyof typeof form]}
                        onChange={(e) => setForm({ ...form, [f.id]: e.target.value })}
                        className="w-full bg-white/[0.03] border border-border-custom rounded-md px-4 py-3 text-sm text-white placeholder:text-muted focus:outline-none focus:border-primary/50 transition-all"
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: "phone", label: "Phone / WhatsApp *", placeholder: "+91 98765 00000", type: "tel", required: true },
                    { id: "email", label: "Email Address", placeholder: "you@company.com", type: "email", required: false },
                  ].map((f) => (
                    <div key={f.id} className="space-y-1.5">
                      <label htmlFor={f.id} className="text-xs font-semibold text-muted">{f.label}</label>
                      <input
                        id={f.id}
                        type={f.type}
                        required={f.required}
                        placeholder={f.placeholder}
                        value={form[f.id as keyof typeof form]}
                        onChange={(e) => setForm({ ...form, [f.id]: e.target.value })}
                        className="w-full bg-white/[0.03] border border-border-custom rounded-md px-4 py-3 text-sm text-white placeholder:text-muted focus:outline-none focus:border-primary/50 transition-all"
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="message" className="text-xs font-semibold text-muted">What do you need help with?</label>
                  <textarea
                    id="message"
                    rows={4}
                    placeholder="E.g. I want to see a demo of the BOQ + Procurement module for a 3-site civil project..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full bg-white/[0.03] border border-border-custom rounded-md px-4 py-3 text-sm text-white placeholder:text-muted focus:outline-none focus:border-primary/50 transition-all resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-md bg-primary py-4 text-sm font-bold text-white hover:opacity-90 active:scale-[0.99] transition-all shadow-lg shadow-primary/20"
                >
                  Send Message, Get Demo →
                </button>
                <p className="text-[10px] text-muted text-center">
                  No spam. Your details are only used to set up your demo.
                </p>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
