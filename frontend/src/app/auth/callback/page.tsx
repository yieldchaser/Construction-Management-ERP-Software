"use client";

import React, { useEffect, useState } from "react";
import { getApi, persistAuth } from "@/lib/siteflow";
import { getApiHost } from "@/lib/api";

const ERROR_MESSAGES: Record<string, string> = {
  google_denied: "Google sign-in was cancelled.",
  google_token: "Could not complete Google sign-in. Please try again.",
  google_userinfo: "Could not read your Google profile. Please try again.",
  google_unverified: "Your Google email is not verified.",
  use_password_login: "This email already has a password account. Please log in with your password.",
};

// Receives the one-time handoff code from an OAuth callback redirect and
// exchanges it (via POST) for the real session JWT. The session token is never
// present in the URL, only the short-lived single-use code.
export default function AuthCallbackPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errCode = params.get("error");
    const code = params.get("code");

    if (errCode) {
      setError(ERROR_MESSAGES[errCode] || "Sign-in failed. Please try again.");
      return;
    }
    if (!code) {
      setError("Missing sign-in code. Please try again.");
      return;
    }

    const run = async () => {
      try {
        const res = await fetch(getApi("/auth/oauth/exchange"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.access_token) {
          setError(data.detail || "Sign-in link is invalid or has expired.");
          return;
        }
        persistAuth(data);
        if (data.onboarding || !data.company?.id) {
          window.location.href = "/onboarding";
          return;
        }
        const companyId = data.company.id;
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
        window.location.href = shouldOnboard ? "/profile/onboarding" : `/c/${companyId}/reports`;
      } catch {
        setError("Could not reach the server. Please try again.");
      }
    };
    run();
  }, []);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-alx-surface-container-lowest text-alx-on-surface p-8">
      <div className="w-full max-w-md text-center space-y-4">
        {error ? (
          <>
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600">
              {error}
            </div>
            <a href="/login" className="inline-block text-sm font-semibold text-alx-primary hover:underline">
              Back to login
            </a>
          </>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto h-10 w-10 rounded-full border-2 border-alx-outline-variant/30 border-t-alx-primary animate-spin motion-reduce:animate-none" />
            <p className="text-alx-on-surface-variant text-sm font-medium">Signing you in to SiteFlow...</p>
          </div>
        )}
      </div>
    </div>
  );
}
