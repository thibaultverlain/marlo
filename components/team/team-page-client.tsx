"use client";

import { useState, useTransition } from "react";
import {
  UserPlus, Shield, ShieldCheck, User, Trash2,
  Copy, Check, Clock, X, Activity, Store, Settings2,
  LayoutDashboard, Package, ShoppingCart, Users, Search,
  ShoppingBag, FileText, Calculator, BarChart3, ListTodo,
  FolderOpen, Users2, AlertCircle, ChevronDown,
  Info,
} from "lucide-react";
import {
  inviteMemberAction,
  revokeInvitationAction,
  removeMemberAction,
  updateMemberRoleAction,
  updateShopNameAction,
} from "@/lib/actions/team";
import { updateMemberPermissionsAction } from "@/lib/actions/permissions";
import type { TeamInvitation, ActivityLogEntry } from "@/lib/db/schema";
import { ALL_PERMISSIONS } from "@/lib/db/schema";

type Member = {
  id: string;
  userId: string;
  role: string;
  permissions: string | null;
  joinedAt: Date;
  email?: string | null;
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietaire",
  manager: "Manager",
  seller: "Vendeur",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  manager: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  seller: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <ShieldCheck size={11} />,
  manager: <Shield size={11} />,
  seller: <User size={11} />,
};

const PERM_CONFIG: { key: string; label: string; icon: React.ElementType }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "products", label: "Stock", icon: Package },
  { key: "sales", label: "Ventes", icon: ShoppingCart },
  { key: "customers", label: "Clients", icon: Users },
  { key: "analytics", label: "Analytique", icon: BarChart3 },
  { key: "sourcing", label: "Sourcing", icon: Search },
  { key: "personal_shopping", label: "Personal Shop.", icon: ShoppingBag },
  { key: "tasks", label: "Taches", icon: ListTodo },
  { key: "invoices", label: "Factures", icon: FileText },
  { key: "accounting", label: "Comptabilite", icon: Calculator },
  { key: "documents", label: "Documents", icon: FolderOpen },
  { key: "team", label: "Equipe", icon: Users2 },
  { key: "settings", label: "Reglages", icon: Settings2 },
];

const DEFAULT_PERMS: Record<string, string[]> = {
  manager: ["dashboard", "products", "sales", "customers", "analytics", "sourcing", "personal_shopping", "tasks", "invoices"],
  seller: ["dashboard", "products", "sales", "tasks"],
};

function getMemberPerms(m: Member): string[] {
  if (m.role === "owner") return [...ALL_PERMISSIONS];
  if (m.permissions) {
    try { return JSON.parse(m.permissions); } catch {}
  }
  return DEFAULT_PERMS[m.role] ?? DEFAULT_PERMS.seller;
}

function memberDisplayName(m: Member, currentUserId: string): string {
  if (m.userId === currentUserId) return "Vous";
  if (m.email) return m.email.split("@")[0];
  return `Membre ${m.userId.substring(0, 6)}`;
}

function memberInitials(m: Member): string {
  if (m.email) {
    const local = m.email.split("@")[0];
    if (local.length >= 2) return local.substring(0, 2).toUpperCase();
  }
  return m.userId.substring(0, 2).toUpperCase();
}

