# Unified Layout & Routing Migration Plan — SiteFlow

> Goal: align SiteFlow's frontend with the competitor's single-shell model
> (`web.onsiteteams.com/c/{company-uuid}/d/{module}`). Today SiteFlow mixes
> URL-driven project context (`/c/[company_id]/p/[project_id]/[module]`) with a
> company dashboard that uses a local-state dropdown, and ~30 project pages render
> their OWN custom `<aside>` sidebars. This causes the "two layout modes" shift the
> user experiences when clicking "← Dashboard". This plan removes that split.

## 0. Principles
1. **One persistent shell.** A single global `Sidebar` + `PageHeader` wraps every module. No page renders its own `<aside>`.
2. **Project context is state, not URL.** The active project lives in a React context + `localStorage`, never in the path. The "Pinned Projects" dropdown switches it and the current view re-fetches — no layout remount.
3. **Preserve deep links.** Old `/p/[project_id]/...` URLs redirect to the new `/d/...` scheme.

## 1. Current state (verified by reading the code)
- `frontend/src/components/Sidebar.tsx` exists, is `"use client"`, and already resolves
  project context: it reads `params.project_id` (or `localStorage.last_project_id`), calls
  `GET /apis/v3/planning/projects` + `/apis/v3/planning/projects/{id}`, and exposes
  `projectId` / `projectContext` as **local component state** (not shared).
- `frontend/src/app/c/[company_id]/d/layout.tsx` renders `<Sidebar />` + `<PageHeader />` and
  currently only wraps the company `d/*` pages (home, library, team-action, todo,
  payment-approval, delete-logs).
- **~30 project pages under `frontend/src/app/c/[company_id]/p/[project_id]/` render their own
  `<aside>` sidebar** (each containing a "← Dashboard" link back to `/c/[company_id]/dashboard`),
  e.g.: `finance/page.tsx`, `hr/page.tsx`, `attendance/page.tsx`, `crm/page.tsx`,
  `procurement/page.tsx`, `procurement/rfq/page.tsx`, `dpr/page.tsx`, `equipment/page.tsx`,
  `mom/page.tsx`, `quality/page.tsx`, `production/page.tsx`, `planning/gantt/page.tsx`,
  `towers/page.tsx`, `subcon/page.tsx`, `subcon/work-orders/amendments/page.tsx`,
  `subcon/scorecards/page.tsx`, `reports/page.tsx`, `reports/calculators/page.tsx`,
  `labour/page.tsx`, `drawings/page.tsx`, `budgeting/boq/page.tsx`, `billing/page.tsx`,
  `budget/page.tsx`, `statutory/page.tsx`, `safety/page.tsx`, `wastage/page.tsx`,
  `three-way/page.tsx`, `face-recognition/page.tsx`, `depreciation/page.tsx`,
  `custom-fields/page.tsx`, `vendor-performance/page.tsx`, `chat/page.tsx`.
- `finance/page.tsx` is the canonical example of page-specific sub-nav: its `<aside>` drives
  `tab` state for Ledger / Party-wise Ledgers / Payment Requests / Company Cash & Bank Accounts /
  Cash Book / Project P&L / Tally Sync / Cost Variance (lines ~643–665). These must become
  **top horizontal sub-tabs**, not a left sidebar.

## 2. Target URL scheme
| Before | After |
| :--- | :--- |
| `/c/[company_id]/p/[project_id]/finance` | `/c/[company_id]/d/finance` |
| `/c/[company_id]/p/[project_id]/hr` | `/c/[company_id]/d/hr` |
| `/c/[company_id]/p/[project_id]/attendance` | `/c/[company_id]/d/attendance` |
| `/c/[company_id]/p/[project_id]/crm` | `/c/[company_id]/d/crm` |
| `/c/[company_id]/p/[project_id]/[module]` | `/c/[company_id]/d/[module]` |
| `/c/[company_id]/p/[project_id]/[module]/[sub]` (rfq, boq, work-orders/amendments, calculators) | `/c/[company_id]/d/[module]/[sub]` |
| `/c/[company_id]/p/[project_id]/reports` + `/c/[company_id]/reports` | `/c/[company_id]/d/report-list` (hub) |
| report view | `/c/[company_id]/d/report-list/{slug}` (mirrors competitor `/d/report-list/onsite-report/{slug}`) |

Company-only pages that do not need a project (`/c/[company_id]/dashboard`,
`/c/[company_id]/settings`, `/c/[company_id]/analytics`) stay at the company level but MUST also
render inside the same global shell (see §3).

