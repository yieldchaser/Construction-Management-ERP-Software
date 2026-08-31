"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getApiHost } from "@/lib/api";
import { authHeaders } from "@/lib/siteflow";
import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/PageHeader";
import SegmentedTabs from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import Icon from "@/components/marketing/Icon";

interface Project {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  name: string;
}

interface ToDoItem {
  id: string;
  title: string;
  due_date: string;
  assigned_to: string;
  project_name: string;
  type: string;
  is_completed: boolean;
}

export default function ToDoPage() {
  const params = useParams();
  const companyId = params.company_id as string;
  const accessToken = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";

  const [todos, setTodos] = useState<ToDoItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [filterStatus, setFilterStatus] = useState<"pending" | "completed">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [loadError, setLoadError] = useState(false);

  // New To Do drawer state
  const [isNewTodoOpen, setIsNewTodoOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [newAssignedId, setNewAssignedId] = useState("");
  const [newProjectId, setNewProjectId] = useState("");
  const [newType, setNewType] = useState("General");

  const apiHost = getApiHost();

  const projectMap = React.useMemo(() => {
    const m: Record<string, string> = {};
    projects.forEach((p) => (m[p.id] = p.name));
    return m;
  }, [projects]);

  const teamMap = React.useMemo(() => {
    const m: Record<string, string> = {};
    teamMembers.forEach((t) => (m[t.id] = t.name));
    return m;
  }, [teamMembers]);

  const fetchTodos = async () => {
    if (!companyId || !accessToken) return;
    try {
      const res = await fetch(`${apiHost}/apis/v3/todos/company/${companyId}`, {
        headers: { ...(authHeaders() || {}) },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const mapped: ToDoItem[] = (data || []).map((t: any) => {
        const assigneeIds: string[] = t.assignee_ids || [];
        const assignedTo = assigneeIds
          .map((id: string) => teamMap[id] || "Unassigned")
          .filter((name: string, idx: number, arr: string[]) => name !== "Unassigned" || arr.length === 1)
          .join(", ");
        return {
          id: t.id,
          title: t.title,
          due_date: t.due_date ? t.due_date.split("T")[0] : "",
          assigned_to: assignedTo || "Unassigned",
          project_name: t.project_id ? (projectMap[t.project_id] ?? "") : "",
          type: t.type || "—",
          is_completed: t.status === "done",
        };
      });
      setTodos(mapped);
      setLoadError(false);
    } catch (err) {
      console.error("Failed to fetch todos", err);
      setLoadError(true);
    }
  };

  useEffect(() => {
    const fetchProjects = async () => {
      if (!companyId || !accessToken) return;
      try {
        const res = await fetch(`${apiHost}/apis/v3/planning/projects?company_id=${companyId}`, {
          headers: { ...(authHeaders() || {}) },
        });
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
          if (data.length > 0 && !newProjectId) {
            setNewProjectId(data[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    const fetchTeam = async () => {
      if (!companyId || !accessToken) return;
      try {
        const res = await fetch(`${apiHost}/apis/v3/crm/team-members/${companyId}`, {
          headers: { ...(authHeaders() || {}) },
        });
        if (res.ok) {
          setTeamMembers(await res.json());
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchProjects();
    fetchTeam();
  }, [companyId, accessToken]);

  useEffect(() => {
    fetchTodos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, accessToken, projectMap, teamMap]);

  const handleToggleTodo = async (t: ToDoItem) => {
    const next = t.is_completed ? "pending" : "done";
    try {
      const res = await fetch(`${apiHost}/apis/v3/todos/${t.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to update task: ${typeof err.detail === "string" ? err.detail : `HTTP ${res.status}`}`);
        return;
      }
      fetchTodos();
    } catch (e) {
      console.error("Failed to update task", e);
      alert("Failed to update task. Check your connection.");
    }
  };

  const handleDeleteTodo = async (id: string) => {
    try {
      const res = await fetch(`${apiHost}/apis/v3/todos/${id}`, {
        method: "DELETE",
        headers: authHeaders() || {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to delete task: ${typeof err.detail === "string" ? err.detail : `HTTP ${res.status}`}`);
        return;
      }
      fetchTodos();
    } catch (e) {
      console.error("Failed to delete task", e);
      alert("Failed to delete task. Check your connection.");
    }
  };

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const payload: any = {
      company_id: companyId,
      title: newTitle.trim(),
      due_date: newDueDate,
      type: newType,
      assignee_ids: newAssignedId ? [newAssignedId] : [],
    };
    if (newProjectId) payload.project_id = newProjectId;

    try {
      const res = await fetch(`${apiHost}/apis/v3/todos/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to create task: ${typeof err.detail === "string" ? err.detail : `HTTP ${res.status}`}`);
        return;
      }
      await fetchTodos();
      setIsNewTodoOpen(false);
      setNewTitle("");
      setNewAssignedId("");
    } catch (e) {
      console.error("Failed to create todo", e);
      alert("Failed to create task. Check your connection.");
    }
  };

  const filteredTodos = todos.filter((t) => {
    const matchesStatus = filterStatus === "completed" ? t.is_completed : !t.is_completed;
    const matchesType = filterType === "All" || t.type === filterType;
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.project_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="To Do"
        subtitle="Assign, track, and complete daily tasks for site coordination."
      >
        <button
          onClick={() => setIsNewTodoOpen(true)}
          className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-md text-xs font-medium transition-all cursor-pointer"
        >
          + New To Do
        </button>
      </PageHeader>
      <div className="flex-1 overflow-y-auto">
        <PageShell width="wide">
          <div className="space-y-6">

          {loadError && (
            <div className="rounded-md border border-warning/20 bg-warning/10 text-warning text-xs px-4 py-2">
              Could not load tasks from the server. Retry once the connection is restored.
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6">
            <SegmentedTabs
              tabs={[
                { id: "pending", label: "Pending" },
                { id: "completed", label: "Completed" },
              ]}
              activeTab={filterStatus}
              onChange={(t) => setFilterStatus(t as any)}
            />

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input-field px-3 py-2 text-xs font-semibold focus:outline-none"
          >
            <option value="All">All Types</option>
            <option value="General">General</option>
            <option value="Payment">Payment</option>
            <option value="Quality Check">Quality Check</option>
            <option value="Attendance">Attendance</option>
          </select>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search todo title..."
            className="input-field px-4 py-2 text-xs font-semibold focus:outline-none placeholder-muted w-full md:w-60"
          />
        </div>
      </div>

      {/* Table grid */}
      <div className="rounded-lg border border-border-custom bg-card overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border-custom text-muted font-semibold uppercase tracking-wider bg-background/50">
              <th className="px-5 py-3 w-12 text-center">Status</th>
              <th className="px-5 py-3">Item Name</th>
              <th className="px-5 py-3">Due Date</th>
              <th className="px-5 py-3">Assigned To</th>
              <th className="px-5 py-3">Project</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-custom">
            {filteredTodos.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8">
                  <EmptyState
                    title="No tasks found"
                    description={todos.length === 0 ? "Get started by adding your first to do item." : "No tasks match the current filter."}
                    action={todos.length === 0 ? { label: "New To Do", onClick: () => setIsNewTodoOpen(true) } : undefined}
                  />
                </td>
              </tr>
            ) : (
              filteredTodos.map((t) => (
                <tr key={t.id} className="hover:bg-elevated/20 transition-colors border-b border-border-custom last:border-b-0">
                  <td className="px-5 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={t.is_completed}
                      onChange={() => handleToggleTodo(t)}
                      className="h-4.5 w-4.5 rounded border-white/20 bg-transparent text-primary focus:ring-primary/20 accent-primary cursor-pointer"
                    />
                  </td>
                  <td className={`px-6 py-4 font-semibold text-foreground ${t.is_completed ? "line-through text-muted" : ""}`}>
                    {t.title}
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {t.due_date ? new Date(t.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-5 py-3 text-muted font-medium">{t.assigned_to}</td>
                  <td className="px-5 py-3 text-muted font-semibold">{t.project_name || "—"}</td>
                  <td className="px-5 py-3">
                    <span className="bg-white/5 border border-border-custom text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded text-foreground">
                      {t.type}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => handleDeleteTodo(t.id)}
                      className="px-2.5 py-1 bg-elevated hover:bg-elevated/80 border border-border-custom text-foreground text-xs font-medium rounded transition-all cursor-pointer"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New To Do Drawer Modal */}
      {isNewTodoOpen && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-card border border-border-custom rounded-lg overflow-hidden shadow-lg animate-in fade-in zoom-in-95 duration-150 relative">
            <div className="p-6 border-b border-border-custom flex justify-between items-center">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Add New To Do</h3>
              <button onClick={() => setIsNewTodoOpen(false)} className="text-muted hover:text-foreground cursor-pointer"><Icon name="close" className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateTodo} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Item Name *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Send material invoice to client"
                  className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Assigned To</label>
                <select
                  value={newAssignedId}
                  onChange={(e) => setNewAssignedId(e.target.value)}
                  className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Project</label>
                  <select
                    value={newProjectId}
                    onChange={(e) => setNewProjectId(e.target.value)}
                    className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="">No project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="General">General</option>
                    <option value="Payment">Payment</option>
                    <option value="Quality Check">Quality Check</option>
                    <option value="Attendance">Attendance</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-primary hover:bg-primary-hover text-white font-medium text-sm rounded-md transition-all mt-4 cursor-pointer"
              >
                Save To Do
              </button>
            </form>
          </div>
        </div>
      )}
          </div>
        </PageShell>
      </div>
    </div>
  );
}