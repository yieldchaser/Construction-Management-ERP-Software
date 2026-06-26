"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Task {
  id: string;
  name: string;
  duration_days: number;
  start_date: string;
  end_date: string;
  status: string;
  priority: string;
  parent_id?: string;
  boq_item_id?: string;
}

export default function GanttSchedulerPage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const projectId = params?.project_id as string;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form states for creating task
  const [taskName, setTaskName] = useState("");
  const [duration, setDuration] = useState(5);
  const [startDate, setStartDate] = useState("");
  const [priority, setPriority] = useState("medium");

  // Form states for adding predecessor
  const [selectedTaskForLink, setSelectedTaskForLink] = useState("");
  const [selectedPredecessor, setSelectedPredecessor] = useState("");

  useEffect(() => {
    if (projectId) {
      fetchTasks();
    }
  }, [projectId]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/apis/v3/planning/tasks?project_id=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (err) {
      console.error("Failed to fetch WBS tasks", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName || !startDate || duration <= 0) {
      setError("Please fill in all task fields.");
      return;
    }

    setError("");
    setSuccess("");

    // Align timestamp format
    const formattedStartDate = new Date(startDate).toISOString();

    try {
      const response = await fetch("http://localhost:8000/apis/v3/planning/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          name: taskName,
          duration_days: duration,
          start_date: formattedStartDate,
          priority,
        }),
      });

      if (response.ok) {
        setSuccess("Task created successfully!");
        setTaskName("");
        setStartDate("");
        fetchTasks();
      } else {
        const data = await response.json();
        setError(data.detail || "Failed to create task.");
      }
    } catch (err) {
      setError("Could not create task. Check connection to core API.");
    }
  };

  const handleAddPredecessor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForLink || !selectedPredecessor) {
      setError("Please select both a task and its predecessor.");
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await fetch(`http://localhost:8000/apis/v3/planning/tasks/${selectedTaskForLink}/predecessors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          predecessor_id: selectedPredecessor,
          type: "finish_to_start",
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess("Predecessor dependency linked and schedule updated!");
        fetchTasks();
      } else {
        setError(data.detail || "Circular dependency or invalid link detected.");
      }
    } catch (err) {
      setError("Failed to link predecessor. Check connection to core API.");
    }
  };

  // Reschedule helper
  const handleReschedule = async (taskId: string, newStart: string) => {
    setError("");
    setSuccess("");
    const formattedStart = new Date(newStart).toISOString();
    try {
      const response = await fetch(`http://localhost:8000/apis/v3/planning/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_date: formattedStart }),
      });
      if (response.ok) {
        setSuccess("Task rescheduled successfully. Downstream shifts calculated!");
        fetchTasks();
      } else {
        const data = await response.json();
        setError(data.detail || "Failed to reschedule task.");
      }
    } catch (err) {
      setError("Reschedule connection failed.");
    }
  };

  return (
    <div className="flex h-screen bg-[#0E0C15] text-[#ededed] overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-white/5 bg-[#0B0910] flex flex-col justify-between h-full shrink-0">
        <div className="flex flex-col overflow-y-auto flex-1">
          {/* Header */}
          <div className="p-6 flex items-center gap-3 border-b border-white/5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] font-sans font-bold text-white">
              S
            </div>
            <span className="font-bold text-white tracking-tight">SiteFlow Console</span>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-2">
            <Link
              href={`/c/${companyId}/dashboard`}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02]"
            >
              <span>←</span> Back to Dashboard
            </Link>
            
            <div className="pt-4">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block px-3 mb-2">
                Planning Module
              </span>
              <ul className="space-y-1">
                <li>
                  <Link
                    href={`/c/${companyId}/p/${projectId}/budgeting/boq`}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                  >
                    <span>📑</span> BOQ Upload Panel
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg bg-primary/10 text-primary border-l-2 border-primary"
                  >
                    <span>📅</span> Gantt Scheduler
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col overflow-hidden h-full">
        {/* Top Header */}
        <header className="h-16 border-b border-white/5 px-8 flex items-center justify-between bg-[#0B0910] shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-white uppercase tracking-wider">
              WBS Gantt Planner
            </h1>
            <span className="h-4 w-px bg-white/10" />
            <span className="text-xs font-medium text-zinc-400">
              Activity Planning Workspace
            </span>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-success/20 bg-success/10 p-4 text-xs text-success">
              ✓ {success}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left Controls & Forms */}
            <div className="space-y-6 lg:col-span-1">
              {/* Task Adder */}
              <div className="rounded-2xl glass-panel p-5 space-y-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-white">Add Task (WBS)</h3>
                <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-zinc-400">Task Title</label>
                    <input
                      type="text"
                      placeholder="Concrete Pouring"
                      value={taskName}
                      onChange={(e) => setTaskName(e.target.value)}
                      className="w-full bg-[#15121F] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-zinc-400">Duration (Days)</label>
                      <input
                        type="number"
                        min={1}
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value))}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Priority</label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-2 py-1.5 text-white focus:outline-none"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-[#15121F] border border-white/10 rounded-lg px-2 py-1.5 text-white focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 px-4 rounded-lg bg-primary text-white font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer mt-2"
                  >
                    Commit Task
                  </button>
                </form>
              </div>

              {/* Predecessor Linker */}
              <div className="rounded-2xl glass-panel p-5 space-y-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-white">Create Predecessor Link</h3>
                <form onSubmit={handleAddPredecessor} className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-zinc-400">Select Target Task</label>
                    <select
                      value={selectedTaskForLink}
                      onChange={(e) => setSelectedTaskForLink(e.target.value)}
                      className="w-full bg-[#15121F] border border-white/10 rounded-lg px-2 py-1.5 text-white focus:outline-none"
                    >
                      <option value="">-- Choose Task --</option>
                      {tasks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400">Select Predecessor (Must finish first)</label>
                    <select
                      value={selectedPredecessor}
                      onChange={(e) => setSelectedPredecessor(e.target.value)}
                      className="w-full bg-[#15121F] border border-white/10 rounded-lg px-2 py-1.5 text-white focus:outline-none"
                    >
                      <option value="">-- Choose Predecessor --</option>
                      {tasks
                        .filter((t) => t.id !== selectedTaskForLink)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 px-4 rounded-lg bg-secondary text-white font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer mt-2"
                  >
                    Link Dependency
                  </button>
                </form>
              </div>
            </div>

            {/* Gantt Interactive Workspace */}
            <div className="lg:col-span-3 rounded-2xl glass-panel p-6 space-y-6 flex flex-col overflow-hidden">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-wider text-white">Project Schedule timeline</h3>
                  <p className="text-[10px] text-zinc-500">Auto-propagates successors on predecessor shift</p>
                </div>
              </div>

              {/* Tasks List Table & Timeline */}
              <div className="flex-1 overflow-auto space-y-4">
                {tasks.length === 0 ? (
                  <div className="h-full flex flex-col justify-center items-center py-12 text-zinc-500 space-y-2">
                    <span className="text-3xl">📅</span>
                    <span className="text-xs">No tasks mapped. Create task in panel to build WBS.</span>
                  </div>
                ) : (
                  <div className="space-y-4 min-w-[700px]">
                    {tasks.map((task) => {
                      const startDateObj = new Date(task.start_date);
                      const endDateObj = new Date(task.end_date);
                      
                      return (
                        <div key={task.id} className="p-4 rounded-xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-all flex items-center justify-between gap-4">
                          <div className="space-y-1 w-1/3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white text-sm">{task.name}</span>
                              <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                                task.priority === "high" ? "bg-primary/10 text-primary border border-primary/20" : "bg-zinc-800 text-zinc-400"
                              }`}>
                                {task.priority}
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-500">
                              Duration: {task.duration_days} Days
                            </div>
                          </div>

                          <div className="w-1/3 flex gap-4 text-xs text-zinc-400">
                            <div>
                              <span className="text-[9px] uppercase text-zinc-500 block">Start</span>
                              <input
                                type="date"
                                value={task.start_date.slice(0, 10)}
                                onChange={(e) => handleReschedule(task.id, e.target.value)}
                                className="bg-[#15121F] border border-white/10 rounded px-1.5 py-0.5 text-xs text-white"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] uppercase text-zinc-500 block">End</span>
                              <span className="font-semibold font-mono text-zinc-300">
                                {endDateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                              </span>
                            </div>
                          </div>

                          {/* Graphical Timeline Bar representation */}
                          <div className="w-1/3 flex items-center pr-4">
                            <div className="h-4 w-full bg-white/5 rounded-full relative overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-secondary to-primary rounded-full animate-shimmer"
                                style={{
                                  width: `${Math.min(100, task.duration_days * 5)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
