"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getApiHost } from "@/lib/api";

const TESTIMONIALS = [
  {
    title: "#1 Construction Application For Project tracking.",
    name: "Mr. Mohammad Taqi",
    company: "Hydro Master, Doha, Qatar",
    quote: "I can share PDF reports instantly with clients & vendors, streamlining communication. Onsite's intuitive platform provides easy-to-use interface."
  },
  {
    title: "#1 Construction Application For Client invoicing.",
    name: "Rocks & logs stone works LLC",
    company: "Dubai, UAE",
    quote: "Material tracking and department-wise roles assignment have become easy for us. There is no more material wastage and easy PO generation. Love this software."
  },
  {
    title: "#1 Construction Application For Attendance/Payroll",
    name: "Mr. Manish Kumar",
    company: "Reidius Infra, Jaipur",
    quote: "With Onsite, all the progress and cost details are visible in one place. Client discussions became much smoother because we are now talking with actual site data instead of guesses."
  },
  {
    title: "#1 Construction Application For Material management",
    name: "Mr. Kathirvel",
    company: "Theeran Avant, Erode, Tamil Nadu",
    quote: "Managing site teams and tracking work across projects was becoming difficult. With Onsite, site engineers and project managers track progress in one place."
  },
  {
    title: "#1 Construction Application For Cost control",
    name: "Mr. Hiren Patel",
    company: "DCC, Mumbai",
    quote: "SiteFlow helped us monitor spending at activity level instead of discovering overruns later. Financial visibility got much closer to daily execution."
  }
];

const LOGOS = [
  "Hydro Master",
  "Rocks & Logs",
  "Reidius Infra",
  "Theeran Avant",
  "DCC Mumbai"
];

