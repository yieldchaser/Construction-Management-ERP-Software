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
  is_critical?: boolean;
  baseline_start?: string;
  baseline_end?: string;
  actual_pct?: number;
}

interface Milestone {
  id: string;
  name: string;
  date: string;
  type: "start" | "handover" | "inspection" | "payment" | "critical";
  status: "upcoming" | "achieved" | "delayed";
  description: string;
}

const MILESTONES: Milestone[] = [
  { id: "M1", name: "Project Kickoff", date: "2026-01-15", type: "start", status: "achieved", description: "Site mobilisation, drawing issue & subcontractor appointments confirmed." },
  { id: "M2", name: "Foundation Complete", date: "2026-03-10", type: "inspection", status: "achieved", description: "Raft concreting done. Structural consultant inspection cleared." },
  { id: "M3", name: "Slab L1 Casting", date: "2026-04-30", type: "inspection", status: "achieved", description: "G+1 slab concrete poured. IS 456 cube test: 35.2 MPa." },
  { id: "M4", name: "Structural Frame Complete", date: "2026-07-15", type: "critical", status: "upcoming", description: "All columns, slabs & beams up to terrace level to be complete." },
  { id: "M5", name: "Running Account Bill #3", date: "2026-08-01", type: "payment", status: "upcoming", description: "RA Bill for 65% completion stage. Expected ₹38L from client." },
  { id: "M6", name: "External Plaster & Waterproofing", date: "2026-09-20", type: "inspection", status: "upcoming", description: "Waterproofing IS 3067 inspection by consultant." },
  { id: "M7", name: "Handover to Client", date: "2026-12-31", type: "handover", status: "upcoming", description: "Full project handover with completion certificate & as-built drawings." },
];

const BASELINE_TASKS = [
  { id: "T1", name: "Earthwork & Excavation", baseline_start: "2026-01-20", baseline_end: "2026-02-10", actual_start: "2026-01-22", actual_end: "2026-02-12", is_critical: true, pct: 100 },
  { id: "T2", name: "PCC & Foundation Raft", baseline_start: "2026-02-11", baseline_end: "2026-03-05", actual_start: "2026-02-13", actual_end: "2026-03-10", is_critical: true, pct: 100 },
  { id: "T3", name: "Ground Floor Columns", baseline_start: "2026-03-06", baseline_end: "2026-03-30", actual_start: "2026-03-11", actual_end: "2026-04-05", is_critical: true, pct: 100 },
  { id: "T4", name: "G+1 Slab Casting", baseline_start: "2026-03-31", baseline_end: "2026-04-25", actual_start: "2026-04-06", actual_end: "2026-04-30", is_critical: true, pct: 100 },
  { id: "T5", name: "First Floor Columns", baseline_start: "2026-05-01", baseline_end: "2026-05-28", actual_start: "2026-05-01", actual_end: "2026-06-05", is_critical: true, pct: 100 },
  { id: "T6", name: "Terrace Slab (G+2)", baseline_start: "2026-05-29", baseline_end: "2026-07-01", actual_start: "2026-06-10", actual_end: null, is_critical: true, pct: 65 },
  { id: "T7", name: "Brick Masonry (All Floors)", baseline_start: "2026-05-15", baseline_end: "2026-07-30", actual_start: "2026-05-20", actual_end: null, is_critical: false, pct: 55 },
  { id: "T8", name: "External Plastering", baseline_start: "2026-08-01", baseline_end: "2026-09-15", actual_start: null, actual_end: null, is_critical: false, pct: 0 },
  { id: "T9", name: "Internal Finishes & Tiles", baseline_start: "2026-09-01", baseline_end: "2026-11-30", actual_start: null, actual_end: null, is_critical: false, pct: 0 },
  { id: "T10", name: "MEP Rough-in & Finishing", baseline_start: "2026-08-15", baseline_end: "2026-11-30", actual_start: null, actual_end: null, is_critical: false, pct: 0 },
];

