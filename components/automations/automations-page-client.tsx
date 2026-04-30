"use client";

import { useState, useTransition } from "react";
import {
  Plus, Zap, Power, PowerOff, Trash2, X,
  Package, ShoppingCart, AlertTriangle, Clock,
  ListTodo, Bell, Users,
} from "lucide-react";
import {
  createAutomationAction,
  toggleAutomationAction,
  deleteAutomationAction,
} from "@/lib/actions/automations";
import type { Automation } from "@/lib/db/schema";

const TRIGGERS = [
  { value: "dormant_stock", label: "Stock dormant", desc: "Article en stock depuis N jours", icon: Package, iconClass: "text-amber-400", bgClass: "bg-amber-500/10", hasValue: true, valueLabel: "Jours", valuePlaceholder: "30" },
  { value: "sale_recorded", label: "Vente enregistree", desc: "Chaque fois qu'une vente est creee", icon: ShoppingCart, iconClass: "text-emerald-400", bgClass: "bg-emerald-500/10", hasValue: false },
  { value: "low_margin", label: "Marge faible", desc: "Marge inferieure a N%", icon: AlertTriangle, iconClass: "text-red-400", bgClass: "bg-red-500/10", hasValue: true, valueLabel: "Seuil (%)", valuePlaceholder: "20" },
  { value: "deadline_passed", label: "Deadline depassee", desc: "Deadline sourcing depassee", icon: Clock, iconClass: "text-violet-400", bgClass: "bg-violet-500/10", hasValue: false },
];

const ACTIONS = [
  { value: "create_task", label: "Creer une tache", icon: ListTodo, desc: "Ajoute une tache automatique" },
  { value: "notify_owner", label: "Notifier le proprietaire", icon: Bell, desc: "Envoie une notification" },
  { value: "notify_team", label: "Notifier l'equipe", icon: Users, desc: "Notifie tous les membres" },
];

