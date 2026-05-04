"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Plus, CheckCircle2, Circle, Clock, AlertTriangle, Trash2,
  ChevronDown, X, ListTodo, ArrowUp, ArrowRight, ArrowDown, Calendar,
} from "lucide-react";
import {
  createTaskAction,
  completeTaskAction,
  updateTaskStatusAction,
  deleteTaskAction,
} from "@/lib/actions/tasks";
import type { Task } from "@/lib/db/schema";

type Member = { id: string; userId: string; role: string; joinedAt: Date };

const STATUS_CONFIG = {
  a_faire: { label: "À faire", icon: Circle, iconClass: "text-zinc-500", bgClass: "bg-zinc-500/10" },
  en_cours: { label: "En cours", icon: Clock, iconClass: "text-amber-400", bgClass: "bg-amber-500/10" },
  fait: { label: "Fait", icon: CheckCircle2, iconClass: "text-emerald-400", bgClass: "bg-emerald-500/10" },
} as const;

const PRIORITY_CONFIG = {
  haute: { label: "Haute", icon: ArrowUp, cl: "text-red-400" },
  normale: { label: "Normale", icon: ArrowRight, cl: "text-zinc-500" },
  basse: { label: "Basse", icon: ArrowDown, cl: "text-zinc-600" },
} as const;

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