## 3. Unified shell + Global Project Context
Place the `ProjectContext` provider and the single shell in
`frontend/src/app/c/[company_id]/layout.tsx` (the correct Next.js location that wraps **every**
company page with one persistent `Sidebar`). `d/layout.tsx` then becomes redundant and can be
deleted. (If you strictly keep `d/layout.tsx` as the shell, then the company-only pages above
must also be nested under `/d/` so the layout wraps them.)

`c/[company_id]/layout.tsx` (sketch):
```tsx
"use client";
import { ProjectProvider } from "@/context/ProjectContext";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProjectProvider>
      <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
        <Sidebar />
        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          <PageHeader title={/* derive from pathname */ ""} />
          <div className="flex-1 overflow-hidden relative flex flex-col">{children}</div>
        </main>
      </div>
    </ProjectProvider>
  );
}
```

`frontend/src/context/ProjectContext.tsx` (sketch):
```tsx
"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

type Ctx = {
  activeProjectId: string;
  setActiveProjectId: (id: string) => void;
  projectContext: { name: string; code: string };
  projects: any[];
  loading: boolean;
};
const ProjectContext = createContext<Ctx | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [activeProjectId, setActiveProjectIdState] = useState(
    () => (typeof window !== "undefined" ? localStorage.getItem("last_project_id") || "" : "")
  );
  const [projectContext, setProjectContext] = useState({ name: "Project Context", code: "" });
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // fetch company project list + resolve active project (logic already exists in Sidebar.tsx today)
  useEffect(() => { /* GET /apis/v3/planning/projects?company_id=... ; set projects; resolve activeProjectId */ }, []);

  const setActiveProjectId = (id: string) => {
    setActiveProjectIdState(id);
    if (typeof window !== "undefined") localStorage.setItem("last_project_id", id);
  };

  return (
    <ProjectContext.Provider value={{ activeProjectId, setActiveProjectId, projectContext, projects, loading }}>
      {children}
    </ProjectContext.Provider>
  );
}
export const useProject = () => {
  const c = useContext(ProjectContext);
  if (!c) throw new Error("useProject must be used within ProjectProvider");
  return c;
};
```

## 4. Sidebar "Pinned Projects" dropdown
In `frontend/src/components/Sidebar.tsx`, replace the current static `projectContext` display with a
dropdown sourced from `useProject().projects`, selected on `useProject().activeProjectId`,
`onChange → useProject().setActiveProjectId(...)`. This re-renders context; every page subscribed via
`useProject()` re-fetches. Remove the local project-resolution `useEffect` from `Sidebar.tsx`
(it moves into the provider). Keep the existing nav items but repoint them (see §6).

Dropdown sketch (inside Sidebar, above the nav list):
```tsx
const { activeProjectId, setActiveProjectId, projects, projectContext } = useProject();
// ...
<select
  value={activeProjectId}
  onChange={(e) => setActiveProjectId(e.target.value)}
  className="..."
>
  {projects.map((p) => (
    <option key={p.id} value={p.id}>{p.project_name || p.name}</option>
  ))}
</select>
```

## 5. Eliminate custom sidebars & convert sub-nav to top tabs
For each `p/[project_id]/[module]/page.tsx`:
1. Delete the entire `<aside>…</aside>` block and its "← Dashboard" / "← Project Dashboard" `<Link>`.
2. The page now renders **only its main panel** inside the global shell.
3. Move page-specific nav into a horizontal tab row at the top of the main panel.
   `finance/page.tsx` already uses a `tab` state — keep it, just render the tab buttons as a
   top toolbar (Ledger / Party / Cash Book / Accounts / P&L / Tally / Cost Variance) instead of a
   left `<aside>`. Same pattern for `crm`, `production`, `subcon/*`, etc.
4. Replace `const { project_id } = useParams()` with `const { activeProjectId } = useProject();`.
5. Update every `fetch(...)` that used `project_id` to use `activeProjectId`.

## 6. Internal link updates
- `Sidebar.tsx` nav items: change `href={`/c/${companyId}/p/${projectId}/finance`}` →
  `href={`/c/${companyId}/d/finance`}` (and same for hr, crm, procurement, dpr, planning,
  production, equipment, quality, attendance, towers, subcon, labour, drawings, budgeting, billing,
  budget, statutory, safety, wastage, three-way, face-recognition, depreciation, custom-fields,
  vendor-performance, chat, mom, reports → `/d/reports` etc.). The `projectId` is no longer in the
  URL — derive it from `useProject()` when needed.
- The MOM / Chat links fixed in a prior session currently point to
  `/c/[company_id]/p/[project_id]/mom` and `/chat` → repoint MOM to `/c/[company_id]/d/mom`.
