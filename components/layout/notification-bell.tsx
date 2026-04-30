"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, X, Check, CheckCheck, ShoppingCart, ListTodo, Users2, AlertTriangle, Package, FileText, Zap } from "lucide-react";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
};

const TYPE_CONFIG: Record<string, { icon: React.ElementType; iconClass: string; bgClass: string }> = {
  task_assigned: { icon: ListTodo, iconClass: "text-blue-400", bgClass: "bg-blue-500/10" },
  sale_recorded: { icon: ShoppingCart, iconClass: "text-emerald-400", bgClass: "bg-emerald-500/10" },
  member_joined: { icon: Users2, iconClass: "text-violet-400", bgClass: "bg-violet-500/10" },
  dormant_stock: { icon: Package, iconClass: "text-amber-400", bgClass: "bg-amber-500/10" },
  deadline_soon: { icon: AlertTriangle, iconClass: "text-red-400", bgClass: "bg-red-500/10" },
  invoice_created: { icon: FileText, iconClass: "text-cyan-400", bgClass: "bg-cyan-500/10" },
  automation: { icon: Zap, iconClass: "text-amber-400", bgClass: "bg-amber-500/10" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "A l'instant";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setNotifs(data.notifications ?? []);
      setUnread(data.unread ?? 0);
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleMarkRead(id: string) {
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnread((c) => Math.max(0, c - 1));
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read", id }),
    });
  }

  async function handleMarkAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_all_read" }),
    });
  }

  function handleClickNotif(notif: Notif) {
    if (!notif.read) handleMarkRead(notif.id);
    if (notif.href) {
      setOpen(false);
      window.location.href = notif.href;
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 px-3 py-[8px] rounded-[10px] text-[13px] transition-all duration-200 text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.03] w-full"
      >
        <Bell size={16} strokeWidth={1.5} />
        <span className="flex-1 text-left">Notifications</span>
        {unread > 0 && (
          <span className="w-[18px] h-[18px] rounded-full bg-rose-500 text-[9px] font-bold text-black flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-0 left-[220px] w-[360px] max-h-[80vh] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-2xl shadow-black/40 z-[60] flex flex-col overflow-hidden animate-in">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between flex-shrink-0">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded-md hover:bg-white/5 transition flex items-center gap-1"
                >
                  <CheckCheck size={12} />
                  Tout lire
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={28} className="mx-auto text-zinc-700 mb-2" />
                <p className="text-sm text-zinc-600">Aucune notification</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {notifs.map((n) => {
                  const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.task_assigned;
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleClickNotif(n)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                        n.read ? "opacity-50 hover:opacity-70" : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl ${cfg.bgClass} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Icon size={15} className={cfg.iconClass} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-[13px] truncate ${n.read ? "text-zinc-500" : "text-zinc-200 font-medium"}`}>
                            {n.title}
                          </p>
                          {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />}
                        </div>
                        {n.body && (
                          <p className="text-[11px] text-zinc-500 truncate mt-0.5">{n.body}</p>
                        )}
                        <p className="text-[10px] text-zinc-600 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.read && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }}
                          className="p-1 rounded hover:bg-white/5 text-zinc-700 hover:text-zinc-400 transition flex-shrink-0"
                          title="Marquer comme lu"
                        >
                          <Check size={12} />
                        </button>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .animate-in {
          animation: notifSlideIn 0.15s ease-out;
        }
        @keyframes notifSlideIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
