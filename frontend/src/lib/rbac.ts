// Frontend mirror of backend/app/permissions.py — the canonical RBAC taxonomy.
// Kept in sync with the backend: any change to MODULES / ACTIONS / globals there
// must be reflected here so the permission-matrix editor renders the same keys
// the backend validates against (ALL_PERMISSION_KEYS).

export const SUPERUSER_KEY = "all";

export const MODULES = [
  "dashboard",
  "projects",
  "finance",
  "billing",
  "procurement",
  "budgeting",
  "payroll",
  "attendance",
  "crm",
  "library",
  "production",
  "quality",
  "safety",
  "drawings",
  "equipment",
  "reports",
  "planning",
  "subcontractor",
] as const;

export type ModuleKey = (typeof MODULES)[number];

// Modules that support a workflow `approve` action (in addition to view/edit).
// R2-172: kept in lockstep with backend WORKFLOW_MODULES - a stored key absent
// from this list is dropped from the draft and silently revoked on save.
export const WORKFLOW_MODULES: ReadonlySet<string> = new Set([
  "finance",
  "billing",
  "procurement",
  "budgeting",
  "payroll",
  "attendance",
  "drawings",
  "reports",
  "subcontractor",
  "projects",
  "crm",
  "production",
  "quality",
  "safety",
  "equipment",
  "planning",
]);

// Cross-cutting high-risk capabilities (not tied to a single module's CRUD).
export const GLOBAL_CAPABILITY_KEYS = [
  "settings:manage", // company config, roles, approval rules, branches
  "team:manage", // add/remove members, assign roles
  "payroll:run", // run payroll
  "data:delete", // destructive deletes across modules
] as const;

// Display labels for the sidebar / matrix.
export const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  projects: "Projects",
  finance: "Finance",
  billing: "Billing",
  procurement: "Procurement",
  budgeting: "Budgeting",
  payroll: "Payroll",
  attendance: "Attendance",
  crm: "CRM",
  library: "Library",
  production: "Production",
  quality: "Quality",
  safety: "Safety",
  drawings: "Drawings",
  equipment: "Equipment",
  reports: "Reports",
  planning: "Planning",
  subcontractor: "Subcontractor",
};

export const ACTION_LABELS: Record<string, string> = {
  view: "View",
  edit: "Edit",
  approve: "Approve",
};

export const GLOBAL_CAPABILITY_LABELS: Record<string, string> = {
  "settings:manage": "Settings — manage company config, roles, branches",
  "team:manage": "Team — add / remove members, assign roles",
  "payroll:run": "Payroll — run payroll",
  "data:delete": "Data — destructive deletes across modules",
};

// Roles that are locked to full access and may never be restricted (mirrors
// backend _LOCKED_ROLES).
export const LOCKED_ROLES: ReadonlySet<string> = new Set(["Owner", "Admin"]);

// Canonical ordered key list (superuser first, then module:action, then globals).
const KEYS: string[] = [SUPERUSER_KEY];
for (const m of MODULES) {
  KEYS.push(`${m}:view`);
  KEYS.push(`${m}:edit`);
  if (WORKFLOW_MODULES.has(m)) KEYS.push(`${m}:approve`);
}
for (const g of GLOBAL_CAPABILITY_KEYS) KEYS.push(g);

export const ALL_PERMISSION_KEYS: string[] = KEYS;
export const ALL_PERMISSION_KEY_SET: ReadonlySet<string> = new Set(KEYS);

export type PermissionDict = Record<string, boolean>;

/** True if the caller is a superuser (`all`) or explicitly holds `key`. */
export function hasPermission(
  perms: PermissionDict | null | undefined,
  key: string
): boolean {
  if (!perms) return false;
  if (perms[SUPERUSER_KEY] === true) return true;
  return perms[key] === true;
}

// Per-module action rows for the matrix editor.
export interface MatrixRow {
  key: string;
  module: string;
  action: "view" | "edit" | "approve";
}

export const MATRIX_ROWS: MatrixRow[] = MODULES.flatMap((m) => {
  const rows: MatrixRow[] = [{ key: `${m}:view`, module: m, action: "view" }];
  rows.push({ key: `${m}:edit`, module: m, action: "edit" });
  if (WORKFLOW_MODULES.has(m))
    rows.push({ key: `${m}:approve`, module: m, action: "approve" });
  return rows;
});

/** Build a normalized permission dict for a custom role (read-only by default). */
export function defaultViewPermissions(): PermissionDict {
  const d: PermissionDict = {};
  for (const m of MODULES) d[`${m}:view`] = true;
  return d;
}
