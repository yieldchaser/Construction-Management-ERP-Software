export const DEMO_TENANT_ID = "e0000000-0000-0000-0000-000000000000";

export function isMissingOrDemoTenant(companyId: string | null | undefined): boolean {
  return !companyId || companyId === DEMO_TENANT_ID;
}

export function redirectToLogin(): void {
  if (typeof window !== "undefined") {
    window.location.replace("/login");
  }
}
