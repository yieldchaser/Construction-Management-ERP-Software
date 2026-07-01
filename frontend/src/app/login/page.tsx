"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

export default function LoginPage() {
  const [mobile, setMobile] = useState("9876543210");
  const [otp, setOtp] = useState("123456");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [timer, setTimer] = useState(30);

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

    // Normalize phone number (assume +91 if no code)
    let formattedMobile = mobile;
    if (!mobile.startsWith("+")) {
      formattedMobile = `+91${mobile.replace(/\D/g, "")}`;
    }

    try {
      const response = await fetch("http://localhost:8000/apis/v3/auth/otp/send", {
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

    let formattedMobile = mobile;
    if (!mobile.startsWith("+")) {
      formattedMobile = `+91${mobile.replace(/\D/g, "")}`;
    }

    try {
      const response = await fetch("http://localhost:8000/apis/v3/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: formattedMobile, code: otp }),
      });

      const data = await response.json();
      if (response.ok && data.access_token) {
        setMessage("Authentication successful! Redirecting...");
        // Store token and details in localStorage for client-side API requests
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("company_id", data.company.id);
        localStorage.setItem("user_id", data.user.id);
        
        // Redirect to main workspace
        setTimeout(() => {
          window.location.href = `/c/${data.company.id}/dashboard`;
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

  return (
    <div className="flex min-h-screen w-full bg-[#0E0C15] text-[#ededed]">
      {/* Graphic Left Panel (Desktop only) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1A162D] to-[#0E0C15] p-16 lg:flex border-r border-white/5">
        {/* Animated background glow elements */}
        <div className="absolute top-[-20%] left-[-20%] h-[70%] w-[70%] rounded-full bg-[#7C5CFF] opacity-10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-20%] h-[70%] w-[70%] rounded-full bg-[#E8184C] opacity-10 blur-[120px]" />

        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3 z-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] font-sans font-bold text-white shadow-lg">
            S
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Site<span className="text-primary">Flow</span>
          </span>
        </div>

        {/* Dynamic Center Graphic */}
        <div className="relative flex flex-1 flex-col justify-center items-start gap-8 z-10">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary border border-primary/20">
              ⚡ SiteFlow Core Engine v3.0
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight text-white max-w-lg lg:text-5xl">
              Professional Site & <br />
              <span className="text-gradient-accent">Operations Control</span>
            </h1>
            <p className="text-zinc-400 text-lg max-w-md">
              Real-time resource coordination, material ledger settlements, and live field calculators. Built to outperform the rest.
            </p>
          </div>

          {/* Simulated Gantt / Geofence Widget */}
          <div className="w-full max-w-md rounded-2xl glass-panel-glow p-6 space-y-4 transition-all duration-500 hover:border-white/10 hover:shadow-[0_0_50px_rgba(232,24,76,0.05)]">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Live Site Activity</span>
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            </div>
            
            <div className="space-y-3">
              {/* Gantt Bar Row 1 */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-300 font-medium">Excavation & Shoring</span>
                  <span className="text-[#00E5A3]">Active</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-secondary to-primary w-4/5 rounded-full animate-shimmer" />
                </div>
              </div>

              {/* Gantt Bar Row 2 */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-300 font-medium">Concrete Pour (M20 grade)</span>
                  <span className="text-zinc-500">Pending QA</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-secondary/40 w-1/2 rounded-full" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 text-xs text-zinc-500 border-t border-white/5 mt-2">
              <span>📍 Geofence Guard: Active (500m radius)</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-xs text-zinc-600 z-10">
          © {new Date().getFullYear()} SiteFlow Inc. All rights reserved. Secured by Supabase.
        </div>
      </div>

      {/* Interactive Form Panel */}
      <div className="flex w-full flex-col justify-center items-center p-8 lg:w-1/2 bg-[#0E0C15] relative">
        <div className="absolute top-[20%] right-[10%] h-[50%] w-[50%] rounded-full bg-[#E8184C] opacity-5 blur-[100px] pointer-events-none lg:hidden" />
        
        {/* Mobile Header (hidden on desktop) */}
        <div className="mb-12 flex items-center gap-3 lg:hidden absolute top-8 left-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] font-sans font-bold text-white">
            S
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Site<span className="text-primary">Flow</span>
          </span>
        </div>

        <div className="w-full max-w-md space-y-8 z-10">
          {/* Header */}
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              {step === "phone" ? "Enter your mobile" : "Enter Verification Code"}
            </h2>
            <p className="text-zinc-400 text-sm">
              {step === "phone"
                ? "We will send you a 6-digit OTP code to verify your profile."
                : `Enter the code sent to your phone.`}
            </p>
          </div>

          {/* Success / Error Messages */}
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-lg border border-success/20 bg-success/10 p-4 text-sm text-success">
              {message}
            </div>
          )}

          {/* Phone Form */}
          {step === "phone" && (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Mobile Number
                </label>
                <div className="flex rounded-xl bg-white/[0.03] border border-white/10 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all overflow-hidden items-center px-4 py-1">
                  <span className="text-zinc-500 font-semibold text-lg mr-3 select-none">+91</span>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="98765 43210"
                    required
                    disabled={loading}
                    className="w-full bg-transparent py-2.5 text-lg font-semibold tracking-wide placeholder-zinc-600 focus:outline-none text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-4 px-6 rounded-xl text-white font-semibold bg-gradient-to-r from-primary to-[#FF3B6C] shadow-lg hover:opacity-90 active:scale-[0.98] transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending OTP...
                  </span>
                ) : (
                  "Request Access Code"
                )}
              </button>
            </form>
          )}

          {/* OTP Verification Form */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    6-Digit Verification Code
                  </label>
                  <button
                    type="button"
                    onClick={() => setStep("phone")}
                    className="text-xs font-medium text-secondary hover:text-white transition-colors"
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
                  className="glass-input w-full px-4 py-3.5 text-center text-2xl font-bold tracking-widest placeholder-zinc-700"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-4 px-6 rounded-xl text-white font-semibold bg-gradient-to-r from-secondary to-[#9C85FF] shadow-lg hover:opacity-90 active:scale-[0.98] transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Verifying Code...
                  </span>
                ) : (
                  "Verify & Log In"
                )}
              </button>

              <div className="flex justify-between items-center text-xs text-zinc-500 pt-2">
                <span>Didn't receive code?</span>
                {timer > 0 ? (
                  <span>Resend in {timer}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="font-medium text-primary hover:text-white transition-colors"
                  >
                    Resend Code
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Quick Sandbox / Developer Helper Notice */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs text-zinc-500 space-y-2">
            <span className="font-semibold text-zinc-400 block">⚡ Dev-Sandbox Environment Mode:</span>
            <p>
              Use any valid 10-digit phone number. Enter code <code className="text-secondary font-mono font-bold">123456</code> to bypass and auto-onboard user and company profiles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
