"use client";

import { useState, useTransition } from "react";
import {
  UserPlus, Shield, ShieldCheck, User, Trash2,
  Copy, Check, Clock, X, Activity, Store, Settings2,
  LayoutDashboard, Package, ShoppingCart, Users, Search,
  ShoppingBag, FileText, Calculator, BarChart3, ListTodo,
  ClipboardList, FolderOpen, Zap, Users2,
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
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietaire",
  manager: "Manager",
  seller: "Vendeur",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  manager: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  seller: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <ShieldCheck size={14} />,
  manager: <Shield size={14} />,
  seller: <User size={14} />,
};

const PERM_CONFIG: { key: string; label: string; icon: React.ElementType; desc: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Tableau de bord" },
  { key: "products", label: "Stock", icon: Package, desc: "Consulter et gerer le stock" },
  { key: "sales", label: "Ventes", icon: ShoppingCart, desc: "Enregistrer et voir les ventes" },
  { key: "customers", label: "Clients", icon: Users, desc: "Voir les fiches clients" },
  { key: "analytics", label: "Analytique", icon: BarChart3, desc: "Acceder aux statistiques" },
  { key: "sourcing", label: "Sourcing", icon: Search, desc: "Gerer les demandes de sourcing" },
  { key: "personal_shopping", label: "Personal Shopping", icon: ShoppingBag, desc: "Gerer les missions PS" },
  { key: "tasks", label: "Taches", icon: ListTodo, desc: "Voir et creer des taches" },
  { key: "templates", label: "Templates", icon: ClipboardList, desc: "Utiliser les modeles" },
  { key: "invoices", label: "Factures", icon: FileText, desc: "Generer et voir les factures" },
  { key: "accounting", label: "Comptabilite", icon: Calculator, desc: "Livre de recettes/depenses" },
  { key: "documents", label: "Documents", icon: FolderOpen, desc: "Documents administratifs" },
  { key: "automations", label: "Automations", icon: Zap, desc: "Regles automatiques" },
  { key: "team", label: "Equipe", icon: Users2, desc: "Gerer l'equipe" },
  { key: "settings", label: "Reglages", icon: Settings2, desc: "Configuration de la boutique" },
];

const DEFAULT_PERMS: Record<string, string[]> = {
  manager: ["dashboard", "products", "sales", "customers", "analytics", "sourcing", "personal_shopping", "tasks", "templates"],
  seller: ["dashboard", "products", "sales", "tasks"],
};

