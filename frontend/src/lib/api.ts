export const getApiHost = (): string => {
  // Prefer an explicit, deploy-time environment variable so the backend host can
  // be changed without a code change + redeploy. Falls back to the previously
  // hardcoded production host when the var is unset, and keeps the localhost dev
  // fallback for local development.
  const envHost = process.env.NEXT_PUBLIC_API_URL;
  if (envHost && envHost.trim().length > 0) {
    return envHost.trim();
  }
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname !== "localhost" && hostname !== "127.0.0.1" && !hostname.startsWith("192.168.")) {
      return "https://construction-erp-backend-73vm.onrender.com";
    }
  }
  return "http://localhost:8000";
};

export async function readErrorDetail(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail) && data.detail[0]?.msg) return data.detail[0].msg;
    return res.statusText || `HTTP ${res.status}`;
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}

