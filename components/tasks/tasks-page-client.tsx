"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  Plus, CheckCircle2, Circle, Clock, AlertTriangle, Trash2,
  X, ListTodo, ArrowUp, ArrowRight, ArrowDown, Calendar, Flame,
  Search, ArrowUpDown, ChevronDown, Edit2,
} from "lucide-react";
import {
  createTaskAction,
  completeTaskAction,
  updateTaskStatusAction,
  updateTaskAction,
  deleteTaskAction,
} from "@/lib/actions/tasks";
import type { Task } from "@/lib/db/schema";

type Member = { id: string; userId: string; role: string; joinedAt: Date; email?: string | null };

const STATUS_CONFIG = {
  a_faire: { label: "A faire", icon: Circle, iconClass: "text-zinc-500", bgClass: "bg-zinc-500/10" },
  en_cours: { label: "En cours", icon: Clock, iconClass: "text-amber-400", bgClass: "bg-amber-500/10" },
  fait: { label: "Fait", icon: CheckCircle2, iconClass: "text-emerald-400", bgClass: "bg-emerald-500/10" },
} as const;

const PRIORITY_CONFIG = {
  haute: { label: "Haute", icon: ArrowUp, cl: "text-red-400" },
  normale: { label: "Normale", icon: ArrowRight, cl: "text-zinc-500" },
  basse: { label: "Basse", icon: ArrowDown, cl: "text-zinc-500" },
} as const;

const SORT_OPTIONS = [
  { value: "priority", label: "Par priorite" },
  { value: "due", label: "Deadline proche" },
  { value: "recent", label: "Recemment cree" },
  { value: "oldest", label: "Plus ancien" },
];