export default function LoginPage() {
  const [mobile, setMobile] = useState("9876543210");
  const [otp, setOtp] = useState("123456");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [timer, setTimer] = useState(30);
  const [countryCode, setCountryCode] = useState("+91");
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

  const [activeTestimonialIdx, setActiveTestimonialIdx] = useState(0);

  // Rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonialIdx((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "otp" && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile || mobile.length < 10) {
      setError("Please enter a valid mobile number.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    let formattedMobile = `${countryCode}${mobile}`;

    try {
      const apiHost = getApiHost();
      const response = await fetch(`${apiHost}/apis/v3/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: formattedMobile }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setStep("otp");
        setTimer(30);
        setMessage(`OTP sent successfully! Demo code: ${data.mock_code || "123456"}`);
      } else {
        setError(data.detail || "Failed to send OTP. Please try again.");
      }
    } catch (err) {
      setError("Could not connect to authentication server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      setError("Please enter the 6-digit OTP code.");
      return;
    }

    setLoading(true);
    setError("");

    let formattedMobile = `${countryCode}${mobile}`;

    try {
      const apiHost = getApiHost();
      const response = await fetch(`${apiHost}/apis/v3/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: formattedMobile, code: otp }),
      });

      const data = await response.json();
      if (response.ok && data.access_token) {
        setMessage("Authentication successful! Checking onboarding status...");
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("company_id", data.company.id);
        localStorage.setItem("user_id", data.user.id);
        
        // Fetch company onboarding status
        const companyRes = await fetch(`${apiHost}/apis/v3/settings/company/${data.company.id}`, {
          headers: { "Authorization": `Bearer ${data.access_token}` }
        });
        
        let shouldOnboard = true;
        if (companyRes.ok) {
          const companyData = await companyRes.json();
          if (companyData.onboarding_completed) {
            shouldOnboard = false;
          }
        }

        setTimeout(() => {
          if (shouldOnboard) {
            window.location.href = `/profile/onboarding`;
          } else {
            window.location.href = `/c/${data.company.id}/d/home`;
          }
        }, 1500);
      } else {
        setError(data.detail || "Invalid OTP code. Please try again.");
      }
    } catch (err) {
      setError("Verification failed. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const currentTestimonial = TESTIMONIALS[activeTestimonialIdx];

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Testimonials Slide Carousel Left Panel (Desktop only) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-primary p-16 lg:flex border-r border-border-custom">
        
        <div className="absolute bottom-[-20%] right-[-20%] h-[70%] w-[70%] rounded-full bg-primary opacity-10 blur-[120px]" />

        {/* Logo */}
        <div className="flex items-center gap-3 z-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary font-bold text-white shadow-sm">
            S
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Site<span className="text-primary">Flow</span>
          </span>
        </div>

        {/* Carousel Content */}
        <div className="flex flex-1 flex-col justify-center items-start gap-8 z-10 relative">
          <div className="space-y-6 transition-all duration-500 ease-in-out min-h-[260px] flex flex-col justify-center">
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight text-white max-w-lg lg:text-5xl">
              {currentTestimonial.title}
            </h1>
            
            <div className="space-y-2 border-l-2 border-primary/50 pl-4 py-1">
              <p className="text-foreground text-lg italic leading-relaxed">
                "{currentTestimonial.quote}"
              </p>
              <div>
                <h4 className="text-sm font-bold text-white mt-2">{currentTestimonial.name}</h4>
                <p className="text-xs text-muted">{currentTestimonial.company}</p>
              </div>
            </div>
          </div>

          {/* Carousel dots */}
          <div className="flex gap-2">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTestimonialIdx(i)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  activeTestimonialIdx === i ? "w-6 bg-primary" : "w-2.5 bg-white/10"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer brand logos */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-8 border-t border-border-custom z-10">
          {LOGOS.map((l, idx) => (
            <span key={idx} className="text-xs font-bold tracking-wider text-muted uppercase">
              {l}
            </span>
          ))}
        </div>
      </div>

      {/* Interactive Form Panel */}
      <div className="flex w-full flex-col justify-center items-center p-8 lg:w-1/2 bg-background relative">
        
        
        {/* Mobile Header */}
        <div className="mb-12 flex items-center gap-3 lg:hidden absolute top-8 left-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-white">
            S
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Site<span className="text-primary">Flow</span>
          </span>
        </div>

        <div className="w-full max-w-md space-y-8 z-10">
          {/* Header */}
          <div className="space-y-4 text-center">
            {step === "phone" && (
              <div className="flex justify-center mb-6">
                {/* Visual phone hand SVG/CSS */}
                <div className="relative h-28 w-28 bg-card border border-border-custom rounded-full flex items-center justify-center shadow-lg">
                  
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary">
                    <rect x="5" y="2" width="14" height="20" rx="2" />
                    <line x1="12" y1="18" x2="12" y2="18" strokeLinecap="round" strokeWidth="2" />
                    <path d="M9 5h6" />
                  </svg>
                </div>
              </div>
            )}
            
            <h2 className="text-3xl font-bold tracking-tight text-white">
              {step === "phone" ? "Login & Sign Up" : "Enter Verification Code"}
            </h2>
            <p className="text-muted text-sm">
              {step === "phone"
                ? "Enter your country code and mobile number to request OTP."
                : `Enter the code sent to your phone.`}
            </p>
          </div>

          {/* Messages */}
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400 text-center">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-lg border border-success/20 bg-success/10 p-4 text-sm text-success text-center">
              {message}
            </div>
          )}

          {/* Phone Form */}
          {step === "phone" && (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="space-y-2">
                <div className="relative flex rounded-md bg-input border border-border-custom focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all overflow-visible items-center p-1.5">
                  {/* Country Selector Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-elevated rounded-lg border border-border-custom text-sm font-semibold hover:bg-white/10 transition-all cursor-pointer text-white"
                    >
                      <span>🇮🇳</span>
                      <span>{countryCode}</span>
                      <span className="text-[10px] opacity-60">▼</span>
                    </button>
                    {isCountryDropdownOpen && (
                      <div className="absolute top-[120%] left-0 w-32 bg-card border border-border-custom rounded-lg shadow-2xl z-50 overflow-hidden">
                        {[
                          { code: "+91", flag: "🇮🇳", label: "India" },
                          { code: "+971", flag: "🇦🇪", label: "UAE" },
                          { code: "+974", flag: "🇶🇦", label: "Qatar" },
                          { code: "+966", flag: "🇸🇦", label: "KSA" }
                        ].map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => {
                              setCountryCode(c.code);
                              setIsCountryDropdownOpen(false);
                            }}
                            className="w-full px-3 py-2 text-left text-xs font-semibold hover:bg-primary/20 hover:text-foreground transition-all flex items-center gap-2 cursor-pointer text-foreground"
                          >
                            <span>{c.flag}</span>
                            <span>{c.code}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="Mobile Number"
                    required
                    disabled={loading}
                    className="w-full bg-transparent px-4 py-2 text-base font-semibold tracking-wide placeholder-zinc-600 focus:outline-none text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-4 px-6 rounded-md text-white font-semibold bg-primary shadow-lg hover:opacity-90 active:scale-[0.98] transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? "Sending OTP..." : "Next"}
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-border-custom"></div>
                <span className="flex-shrink mx-4 text-xs font-bold text-muted uppercase tracking-widest">Or</span>
                <div className="flex-grow border-t border-border-custom"></div>
              </div>

              <button
                type="button"
                className="w-full flex justify-center items-center py-3.5 px-6 rounded-md text-muted font-semibold border border-border-custom hover:bg-elevated hover:text-foreground transition-all cursor-pointer"
              >
                Login with App
              </button>
            </form>
          )}

          {/* OTP Verification Form */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                    6-Digit Verification Code
                  </label>
                  <button
                    type="button"
                    onClick={() => setStep("phone")}
                    className="text-xs font-medium text-secondary hover:text-foreground transition-colors"
                  >
                    Change Number
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  required
                  disabled={loading}
                  className="input-field w-full px-4 py-3.5 text-center text-2xl font-bold tracking-widest placeholder-muted"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-4 px-6 rounded-md text-white font-semibold bg-primary shadow-lg hover:opacity-90 active:scale-[0.98] transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? "Verifying Code..." : "Verify & Log In"}
              </button>

              <div className="flex justify-between items-center text-xs text-muted pt-2">
                <span>Didn't receive code?</span>
                {timer > 0 ? (
                  <span>Resend in {timer}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="font-medium text-primary hover:text-foreground transition-colors"
                  >
                    Resend Code
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Developer Notice */}
          <div className="rounded-md border border-border-custom bg-elevated p-4 text-xs text-muted space-y-2">
            <span className="font-semibold text-muted block">⚡ Developer Notice:</span>
            <p>
              Use OTP code <code className="text-secondary font-mono font-bold">123456</code> to log in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
