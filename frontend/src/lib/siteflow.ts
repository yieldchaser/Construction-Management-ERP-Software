import { getApiHost } from "@/lib/api";

export const getApi = (path: string): string =>
  `${getApiHost()}/apis/v3${path}`;

export const authHeaders = (): Record<string, string> | undefined => {
  if (typeof window === "undefined") return undefined;
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : undefined;
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

export const fmtINR = (n: number | undefined | null): string =>
  `₹${Math.round(n || 0).toLocaleString("en-IN")}`;

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