function getMemberPerms(m: Member): string[] {
  if (m.role === "owner") return [...ALL_PERMISSIONS];
  if (m.permissions) {
    try { return JSON.parse(m.permissions); } catch {}
  }
  return DEFAULT_PERMS[m.role] ?? DEFAULT_PERMS.seller;
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
  automation_creee: "Automation creee",
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
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [editingPermsFor, setEditingPermsFor] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);

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

  function handleRemoveMember(id: string) {
    startTransition(async () => {
      const result = await removeMemberAction(id);
      if (result.error) setMessage({ type: "error", text: result.error });
      setConfirmRemove(null);
    });
  }

  function handleUpdateRole(memberId: string, role: "manager" | "seller") {
    startTransition(async () => {
      const result = await updateMemberRoleAction(memberId, role);
      if (result.error) setMessage({ type: "error", text: result.error });
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
    setEditPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
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
          <div className="flex gap-2">
            <input type="text" value={newShopName} onChange={(e) => setNewShopName(e.target.value)}
              className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]" autoFocus />
            <button onClick={handleSaveShopName} disabled={isPending}
              className="px-4 py-2 text-[13px] font-semibold text-[var(--color-text-inverse)] bg-rose-500 rounded-lg hover:bg-rose-400 transition disabled:opacity-50">Enregistrer</button>
            <button onClick={() => { setEditingShopName(false); setNewShopName(shopName); }}
              className="px-3 py-2 text-sm text-zinc-500 hover:text-zinc-300">Annuler</button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-white font-medium">{shopName}</span>
            <button onClick={() => setEditingShopName(true)} className="text-xs text-rose-400 hover:underline">Modifier</button>
          </div>
        )}
      </div>

      {/* Members */}
      <div className="card-static p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Membres ({members.length})</h2>
          <button onClick={() => setShowInviteForm(!showInviteForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-[var(--color-text-inverse)] bg-rose-500 rounded-lg hover:bg-rose-400 transition">
            <UserPlus size={13} />
            Inviter
          </button>
        </div>

        {/* Invite form */}
        {showInviteForm && (
          <div className="mb-5 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
            <div className="flex flex-col sm:flex-row gap-3">
              <input type="email" placeholder="email@exemple.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                onKeyDown={(e) => e.key === "Enter" && handleInvite()} />
              <div className="flex gap-2">
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as "manager" | "seller")}
                  className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                  <option value="seller">Vendeur</option>
                  <option value="manager">Manager</option>
                </select>
                <button onClick={handleInvite} disabled={isPending || !inviteEmail.trim()}
                  className="px-4 py-2 text-[13px] font-semibold text-[var(--color-text-inverse)] bg-rose-500 rounded-lg hover:bg-rose-400 transition disabled:opacity-50">
                  {isPending ? "..." : "Envoyer"}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-zinc-600 mt-2">Le lien sera copie automatiquement. Validite : 7 jours.</p>
          </div>
        )}

        {/* Members list */}
        <div className="space-y-1">
          {members.map((m) => {
            const isOwner = m.role === "owner";
            const isSelf = m.userId === currentUserId;
            const perms = getMemberPerms(m);
            const isEditingThis = editingPermsFor === m.id;

            return (
              <div key={m.id}>
                <div className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-[var(--color-bg)]/50 transition group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[var(--color-border)] flex items-center justify-center text-xs font-semibold text-zinc-500">
                      {m.userId.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-white">
                          {isSelf ? "Vous" : `Membre ${m.userId.substring(0, 8)}`}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${ROLE_COLORS[m.role]}`}>
                          {ROLE_ICONS[m.role]}
                          {ROLE_LABELS[m.role]}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-600">
                        {isOwner ? "Acces total" : `${perms.length} permissions`} · Depuis {new Date(m.joinedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>

                  {!isOwner && !isSelf && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => isEditingThis ? setEditingPermsFor(null) : openPermEditor(m)}
                        className={`p-1.5 rounded transition ${isEditingThis ? "bg-rose-500/10 text-rose-400" : "text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.03]"}`}
                        title="Permissions">
                        <Settings2 size={14} />
                      </button>
                      <select value={m.role} onChange={(e) => handleUpdateRole(m.id, e.target.value as "manager" | "seller")}
                        className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-[11px] text-white focus:outline-none">
                        <option value="seller">Vendeur</option>
                        <option value="manager">Manager</option>
                      </select>
                      {confirmRemove === m.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleRemoveMember(m.id)}
                            className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-[11px]">Confirmer</button>
                          <button onClick={() => setConfirmRemove(null)}
                            className="px-2 py-1 text-[11px] text-zinc-500">Annuler</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmRemove(m.id)}
                          className="p-1.5 rounded hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition" title="Retirer">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Permissions editor panel */}
                {isEditingThis && !isOwner && (
                  <div className="mx-3 mb-3 p-4 rounded-xl border border-rose-500/20 bg-rose-500/[0.02]">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[12px] font-semibold text-white">Permissions de {isSelf ? "votre compte" : `Membre ${m.userId.substring(0, 8)}`}</p>
                      <div className="flex gap-2">
                        <button onClick={() => setEditPerms(ALL_PERMISSIONS.filter((p) => !["team", "settings", "accounting", "automations"].includes(p)))}
                          className="text-[10px] text-zinc-500 hover:text-zinc-300">Tout cocher</button>
                        <button onClick={() => setEditPerms(["dashboard"])}
                          className="text-[10px] text-zinc-500 hover:text-zinc-300">Minimum</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                      {PERM_CONFIG.map((p) => {
                        const Icon = p.icon;
                        const checked = editPerms.includes(p.key);
                        return (
                          <button key={p.key} onClick={() => togglePerm(p.key)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all border ${
                              checked
                                ? "border-rose-500/20 bg-rose-500/5"
                                : "border-transparent hover:bg-white/[0.02]"
                            }`}>
                            <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                              checked ? "bg-rose-500 border-rose-500" : "border-zinc-600"
                            }`}>
                              {checked && <Check size={10} className="text-white" />}
                            </div>
                            <Icon size={13} className={checked ? "text-white" : "text-zinc-600"} />
                            <div>
                              <p className={`text-[11px] font-medium ${checked ? "text-white" : "text-zinc-500"}`}>{p.label}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-[var(--color-border)]">
                      <button onClick={() => setEditingPermsFor(null)}
                        className="px-3 py-1.5 text-[12px] text-zinc-500 hover:text-zinc-300">Annuler</button>
                      <button onClick={handleSavePerms} disabled={isPending}
                        className="px-4 py-1.5 text-[12px] font-semibold text-[var(--color-text-inverse)] bg-rose-500 rounded-lg hover:bg-rose-400 transition disabled:opacity-50">
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
            <Clock size={14} className="text-zinc-500" />
            Invitations en attente ({invitations.length})
          </h2>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[var(--color-bg)]/40">
                <div>
                  <span className="text-sm text-white">{inv.email}</span>
                  <span className={`ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${ROLE_COLORS[inv.role]}`}>
                    {ROLE_LABELS[inv.role]}
                  </span>
                  <p className="text-[10px] text-zinc-600">
                    Expire le {new Date(inv.expiresAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => {
                    const link = `${window.location.origin}/api/auth/callback?invite=${inv.token}`;
                    navigator.clipboard.writeText(link);
                    setCopiedToken(inv.token);
                    setTimeout(() => setCopiedToken(null), 2000);
                  }} className="p-1.5 rounded hover:bg-white/[0.03] text-zinc-600 hover:text-zinc-300 transition" title="Copier le lien">
                    {copiedToken === inv.token ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                  <button onClick={() => handleRevokeInvitation(inv.id)} disabled={isPending}
                    className="p-1.5 rounded hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition" title="Revoquer">
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
            {activity.slice(0, 15).map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 px-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500/50" />
                  <span className="text-white font-medium">{a.userName ?? a.userId.substring(0, 8)}</span>
                  <span className="text-zinc-500">{ACTION_LABELS[a.action] || a.action}</span>
                  {a.details && <span className="text-zinc-400">{a.details}</span>}
                </div>
                <span className="text-zinc-600 text-[10px]">{timeAgo(a.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