const ACTION_LABELS: Record<string, string> = {
  invitation_envoyee: "Invitation envoyee",
  invitation_revoquee: "Invitation revoquee",
  membre_retire: "Membre retire",
  role_modifie: "Role modifie",
  permissions_modifiees: "Permissions modifiees",
  boutique_renommee: "Boutique renommee",
  tache_creee: "Tache creee",
  tache_terminee: "Tache terminee",
};

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "A l'instant";
  if (mins < 60) return `Il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
}

export default function TeamPageClient({
  members,
  invitations,
  shopName,
  currentUserId,
  activity,
}: {
  members: Member[];
  invitations: TeamInvitation[];
  shopName: string;
  currentUserId: string;
  activity: ActivityLogEntry[];
}) {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"manager" | "seller">("seller");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [editingShopName, setEditingShopName] = useState(false);
  const [newShopName, setNewShopName] = useState(shopName);
  const [confirmRemoveMember, setConfirmRemoveMember] = useState<Member | null>(null);
  const [confirmRoleChange, setConfirmRoleChange] = useState<{ member: Member; newRole: "manager" | "seller" } | null>(null);
  const [editingPermsFor, setEditingPermsFor] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [showActivityAll, setShowActivityAll] = useState(false);
  const [showRoleHelp, setShowRoleHelp] = useState(false);

  // Activity this week
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const activityThisWeek = activity.filter((a) => new Date(a.createdAt) >= oneWeekAgo).length;

  function handleInvite() {
    if (!inviteEmail.trim()) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("email", inviteEmail.trim());
      fd.set("role", inviteRole);
      const result = await inviteMemberAction(fd);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "Invitation envoyee." });
        setInviteEmail("");
        setShowInviteForm(false);
        if (result.token) {
          const link = `${window.location.origin}/api/auth/callback?invite=${result.token}`;
          navigator.clipboard.writeText(link).then(() => setCopiedToken(result.token!));
        }
      }
      setTimeout(() => setMessage(null), 5000);
    });
  }

  function handleRevokeInvitation(id: string) {
    startTransition(async () => { await revokeInvitationAction(id); });
  }

  function handleRemoveMember() {
    if (!confirmRemoveMember) return;
    const id = confirmRemoveMember.id;
    startTransition(async () => {
      const result = await removeMemberAction(id);
      if (result.error) setMessage({ type: "error", text: result.error });
      setConfirmRemoveMember(null);
    });
  }

  function handleConfirmRoleChange() {
    if (!confirmRoleChange) return;
    const { member, newRole } = confirmRoleChange;
    startTransition(async () => {
      const result = await updateMemberRoleAction(member.id, newRole);
      if (result.error) setMessage({ type: "error", text: result.error });
      else setMessage({ type: "success", text: `Role mis a jour : ${ROLE_LABELS[newRole]}` });
      setConfirmRoleChange(null);
      setTimeout(() => setMessage(null), 3000);
    });
  }

  function handleSaveShopName() {
    startTransition(async () => {
      const result = await updateShopNameAction(newShopName);
      if (result.error) setMessage({ type: "error", text: result.error });
      else setEditingShopName(false);
    });
  }

  function openPermEditor(m: Member) {
    setEditingPermsFor(m.id);
    setEditPerms(getMemberPerms(m));
  }

  function togglePerm(perm: string) {
    setEditPerms((prev) => prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]);
  }

  function handleSavePerms() {
    if (!editingPermsFor) return;
    startTransition(async () => {
      const result = await updateMemberPermissionsAction(editingPermsFor!, editPerms);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: "Permissions mises a jour." });
        setEditingPermsFor(null);
        setTimeout(() => setMessage(null), 3000);
      }
    });
  }

  const activityToShow = showActivityAll ? activity : activity.slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Message banner */}
      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm flex items-center justify-between ${
          message.type === "success"
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            : "bg-red-500/10 text-red-400 border border-red-500/20"
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-3 opacity-60 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Membres</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Users2 size={16} className="text-emerald-400" /></div>
          </div>
          <p className="text-[22px] font-bold tabular-nums text-white mt-auto">{members.length}</p>
        </div>
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Invitations</p>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center"><Clock size={16} className="text-amber-400" /></div>
          </div>
          <p className={`text-[22px] font-bold tabular-nums mt-auto ${invitations.length > 0 ? "text-amber-400" : "text-white"}`}>{invitations.length}</p>
        </div>
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Activite 7j</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Activity size={16} className="text-emerald-400" /></div>
          </div>
          <p className="text-[22px] font-bold tabular-nums text-white mt-auto">{activityThisWeek}</p>
        </div>
      </div>

      {/* Shop name */}
      <div className="card-static p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center">
            <Store size={16} className="text-rose-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Boutique</h2>
            <p className="text-[11px] text-zinc-500">Nom affiche pour l'equipe</p>
          </div>
        </div>
        {editingShopName ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <input type="text" value={newShopName} onChange={(e) => setNewShopName(e.target.value)}
              className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-rose-500/50" autoFocus />
            <div className="flex gap-2">
              <button onClick={handleSaveShopName} disabled={isPending}
                className="flex-1 sm:flex-none px-4 py-2 text-[13px] font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition disabled:opacity-50">
                Enregistrer
              </button>
              <button onClick={() => { setEditingShopName(false); setNewShopName(shopName); }}
                className="px-3 py-2 text-sm text-zinc-500 hover:text-zinc-300">Annuler</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-white font-medium">{shopName}</span>
            <button onClick={() => setEditingShopName(true)} className="text-xs text-rose-400 hover:text-rose-300 font-medium">Modifier</button>
          </div>
        )}
      </div>

      {/* Members */}
      <div className="card-static p-5">
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-white">Membres ({members.length})</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRoleHelp(!showRoleHelp)}
              className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition"
            >
              <Info size={11} />
              Les roles
            </button>
            <button onClick={() => setShowInviteForm(!showInviteForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition">
              <UserPlus size={13} />
              Inviter
            </button>
          </div>
        </div>

        {/* Roles help */}
        {showRoleHelp && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/[0.05] border border-emerald-500/15 text-[11px] text-emerald-300/80 space-y-1.5">
            <p><span className="inline-flex items-center gap-1 font-semibold text-amber-400"><ShieldCheck size={10} /> Proprietaire</span> · Acces total a tout, ne peut pas etre modifie.</p>
            <p><span className="inline-flex items-center gap-1 font-semibold text-emerald-400"><Shield size={10} /> Manager</span> · Acces a Dashboard, Stock, Ventes, Clients, Analytique, Sourcing, PS, Taches, Factures. Pas comptabilite, equipe, reglages.</p>
            <p><span className="inline-flex items-center gap-1 font-semibold text-zinc-400"><User size={10} /> Vendeur</span> · Acces a Dashboard, Stock, Ventes, Taches. Permissions ajustables individuellement.</p>
          </div>
        )}

        {/* Invite form */}
        {showInviteForm && (
          <div className="mb-5 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
            <div className="flex flex-col sm:flex-row gap-3">
              <input type="email" placeholder="email@exemple.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                onKeyDown={(e) => e.key === "Enter" && handleInvite()} />
              <div className="flex gap-2">
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as "manager" | "seller")}
                  className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-rose-500/50">
                  <option value="seller">Vendeur</option>
                  <option value="manager">Manager</option>
                </select>
                <button onClick={handleInvite} disabled={isPending || !inviteEmail.trim()}
                  className="px-4 py-2 text-[13px] font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition disabled:opacity-50">
                  {isPending ? "..." : "Envoyer"}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-zinc-500 mt-2">Le lien sera copie automatiquement. Validite : 7 jours.</p>
          </div>
        )}

        {/* Members list */}
        <div className="space-y-1">
          {members.map((m) => {
            const isOwner = m.role === "owner";
            const isSelf = m.userId === currentUserId;
            const perms = getMemberPerms(m);
            const isEditingThis = editingPermsFor === m.id;
            const displayName = memberDisplayName(m, currentUserId);

            return (
              <div key={m.id}>
                <div className="flex items-center justify-between gap-2 py-3 px-3 rounded-lg hover:bg-[var(--color-bg)]/50 transition">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-full bg-rose-500/15 flex items-center justify-center text-xs font-semibold text-rose-300 flex-shrink-0">
                      {memberInitials(m)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-medium text-white truncate">{displayName}</span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${ROLE_COLORS[m.role]}`}>
                          {ROLE_ICONS[m.role]}
                          {ROLE_LABELS[m.role]}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate">
                        {m.email ?? `ID ${m.userId.substring(0, 8)}`}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {isOwner ? "Acces total" : `${perms.length} permission${perms.length > 1 ? "s" : ""}`} · Depuis {new Date(m.joinedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>

                  {/* Actions ALWAYS visible */}
                  {!isOwner && !isSelf && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => isEditingThis ? setEditingPermsFor(null) : openPermEditor(m)}
                        className={`p-1.5 rounded transition ${isEditingThis ? "bg-rose-500/10 text-rose-400" : "text-zinc-500 hover:text-zinc-200 hover:bg-[var(--color-bg-hover)]"}`}
                        title="Permissions">
                        <Settings2 size={14} />
                      </button>
                      <select value={m.role}
                        onChange={(e) => setConfirmRoleChange({ member: m, newRole: e.target.value as "manager" | "seller" })}
                        className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-rose-500/50">
                        <option value="seller">Vendeur</option>
                        <option value="manager">Manager</option>
                      </select>
                      <button onClick={() => setConfirmRemoveMember(m)}
                        className="p-1.5 rounded hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition" title="Retirer">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Permissions editor panel */}
                {isEditingThis && !isOwner && (
                  <div className="mx-3 mb-3 p-4 rounded-xl border border-rose-500/20 bg-rose-500/[0.02]">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[12px] font-semibold text-white">Permissions de {displayName}</p>
                      <div className="flex gap-1.5">
                        <button onClick={() => setEditPerms(ALL_PERMISSIONS.filter((p) => !["team", "settings", "accounting"].includes(p)))}
                          className="px-2 py-1 text-[10px] font-medium text-zinc-400 bg-[var(--color-bg-card)] rounded hover:text-zinc-200">Tout cocher</button>
                        <button onClick={() => setEditPerms(["dashboard"])}
                          className="px-2 py-1 text-[10px] font-medium text-zinc-400 bg-[var(--color-bg-card)] rounded hover:text-zinc-200">Minimum</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {PERM_CONFIG.map((p) => {
                        const Icon = p.icon;
                        const checked = editPerms.includes(p.key);
                        return (
                          <button key={p.key} onClick={() => togglePerm(p.key)}
                            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all border ${
                              checked ? "border-rose-500/20 bg-rose-500/5" : "border-transparent hover:bg-white/[0.02]"
                            }`}>
                            <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all flex-shrink-0 ${
                              checked ? "bg-rose-500 border-rose-500" : "border-zinc-600"
                            }`}>
                              {checked && <Check size={10} className="text-white" />}
                            </div>
                            <Icon size={13} className={checked ? "text-white" : "text-zinc-500"} />
                            <p className={`text-[11px] font-medium truncate ${checked ? "text-white" : "text-zinc-500"}`}>{p.label}</p>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-[var(--color-border)]">
                      <button onClick={() => setEditingPermsFor(null)}
                        className="px-3 py-1.5 text-[12px] text-zinc-500 hover:text-zinc-300">Annuler</button>
                      <button onClick={handleSavePerms} disabled={isPending}
                        className="px-4 py-1.5 text-[12px] font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition disabled:opacity-50">
                        {isPending ? "..." : "Enregistrer"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div className="card-static p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Clock size={14} className="text-amber-400" />
            Invitations en attente ({invitations.length})
          </h2>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-2 py-2.5 px-3 rounded-lg bg-[var(--color-bg)]/40">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-white truncate">{inv.email}</span>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${ROLE_COLORS[inv.role]}`}>
                      {ROLE_LABELS[inv.role]}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    Expire le {new Date(inv.expiresAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => {
                    const link = `${window.location.origin}/api/auth/callback?invite=${inv.token}`;
                    navigator.clipboard.writeText(link);
                    setCopiedToken(inv.token);
                    setTimeout(() => setCopiedToken(null), 2000);
                  }} className="p-1.5 rounded hover:bg-[var(--color-bg-hover)] text-zinc-500 hover:text-zinc-200 transition" title="Copier le lien">
                    {copiedToken === inv.token ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                  <button onClick={() => handleRevokeInvitation(inv.id)} disabled={isPending}
                    className="p-1.5 rounded hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition" title="Revoquer">
                    <X size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity log */}
      {activity.length > 0 && (
        <div className="card-static p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Activity size={14} className="text-zinc-500" />
            Activite recente
          </h2>
          <div className="space-y-1">
            {activityToShow.map((a) => (
              <div key={a.id} className="flex items-start justify-between py-2 px-2 text-xs gap-2">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500/50 mt-1.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-white font-medium">{a.userName ?? a.userId.substring(0, 8)}</span>
                    <span className="text-zinc-500 ml-1.5">{ACTION_LABELS[a.action] || a.action}</span>
                    {a.details && <span className="text-zinc-400 ml-1">{a.details}</span>}
                  </div>
                </div>
                <span className="text-zinc-500 text-[10px] flex-shrink-0">{timeAgo(a.createdAt)}</span>
              </div>
            ))}
          </div>
          {activity.length > 8 && (
            <button
              onClick={() => setShowActivityAll(!showActivityAll)}
              className="mt-3 w-full text-center text-[11px] text-rose-400 hover:text-rose-300 font-medium flex items-center justify-center gap-1"
            >
              <ChevronDown size={11} className={`transition-transform ${showActivityAll ? "rotate-180" : ""}`} />
              {showActivityAll ? "Reduire" : `Voir tout (${activity.length})`}
            </button>
          )}
        </div>
      )}

      {/* Confirm remove member modal */}
      {confirmRemoveMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setConfirmRemoveMember(null)}>
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center"><Trash2 size={18} className="text-red-400" /></div>
              <div>
                <h3 className="text-[15px] font-semibold text-white">Retirer le membre</h3>
                <p className="text-[12px] text-zinc-500 mt-0.5 truncate max-w-[280px]">
                  {memberDisplayName(confirmRemoveMember, currentUserId)}
                </p>
              </div>
              <button onClick={() => setConfirmRemoveMember(null)} className="ml-auto p-1 rounded hover:bg-[var(--color-bg-hover)] text-zinc-500">
                <X size={16} />
              </button>
            </div>
            <p className="text-[13px] text-zinc-400 mb-5">
              Le membre perdra acces a la boutique immediatement. Cette action est irreversible.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmRemoveMember(null)} className="px-3 py-2 text-[13px] text-zinc-400 hover:text-zinc-200">
                Annuler
              </button>
              <button onClick={handleRemoveMember} disabled={isPending} className="px-4 py-2 text-[13px] font-semibold text-white bg-red-500 rounded-lg hover:bg-red-400 disabled:opacity-50">
                {isPending ? "..." : "Retirer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm role change modal */}
      {confirmRoleChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setConfirmRoleChange(null)}>
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center"><AlertCircle size={18} className="text-rose-400" /></div>
              <div>
                <h3 className="text-[15px] font-semibold text-white">Changer le role</h3>
                <p className="text-[12px] text-zinc-500 mt-0.5">{memberDisplayName(confirmRoleChange.member, currentUserId)}</p>
              </div>
              <button onClick={() => setConfirmRoleChange(null)} className="ml-auto p-1 rounded hover:bg-[var(--color-bg-hover)] text-zinc-500">
                <X size={16} />
              </button>
            </div>
            <p className="text-[13px] text-zinc-400 mb-2">
              Passer de <span className="text-white font-medium">{ROLE_LABELS[confirmRoleChange.member.role]}</span> a <span className="text-white font-medium">{ROLE_LABELS[confirmRoleChange.newRole]}</span> ?
            </p>
            <p className="text-[11px] text-zinc-500 mb-5">
              Les permissions seront automatiquement ajustees aux valeurs par defaut du nouveau role.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmRoleChange(null)} className="px-3 py-2 text-[13px] text-zinc-400 hover:text-zinc-200">
                Annuler
              </button>
              <button onClick={handleConfirmRoleChange} disabled={isPending} className="px-4 py-2 text-[13px] font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-400 disabled:opacity-50">
                {isPending ? "..." : "Changer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
