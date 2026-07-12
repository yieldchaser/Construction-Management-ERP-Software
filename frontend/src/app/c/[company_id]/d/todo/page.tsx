"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getApiHost } from "@/lib/api";
import { authHeaders } from "@/lib/siteflow";

interface Project {
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

const DEFAULT_TODOS: ToDoItem[] = [
  {
    id: "todo-1",
    title: "Collect client payment for Milestone 2",
    due_date: "2026-07-15",
    assigned_to: "Ramesh Kumar (Project Manager)",
    project_name: "Skyline Towers",
    type: "Payment",
    is_completed: false
  },
  {
    id: "todo-2",
    title: "Approve concrete test results report",
    due_date: "2026-07-10",
    assigned_to: "Suresh Patil (QC Lead)",
    project_name: "Skyline Towers",
    type: "Quality Check",
    is_completed: false
  },
  {
    id: "todo-3",
    title: "Verify labor attendance logs",
    due_date: "2026-07-08",
    assigned_to: "Vikas Sharma (Site Supervisor)",
    project_name: "Metro Line Extension",
    type: "Attendance",
    is_completed: false
  }
];

export default function ToDoPage() {
  const params = useParams();
  const companyId = params.company_id as string;
  const accessToken = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";

  const [todos, setTodos] = useState<ToDoItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filterStatus, setFilterStatus] = useState<"pending" | "completed">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All");

