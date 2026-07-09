"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { getApi, authHeaders } from "@/lib/siteflow";
import { useProject } from "@/context/ProjectContext";

const TABS = [
  { label: "Dashboard", slug: "dashboard" },
  { label: "BOQ", slug: "boq" },
  { label: "Party", slug: "party" },
  { label: "Transaction", slug: "transaction" },
  { label: "To Do", slug: "todo" },
  { label: "Task", slug: "task" },
  { label: "Attendance", slug: "attendance" },
  { label: "Material", slug: "material" },
  { label: "Subcon", slug: "subcon" },
  { label: "Files", slug: "files" },
  { label: "MOM", slug: "mom" },
  { label: "Equipment", slug: "equipment" },
  { label: "Inspection", slug: "quality" },
];

const STATUSES = ["Ongoing", "Completed", "On Hold", "Cancelled", "Planning"];

type ProjectInfo = {
  id: string;
  name: string;
  code?: string | null;
  status: string;
};

export default function ProjectDetailLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const companyId = params.company_id as string;
  const projectId = params.project_id as string;

  const { projects, setActiveProjectId } = useProject();

  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [status, setStatus] = useState("Ongoing");
  const [savingStatus, setSavingStatus] = useState(false);

  const base = `/c/${companyId}/p/${projectId}`;
  const currentSlug =
    TABS.find((t) => pathname === `${base}/${t.slug}`)?.slug || "dashboard";

  const load = useCallback(async () => {
    try {
      const res = await fetch(getApi(`/projects/${projectId}`), { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setProject({
          id: data.id,
          name: data.name,
          code: data.code,
          status: data.status || "Ongoing",
        });
        setStatus(data.status || "Ongoing");
      }
    } catch {
      /* ignore */
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const onSwitchProject = (nextId: string) => {
    setActiveProjectId(nextId);
    router.push(`/c/${companyId}/p/${nextId}/${currentSlug}`);
  };

  const onStatusChange = async (next: string) => {
    setStatus(next);
    setSavingStatus(true);
    try {
      await fetch(getApi(`/projects/${projectId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({ status: next }),
      });
      setProject((p) => (p ? { ...p, status: next } : p));
      load();
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Project header: name + switcher + status */}
      <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b border-border-custom bg-card">
        <div className="min-w-0">
          <div className="text-base font-semibold text-foreground truncate">
            {project?.name || "Project"}
            {project?.code ? <span className="ml-2 text-xs font-normal text-muted">({project.code})</span> : null}
          </div>
          <div className="text-[11px] uppercase tracking-wider text-muted">Project</div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <select
            value={projectId}
            onChange={(e) => onSwitchProject(e.target.value)}
            className="rounded-md border border-border-custom bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary cursor-pointer"
          >
            {projects.length === 0 && <option value={projectId}>Switch Project…</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_name || p.name}
                {p.project_code || p.code ? ` (${p.project_code || p.code})` : ""}
              </option>
            ))}
          </select>

          <select
            value={status}
            disabled={savingStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="rounded-md border border-border-custom bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary cursor-pointer disabled:opacity-50"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 11-sub-tab nav bar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border-custom bg-background/40 overflow-x-auto">
        {TABS.map((t) => {
          const href = `${base}/${t.slug}`;
          const active = pathname === href;
          return (
            <Link
              key={t.slug}
              href={href}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted hover:text-foreground hover:bg-elevated"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
