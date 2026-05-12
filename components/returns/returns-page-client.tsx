"use client";

import { useState, useTransition } from "react";
import {
  Plus, RotateCcw, CheckCircle2, X, Package, Trash2,
} from "lucide-react";
import { createReturnAction, resolveReturnAction } from "@/lib/actions/returns";
import type { Return, Sale } from "@/lib/db/schema";

const STATUS_CONFIG = {
  en_cours: { label: "En cours", cl: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  recu: { label: "Recu", cl: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  rembourse: { label: "Rembourse", cl: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  refuse: { label: "Refuse", cl: "text-red-400 bg-red-500/10 border-red-500/20" },
} as const;

function formatCurrency(v: any) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(v ?? 0));
}
function formatDate(d: any): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default function ReturnsPageClient({
  returns,
  sales,
}: {
  returns: Return[];
  sales: Sale[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [saleId, setSaleId] = useState("");
  const [reason, setReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [restock, setRestock] = useState(true);
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveAmount, setResolveAmount] = useState("");

  function handleCreate() {
    if (!saleId || !reason.trim()) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("saleId", saleId);
      fd.set("reason", reason);
      if (refundAmount) fd.set("refundAmount", refundAmount);
      fd.set("restockProduct", String(restock));
      if (notes) fd.set("notes", notes);
      const result = await createReturnAction(fd);
      if (result.error) setError(result.error);
      else { setSaleId(""); setReason(""); setRefundAmount(""); setNotes(""); setShowForm(false); }
    });
  }

  function handleResolve(returnId: string, status: "rembourse" | "refuse") {
    startTransition(async () => {
      const result = await resolveReturnAction(returnId, status, resolveAmount || undefined);
      if (result.error) setError(result.error);
      else setResolvingId(null);
    });
  }

  const openReturns = returns.filter((r) => r.status === "en_cours" || r.status === "recu");
  const closedReturns = returns.filter((r) => r.status === "rembourse" || r.status === "refuse");

  return (
    <>
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Retours</h1>
          <p className="text-zinc-500 mt-1 text-sm">
            {openReturns.length} retour{openReturns.length > 1 ? "s" : ""} en cours
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-[var(--color-text-inverse)] bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors">
          <Plus size={14} />
          Declarer un retour
        </button>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {showForm && (
        <div className="card-static p-5 space-y-4">
          <div>
            <label className="text-[11px] text-zinc-500 block mb-1">Vente concernee</label>
            <select value={saleId} onChange={(e) => setSaleId(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]">
              <option value="">Selectionner une vente...</option>
              {sales.filter((s) => s.shippingStatus && s.shippingStatus !== "retourne").map((s) => (
                <option key={s.id} value={s.id}>
                  {new Date(s.soldAt!).toLocaleDateString("fr-FR")} — {formatCurrency(s.salePrice)} — {s.channel}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 block mb-1">Raison du retour</label>
            <input type="text" placeholder="Ex: Article ne correspond pas, defaut..." value={reason} onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-zinc-500 block mb-1">Montant de remboursement (€)</label>
              <input type="number" step="0.01" placeholder="Laisser vide si inconnu" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]" />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <button onClick={() => setRestock(!restock)}
                className={`w-9 h-5 rounded-full transition-colors relative ${restock ? "bg-rose-500" : "bg-zinc-700"}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${restock ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
              <span className="text-[12px] text-zinc-400">Remettre en stock</span>
            </div>
          </div>
          <input type="text" placeholder="Notes (optionnel)" value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-2 text-[13px] text-zinc-500 hover:text-zinc-300">Annuler</button>
            <button onClick={handleCreate} disabled={isPending || !saleId || !reason.trim()}
              className="px-4 py-2 text-[13px] font-semibold text-[var(--color-text-inverse)] bg-rose-500 rounded-lg hover:bg-rose-400 transition disabled:opacity-50">
              {isPending ? "..." : "Declarer"}
            </button>
          </div>
        </div>
      )}

      {returns.length === 0 ? (
        <div className="card-static p-12 text-center">
          <RotateCcw size={40} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500 text-sm">Aucun retour</p>
        </div>
      ) : (
        <div className="space-y-2">
          {[...openReturns, ...closedReturns].map((ret) => {
            const sc = STATUS_CONFIG[ret.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.en_cours;
            const isResolving = resolvingId === ret.id;
            const open = ret.status === "en_cours" || ret.status === "recu";

            return (
              <div key={ret.id} className="card-static overflow-hidden">
                <div className="p-4 flex items-center gap-4 group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${open ? "bg-amber-500/10" : "bg-zinc-500/10"}`}>
                    <RotateCcw size={18} className={open ? "text-amber-400" : "text-zinc-500"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium text-white truncate">{ret.reason}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${sc.cl}`}>{sc.label}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500">
                      <span>Declare le {formatDate(ret.createdAt)}</span>
                      {ret.refundAmount && <span className="text-rose-400">Remboursement : {formatCurrency(ret.refundAmount)}</span>}
                      {ret.restockProduct && open && <span className="text-blue-400 flex items-center gap-1"><Package size={10} /> Remise en stock prevue</span>}
                    </div>
                  </div>
                  {open && !isResolving && (
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={() => { setResolvingId(ret.id); setResolveAmount(String(ret.refundAmount ?? "")); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition">
                        <CheckCircle2 size={12} /> Resoudre
                      </button>
                    </div>
                  )}
                </div>

                {isResolving && (
                  <div className="border-t border-[var(--color-border)] p-4 bg-[var(--color-bg)]/30 space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="text-[12px] text-zinc-500">Montant rembourse :</label>
                      <input type="number" step="0.01" value={resolveAmount} onChange={(e) => setResolveAmount(e.target.value)}
                        className="w-28 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] text-right" />
                      <span className="text-zinc-500 text-sm">€</span>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setResolvingId(null)} className="px-3 py-1.5 text-[12px] text-zinc-500 hover:text-zinc-300">Annuler</button>
                      <button onClick={() => handleResolve(ret.id, "refuse")} disabled={isPending}
                        className="px-3 py-1.5 text-[12px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition disabled:opacity-50">
                        Refuse
                      </button>
                      <button onClick={() => handleResolve(ret.id, "rembourse")} disabled={isPending}
                        className="px-4 py-1.5 text-[12px] font-semibold text-[var(--color-text-inverse)] bg-emerald-600 rounded-lg hover:bg-emerald-500 transition disabled:opacity-50">
                        {isPending ? "..." : "Rembourse"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