  // New To Do drawer state
  const [isNewTodoOpen, setIsNewTodoOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [newAssigned, setNewAssigned] = useState("Ramesh Kumar");
  const [newProject, setNewProject] = useState("Skyline Towers");
  const [newType, setNewType] = useState("General");

  // Repeat Settings Modal State
  const [isRepeatModalOpen, setIsRepeatModalOpen] = useState(false);
  const [repeatType, setRepeatType] = useState<"weekdays" | "everyday" | "monthdays">("weekdays");
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>(["W"]);
  const [endsOption, setEndsOption] = useState<"6months" | "date">("6months");
  const [endsDate, setEndsDate] = useState("2026-12-05");

  const apiHost = getApiHost();

  useEffect(() => {
    // Read from localStorage or set defaults
    const cached = localStorage.getItem(`todos_${companyId}`);
    if (cached) {
      setTodos(JSON.parse(cached));
    } else {
      setTodos(DEFAULT_TODOS);
      localStorage.setItem(`todos_${companyId}`, JSON.stringify(DEFAULT_TODOS));
    }

    // Fetch projects for dropdown
    const fetchProjects = async () => {
      if (!companyId || !accessToken) return;
      try {
        const res = await fetch(`${apiHost}/apis/v3/planning/projects?company_id=${companyId}`, {
          headers: { ...(authHeaders() || {}) }
        });
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
          if (data.length > 0) {
            setNewProject(data[0].name);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchProjects();
  }, [companyId, accessToken]);

  const updateTodosInStateAndCache = (updatedList: ToDoItem[]) => {
    setTodos(updatedList);
    localStorage.setItem(`todos_${companyId}`, JSON.stringify(updatedList));
  };

  const handleToggleTodo = (id: string) => {
    const updated = todos.map((t) => {
      if (t.id === id) {
        return { ...t, is_completed: !t.is_completed };
      }
      return t;
    });
    updateTodosInStateAndCache(updated);
  };

  const handleDeleteTodo = (id: string) => {
    const updated = todos.filter((t) => t.id !== id);
    updateTodosInStateAndCache(updated);
  };

  const handleCreateTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: ToDoItem = {
      id: `todo-${Date.now()}`,
      title: newTitle,
      due_date: newDueDate,
      assigned_to: newAssigned,
      project_name: newProject,
      type: newType,
      is_completed: false
    };

    updateTodosInStateAndCache([...todos, newItem]);
    setIsNewTodoOpen(false);
    setNewTitle("");
  };

  const filteredTodos = todos.filter((t) => {
    const matchesStatus = filterStatus === "completed" ? t.is_completed : !t.is_completed;
    const matchesType = filterType === "All" || t.type === filterType;
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.project_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6 relative">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-base font-semibold text-foreground">To Do</h1>
          <p className="text-xs text-muted mt-1">Assign, track, and complete daily tasks for site coordination.</p>
        </div>

        <button
          onClick={() => setIsNewTodoOpen(true)}
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-md text-xs font-medium shadow-sm transition-all cursor-pointer"
        >
          + New To Do
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus("pending")}
            className={`px-4 py-2 text-xs font-bold rounded-md border transition-all cursor-pointer ${
              filterStatus === "pending"
                ? "bg-primary border-primary text-white"
                : "bg-elevated border-border-custom text-muted hover:text-foreground"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilterStatus("completed")}
            className={`px-4 py-2 text-xs font-bold rounded-md border transition-all cursor-pointer ${
              filterStatus === "completed"
                ? "bg-primary border-primary text-white"
                : "bg-elevated border-border-custom text-muted hover:text-foreground"
            }`}
          >
            Completed
          </button>
        </div>

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
                <td colSpan={7} className="px-6 py-12 text-center text-muted font-semibold">
                  No tasks found in list. Click "+ New To Do" to add one.
                </td>
              </tr>
            ) : (
              filteredTodos.map((t) => (
                <tr key={t.id} className="hover:bg-elevated/20 transition-colors border-b border-border-custom last:border-b-0">
                  <td className="px-5 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={t.is_completed}
                      onChange={() => handleToggleTodo(t.id)}
                      className="h-4.5 w-4.5 rounded border-white/20 bg-transparent text-primary focus:ring-primary/20 accent-primary cursor-pointer"
                    />
                  </td>
                  <td className={`px-6 py-4 font-semibold text-foreground ${t.is_completed ? "line-through text-muted" : ""}`}>
                    {t.title}
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {new Date(t.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-5 py-3 text-muted font-medium">{t.assigned_to}</td>
                  <td className="px-5 py-3 text-muted font-semibold">{t.project_name}</td>
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
              <button onClick={() => setIsNewTodoOpen(false)} className="text-muted hover:text-foreground font-bold">×</button>
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
                <input
                  type="text"
                  value={newAssigned}
                  onChange={(e) => setNewAssigned(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Project</label>
                  <select
                    value={newProject}
                    onChange={(e) => setNewProject(e.target.value)}
                    className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                    {projects.length === 0 && <option value="Skyline Towers">Skyline Towers</option>}
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

              {/* Repeat Settings Trigger */}
              <div className="pt-2 flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted block">Repeat Status</span>
                  <span className="text-[10px] text-primary font-bold">
                    {repeatType === "weekdays" ? `Every ${selectedWeekdays.join(", ")}` : repeatType === "everyday" ? "Daily task" : "Monthly task"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRepeatModalOpen(true)}
                  className="px-3 py-1 bg-elevated border border-border-custom hover:bg-elevated/80 text-foreground text-xs font-semibold rounded-lg transition-all"
                >
                  ⚙️ Repeat Settings
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-primary hover:bg-primary-hover text-white font-medium text-sm rounded-md shadow-sm transition-all mt-4 cursor-pointer"
              >
                Save To Do
              </button>
            </form>

            {/* Repeat Settings Child Modal Overlay (Screenshot 4) */}
            {isRepeatModalOpen && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-card border border-border-custom w-full max-w-sm rounded-xl p-5 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-border-custom">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Repeat Settings</h4>
                    <button type="button" onClick={() => setIsRepeatModalOpen(false)} className="text-muted hover:text-foreground font-bold">✕</button>
                  </div>

                  <div className="space-y-4 text-xs">
                    {/* Repeat Types */}
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-muted hover:text-foreground select-none">
                        <input
                          type="radio"
                          name="repeatType"
                          checked={repeatType === "weekdays"}
                          onChange={() => setRepeatType("weekdays")}
                          className="accent-primary"
                        />
                        <span>Week Days</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-muted hover:text-foreground select-none">
                        <input
                          type="radio"
                          name="repeatType"
                          checked={repeatType === "everyday"}
                          onChange={() => setRepeatType("everyday")}
                          className="accent-primary"
                        />
                        <span>Everyday</span>
                      </label>
                    </div>

                    {/* Weekdays Selector */}
                    {repeatType === "weekdays" && (
                      <div className="space-y-2">
                        <span className="text-[10px] text-muted uppercase font-bold block">Week Days</span>
                        <div className="flex justify-between gap-1">
                          {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => {
                            const isSel = selectedWeekdays.includes(day);
                            return (
                              <button
                                type="button"
                                key={idx}
                                onClick={() => {
                                  if (isSel) {
                                    setSelectedWeekdays(selectedWeekdays.filter(d => d !== day));
                                  } else {
                                    setSelectedWeekdays([...selectedWeekdays, day]);
                                  }
                                }}
                                className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                                  isSel ? "bg-primary text-white" : "bg-elevated hover:bg-elevated/80 text-muted"
                                }`}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Ends settings */}
                    <div className="space-y-3 pt-2 border-t border-border-custom/50">
                      <span className="text-[10px] text-muted uppercase font-bold block">Ends</span>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer text-muted hover:text-foreground select-none">
                          <input
                            type="radio"
                            name="endsOption"
                            checked={endsOption === "6months"}
                            onChange={() => setEndsOption("6months")}
                            className="accent-primary"
                          />
                          <span>End In 6 Months <span className="text-muted/65 font-mono ml-2">(05 Dec 2026)</span></span>
                        </label>

                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="endsOption"
                            checked={endsOption === "date"}
                            onChange={() => setEndsOption("date")}
                            className="accent-primary"
                          />
                          <span className="text-muted mr-2">End till</span>
                          <input
                            type="date"
                            value={endsDate}
                            onChange={(e) => setEndsDate(e.target.value)}
                            className="bg-background border border-border-custom rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-3 border-t border-border-custom">
                    <button
                      type="button"
                      onClick={() => setIsRepeatModalOpen(false)}
                      className="px-3.5 py-1.5 bg-zinc-800 text-muted hover:text-white rounded-lg text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRepeatModalOpen(false)}
                      className="px-4 py-1.5 bg-primary text-white font-bold rounded-lg text-xs hover:opacity-90"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
