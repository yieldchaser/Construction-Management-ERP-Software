import type { NextConfig } from "next";

// Backend API + Supabase Storage hosts the browser must be allowed to reach.
// Keep in sync with src/lib/api.ts (getApiHost) and the Supabase project URL.
const API_HOST = "https://construction-erp-backend-73vm.onrender.com";
const SUPABASE_HOSTS = "https://*.supabase.co";

// Content-Security-Policy. Shipped in Report-Only mode first (see headers below)
// so it cannot break the live app while we watch for violations; promote it to
// the enforcing `Content-Security-Policy` header once reports are clean.
// Notes:
// - 'unsafe-inline' for styles is required by Next.js injected styles and the
//   app's inline style usage (aurora/theme work).
// - script-src keeps 'unsafe-inline' for Next's hydration bootstrap; add
//   'unsafe-eval' only if a client library actually needs it.
// - img-src allows https:, data: and blob: so Supabase Storage images, inline
//   data URIs, and camera-captured blobs (face recognition) all load.
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  `connect-src 'self' ${API_HOST} ${SUPABASE_HOSTS}`,
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
].join("; ");

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Enforced clickjacking protection even while CSP is report-only.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    // The PWA genuinely needs geolocation (geofenced attendance) and camera
    // (face-recognition punch). Scope those to same-origin, deny the rest.
    key: "Permissions-Policy",
    value: "geolocation=(self), camera=(self), microphone=(), payment=(), usb=(), browsing-topics=()",
  },
  {
    // Report-Only: observe violations without blocking. Promote to
    // "Content-Security-Policy" once the app is confirmed clean.
    key: "Content-Security-Policy-Report-Only",
    value: contentSecurityPolicy,
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