const LOOKAHEAD_TASKS = [
  { id: "L1", name: "Terrace slab curing (ongoing)", responsible: "Er. Suresh R", start: "2026-07-01", end: "2026-07-14", status: "in_progress", remarks: "28-day cure. DO NOT LOAD." },
  { id: "L2", name: "Brick masonry — 2nd floor east wing", responsible: "Subcon: Ramesh & Co", start: "2026-07-02", end: "2026-07-08", status: "scheduled", remarks: "Material (4000 bricks) confirmed at yard." },
  { id: "L3", name: "Plumbing rough-in — G+1 toilets", responsible: "MEP Consultant", start: "2026-07-03", end: "2026-07-07", status: "scheduled", remarks: "Coordinate with masonry team for wall chasing." },
  { id: "L4", name: "Column shuttering — terrace parapet", responsible: "Er. Ravi K", start: "2026-07-05", end: "2026-07-08", status: "scheduled", remarks: "Wait for cube test report clearance." },
  { id: "L5", name: "External scaffold inspection", responsible: "Safety Officer", start: "2026-07-07", end: "2026-07-07", status: "scheduled", remarks: "IS 3696 compliance check." },
  { id: "L6", name: "Parapet wall concrete pour", responsible: "Er. Ravi K", start: "2026-07-09", end: "2026-07-10", status: "planned", remarks: "Subject to scaffold inspection clearance." },
  { id: "L7", name: "Waterproofing application — terrace", responsible: "WP Subcon", start: "2026-07-12", end: "2026-07-14", status: "planned", remarks: "IS 3067 — Crystalline 2-coat system." },
];

interface TodoItem {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
}

interface CommentItem {
  id: string;
  task_id: string;
  user_name: string;
  message_text?: string;
  media_url?: string;
  voice_note_url?: string;
  progress_qty_added?: number;
  created_at: string;
}

// Safe evaluation of mathematical formulas typed by field workers (e.g. 2+3+6)
const evaluateFormula = (str: string): number => {
  try {
    if (!str || !str.trim()) return 0;
    const cleaned = str.replace(/[^0-9+\-*/().\s]/g, "");
    if (!cleaned) return 0;
    const evaluated = new Function(`return ${cleaned}`)();
    return typeof evaluated === "number" && !isNaN(evaluated) ? evaluated : 0;
  } catch {
    return 0;
  }
};