function formatDueDate(d: string | null): string {
  if (!d) return "";
  const date = new Date(d);
  const today = new Date(new Date().toDateString());
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.getTime() === today.getTime()) return "Aujourd'hui";
  if (date.getTime() === tomorrow.getTime()) return "Demain";
  if (date < today) {
    const days = Math.floor((today.getTime() - date.getTime()) / 86400000);
    return `En retard (${days}j)`;
  }
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function TasksPageClient({
  tasks,
  counts,
  members,
  currentUserId,
  activeFilter,
}: {
  tasks: Task[];
  counts: { total: number; open: number; mine: number; overdue: number; haute: number };
  members: Member[];
  currentUserId: string;
  activeFilter: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState<"haute" | "normale" | "basse">("normale");
  const [dueDate, setDueDate] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreate() {
    if (!title.trim()) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("title", title.trim());
      if (description.trim()) fd.set("description", description.trim());
      if (assignedTo) fd.set("assignedTo", assignedTo);
      fd.set("priority", priority);
      if (dueDate) fd.set("dueDate", dueDate);
      const result = await createTaskAction(fd);
      if (result.error) {
        setError(result.error);
      } else {
        setTitle(""); setDescription(""); setAssignedTo(""); setPriority("normale"); setDueDate("");
        setShowForm(false);
      }
    });
  }

  function handleComplete(taskId: string) {
    startTransition(async () => { await completeTaskAction(taskId); });
  }

  function handleStatusChange(taskId: string, status: "a_faire" | "en_cours" | "fait") {
    startTransition(async () => { await updateTaskStatusAction(taskId, status); });
  }

  function handleDelete(taskId: string) {
    startTransition(async () => { await deleteTaskAction(taskId); });
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Tâches</h1>
          <p className="text-zinc-500 mt-1 text-sm">
            {counts.open} en cours{counts.overdue > 0 && <span className="text-red-400 ml-1">· {counts.overdue} en retard</span>}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-[var(--color-text-inverse)] bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors"
        >
          <Plus size={14} />
          Nouvelle tâche
        </button>
      </div>

      {/* KPIs row — dashboard style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">À faire</p>
            <div className="w-8 h-8 rounded-xl bg-zinc-500/10 flex items-center justify-center">
              <ListTodo size={16} className="text-zinc-400" />
            </div>
          </div>
          <p className="text-[22px] font-bold tabular-nums text-white mt-auto">{counts.open}</p>
        </div>
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Mes tâches</p>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Circle size={16} className="text-blue-400" />
            </div>
          </div>
          <p className="text-[22px] font-bold tabular-nums text-white mt-auto">{counts.mine}</p>
        </div>
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Priorité haute</p>
            <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
              <ArrowUp size={16} className="text-red-400" />
            </div>
          </div>
          <p className={`text-[22px] font-bold tabular-nums mt-auto ${counts.haute > 0 ? "text-red-400" : "text-white"}`}>{counts.haute}</p>
        </div>
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">En retard</p>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle size={16} className="text-amber-400" />
            </div>
          </div>
          <p className={`text-[22px] font-bold tabular-nums mt-auto ${counts.overdue > 0 ? "text-amber-400" : "text-white"}`}>{counts.overdue}</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl px-4 py-3 text-sm bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="opacity-60 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="card-static p-5 space-y-3">
          <input
            type="text"
            placeholder="Ex: Expédier la commande Gucci Jordaan"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-text)] placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleCreate()}
          />
          <textarea
            placeholder="Description (optionnel)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-text)] placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] resize-none"
          />
          <div className="flex flex-wrap gap-3">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[13px] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            >
              <option value="haute">Haute priorité</option>
              <option value="normale">Normale</option>
              <option value="basse">Basse</option>
            </select>
            {members.length > 1 && (
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[13px] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              >
                <option value="">Non assignée</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.userId === currentUserId ? "Moi" : `Membre ${m.userId.substring(0, 6)}`}
                  </option>
                ))}
              </select>
            )}
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[13px] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
            <div className="flex gap-2 ml-auto">
              <button onClick={() => setShowForm(false)} className="px-3 py-2 text-[13px] text-zinc-500 hover:text-zinc-300">Annuler</button>
              <button
                onClick={handleCreate}
                disabled={isPending || !title.trim()}
                className="px-4 py-2 text-[13px] font-semibold text-[var(--color-text-inverse)] bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors disabled:opacity-50"
              >
                {isPending ? "..." : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex bg-zinc-800/60 rounded-lg p-0.5 w-fit">
        {([
          { key: "open", label: `En cours (${counts.open})` },
          { key: "mine", label: `Mes tâches (${counts.mine})` },
          { key: "all", label: `Tout (${counts.total})` },
        ] as const).map((f) => (
          <Link
            key={f.key}
            href={`/tasks?filter=${f.key}`}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${
              activeFilter === f.key
                ? "bg-[rgba(251,113,133,0.12)] text-rose-400"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="card-static p-12 text-center">
          <ListTodo size={40} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500 text-sm mb-4">Aucune tâche{activeFilter === "mine" ? " assignée" : ""}</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors"
          >
            <Plus size={14} />
            Créer
          </button>
        </div>
      ) : (
        <div className="card-static overflow-hidden">
          <div className="divide-y divide-[var(--color-border)]">
            {tasks.map((task) => {
              const st = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.a_faire;
              const pr = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.normale;
              const StatusIcon = st.icon;
              const PriorityIcon = pr.icon;
              const overdue = isOverdue(task.dueDate);
              const done = task.status === "fait";

              return (
                <div key={task.id} className={`flex items-center gap-3 px-5 py-3 row-hover transition-colors group ${done ? "opacity-50" : ""}`}>
                  {/* Complete button */}
                  <button
                    onClick={() => done ? handleStatusChange(task.id, "a_faire") : handleComplete(task.id)}
                    disabled={isPending}
                    className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      done
                        ? "border-emerald-500 bg-emerald-500/20"
                        : "border-zinc-600 hover:border-rose-400 hover:bg-rose-500/10"
                    }`}
                  >
                    {done && <CheckCircle2 size={12} className="text-emerald-400" />}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-[13px] font-medium truncate ${done ? "line-through text-zinc-600" : "text-zinc-200"}`}>
                        {task.title}
                      </p>
                      {task.priority === "haute" && !done && (
                        <PriorityIcon size={12} className={pr.cl} />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.dueDate && (
                        <span className={`text-[11px] flex items-center gap-1 ${overdue && !done ? "text-red-400" : "text-zinc-500"}`}>
                          <Calendar size={9} />
                          {formatDueDate(task.dueDate)}
                        </span>
                      )}
                      {task.assignedTo && (
                        <span className="text-[11px] text-zinc-600">
                          {task.assignedTo === currentUserId ? "Moi" : `${task.assignedTo.substring(0, 6)}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status + actions */}
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!done && (
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value as any)}
                        className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-0.5 text-[11px] text-[var(--color-text)] focus:outline-none"
                      >
                        <option value="a_faire">À faire</option>
                        <option value="en_cours">En cours</option>
                        <option value="fait">Fait</option>
                      </select>
                    )}
                    <button
                      onClick={() => handleDelete(task.id)}
                      disabled={isPending}
                      className="p-1.5 rounded hover:bg-red-500/10 text-zinc-700 hover:text-red-400 transition"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
