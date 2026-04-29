"use client";

import { useState, useTransition } from "react";
import {
  UserPlus, Shield, ShieldCheck, User, Trash2, ChevronDown,
  Copy, Check, Clock, X, Activity, Store,
} from "lucide-react";
import {
  inviteMemberAction,
  revokeInvitationAction,
  removeMemberAction,
  updateMemberRoleAction,
  updateShopNameAction,
} from "@/lib/actions/team";
import type { TeamInvitation, ActivityLogEntry } from "@/lib/db/schema";

type Member = {
  id: string;
  userId: string;
  role: string;
  joinedAt: Date;
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Propriétaire",
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

const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: "Accès total : équipe, réglages, compta, factures",
  manager: "Stock, ventes, clients, sourcing, PS, analytics",
  seller: "Consulte le stock, enregistre ses ventes",
};

const ACTION_LABELS: Record<string, string> = {
  invitation_envoyee: "Invitation envoyée",
  invitation_revoquee: "Invitation révoquée",
  membre_retire: "Membre retiré",
  role_modifie: "Rôle modifié",
  boutique_renommee: "Boutique renommée",
  produit_ajoute: "Produit ajouté",
  vente_enregistree: "Vente enregistrée",
  facture_generee: "Facture générée",
};

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days}j`;
  return new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
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
        setMessage({ type: "success", text: `Invitation envoyée. Lien : copiez le token ci-dessous.` });
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
    startTransition(async () => {
      await revokeInvitationAction(id);
    });
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
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setEditingShopName(false);
      }
    });
  }

  return (
    <div className="space-y-8">
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
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-[var(--color-accent)]/10 flex items-center justify-center">
            <Store size={16} className="text-[var(--color-accent)]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Boutique</h2>
            <p className="text-xs text-[var(--color-text-muted)]">Nom affiché pour l'équipe</p>
          </div>
        </div>
        {editingShopName ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={newShopName}
              onChange={(e) => setNewShopName(e.target.value)}
              className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              autoFocus
            />
            <button onClick={handleSaveShopName} disabled={isPending} className="px-4 py-2 bg-[var(--color-accent)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition disabled:opacity-50">
              Enregistrer
            </button>
            <button onClick={() => { setEditingShopName(false); setNewShopName(shopName); }} className="px-3 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
              Annuler
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text)] font-medium">{shopName}</span>
            <button onClick={() => setEditingShopName(true)} className="text-xs text-[var(--color-accent)] hover:underline">
              Modifier
            </button>
          </div>
        )}
      </div>

      {/* Role legend */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
        <h2 className="text-sm font-semibold text-[var(--color-text)] mb-4">Permissions par rôle</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(["owner", "manager", "seller"] as const).map((role) => (
            <div key={role} className="rounded-lg border border-[var(--color-border)] p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${ROLE_COLORS[role]}`}>
                  {ROLE_ICONS[role]}
                  {ROLE_LABELS[role]}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">{ROLE_DESCRIPTIONS[role]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Members */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">
            Membres ({members.length})
          </h2>
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-accent)] text-white text-xs font-medium rounded-lg hover:opacity-90 transition"
          >
            <UserPlus size={13} />
            Inviter
          </button>
        </div>

        {/* Invite form */}
        {showInviteForm && (
          <div className="mb-5 p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="email@exemple.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              />
              <div className="flex gap-2">
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "manager" | "seller")}
                  className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                >
                  <option value="seller">Vendeur</option>
                  <option value="manager">Manager</option>
                </select>
                <button
                  onClick={handleInvite}
                  disabled={isPending || !inviteEmail.trim()}
                  className="px-4 py-2 bg-[var(--color-accent)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition disabled:opacity-50"
                >
                  {isPending ? "..." : "Envoyer"}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-2">
              Le lien d'invitation sera copié automatiquement. Validité : 7 jours.
            </p>
          </div>
        )}

        {/* Members list */}
        <div className="space-y-2">
          {members.map((m) => {
            const isOwner = m.role === "owner";
            const isSelf = m.userId === currentUserId;
            return (
              <div key={m.id} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-[var(--color-bg)]/50 transition group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-border)] flex items-center justify-center text-xs font-semibold text-[var(--color-text-muted)]">
                    {m.userId.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[var(--color-text)]">
                        {isSelf ? "Vous" : `Membre ${m.userId.substring(0, 8)}`}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${ROLE_COLORS[m.role]}`}>
                        {ROLE_ICONS[m.role]}
                        {ROLE_LABELS[m.role]}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      Depuis {new Date(m.joinedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>

                {!isOwner && !isSelf && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <select
                      value={m.role}
                      onChange={(e) => handleUpdateRole(m.id, e.target.value as "manager" | "seller")}
                      className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-[11px] text-[var(--color-text)] focus:outline-none"
                    >
                      <option value="seller">Vendeur</option>
                      <option value="manager">Manager</option>
                    </select>
                    {confirmRemove === m.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-[11px] hover:bg-red-500/30"
                        >
                          Confirmer
                        </button>
                        <button
                          onClick={() => setConfirmRemove(null)}
                          className="px-2 py-1 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRemove(m.id)}
                        className="p-1.5 rounded hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400 transition"
                        title="Retirer"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
          <h2 className="text-sm font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
            <Clock size={14} className="text-[var(--color-text-muted)]" />
            Invitations en attente ({invitations.length})
          </h2>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[var(--color-bg)]/40">
                <div>
                  <span className="text-sm text-[var(--color-text)]">{inv.email}</span>
                  <span className={`ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${ROLE_COLORS[inv.role]}`}>
                    {ROLE_LABELS[inv.role]}
                  </span>
                  <p className="text-[10px] text-[var(--color-text-muted)]">
                    Expire le {new Date(inv.expiresAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const link = `${window.location.origin}/api/auth/callback?invite=${inv.token}`;
                      navigator.clipboard.writeText(link);
                      setCopiedToken(inv.token);
                      setTimeout(() => setCopiedToken(null), 2000);
                    }}
                    className="p-1.5 rounded hover:bg-[var(--color-border)]/50 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition"
                    title="Copier le lien"
                  >
                    {copiedToken === inv.token ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                  <button
                    onClick={() => handleRevokeInvitation(inv.id)}
                    disabled={isPending}
                    className="p-1.5 rounded hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400 transition"
                    title="Révoquer"
                  >
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
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
          <h2 className="text-sm font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
            <Activity size={14} className="text-[var(--color-text-muted)]" />
            Activité récente
          </h2>
          <div className="space-y-1">
            {activity.slice(0, 15).map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 px-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]/50" />
                  <span className="text-[var(--color-text-muted)]">
                    {ACTION_LABELS[a.action] || a.action}
                  </span>
                  {a.details && (
                    <span className="text-[var(--color-text)]">{a.details}</span>
                  )}
                </div>
                <span className="text-[var(--color-text-muted)] text-[10px]">{timeAgo(a.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