export default function GanttSchedulerPage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const projectId = params?.project_id as string;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mainTab, setMainTab] = useState<"wbs" | "milestones" | "baseline" | "lookahead">("wbs");

  // Form states for creating task
  const [taskName, setTaskName] = useState("");
  const [duration, setDuration] = useState(5);
  const [startDate, setStartDate] = useState("");
  const [priority, setPriority] = useState("medium");

  // Form states for adding predecessor
  const [selectedTaskForLink, setSelectedTaskForLink] = useState("");
  const [selectedPredecessor, setSelectedPredecessor] = useState("");

  // Task Details Drawer
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  
  // New subtask / checklist state
  const [newTodoTitle, setNewTodoTitle] = useState("");
  
  // New comment state
  const [newCommentText, setNewCommentText] = useState("");
  
  // Progress posting with simulated Measurement Book takeoff
  const [progressQty, setProgressQty] = useState<string>("");
  const [useTakeoff, setUseTakeoff] = useState(false);
  const [takeoffN, setTakeoffN] = useState<number>(1);
  const [takeoffL, setTakeoffL] = useState<number>(1);
  const [takeoffW, setTakeoffW] = useState<number>(1);
  const [takeoffH, setTakeoffH] = useState<number>(1);

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`http://localhost:8000/apis/v3/planning/tasks?project_id=${projectId}`);
      if (res.ok) {
        setTasks(await res.json());
      } else {
        setError("Failed to load WBS tasks.");
      }
    } catch (e) {
      setError("Unable to connect to WBS services.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchTasks();
    }
  }, [projectId]);

  // Load Task Details (checklists, feed/comments)
  const handleOpenDrawer = async (task: Task) => {
    setSelectedTask(task);
    setTodos([]);
    setComments([]);
    setProgressQty("");
    setUseTakeoff(false);

    try {
      // 1. Fetch Todos
      const todoRes = await fetch(`http://localhost:8000/apis/v3/planning/tasks/${task.id}/todos`);
      if (todoRes.ok) {
        setTodos(await todoRes.json());
      }
      // 2. Fetch Comments
      const commRes = await fetch(`http://localhost:8000/apis/v3/planning/tasks/${task.id}/comments`);
      if (commRes.ok) {
        setComments(await commRes.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim() || !startDate) {
      setError("Task name and start date are required.");
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/apis/v3/planning/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          name: taskName,
          duration_days: duration,
          start_date: startDate,
          priority: priority,
          status: "pending"
        }),
      });

      if (res.ok) {
        setTaskName("");
        setStartDate("");
        setSuccess("Task created successfully!");
        fetchTasks();
      } else {
        setError("Failed to create task.");
      }
    } catch (e) {
      setError("Connection error.");
    }
  };

  const handleAddPredecessor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForLink || !selectedPredecessor) return;

    try {
      const res = await fetch(`http://localhost:8000/apis/v3/planning/tasks/${selectedTaskForLink}/predecessors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          predecessor_id: selectedPredecessor
        }),
      });

      if (res.ok) {
        setSuccess("Task link recorded successfully!");
        setSelectedTaskForLink("");
        setSelectedPredecessor("");
        fetchTasks();
      } else {
        setError("Link loop detected. Predecessor rejected.");
      }
    } catch (e) {
      setError("Connection error.");
    }
  };

  // Add todo subtask
  const handleAddTodo = async () => {
    if (!selectedTask || !newTodoTitle.trim()) return;
    try {
      const res = await fetch(`http://localhost:8000/apis/v3/planning/tasks/${selectedTask.id}/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTodoTitle.trim() }),
      });
      if (res.ok) {
        const added = await res.json();
        setTodos([...todos, added]);
        setNewTodoTitle("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle todo subtask
  const handleToggleTodo = async (todoId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/apis/v3/planning/tasks/todos/${todoId}/toggle`, {
        method: "PATCH",
      });
      if (res.ok) {
        const updated = await res.json();
        setTodos(todos.map(t => t.id === todoId ? updated : t));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete todo
  const handleDeleteTodo = async (todoId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/apis/v3/planning/tasks/todos/${todoId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTodos(todos.filter(t => t.id !== todoId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save comment or progress log
  const handleSaveComment = async (customVoiceUrl?: string) => {
    if (!selectedTask) return;
    if (!newCommentText && !progressQty && !customVoiceUrl) return;

    try {
      const evaluatedQty = progressQty ? evaluateFormula(progressQty) : null;
      const body = {
        user_id: "e0000000-0000-0000-0000-000000000100", // simulated logged-in user ID
        user_name: "Vikram Joshi (Site Engineer)",
        message_text: newCommentText || (customVoiceUrl ? "Voice note logged" : `Logged progress takeoff: ${evaluatedQty}`),
        progress_qty_added: evaluatedQty,
        voice_note_url: customVoiceUrl || null
      };

      const res = await fetch(`http://localhost:8000/apis/v3/planning/tasks/${selectedTask.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const added = await res.json();
        setComments([...comments, added]);
        setNewCommentText("");
        setProgressQty("");
        setUseTakeoff(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Evaluate Takeoff dimension math
  useEffect(() => {
    if (useTakeoff) {
      const val = takeoffN * takeoffL * takeoffW * takeoffH;
      setProgressQty(val.toFixed(2));
    }
  }, [useTakeoff, takeoffN, takeoffL, takeoffW, takeoffH]);

  // Simulate Voice note recording
  const startRecording = () => {
    setIsRecording(true);
    setRecordingSeconds(0);
    const interval = setInterval(() => {
      setRecordingSeconds(prev => {
        if (prev >= 4) {
          clearInterval(interval);
          setIsRecording(false);
          // Auto save voice comment
          handleSaveComment("https://siteflow-voice-records.s3.amazonaws.com/rec-0051.mp3");
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
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
              className="flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.02] rounded-lg"
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
                    className="flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.02] rounded-lg"
                  >
                    <span>📑</span> BOQ Upload Panel
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white/[0.06] text-white font-semibold shadow-sm"
                  >
                    <span>📅</span> Gantt Scheduler
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        {/* Sidebar Footer (Screens 5788 & 5789) */}
        <div className="p-4 border-t border-white/5 bg-black/20 text-[10px] text-zinc-500 space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="font-bold text-zinc-400">TO DO PENDING</span>
            <span className="px-2 py-0.5 bg-primary/25 border border-primary/40 rounded text-primary font-extrabold font-mono text-[9px]">94</span>
          </div>
          <div className="flex items-center gap-1.5 opacity-80 mt-1">
            <span>💾</span> Database Backup: <strong className="text-zinc-400">5:40 AM, 29 Aug</strong>
          </div>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col overflow-hidden h-full">
        {/* Header */}
        <header className="h-14 border-b border-white/5 px-6 flex items-center justify-between bg-[#0B0910] shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold text-white">Project Scheduler & WBS</h1>
          </div>
          <div className="flex gap-1">
            {(["wbs", "milestones", "baseline", "lookahead"] as const).map(t => (
              <button key={t} onClick={() => setMainTab(t)}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg capitalize transition-all ${mainTab === t ? "bg-primary text-white" : "bg-white/5 text-zinc-400 hover:text-white"}`}>
                {t === "wbs" ? "📋 WBS Tasks" : t === "milestones" ? "🔷 Milestones" : t === "baseline" ? "📊 Baseline" : "📅 14-Day Lookahead"}
              </button>
            ))}
          </div>
        </header>

        {/* Content Workspace */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && <div className="bg-red-500/15 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl">{error}</div>}
          {success && <div className="bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-xs p-3 rounded-xl">{success}</div>}

          {/* ── MILESTONES TAB ── */}
          {mainTab === "milestones" && (
            <div className="space-y-3">
              <div className="text-xs text-zinc-500 mb-4">Project milestone tracker — key deliverables, inspections, and payment events.</div>
              {MILESTONES.map(m => {
                const colors = {
                  start: "border-blue-500/30 bg-blue-500/5",
                  handover: "border-emerald-500/30 bg-emerald-500/5",
                  inspection: "border-amber-500/30 bg-amber-500/5",
                  payment: "border-purple-500/30 bg-purple-500/5",
                  critical: "border-red-500/30 bg-red-500/5",
                };
                const statusCls = m.status === "achieved" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : m.status === "delayed" ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-zinc-700/30 border-zinc-600/20 text-zinc-400";
                const icon = { start: "🚀", handover: "🏁", inspection: "🔍", payment: "💰", critical: "⚠️" };
                return (
                  <div key={m.id} className={`flex items-start gap-4 p-4 rounded-xl border ${colors[m.type]}`}>
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-lg">{icon[m.type]}</div>
                      <div className="text-[9px] font-mono text-zinc-600">{m.date}</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white text-xs">{m.name}</span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded border font-bold ${statusCls}`}>{m.status.toUpperCase()}</span>
                      </div>
                      <p className="text-[11px] text-zinc-500">{m.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── BASELINE TAB ── */}
          {mainTab === "baseline" && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-[10px]">
                <div className="flex items-center gap-1.5"><div className="w-10 h-2 rounded bg-blue-400/60" /> Baseline (Planned)</div>
                <div className="flex items-center gap-1.5"><div className="w-10 h-2 rounded bg-emerald-400" /> Actual Progress</div>
                <div className="flex items-center gap-1.5"><div className="w-10 h-2 rounded bg-red-400" /> Critical Path</div>
              </div>
              {BASELINE_TASKS.map(t => {
                const delay = t.actual_start && t.actual_end ? Math.max(0, (new Date(t.actual_end).getTime() - new Date(t.baseline_end).getTime()) / 86400000) : 0;
                return (
                  <div key={t.id} className="bg-[#14121F] border border-white/5 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {t.is_critical && <span className="text-[8px] bg-red-500/10 border border-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">CRITICAL</span>}
                        <span className="text-xs font-semibold text-white">{t.name}</span>
                      </div>
                      <div className="text-right text-[10px]">
                        {delay > 0 && <span className="text-red-400 font-bold">+{delay.toFixed(0)}d delay</span>}
                        {delay === 0 && t.pct === 100 && <span className="text-emerald-400 font-bold">✓ On Time</span>}
                        {t.pct < 100 && t.pct > 0 && <span className="text-amber-400 font-bold">{t.pct}% done</span>}
                      </div>
                    </div>
                    {/* Baseline bar */}
                    <div className="text-[9px] text-zinc-600">Baseline: {t.baseline_start} → {t.baseline_end}</div>
                    <div className="h-2 bg-blue-400/20 rounded-full relative overflow-hidden">
                      <div className={`h-full rounded-full ${t.is_critical ? "bg-red-400/50" : "bg-blue-400/50"}`} style={{ width: "100%" }} />
                    </div>
                    {/* Actual bar */}
                    <div className="text-[9px] text-zinc-600">Actual: {t.actual_start ?? "Not started"} → {t.actual_end ?? "Ongoing"}</div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-400" style={{ width: `${t.pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── LOOKAHEAD TAB ── */}
          {mainTab === "lookahead" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white">14-Day Lookahead Schedule</h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Rolling 2-week plan for site supervisors · Updated every Monday</p>
                </div>
                <div className="text-[10px] text-zinc-500">Jul 01 – Jul 14, 2026</div>
              </div>
              {LOOKAHEAD_TASKS.map(t => {
                const statusCls = t.status === "in_progress" ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : t.status === "scheduled" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-zinc-700/20 border-zinc-600/20 text-zinc-500";
                return (
                  <div key={t.id} className="bg-[#14121F] border border-white/5 rounded-xl p-4 flex items-start gap-4">
                    <div className="shrink-0 text-[9px] font-mono text-zinc-600 w-20">{t.start}<br/>→ {t.end}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-white">{t.name}</span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded border font-bold ${statusCls}`}>{t.status.replace("_"," ").toUpperCase()}</span>
                      </div>
                      <div className="text-[10px] text-zinc-500">Responsible: {t.responsible}</div>
                      {t.remarks && <div className="text-[10px] text-zinc-600 mt-0.5 italic">{t.remarks}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── WBS TAB ── */}
          {mainTab === "wbs" && <>
          {/* Quick Creator Forms */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Create Task Form */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-[#14121F] space-y-4">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Create WBS Task
              </h2>
              <form onSubmit={handleCreateTask} className="grid grid-cols-2 gap-3 text-xs">
                <div className="col-span-2 space-y-1">
                  <label className="text-zinc-400 font-semibold">Task Name</label>
                  <input
                    type="text"
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                    placeholder="Slab casting, foundation excav..."
                    className="w-full bg-[#1C182A] border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Duration (Days)</label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#1C182A] border border-white/10 rounded-lg p-2 text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[#1C182A] border border-white/10 rounded-lg p-2 text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-zinc-400 font-semibold">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-[#1C182A] border border-white/10 rounded-lg p-2 text-white"
                  >
                    <option value="high">🔴 High Priority</option>
                    <option value="medium">🟡 Medium Priority</option>
                    <option value="low">🟢 Low Priority</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="col-span-2 mt-2 bg-gradient-to-r from-primary to-[#FF3B6C] rounded-xl py-2.5 font-bold text-white hover:opacity-90 transition-all shadow-lg shadow-primary/20 text-xs"
                >
                  Save WBS Task
                </button>
              </form>
            </div>

            {/* Predecessors / Linker Form */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-[#14121F] space-y-4">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Link CPM Predecessors
              </h2>
              <form onSubmit={handleAddPredecessor} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Target WBS Task</label>
                  <select
                    value={selectedTaskForLink}
                    onChange={(e) => setSelectedTaskForLink(e.target.value)}
                    className="w-full bg-[#1C182A] border border-white/10 rounded-lg p-2 text-white"
                  >
                    <option value="">-- Choose Task --</option>
                    {tasks.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Requires Completion of Predecessor</label>
                  <select
                    value={selectedPredecessor}
                    onChange={(e) => setSelectedPredecessor(e.target.value)}
                    className="w-full bg-[#1C182A] border border-white/10 rounded-lg p-2 text-white"
                  >
                    <option value="">-- Choose Predecessor --</option>
                    {tasks
                      .filter(t => t.id !== selectedTaskForLink)
                      .map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))
                    }
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#1C182A] hover:bg-[#252037] border border-white/10 rounded-xl py-2.5 font-bold text-white transition-all text-xs"
                >
                  🔗 Establish Link Dependency
                </button>
              </form>
            </div>
          </div>

          {/* WBS Task Gantt List */}
          <div className="glass-panel rounded-2xl border border-white/5 p-6 space-y-4">
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">WBS Execution Nodes</h2>
              <p className="text-[10px] text-zinc-500">Click a task card below to open its real-time collaboration feed, subtasks and progress takeoff book.</p>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-10 text-xs text-zinc-500">Loading WBS Node levels...</div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => handleOpenDrawer(task)}
                    className="p-4 rounded-xl border border-white/5 bg-[#120F1A] hover:border-primary/20 transition-all flex items-center justify-between cursor-pointer group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-white text-xs group-hover:text-primary transition-all">
                          {task.name}
                        </strong>
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                          task.priority === "high" ? "bg-red-500/10 text-red-400" : "bg-zinc-500/10 text-zinc-400"
                        }`}>{task.priority}</span>
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        Start: {new Date(task.start_date).toLocaleDateString()} · Duration: {task.duration_days} Days
                      </div>
                    </div>

                    <span className="text-zinc-500 font-bold group-hover:text-white transition-all">→</span>
                  </div>
                ))
              )}
            </div>
          </div>
          </> }
        </div>
      </main>

      {/* Task detail Drawer overlay */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-[#000]/60 backdrop-blur-sm flex items-center justify-end">
          <div className="bg-[#0C0A12] border-l border-white/10 w-full max-w-lg h-full shadow-2xl flex flex-col overflow-hidden text-xs">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-[#0F0D16]">
              <div>
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-primary">WBS Task details</span>
                <h2 className="text-base font-extrabold text-white mt-1">{selectedTask.name}</h2>
              </div>
              <button onClick={() => setSelectedTask(null)} className="text-zinc-400 hover:text-white">✕ Close</button>
            </div>

            {/* Content body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              
              {/* 1. Subtask checklist */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Subtask Checklist</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add new subtask item..."
                    value={newTodoTitle}
                    onChange={(e) => setNewTodoTitle(e.target.value)}
                    className="flex-1 bg-[#120F1A] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  />
                  <button onClick={handleAddTodo} className="px-4 py-2 bg-zinc-800 border border-white/10 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold">
                    + Todo
                  </button>
                </div>

                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {todos.map(todo => (
                    <div key={todo.id} className="flex items-center justify-between p-2 rounded bg-white/[0.02] border border-white/5">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={todo.is_completed}
                          onChange={() => handleToggleTodo(todo.id)}
                          className="accent-primary h-3.5 w-3.5 rounded cursor-pointer"
                        />
                        <span className={`text-xs ${todo.is_completed ? "line-through text-zinc-500" : "text-zinc-300"}`}>
                          {todo.title}
                        </span>
                      </div>
                      <button onClick={() => handleDeleteTodo(todo.id)} className="text-zinc-500 hover:text-red-400">✕</button>
                    </div>
                  ))}
                  {todos.length === 0 && (
                    <p className="text-[10px] text-zinc-600 italic">No sub-task todos added yet.</p>
                  )}
                </div>
              </div>

              {/* 2. Progress posting with evaluated inputs (like 2+3+6) */}
              <div className="space-y-3 border-t border-white/5 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Progress entry & Measurement Book</h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="useTakeoffCheck"
                      checked={useTakeoff}
                      onChange={(e) => setUseTakeoff(e.target.checked)}
                      className="accent-primary h-3.5 w-3.5 rounded cursor-pointer"
                    />
                    <label htmlFor="useTakeoffCheck" className="text-xs text-zinc-400 select-none cursor-pointer">
                      Use Takeoff (N x L x W x H)
                    </label>
                  </div>
                </div>

                {useTakeoff && (
                  <div className="grid grid-cols-4 gap-2 bg-[#120F1A] p-3 rounded-lg border border-white/5 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 block">No. (N)</span>
                      <input type="number" value={takeoffN} onChange={(e) => setTakeoffN(parseFloat(e.target.value) || 1)} className="w-full bg-[#181424] border border-white/10 rounded p-1 text-white text-center" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 block">Length (L)</span>
                      <input type="number" value={takeoffL} onChange={(e) => setTakeoffL(parseFloat(e.target.value) || 1)} className="w-full bg-[#181424] border border-white/10 rounded p-1 text-white text-center" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 block">Width (W)</span>
                      <input type="number" value={takeoffW} onChange={(e) => setTakeoffW(parseFloat(e.target.value) || 1)} className="w-full bg-[#181424] border border-white/10 rounded p-1 text-white text-center" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 block">Height (H)</span>
                      <input type="number" value={takeoffH} onChange={(e) => setTakeoffH(parseFloat(e.target.value) || 1)} className="w-full bg-[#181424] border border-white/10 rounded p-1 text-white text-center" />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter qty or formula (e.g. 2+3+6)..."
                      value={progressQty}
                      onChange={(e) => setProgressQty(e.target.value)}
                      disabled={useTakeoff}
                      className="flex-1 bg-[#120F1A] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none disabled:opacity-70 disabled:text-emerald-400 disabled:font-bold"
                    />
                    <button
                      onClick={() => handleSaveComment()}
                      className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition-all"
                    >
                      Log Progress
                    </button>
                  </div>

                  {/* Expression evaluation preview (Screen 5794) */}
                  {!useTakeoff && progressQty && isNaN(Number(progressQty)) && (
                    <div className="text-[10px] text-zinc-400 mt-1 pl-1">
                      Evaluated Output: <strong className="text-white font-mono">{evaluateFormula(progressQty)}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Feed activity Timeline */}
              <div className="space-y-3 border-t border-white/5 pt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-sans">Task Activity Chat Feed</h3>
                  
                  {/* Microphone simulated trigger */}
                  <button
                    onClick={startRecording}
                    disabled={isRecording}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] transition-all font-semibold ${
                      isRecording
                        ? "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse"
                        : "bg-[#181424] border-white/10 text-zinc-300 hover:text-white"
                    }`}
                  >
                    <span>🎙️</span> {isRecording ? `Recording (${4 - recordingSeconds}s)...` : "Audio Memo"}
                  </button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {comments.map(comm => (
                    <div key={comm.id} className="p-3 rounded-lg bg-[#120F1A] border border-white/5 space-y-1.5">
                      <div className="flex justify-between items-center text-[9px] text-zinc-500">
                        <strong className="text-zinc-300 font-bold">{comm.user_name}</strong>
                        <span>{new Date(comm.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <p className="text-zinc-300 text-xs">{comm.message_text}</p>
                      
                      {comm.voice_note_url && (
                        <div className="flex items-center gap-2 p-1.5 rounded bg-black/20 border border-white/5 text-[9px] text-zinc-400 font-mono">
                          <span>🔊 Audio Note:</span>
                          <span className="text-primary underline cursor-pointer truncate max-w-[150px]">{comm.voice_note_url}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-[10px] text-zinc-600 italic">No feed updates posted yet. Write a message or record a memo.</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Post progress comments..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="flex-1 bg-[#120F1A] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  />
                  <button onClick={() => handleSaveComment()} className="px-4 py-2 bg-[#1C182A] border border-white/10 hover:bg-[#252037] text-zinc-300 hover:text-white rounded-lg text-xs font-bold">
                    Send
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