function formatDate(d: Date | string | null): string {
  if (!d) return "Jamais";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function AutomationsPageClient({ automations }: { automations: Automation[] }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("dormant_stock");
  const [triggerValue, setTriggerValue] = useState("30");
  const [action, setAction] = useState("create_task");
  const [actionValue, setActionValue] = useState("Baisser le prix de {title}");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selectedTrigger = TRIGGERS.find((t) => t.value === trigger);

  function handleCreate() {
    if (!name.trim()) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", name.trim());
      fd.set("trigger", trigger);
      fd.set("triggerValue", triggerValue);
      fd.set("action", action);
      fd.set("actionValue", actionValue.trim());
      const result = await createAutomationAction(fd);
      if (result.error) {
        setError(result.error);
      } else {
        setName(""); setTriggerValue("30"); setActionValue(""); setShowForm(false);
      }
    });
  }

  function handleToggle(id: string, enabled: boolean) {
    startTransition(async () => { await toggleAutomationAction(id, enabled); });
  }

  function handleDelete(id: string) {
    startTransition(async () => { await deleteAutomationAction(id); });
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Automatisations</h1>
          <p className="text-zinc-500 mt-1 text-sm">
            {automations.filter((a) => a.enabled).length} active{automations.filter((a) => a.enabled).length > 1 ? "s" : ""}
            {automations.length > 0 && ` sur ${automations.length}`}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-[#0a0a0f] bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors"
        >
          <Plus size={14} />
          Nouvelle regle
        </button>
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
        <div className="card-static p-6 space-y-4">
          <input
            type="text"
            placeholder="Nom de la regle (ex: Alerte stock dormant)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            autoFocus
          />

          {/* Trigger selector */}
          <div>
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Quand</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TRIGGERS.map((t) => {
                const Icon = t.icon;
                const isSelected = trigger === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setTrigger(t.value)}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-rose-500/30 bg-rose-500/5"
                        : "border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${t.bgClass} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={15} className={t.iconClass} />
                    </div>
                    <div>
                      <p className={`text-[13px] font-medium ${isSelected ? "text-white" : "text-zinc-300"}`}>{t.label}</p>
                      <p className="text-[11px] text-zinc-600">{t.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedTrigger?.hasValue && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[12px] text-zinc-500">{selectedTrigger.valueLabel} :</span>
                <input
                  type="number"
                  value={triggerValue}
                  onChange={(e) => setTriggerValue(e.target.value)}
                  placeholder={selectedTrigger.valuePlaceholder}
                  className="w-20 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm text-white text-center focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                />
              </div>
            )}
          </div>

          {/* Action selector */}
          <div>
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Alors</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {ACTIONS.map((a) => {
                const Icon = a.icon;
                const isSelected = action === a.value;
                return (
                  <button
                    key={a.value}
                    onClick={() => setAction(a.value)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-rose-500/30 bg-rose-500/5"
                        : "border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:bg-white/[0.02]"
                    }`}
                  >
                    <Icon size={15} className={isSelected ? "text-rose-400" : "text-zinc-500"} />
                    <div>
                      <p className={`text-[12px] font-medium ${isSelected ? "text-white" : "text-zinc-300"}`}>{a.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action value */}
          <div>
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">
              {action === "create_task" ? "Titre de la tache" : "Message"}
            </p>
            <input
              type="text"
              value={actionValue}
              onChange={(e) => setActionValue(e.target.value)}
              placeholder="Utilise {title}, {margin}, {price} comme variables"
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
            <p className="text-[10px] text-zinc-600 mt-1">Variables : {"{title}"} = nom de l'article, {"{margin}"} = marge %, {"{price}"} = prix de vente</p>
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-2 text-[13px] text-zinc-500 hover:text-zinc-300">Annuler</button>
            <button
              onClick={handleCreate}
              disabled={isPending || !name.trim()}
              className="px-4 py-2 text-[13px] font-semibold text-[#0a0a0f] bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors disabled:opacity-50"
            >
              {isPending ? "..." : "Creer"}
            </button>
          </div>
        </div>
      )}

      {/* Automations list */}
      {automations.length === 0 && !showForm ? (
        <div className="card-static p-12 text-center">
          <Zap size={40} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500 text-sm mb-2">Aucune automatisation</p>
          <p className="text-zinc-600 text-xs mb-4">Creez des regles pour automatiser les taches repetitives</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#0a0a0f] bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors"
          >
            <Plus size={14} />
            Creer une regle
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {automations.map((auto) => {
            const triggerCfg = TRIGGERS.find((t) => t.value === auto.trigger);
            const actionCfg = ACTIONS.find((a) => a.value === auto.action);
            const TriggerIcon = triggerCfg?.icon ?? Zap;
            const ActionIcon = actionCfg?.icon ?? Zap;

            return (
              <div key={auto.id} className={`card-static p-4 flex items-center gap-4 transition-opacity ${!auto.enabled ? "opacity-50" : ""}`}>
                {/* Trigger icon */}
                <div className={`w-10 h-10 rounded-xl ${triggerCfg?.bgClass ?? "bg-zinc-500/10"} flex items-center justify-center flex-shrink-0`}>
                  <TriggerIcon size={18} className={triggerCfg?.iconClass ?? "text-zinc-400"} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-white truncate">{auto.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500">
                    <span>{triggerCfg?.label}{auto.triggerValue ? ` (${auto.triggerValue})` : ""}</span>
                    <span className="text-zinc-700">-&gt;</span>
                    <span className="flex items-center gap-1">
                      <ActionIcon size={10} />
                      {actionCfg?.label}
                    </span>
                  </div>
                  {auto.lastRun && (
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      Derniere exec : {formatDate(auto.lastRun)} ({auto.runCount}x)
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggle(auto.id, !auto.enabled)}
                    disabled={isPending}
                    className={`p-2 rounded-lg transition-colors ${
                      auto.enabled
                        ? "text-emerald-400 hover:bg-emerald-500/10"
                        : "text-zinc-600 hover:bg-zinc-500/10"
                    }`}
                    title={auto.enabled ? "Desactiver" : "Activer"}
                  >
                    {auto.enabled ? <Power size={15} /> : <PowerOff size={15} />}
                  </button>
                  <button
                    onClick={() => handleDelete(auto.id)}
                    disabled={isPending}
                    className="p-2 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
