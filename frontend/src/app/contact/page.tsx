"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import MarketingShell from "@/components/marketing/MarketingShell";
import { getApiHost } from "@/lib/api";

const OFFICES = [
  { city: "Delhi (HQ)", address: "SiteFlow Offices, New Delhi, India" },
  { city: "Dubai", address: "Serving UAE, Qatar & Saudi Arabia clients" },
];

type ContactIconName = "chat" | "mail" | "call" | "location" | "rocket";

function ContactIcon({ name, className = "w-6 h-6" }: { name: ContactIconName; className?: string }) {
  const paths: Record<ContactIconName, React.ReactNode> = {
    chat: (
      <>
        <path d="M21 12a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.8-.9L3 21l1.4-5.7A8.4 8.4 0 0 1 3.5 12 8.5 8.5 0 0 1 12 3.5 8.5 8.5 0 0 1 21 12Z" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3.5 6 8.5 7 8.5-7" />
      </>
    ),
    call: (
      <>
        <path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 10 10 0 0 0 3.1.5 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 10 10 0 0 0 .5 3.1 1 1 0 0 1-.25 1Z" />
      </>
    ),
    location: (
      <>
        <path d="M12 21s7-6.1 7-11.5a7 7 0 0 0-14 0C5 14.9 12 21 12 21Z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </>
    ),
    rocket: (
      <>
        <path d="M12 2c2.5 2 4 5.3 4 8.5 0 2-1 4-2 5.5l-2-1-2 1c-1-1.5-2-3.5-2-5.5C8 7.3 9.5 4 12 2Z" />
        <path d="m8.5 15.5-2 2 .5 2.5 2.5.5 2-2" />
        <path d="M15.5 15.5c1.5-.5 3 0 3.5 1s0 3-1 3.5" />
        <circle cx="12" cy="9" r="1.5" />
      </>
    ),
  };

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", company: "", phone: "", email: "", role: "", sites: "", message: "" });
  const [website, setWebsite] = useState(""); // honeypot: always left empty by real users
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/public/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          website,
          source: "contact_form",
          page_url: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });
      if (!res.ok) {
        if (res.status === 422) {
          throw new Error("validation");
        }
        throw new Error("request_failed");
      }
      setSubmitted(true);
    } catch (err) {
      if (err instanceof Error && err.message === "validation") {
        setError("Please check the required fields above (name, company, phone, and email) and try again.");
      } else {
        setError("We could not send your message. Please try again, or reach us directly on WhatsApp or email.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass =
    "w-full bg-alx-surface-container-lowest border border-alx-outline-variant/40 rounded-lg px-4 py-3 text-sm text-alx-on-surface placeholder:text-alx-on-surface-variant/60 focus:outline-none focus:border-alx-primary focus:ring-1 focus:ring-alx-primary transition-colors";
  const labelClass = "font-uilabel text-xs font-semibold text-alx-on-surface-variant uppercase tracking-wider";

  return (
    <MarketingShell>
      {/* Hero */}
      <section className="relative px-6 pt-16 pb-20 text-center overflow-hidden alx-scroll-fade is-visible">
        <div className="absolute inset-0 z-0 alx-hero-wash pointer-events-none" />
        <div className="max-w-2xl mx-auto relative z-10 space-y-6">
          <span className="alx-label alx-badge-gold inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs">
            Talk to Us
          </span>

          <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-alx-on-surface leading-tight">
            Get in touch with SiteFlow
          </h1>

          <p className="font-body text-alx-on-surface-variant text-base md:text-lg leading-relaxed">
            Whether you want a product demo, have a sales question, or need support, we&apos;re reachable on WhatsApp and respond same day.
          </p>
        </div>
      </section>

      {/* Main Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 alx-scroll-fade">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Contact Info Panel */}
          <div className="flex flex-col gap-6 lg:gap-8">
            {/* Quick channels */}
            <div className="rounded-2xl bg-alx-surface-container-lowest p-5 sm:p-7 md:p-9 space-y-6 shadow-xl shadow-alx-on-surface/5">
              <h2 className="font-headline text-lg font-bold text-alx-on-surface">Fastest ways to reach us</h2>
              {[
                { icon: "chat" as const, label: "WhatsApp (Fastest)", value: "+91 76673 59544", sub: "Usually responds in < 2 hours" },
                { icon: "mail" as const, label: "Email", value: "puwork09@gmail.com", sub: "Response within 1 business day" },
                { icon: "call" as const, label: "Phone", value: "+91 76673 59544", sub: "Mon-Sat, 9 AM to 7 PM IST" },
              ].map((c, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-alx-primary-fixed text-alx-primary shrink-0">
                    <ContactIcon name={c.icon} className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-uilabel text-xs font-semibold text-alx-on-surface-variant uppercase tracking-wider">{c.label}</div>
                    <div className="text-sm font-bold text-alx-on-surface mt-0.5">{c.value}</div>
                    <div className="text-xs text-alx-on-surface-variant mt-0.5">{c.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Offices */}
            <div className="rounded-2xl bg-alx-surface-container-lowest p-5 sm:p-7 md:p-9 space-y-6 shadow-xl shadow-alx-on-surface/5">
              <h2 className="font-headline text-lg font-bold text-alx-on-surface">Offices</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {OFFICES.map((o, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-2 mb-2 text-alx-primary">
                      <ContactIcon name="location" className="w-5 h-5" />
                      <div className="text-sm font-bold text-alx-on-surface">{o.city}</div>
                    </div>
                    <div className="text-xs text-alx-on-surface-variant leading-relaxed">{o.address}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Response promise */}
            <div className="rounded-2xl bg-gradient-to-br from-alx-primary-fixed via-alx-surface-container-lowest to-alx-surface-container p-5 sm:p-6 md:p-7 space-y-3 shadow-xl shadow-alx-primary/5 border border-alx-outline-variant/20">
              <div className="flex items-center gap-2">
                <ContactIcon name="rocket" className="w-5 h-5 text-alx-primary" />
                <div className="font-headline text-sm font-bold text-alx-on-surface">Our promise</div>
              </div>
              <p className="text-xs text-alx-on-surface-variant leading-relaxed">
                Every inquiry gets a real response, not an auto-reply. If you fill the form, our team will follow up by email.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="h-full flex flex-col">
            {submitted ? (
              <div className="rounded-2xl bg-alx-surface-container-lowest shadow-xl shadow-alx-on-surface/5 p-8 sm:p-12 text-center space-y-5 h-full flex flex-col items-center justify-center flex-grow">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-alx-primary-fixed text-alx-primary">
                  <ContactIcon name="chat" className="w-8 h-8" />
                </div>
                <h2 className="font-headline text-2xl font-extrabold text-alx-on-surface">Message received!</h2>
                <p className="font-body text-alx-on-surface-variant text-sm max-w-xs">
                  Thanks for reaching out. Our team will review your message and get back to you by email soon.
                </p>
                <Link href="/" className="text-sm text-alx-primary hover:underline">
                  &larr; Back to Home
                </Link>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl bg-alx-surface-container-lowest shadow-xl shadow-alx-on-surface/5 p-5 sm:p-8 md:p-10 flex-grow flex flex-col justify-between h-full">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-alx-primary-fixed rounded-full blur-3xl opacity-50 pointer-events-none" />
                <h2 className="font-headline text-xl font-extrabold text-alx-on-surface mb-6 relative z-10">Send us a message</h2>
                <form onSubmit={handleSubmit} className="space-y-6 flex-grow flex flex-col justify-between relative z-10">
                  {/* Honeypot: hidden from real visitors, left blank by them. Bots that
                      fill every field trip this and their submission is silently dropped. */}
                  <input
                    type="text"
                    name="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="absolute -left-[9999px] w-px h-px opacity-0 pointer-events-none"
                  />
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {[
                        { id: "name", label: "Your Name *", placeholder: "Rajesh Kumar", type: "text", required: true },
                        { id: "company", label: "Company Name *", placeholder: "ABC Contractors Pvt Ltd", type: "text", required: true },
                      ].map((f) => (
                        <div key={f.id} className="space-y-2">
                          <label htmlFor={f.id} className={labelClass}>
                            {f.label}
                          </label>
                          <input
                            id={f.id}
                            type={f.type}
                            required={f.required}
                            placeholder={f.placeholder}
                            value={form[f.id as keyof typeof form]}
                            onChange={(e) => setForm({ ...form, [f.id]: e.target.value })}
                            className={fieldClass}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {[
                        { id: "phone", label: "Phone / WhatsApp *", placeholder: "+91 98765 00000", type: "tel", required: true },
                        { id: "email", label: "Email Address *", placeholder: "you@company.com", type: "email", required: true },
                      ].map((f) => (
                        <div key={f.id} className="space-y-2">
                          <label htmlFor={f.id} className={labelClass}>
                            {f.label}
                          </label>
                          <input
                            id={f.id}
                            type={f.type}
                            required={f.required}
                            placeholder={f.placeholder}
                            value={form[f.id as keyof typeof form]}
                            onChange={(e) => setForm({ ...form, [f.id]: e.target.value })}
                            className={fieldClass}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {[
                        { id: "role", label: "Your Role / Designation", placeholder: "e.g. Owner, PM, Accountant", type: "text", required: false },
                        { id: "sites", label: "Number of Active Sites", placeholder: "e.g. 3", type: "text", required: false },
                      ].map((f) => (
                        <div key={f.id} className="space-y-2">
                          <label htmlFor={f.id} className={labelClass}>
                            {f.label}
                          </label>
                          <input
                            id={f.id}
                            type={f.type}
                            required={f.required}
                            placeholder={f.placeholder}
                            value={form[f.id as keyof typeof form]}
                            onChange={(e) => setForm({ ...form, [f.id]: e.target.value })}
                            className={fieldClass}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="message" className={labelClass}>
                        What do you need help with?
                      </label>
                      <textarea
                        id="message"
                        rows={4}
                        placeholder="E.g. I want to see a demo of the BOQ + Procurement module for a 3-site civil project..."
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        className={`${fieldClass} resize-none`}
                      />
                    </div>
                  </div>
                  <div className="space-y-4 pt-4">
                    {error && (
                      <p role="alert" className="text-xs font-semibold text-red-600 text-center">
                        {error}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="alx-bg-gradient-primary text-alx-on-primary w-full rounded-full font-uilabel py-4 text-sm font-bold tracking-wide hover:shadow-xl hover:shadow-alx-primary/30 transition-all active:scale-[0.99] inline-flex items-center justify-center relative overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <span className="relative z-10">
                        {submitting ? "Sending..." : "Send Message, Get Demo →"}
                      </span>
                      <div className="absolute inset-0 alx-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </button>
                    <p className="text-[11px] text-alx-on-surface-variant text-center">
                      No spam. Your details are only used to set up your demo.
                    </p>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
