"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getApiHost } from "@/lib/api";

export type ProjectRecord = {
  id?: string;
  name?: string;
  project_name?: string;
  code?: string;
  project_code?: string;
};

export type ProjectContextValue = {
  activeProjectId: string;
  setActiveProjectId: (id: string) => void;
  projects: ProjectRecord[];
  projectContext: { name: string; code: string };
  loading: boolean;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

const FALLBACK_PROJECT_ID = "d0000000-0000-0000-0000-000000000001";

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();

  const [activeProjectId, setActiveProjectIdState] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("last_project_id") || "" : ""
  );
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [projectContext, setProjectContext] = useState<{ name: string; code: string }>({
    name: "Project Context",
    code: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const companyId =
      (params.company_id as string) || "e0000000-0000-0000-0000-000000000000";
    const routeProjectId = (params.project_id as string) || "";
    const storedProjectId =
      typeof window !== "undefined" ? localStorage.getItem("last_project_id") : null;
    const nextProjectId = routeProjectId || storedProjectId || "";

    const token =
      typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;
    const apiHost = getApiHost();

    const applyProject = (project: ProjectRecord) => {
      if (!isActive || !project) return;
      const resolvedName = project.name || project.project_name || "Active Project";
      const resolvedCode = project.code || project.project_code || "";
      setProjectContext({ name: resolvedName, code: resolvedCode });
      setActiveProjectIdState(
        project.id || nextProjectId || FALLBACK_PROJECT_ID
      );
    };

    const resolve = async () => {
      // Resolve the active project's details when we already know its id.
      if (nextProjectId && nextProjectId !== FALLBACK_PROJECT_ID) {
        if (typeof window !== "undefined") {
          localStorage.setItem("last_project_id", nextProjectId);
        }
        try {
          const res = await fetch(
            `${apiHost}/apis/v3/planning/projects/${nextProjectId}`,
            { headers: authHeaders }
          );
          if (res.ok) {
            applyProject(await res.json());
          }
        } catch {
          // Fall through to the company project list.
        }
      }

      // Fetch the full project list for the "Pinned Projects" dropdown.
      try {
        const res = await fetch(
          `${apiHost}/apis/v3/planning/projects?company_id=${companyId}`,
          { headers: authHeaders }
        );
        if (res.ok) {
          const data: unknown = await res.json();
          const payload = data as { data?: unknown; projects?: unknown };
          const list: ProjectRecord[] = Array.isArray(data)
            ? (data as ProjectRecord[])
            : Array.isArray(payload.data)
              ? (payload.data as ProjectRecord[])
              : Array.isArray(payload.projects)
                ? (payload.projects as ProjectRecord[])
                : [];
          if (isActive) setProjects(list);

          if (!nextProjectId) {
            const first = list.find((p) => p?.id);
            if (first) {
              if (typeof window !== "undefined") {
                localStorage.setItem("last_project_id", first.id ?? "");
              }
              applyProject(first);
            } else if (isActive) {
              setProjectContext({ name: "Project Context", code: "Unavailable" });
            }
          }
        } else if (isActive) {
          setProjectContext({ name: "Project Context", code: "Unavailable" });
        }
      } catch {
        if (isActive) {
          setProjectContext({ name: "Project Context", code: "Unavailable" });
        }
      } finally {
        if (isActive) setLoading(false);
      }
    };

    resolve();

    return () => {
      isActive = false;
    };
  }, [params.company_id, params.project_id]);

  const setActiveProjectId = (id: string) => {
    setActiveProjectIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("last_project_id", id);
    }
    // Update the displayed context immediately from the already-loaded list.
    const chosen = projects.find((p) => p.id === id);
    if (chosen) {
      setProjectContext({
        name: chosen.name || chosen.project_name || "Active Project",
        code: chosen.code || chosen.project_code || "",
      });
    }
  };

  return (
    <ProjectContext.Provider
      value={{ activeProjectId, setActiveProjectId, projects, projectContext, loading }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return ctx;
}
