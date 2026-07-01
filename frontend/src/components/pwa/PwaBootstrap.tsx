"use client";
 
import { useEffect } from "react";
 
// Global client-side redirect for all hardcoded localhost API endpoints
if (typeof window !== "undefined") {
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    if (typeof input === "string" && input.startsWith("http://localhost:8000")) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      input = input.replace("http://localhost:8000", baseUrl);
    }
    return originalFetch(input, init);
  };
}

export default function PwaBootstrap() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }
 
    void navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
  }, []);
 
  return null;
}
