"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getApiHost } from "@/lib/api";

if (typeof window !== "undefined") {
  if (!(window as any).__originalFetch) {
    (window as any).__originalFetch = window.fetch;
    window.fetch = function (input, init) {
      let url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : (input as Request).url;

      const isApiCall = url.includes("/apis/") || url.includes("localhost:8000") || url.includes("onrender.com");
      if (isApiCall && !url.includes("/resolve-company/")) {
        const stored = localStorage.getItem("company_slug_mappings");
        const slugMap = stored
          ? JSON.parse(stored)
          : { "demo-construction": "e0000000-0000-0000-0000-000000000000" };

        if (!slugMap["demo-construction"]) {
          slugMap["demo-construction"] = "e0000000-0000-0000-0000-000000000000";
        }

        for (const [slug, uuid] of Object.entries(slugMap)) {
          if (url.includes(slug)) {
            url = url.replaceAll(slug, uuid as string);
          }
        }
      }

      if (typeof input === "object" && !(input instanceof URL)) {
        const newRequest = new Request(url, input as Request);
        return (window as any).__originalFetch(newRequest, init);
      }
      return (window as any).__originalFetch(url, init);
    };
  }
}

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

  const [activeProjectId, setActiveProjectIdState] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const stored = localStorage.getItem("last_project_id") || "";
    // Never seed from the legacy placeholder id — it 403s every project-scoped
    // fetch and blocks the real project from ever being auto-selected.
    if (stored === FALLBACK_PROJECT_ID) {
      localStorage.removeItem("last_project_id");
      return "";
    }
    return stored;
  });
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
    const storedRaw =
      typeof window !== "undefined" ? localStorage.getItem("last_project_id") : null;
    // Ignore the legacy placeholder so nextProjectId can be empty -> the real
    // project gets auto-selected from the company project list below.
    const storedProjectId = storedRaw && storedRaw !== FALLBACK_PROJECT_ID ? storedRaw : null;
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
      setActiveProjectIdState(project.id || nextProjectId || "");
    };

    const resolve = async () => {
      let activeCompanyUuid = companyId;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId);
      if (!isUuid) {
        const stored = localStorage.getItem("company_slug_mappings");
        const slugMap = stored ? JSON.parse(stored) : {};
        if (slugMap[companyId]) {
          activeCompanyUuid = slugMap[companyId];
        } else {
          try {
            const res = await (window as any).__originalFetch(`${apiHost}/apis/v3/auth/resolve-company/${companyId}`);
            if (res.ok) {
              const data = await res.json();
              activeCompanyUuid = data.id;
              slugMap[companyId] = activeCompanyUuid;
              localStorage.setItem("company_slug_mappings", JSON.stringify(slugMap));
            }
          } catch (e) {
            console.error("Failed to resolve slug", e);
          }
        }
      }

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
