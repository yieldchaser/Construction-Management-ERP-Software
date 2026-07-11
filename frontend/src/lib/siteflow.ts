import { getApiHost } from "@/lib/api";

export const getApi = (path: string): string =>
  `${getApiHost()}/apis/v3${path}`;

export const authHeaders = (): Record<string, string> | undefined => {
  if (typeof window === "undefined") return undefined;
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : undefined;
};

// Persist a successful auth response (any method: phone, email OTP, Google,
// password) into localStorage the same way the app already reads it elsewhere.
// The token is stored client-side only; it is never placed in a URL.
export const persistAuth = (data: {
  access_token: string;
  user?: { id?: string; name?: string };
  company?: { id?: string } | null;
}): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem("access_token", data.access_token);
  if (data.user?.id) localStorage.setItem("user_id", data.user.id);
  localStorage.setItem("user_name", data.user?.name || "");
  localStorage.setItem("creator_name", data.user?.name || "");
  if (data.company?.id) localStorage.setItem("company_id", data.company.id);
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const resolveCompanyId = async (slug: string): Promise<string> => {
  if (UUID_RE.test(slug)) return slug;
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("company_slug_mappings");
    const map = stored ? JSON.parse(stored) : {};
    if (map[slug]) return map[slug];
  }
  try {
    const res = await fetch(`${getApiHost()}/apis/v3/auth/resolve-company/${slug}`);
    if (res.ok) return (await res.json()).id;
  } catch {
    /* ignore */
  }
  return slug;
};

// decimalPlaces defaults to 0 to preserve the original rounded-integer
// behavior for the many call sites that don't pass a company's configured
// Company.currency_decimal_places (Settings -> Document & Fields -> Number
// Format). Callers that already have the company/settings object in scope
// can pass it explicitly, e.g. fmtINR(amount, company.currency_decimal_places).
export const fmtINR = (
  n: number | undefined | null,
  decimalPlaces: number = 0
): string => {
  const value = n || 0;
  if (decimalPlaces <= 0) {
    return `₹${Math.round(value).toLocaleString("en-IN")}`;
  }
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  })}`;
};

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