- Remove the now-dead "← Dashboard" links from every migrated page (the global shell already
  provides navigation; if a "back to hub" affordance is wanted, use a normal `<Link>` to
  `/c/[company_id]/d/home` that does NOT unmount the shell).

## 7. URL migration & redirects (preserve bookmarks)
- Physically move files: `app/c/[company_id]/p/[project_id]/[module]/page.tsx` →
  `app/c/[company_id]/d/[module]/page.tsx` (and sub-routes like `rfq`, `boq`,
  `work-orders/amendments`, `calculators`).
- Keep a thin legacy redirect at the old location so old URLs/bookmarks keep working:
  ```tsx
  // app/c/[company_id]/p/[project_id]/[module]/page.tsx
  import { redirect } from "next/navigation";
  export default function LegacyRedirect({ params }: { params: { company_id: string; project_id: string; module: string } }) {
    redirect(`/c/${params.company_id}/d/${params.module}`);
  }
  ```
  (Do this for each migrated module; once everything is verified, the `p/[project_id]` tree can be
  deleted.)
- Reports: move `p/[project_id]/reports` + company `reports` into `/d/report-list`; update
  `reports/page.tsx`, `reports/[slug]/page.tsx`, `dpr/page.tsx`, `item-wise-sales/page.tsx` hrefs to
  `/c/[company_id]/d/report-list` and `/c/[company_id]/d/report-list/{slug}`.

## 8. Inventory of files to change (summary)
- NEW: `app/c/[company_id]/layout.tsx`, `context/ProjectContext.tsx`.
- MODIFY: `components/Sidebar.tsx` (dropdown + consume context, drop local resolution),
  `app/c/[company_id]/d/layout.tsx` (delete — subsumed), every `p/[project_id]/[module]/page.tsx`
  (remove `<aside>`, use `useProject()`, top tabs), `reports/page.tsx`, `reports/[slug]/page.tsx`,
  `dpr/page.tsx`, `item-wise-sales/page.tsx`.
- LINK UPDATES: Sidebar nav, MOM/Chat links, any remains of `← Dashboard`.
- REDIRECTS: legacy `p/[project_id]/[module]/page.tsx` stubs.

## 9. Phasing (recommended — keep blast radius small)
- **Phase 0 — scaffold:** add `context/ProjectContext.tsx` + `c/[company_id]/layout.tsx` (shell).
  Keep `d/layout.tsx` temporarily.
- **Phase 1 — pilot (Finance):** move `p/[project_id]/finance` → `d/finance`; remove its `<aside>`;
  convert Ledger/Party/Cash Book tabs to top tabs; wire `useProject()`; update Sidebar nav; add
  legacy redirect. Manually verify: single shell, dropdown re-fetches Finance, no layout shift,
  back/forward stays in shell.
- **Phase 2 — roll out** remaining modules in batches (HR, Attendance, CRM, Procurement, DPR,
  Equipment, Production, Quality, Planning/Gantt, Towers, Subcon/*, Reports, Labour, Drawings,
  Budgeting, Billing, Budget, Statutory, Safety, Wastage, Three-way, Face-recognition,
  Depreciation, Custom-fields, Vendor-performance, Chat, MOM).
- **Phase 3 — cleanup:** delete `d/layout.tsx` and the legacy `p/[project_id]` tree once all
  redirects are confirmed.
- **Phase 4 (optional):** normalize the stray `/d/` inconsistency for the remaining company pages
  (dashboard/library/home/team-action/todo/payment-approval/delete-logs) so the whole workspace
  shares one consistent scheme.

## 10. Verification & acceptance
- `cd frontend && npx tsc --noEmit --skipLibCheck` and `npm run build` pass.
- Manual: log in → land on reports hub → open Finance → use "Pinned Projects" dropdown → the
  current view re-fetches, **the sidebar/layout does NOT remount**, the URL stays
  `/c/[company_id]/d/finance`.
- Browser back/forward stays within the single shell (no layout shift).
- Old `/c/[company_id]/p/[project_id]/finance` URL 308-redirects to `/c/[company_id]/d/finance`.
- No `<aside>` elements remain in any module page; every module shows the one global `Sidebar`.

## 11. Risks
- **Large blast radius** → mitigated by phasing + pilot first; redirects preserve deep links.
- **SSR/initial render** → all affected pages are already `"use client"`; reading project from
  context (client) is safe. Guard `typeof window` for `localStorage`.
- **Pages that read `project_id` from `useParams()` in many places** → mechanical but must be
  exhaustive; a grep for `params.project_id` / `useParams()` across `p/[project_id]` before/after
  each batch catches leftovers.
