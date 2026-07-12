"use client";

import React, { useState, useEffect, useRef } from "react";
import { getApiHost } from "@/lib/api";
import { getApi, persistAuth } from "@/lib/siteflow";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";

type Method = "phone" | "email_otp" | "password";
type Stage =
  | "input"        // phone / email / password entry
  | "otp"          // phone or email code entry
  | "register"     // email + password + name
  | "verify"       // verify email OTP after register
  | "forgot"       // request reset code
  | "reset"        // enter reset code + new password
  | "pick";        // choose a company (multi-membership)

interface AuthCompany {
  id: string;
  name: string;
  slug?: string | null;
}
interface AuthResponse {
  access_token: string;
  onboarding?: boolean;
  needs_company_selection?: boolean;
  user?: { id?: string; name?: string };
  company?: { id?: string; name?: string } | null;
  companies?: AuthCompany[];
}

const COUNTRY_CODES = [
  { code: "+91", flag: "IN", label: "India" },
  { code: "+971", flag: "AE", label: "UAE" },
  { code: "+974", flag: "QA", label: "Qatar" },
  { code: "+966", flag: "SA", label: "KSA" },
];

export default function LoginPage() {
  const [method, setMethod] = useState<Method>("phone");
  const [stage, setStage] = useState<Stage>("input");

  const [mobile, setMobile] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [isCountryOpen, setIsCountryOpen] = useState(false);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [companies, setCompanies] = useState<AuthCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [timer, setTimer] = useState(0);

  // Firebase Phone Auth (client-side). When the public Firebase config is
  // present, the "Phone OTP" tab uses Firebase (which handles carrier routing
  // and DLT compliance); otherwise it falls back to the MSG91/demo-allowlist
  // flow unchanged. See src/lib/firebase.ts.
  const firebaseReady = isFirebaseConfigured();
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const reset = (m: Method) => {
    setMethod(m);
    setStage(m === "password" ? "input" : "input");
    setError("");
    setMessage("");
    setOtp("");
    setPassword("");
  };

  const fmtMobile = () => `${countryCode}${mobile}`;

  const call = async (path: string, body: Record<string, unknown>) => {
    const res = await fetch(getApi(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { res, data } as { res: Response; data: any };
  };

  // Route the user after any successful auth.
  const finishLogin = async (data: AuthResponse) => {
    persistAuth(data);
    if (data.onboarding) {
      window.location.href = "/onboarding";
      return;
    }
    if (data.needs_company_selection && (data.companies?.length || 0) > 1) {
      setCompanies(data.companies || []);
      setStage("pick");
      setLoading(false);
      return;
    }
    const companyId = data.company?.id;
    if (!companyId) {
      window.location.href = "/onboarding";
      return;
    }
    // Preserve the existing behaviour: send new companies through the segment
    // questionnaire, otherwise straight to the console.
    let shouldOnboard = true;
    try {
      const r = await fetch(`${getApiHost()}/apis/v3/settings/company/${companyId}`, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      if (r.ok) {
        const c = await r.json();
        if (c.onboarding_completed) shouldOnboard = false;
      }
    } catch {
      /* non-fatal */
    }
    window.location.href = shouldOnboard
      ? "/profile/onboarding"
      : `/c/${companyId}/reports`;
  };

  const pickCompany = (companyId: string) => {
    localStorage.setItem("company_id", companyId);
    window.location.href = `/c/${companyId}/reports`;
  };

  // ── Handlers ────────────────────────────────────────────────────────────
  const guard = () => {
    setLoading(true);
    setError("");
    setMessage("");
  };

  const handlePhoneSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile || mobile.length < 10) {
      setError("Please enter a valid mobile number.");
      return;
    }
    if (firebaseReady) {
      await handleFirebasePhoneSend();
      return;
    }
    guard();
    try {
      const { res, data } = await call("/auth/otp/send", { mobile: fmtMobile() });
      if (res.ok && data.success) {
        setStage("otp");
        setTimer(30);
        setMessage(data.demo_mode ? `Demo code: ${data.mock_code}` : "Code sent to your phone.");
      } else setError(data.detail || "Failed to send code.");
    } catch {
      setError("Could not reach the server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  // Firebase phone send: run the invisible reCAPTCHA and send the SMS via the
  // Firebase JS SDK (no MSG91 involved). The resulting confirmationResult is
  // held so the code-entry step can confirm it.
  const handleFirebasePhoneSend = async () => {
    guard();
    try {
      const auth = getFirebaseAuth();
      if (!auth) {
        setError("Phone login is temporarily unavailable.");
        setLoading(false);
        return;
      }
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(auth, "firebase-recaptcha", {
          size: "invisible",
        });
      }
      const confirmation = await signInWithPhoneNumber(auth, fmtMobile(), recaptchaRef.current);
      confirmationRef.current = confirmation;
      setStage("otp");
      setTimer(30);
      setMessage("Code sent to your phone.");
    } catch (err: any) {
      // Log the real Firebase error code/message to the browser console (dev
      // visibility only, not sent anywhere) - swallowing it entirely made every
      // failure indistinguishable (bad number vs quota vs captcha vs billing).
      console.error("[firebase phone] signInWithPhoneNumber failed:", err?.code, err?.message, err);
      // Reset the verifier so a retry gets a fresh challenge.
      try {
        recaptchaRef.current?.clear();
      } catch {
        /* ignore */
      }
      recaptchaRef.current = null;
      setError("Could not send the code. Please check the number and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailOtpSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email.");
      return;
    }
    guard();
    try {
      const { res, data } = await call("/auth/email-otp/send", { email });
      if (res.ok && data.success) {
        setStage("otp");
        setTimer(30);
        setMessage(data.demo_mode ? `Demo code: ${data.mock_code}` : "Code sent to your email.");
      } else setError(data.detail || "Failed to send code.");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    if (method === "phone" && firebaseReady) {
      await handleFirebaseOtpVerify();
      return;
    }
    guard();
    try {
      const path = method === "phone" ? "/auth/otp/verify" : "/auth/email-otp/verify";
      const body = method === "phone" ? { mobile: fmtMobile(), code: otp } : { email, code: otp };
      const { res, data } = await call(path, body);
      if (res.ok && data.access_token) {
        setMessage("Success. Redirecting...");
        await finishLogin(data);
      } else {
        setError(data.detail || "Invalid code.");
      }
    } catch {
      setError("Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  // Firebase phone verify: confirm the code with Firebase to obtain a signed ID
  // token, then hand that token to the backend which verifies it and mints our
  // session (same post-login handling as every other method).
  const handleFirebaseOtpVerify = async () => {
    guard();
    try {
      const confirmation = confirmationRef.current;
      if (!confirmation) {
        setError("Your session expired. Please request a new code.");
        setStage("input");
        setLoading(false);
        return;
      }
      const credential = await confirmation.confirm(otp);
      const idToken = await credential.user.getIdToken();
      const { res, data } = await call("/auth/firebase/verify", { id_token: idToken });
      if (res.ok && data.access_token) {
        setMessage("Success. Redirecting...");
        await finishLogin(data);
      } else {
        setError(data.detail || "Could not complete sign-in.");
      }
    } catch {
      setError("Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    guard();
    try {
      const { res, data } = await call("/auth/login", { email, password });
      if (res.ok && data.access_token) {
        setMessage("Success. Redirecting...");
        await finishLogin(data);
      } else if (res.status === 403) {
        // Email not verified: move the user into the verify step.
        setError("");
        setMessage("Verify your email to continue. We can send you a code.");
        setStage("verify");
      } else {
        setError(data.detail || "Invalid email or password.");
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    guard();
    try {
      const { res, data } = await call("/auth/register", { email, password, name });
      if (res.ok && data.success) {
        setStage("verify");
        setTimer(30);
        setMessage(
          data.demo_mode
            ? `Account created. Demo code: ${data.mock_code}`
            : "Account created. Enter the code we emailed you."
        );
      } else {
        setError(data.detail || "Could not create the account.");
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  // Verify email after register (or after a 403 login), then log in.
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    guard();
    try {
      const { res, data } = await call("/auth/email-otp/verify", { email, code: otp });
      if (res.ok && data.access_token) {
        setMessage("Verified. Redirecting...");
        await finishLogin(data);
      } else {
        setError(data.detail || "Invalid code.");
      }
    } catch {
      setError("Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerify = async () => {
    guard();
    try {
      const { res, data } = await call("/auth/email-otp/send", { email });
      if (res.ok) {
        setTimer(30);
        setMessage(data.demo_mode ? `Demo code: ${data.mock_code}` : "Code sent to your email.");
      } else setError(data.detail || "Failed to send code.");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email.");
      return;
    }
    guard();
    try {
      const { res, data } = await call("/auth/password/forgot", { email });
      if (res.ok) {
        setStage("reset");
        setTimer(30);
        setMessage("If an account exists, a reset code has been sent to your email.");
      } else setError(data.detail || "Could not send a reset code.");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    guard();
    try {
      const { res, data } = await call("/auth/password/reset", {
        email,
        code: otp,
        new_password: password,
      });
      if (res.ok && data.success) {
        setStage("input");
        setOtp("");
        setPassword("");
        setMessage("Password updated. Please log in.");
      } else {
        setError(data.detail || "Could not reset the password.");
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  const SUBMIT_CLASS =
    "w-full flex justify-center items-center py-2.5 px-6 rounded-md text-white font-medium bg-primary hover:bg-primary-hover shadow-sm transition-colors motion-reduce:transition-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none";

  const startGoogle = () => {
    // Public GET: the backend 307-redirects to Google. No token in any URL.
    window.location.href = getApi("/auth/google/authorize");
  };

  // ── UI helpers ────────────────────────────────────────────────────────────
  const tabBtn = (m: Method, label: string) => (
    <button
      type="button"
      onClick={() => reset(m)}
      className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors motion-reduce:transition-none ${
        method === m
          ? "bg-primary text-white"
          : "bg-input text-muted hover:text-foreground border border-border-custom"
      }`}
    >
      {label}
    </button>
  );

  const heading = () => {
    if (stage === "pick") return "Choose a company";
    if (stage === "otp" || stage === "verify") return "Enter verification code";
    if (stage === "forgot") return "Reset your password";
    if (stage === "reset") return "Set a new password";
    if (method === "password" && stage === "register") return "Create your account";
    return "Login & Sign Up";
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-primary p-16 lg:flex border-r border-border-custom">
        {/* Soft light glows — white so they read against the primary fill
            (a bg-primary blob on a bg-primary panel is invisible). */}
        <div className="absolute bottom-[-20%] right-[-20%] h-[70%] w-[70%] rounded-full bg-white opacity-10 blur-[120px]" />
        <div className="absolute top-[-15%] left-[-10%] h-[45%] w-[45%] rounded-full bg-white opacity-[0.07] blur-[110px]" />

        <div className="flex items-center gap-3 z-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white font-bold text-primary shadow-md ring-1 ring-white/70">S</div>
          <span className="text-xl font-bold tracking-tight text-white">SiteFlow</span>
        </div>

        <div className="z-10 max-w-md space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl font-extrabold leading-tight text-white">
              Your whole construction business in one workspace.
            </h2>
            <p className="text-sm leading-relaxed text-white/80">
              Projects, billing, procurement, payroll and CRM stay connected, so your office and your site work from the same numbers.
            </p>
          </div>

          {/* Compact live-project mock, echoing the homepage hero card
              (same honest demo strings), adapted for this fixed half-width panel. */}
          <div className="rounded-xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-sm space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-white">Greenline Residency</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                Phase 2
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-white/70">
                <span>Weighted progress</span>
                <span className="font-semibold text-white">62%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                <div className="h-full w-[62%] rounded-full bg-white" />
              </div>
            </div>
            <div className="rounded-md border border-white/20 bg-white/10 px-3 py-2 text-[11px] text-white/90">
              Project P&amp;L: revenue Rs 61L, cost Rs 44L, margin 28%
            </div>
          </div>

          {/* Proportionate, honest proof points (mirrors the homepage trust bar). */}
          <ul className="space-y-2.5">
            {[
              "16 operational modules under one login",
              "Tally & Zoho accounting integrations",
              "GPS-geofenced attendance, IS-code compliant math",
            ].map((point) => (
              <li key={point} className="flex items-center gap-2.5 text-sm text-white/85">
                <svg
                  className="h-4 w-4 flex-shrink-0 text-white"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m5 10.5 3.5 3.5 7-8" />
                </svg>
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col justify-center items-center p-8 lg:w-1/2 bg-background relative">
        <div className="w-full max-w-md space-y-6 z-10">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">{heading()}</h2>
            <p className="text-muted text-sm">
              {stage === "input" && method === "phone" && "Enter your mobile number to receive a code."}
              {stage === "input" && method === "email_otp" && "Enter your email to receive a code."}
              {stage === "input" && method === "password" && "Log in with your email and password."}
              {stage === "register" && "Sign up with your email and a password."}
              {(stage === "otp" || stage === "verify") && "Enter the 6-digit code we sent you."}
              {stage === "forgot" && "We will email you a code to reset your password."}
              {stage === "reset" && "Enter the code and choose a new password."}
              {stage === "pick" && "You belong to more than one company."}
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400 text-center">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-lg border border-success/20 bg-success/10 p-3 text-sm text-success text-center">
              {message}
            </div>
          )}

          {/* Google + method tabs shown only on the primary entry stages */}
          {(stage === "input" || stage === "register") && (
            <>
              <button
                type="button"
                onClick={startGoogle}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-6 rounded-md font-semibold border border-border-custom bg-input hover:bg-elevated hover:text-foreground text-foreground transition-colors motion-reduce:transition-none cursor-pointer"
              >
                <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.09C3.24 21.3 7.28 24 12 24z" />
                  <path fill="#FBBC05" d="M5.27 14.27a7.2 7.2 0 010-4.54v-3.1H1.26a12 12 0 000 10.74z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.28 0 3.24 2.7 1.26 6.63l4.01 3.1C6.22 6.86 8.87 4.75 12 4.75z" />
                </svg>
                Continue with Google
              </button>
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-border-custom" />
                <span className="flex-shrink mx-4 text-xs font-bold text-muted uppercase tracking-widest">Or</span>
                <div className="flex-grow border-t border-border-custom" />
              </div>
              <div className="flex gap-2">
                {tabBtn("phone", "Phone OTP")}
                {tabBtn("email_otp", "Email OTP")}
                {tabBtn("password", "Password")}
              </div>
            </>
          )}

          {/* Phone input */}
          {stage === "input" && method === "phone" && (
            <form onSubmit={handlePhoneSend} className="space-y-5">
              <div className="relative flex rounded-md bg-input border border-border-custom focus-within:border-primary transition-colors motion-reduce:transition-none items-center p-1.5">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCountryOpen(!isCountryOpen)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-elevated rounded-lg border border-border-custom text-sm font-semibold hover:bg-elevated/80 transition-colors motion-reduce:transition-none cursor-pointer text-foreground"
                  >
                    <span>{countryCode}</span>
                    <span className="text-[10px] opacity-60">v</span>
                  </button>
                  {isCountryOpen && (
                    <div className="absolute top-[120%] left-0 w-32 bg-card border border-border-custom rounded-lg shadow-2xl z-50 overflow-hidden">
                      {COUNTRY_CODES.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            setCountryCode(c.code);
                            setIsCountryOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-semibold hover:bg-primary/20 hover:text-foreground transition-colors motion-reduce:transition-none cursor-pointer text-foreground"
                        >
                          {c.code} {c.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="Mobile number"
                  required
                  disabled={loading}
                  className="w-full bg-transparent px-4 py-2 text-base font-semibold tracking-wide placeholder-muted focus:outline-none text-foreground"
                />
              </div>
              <button type="submit" disabled={loading} className={SUBMIT_CLASS}>
                {loading ? "Sending..." : "Send code"}
              </button>
            </form>
          )}

          {/* Email OTP input */}
          {stage === "input" && method === "email_otp" && (
            <form onSubmit={handleEmailOtpSend} className="space-y-5">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                disabled={loading}
                className="input-field w-full px-4 py-3 text-sm focus:outline-none"
              />
              <button type="submit" disabled={loading} className={SUBMIT_CLASS}>
                {loading ? "Sending..." : "Send code"}
              </button>
            </form>
          )}

          {/* Password login */}
          {stage === "input" && method === "password" && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                disabled={loading}
                className="input-field w-full px-4 py-3 text-sm focus:outline-none"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                disabled={loading}
                className="input-field w-full px-4 py-3 text-sm focus:outline-none"
              />
              <button type="submit" disabled={loading} className={SUBMIT_CLASS}>
                {loading ? "Signing in..." : "Log in"}
              </button>
              <div className="flex justify-between text-xs text-muted pt-1">
                <button type="button" onClick={() => { setStage("register"); setError(""); setMessage(""); }} className="font-medium text-primary hover:text-foreground">
                  Create account
                </button>
                <button type="button" onClick={() => { setStage("forgot"); setError(""); setMessage(""); }} className="font-medium text-secondary hover:text-foreground">
                  Forgot password?
                </button>
              </div>
            </form>
          )}

          {/* Register */}
          {stage === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required disabled={loading} className="input-field w-full px-4 py-3 text-sm focus:outline-none" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required disabled={loading} className="input-field w-full px-4 py-3 text-sm focus:outline-none" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 8 characters)" required disabled={loading} className="input-field w-full px-4 py-3 text-sm focus:outline-none" />
              <button type="submit" disabled={loading} className={SUBMIT_CLASS}>
                {loading ? "Creating..." : "Create account"}
              </button>
              <button type="button" onClick={() => { setStage("input"); setError(""); setMessage(""); }} className="w-full text-xs font-medium text-muted hover:text-foreground pt-1">
                Back to login
              </button>
            </form>
          )}

          {/* OTP / verify code */}
          {(stage === "otp" || stage === "verify") && (
            <form onSubmit={stage === "otp" ? handleOtpVerify : handleVerifyEmail} className="space-y-5">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                required
                disabled={loading}
                className="input-field w-full px-4 py-3.5 text-center text-2xl font-bold tracking-widest placeholder-muted"
              />
              <button type="submit" disabled={loading} className={SUBMIT_CLASS}>
                {loading ? "Verifying..." : "Verify"}
              </button>
              <div className="flex justify-between items-center text-xs text-muted">
                <button type="button" onClick={() => { setStage("input"); setOtp(""); setError(""); }} className="font-medium text-secondary hover:text-foreground">
                  Back
                </button>
                {timer > 0 ? (
                  <span>Resend in {timer}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={stage === "otp" ? (method === "phone" ? handlePhoneSend : handleEmailOtpSend) as any : handleResendVerify}
                    disabled={loading}
                    className="font-medium text-primary hover:text-foreground"
                  >
                    Resend code
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Forgot */}
          {stage === "forgot" && (
            <form onSubmit={handleForgotSend} className="space-y-5">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required disabled={loading} className="input-field w-full px-4 py-3 text-sm focus:outline-none" />
              <button type="submit" disabled={loading} className={SUBMIT_CLASS}>
                {loading ? "Sending..." : "Send reset code"}
              </button>
              <button type="button" onClick={() => { setStage("input"); setError(""); setMessage(""); }} className="w-full text-xs font-medium text-muted hover:text-foreground">
                Back to login
              </button>
            </form>
          )}

          {/* Reset */}
          {stage === "reset" && (
            <form onSubmit={handleReset} className="space-y-4">
              <input type="text" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Reset code" required disabled={loading} className="input-field w-full px-4 py-3 text-center text-xl font-bold tracking-widest" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (min 8 characters)" required disabled={loading} className="input-field w-full px-4 py-3 text-sm focus:outline-none" />
              <button type="submit" disabled={loading} className={SUBMIT_CLASS}>
                {loading ? "Updating..." : "Update password"}
              </button>
              <button type="button" onClick={() => { setStage("input"); setError(""); setMessage(""); }} className="w-full text-xs font-medium text-muted hover:text-foreground">
                Back to login
              </button>
            </form>
          )}

          {/* Company picker */}
          {stage === "pick" && (
            <div className="space-y-3">
              {companies.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pickCompany(c.id)}
                  className="w-full text-left px-4 py-3 rounded-md border border-border-custom bg-input hover:border-primary hover:bg-elevated transition-colors motion-reduce:transition-none text-foreground font-semibold"
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {/* Invisible reCAPTCHA host for Firebase Phone Auth (no-op when the
              MSG91 fallback is active). */}
          <div id="firebase-recaptcha" />
        </div>
      </div>
    </div>
  );
}