function isOverdue(dueDate: string | Date | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

function formatDueDate(d: string | Date | null): string {
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

function memberLabel(userId: string, currentUserId: string, members: Member[]): string {
  if (userId === currentUserId) return "Moi";
  const m = members.find((x) => x.userId === userId);
  if (m?.email) {
    const name = m.email.split("@")[0];
    return name;
  }
  return userId.substring(0, 6);
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

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sort, setSort] = useState("priority");
  const [showSort, setShowSort] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPriority, setEditPriority] = useState<"haute" | "normale" | "basse">("normale");
  const [editDueDate, setEditDueDate] = useState("");

  const filtered = useMemo(() => {
    let list = tasks.filter((t) => {
      const matchSearch =
        search === "" ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase());
      const matchPriority = priorityFilter === "all" || t.priority === priorityFilter;
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      return matchSearch && matchPriority && matchStatus;
    });

    list = [...list];
    const priorityWeight: Record<string, number> = { haute: 0, normale: 1, basse: 2 };
    switch (sort) {
      case "due":
        list.sort((a, b) => {
          const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return aDue - bDue;
        });
        break;
      case "recent":
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "oldest":
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "priority":
      default:
        list.sort((a, b) => {
          const aDone = a.status === "fait" ? 1 : 0;
          const bDone = b.status === "fait" ? 1 : 0;
          if (aDone !== bDone) return aDone - bDone;
          return (priorityWeight[a.priority] ?? 1) - (priorityWeight[b.priority] ?? 1);
        });
    }
    return list;
  }, [tasks, search, priorityFilter, statusFilter, sort]);

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
      if (result?.error) setError(result.error);
      else {
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

  function startEditing(task: Task) {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditPriority(task.priority as any);
    setEditDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "");
  }
  function saveEdit(taskId: string) {
    if (!editTitle.trim()) return;
    startTransition(async () => {
      await updateTaskAction(taskId, {
        title: editTitle.trim(),
        priority: editPriority,
        dueDate: editDueDate || null,
      });
      setEditingId(null);
    });
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Taches</h1>
          <p className="text-zinc-500 mt-1 text-sm">{counts.open} en cours</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors"
        >
          <Plus size={14} />
          Nouvelle tache
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">En cours</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Circle size={16} className="text-emerald-400" /></div>
          </div>
          <p className="text-[22px] font-bold tabular-nums text-white mt-auto">{counts.open}</p>
        </div>
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Mes taches</p>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center"><ListTodo size={16} className="text-rose-400" /></div>
          </div>
          <p className="text-[22px] font-bold tabular-nums text-white mt-auto">{counts.mine}</p>
        </div>
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Priorite haute</p>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center"><ArrowUp size={16} className="text-rose-400" /></div>
          </div>
          <p className={`text-[22px] font-bold tabular-nums mt-auto ${counts.haute > 0 ? "text-rose-400" : "text-white"}`}>{counts.haute}</p>
        </div>
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">En retard</p>
            <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center"><AlertTriangle size={16} className="text-red-400" /></div>
          </div>
          <p className={`text-[22px] font-bold tabular-nums mt-auto ${counts.overdue > 0 ? "text-red-400" : "text-white"}`}>{counts.overdue}</p>
        </div>
      </div>

      {/* Bandeau urgence */}
      {counts.overdue > 0 && (
        <div className="flex items-center gap-3 bg-red-500/[0.08] border border-red-500/20 rounded-xl px-4 py-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
            <Flame size={16} className="text-red-400" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-red-300">
              {counts.overdue} tache{counts.overdue > 1 ? "s" : ""} en retard
            </p>
            <p className="text-[11px] text-red-400/70 mt-0.5">A traiter en priorite</p>
          </div>
        </div>
      )}

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
            placeholder="Ex: Expedier la commande Gucci Jordaan"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-text)] placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-rose-500/50"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleCreate()}
          />
          <textarea
            placeholder="Description (optionnel)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-text)] placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-rose-500/50 resize-none"
          />
          <div className="flex flex-wrap gap-2">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[13px] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-rose-500/50"
            >
              <option value="haute">Haute priorite</option>
              <option value="normale">Normale</option>
              <option value="basse">Basse</option>
            </select>
            {members.length > 1 && (
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[13px] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-rose-500/50"
              >
                <option value="">Non assignee</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {memberLabel(m.userId, currentUserId, members)}
                  </option>
                ))}
              </select>
            )}
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[13px] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-rose-500/50"
            />
            <div className="flex gap-2 ml-auto">
              <button onClick={() => setShowForm(false)} className="px-3 py-2 text-[13px] text-zinc-500 hover:text-zinc-300">Annuler</button>
              <button
                onClick={handleCreate}
                disabled={isPending || !title.trim()}
                className="px-4 py-2 text-[13px] font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors disabled:opacity-50"
              >
                {isPending ? "..." : "Creer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters - main tabs */}
      <div className="flex bg-zinc-800/60 rounded-lg p-0.5 w-fit overflow-x-auto">
        {([
          { key: "open", label: `En cours (${counts.open})` },
          { key: "mine", label: `Mes taches (${counts.mine})` },
          { key: "all", label: `Tout (${counts.total})` },
        ] as const).map((f) => (
          <Link
            key={f.key}
            href={`/tasks?filter=${f.key}`}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all whitespace-nowrap ${
              activeFilter === f.key
                ? "bg-[var(--color-accent-muted)] text-rose-400"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Search + secondary filters + sort */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-[13px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500/50 text-zinc-200 placeholder:text-zinc-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-[13px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-rose-500/50 text-zinc-300"
          >
            <option value="all">Toute priorite</option>
            <option value="haute">Haute</option>
            <option value="normale">Normale</option>
            <option value="basse">Basse</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-[13px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-rose-500/50 text-zinc-300"
          >
            <option value="all">Tous statuts</option>
            <option value="a_faire">A faire</option>
            <option value="en_cours">En cours</option>
            <option value="fait">Fait</option>
          </select>
          <div className="relative">
            <button onClick={() => setShowSort(!showSort)}
              className="flex items-center gap-2 px-3 py-2 text-[13px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg hover:text-zinc-200 text-zinc-400">
              <ArrowUpDown size={13} />
              <span className="hidden sm:inline">{SORT_OPTIONS.find((s) => s.value === sort)?.label}</span>
              <ChevronDown size={12} />
            </button>
            {showSort && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSort(false)} />
                <div className="absolute right-0 top-full mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg shadow-xl shadow-black/30 py-1 z-50 min-w-[180px]">
                  {SORT_OPTIONS.map((opt) => (
                    <button key={opt.value}
                      onClick={() => { setSort(opt.value); setShowSort(false); }}
                      className={`w-full px-3 py-1.5 text-left text-[13px] hover:bg-[var(--color-bg-hover)] transition ${sort === opt.value ? "text-rose-400 font-medium" : "text-zinc-300"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="card-static p-12 text-center">
          <ListTodo size={40} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500 text-sm mb-4">Aucune tache trouvee</p>
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors">
            <Plus size={14} />
            Creer
          </button>
        </div>
      ) : (
        <div className="card-static overflow-hidden">
          <div className="divide-y divide-[var(--color-border)]">
            {filtered.map((task) => {
              const pr = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.normale;
              const PriorityIcon = pr.icon;
              const overdue = isOverdue(task.dueDate);
              const done = task.status === "fait";
              const isEditing = editingId === task.id;

              return (
                <div key={task.id} className={`flex items-start gap-3 px-4 sm:px-5 py-3 hover:bg-[var(--color-bg-hover)] transition-colors group ${done ? "opacity-50" : ""}`}>
                  {/* Complete button */}
                  <button
                    onClick={() => done ? handleStatusChange(task.id, "a_faire") : handleComplete(task.id)}
                    disabled={isPending}
                    className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all ${
                      done
                        ? "border-emerald-500 bg-emerald-500/20"
                        : "border-zinc-600 hover:border-rose-400 hover:bg-rose-500/10"
                    }`}
                  >
                    {done && <CheckCircle2 size={12} className="text-emerald-400" />}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(task.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          autoFocus
                          className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                        />
                        <div className="flex flex-wrap gap-2 items-center">
                          <select value={editPriority} onChange={(e) => setEditPriority(e.target.value as any)}
                            className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-[11px] text-zinc-300 focus:outline-none">
                            <option value="haute">Haute</option>
                            <option value="normale">Normale</option>
                            <option value="basse">Basse</option>
                          </select>
                          <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)}
                            className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-[11px] text-zinc-300 focus:outline-none" />
                          <div className="flex gap-1 ml-auto">
                            <button onClick={() => setEditingId(null)} className="px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-300">Annuler</button>
                            <button onClick={() => saveEdit(task.id)} disabled={isPending}
                              className="px-2.5 py-1 text-[11px] font-semibold text-white bg-rose-500 rounded hover:bg-rose-400 disabled:opacity-50">
                              Enregistrer
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <p className={`text-[13px] font-medium ${done ? "line-through text-zinc-500" : "text-zinc-200"}`}>
                            {task.title}
                          </p>
                          {task.priority === "haute" && !done && <PriorityIcon size={12} className={pr.cl} />}
                        </div>
                        {task.description && !done && (
                          <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {task.dueDate && (
                            <span className={`text-[11px] flex items-center gap-1 ${overdue && !done ? "text-red-400 font-semibold" : "text-zinc-500"}`}>
                              <Calendar size={9} />
                              {formatDueDate(task.dueDate as any)}
                            </span>
                          )}
                          {task.assignedTo && (
                            <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                              · {memberLabel(task.assignedTo, currentUserId, members)}
                            </span>
                          )}
                          {task.status === "en_cours" && !done && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-amber-300 bg-amber-500/15">
                              <Clock size={9} />
                              En cours
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions toujours visibles */}
                  {!isEditing && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!done && (
                        <>
                          <button
                            onClick={() => task.status === "a_faire" ? handleStatusChange(task.id, "en_cours") : handleStatusChange(task.id, "a_faire")}
                            disabled={isPending}
                            title={task.status === "a_faire" ? "Marquer en cours" : "Revenir a faire"}
                            className="p-1.5 rounded hover:bg-[var(--color-bg-hover)] text-zinc-500 hover:text-zinc-300 transition"
                          >
                            <Clock size={13} />
                          </button>
                          <button onClick={() => startEditing(task)} disabled={isPending}
                            title="Modifier"
                            className="p-1.5 rounded hover:bg-[var(--color-bg-hover)] text-zinc-500 hover:text-zinc-300 transition">
                            <Edit2 size={13} />
                          </button>
                        </>
                      )}
                      <button onClick={() => handleDelete(task.id)} disabled={isPending}
                        title="Supprimer"
                        className="p-1.5 rounded hover:bg-red-500/10 text-zinc-700 hover:text-red-400 transition">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
