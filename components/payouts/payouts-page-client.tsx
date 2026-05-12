"use client";

import { useState, useTransition } from "react";
import {
  Plus, Wallet, CheckCircle2, Clock, X, Check,
  Trash2, ArrowRight, AlertCircle,
} from "lucide-react";
import {
  createPayoutAction,
  markPayoutReceivedAction,
  deletePayoutAction,
} from "@/lib/actions/payouts";
import type { Payout } from "@/lib/db/schema";

const PLATFORMS = ["vinted", "vestiaire", "stockx", "prive", "autre"];

const PLATFORM_LABELS: Record<string, string> = {
  vinted: "Vinted", vestiaire: "Vestiaire", stockx: "StockX", prive: "Prive", autre: "Autre",
};

const STATUS_CONFIG = {
  en_attente: { label: "En attente", cl: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  recu: { label: "Recu", cl: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  partiel: { label: "Partiel", cl: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  litige: { label: "Litige", cl: "text-red-400 bg-red-500/10 border-red-500/20" },
} as const;

function formatCurrency(v: any) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(v ?? 0));
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default function PayoutsPageClient({
  payouts,
  stats,
}: {
  payouts: (Payout & { saleCount: number })[];
  stats: any;
}) {
  const [showForm, setShowForm] = useState(false);
  const [platform, setPlatform] = useState("vinted");
  const [expectedAmount, setExpectedAmount] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [receivedAmount, setReceivedAmount] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split("T")[0]);

  function handleCreate() {
    if (!expectedAmount.trim()) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("platform", platform);
      fd.set("expectedAmount", expectedAmount);
      if (expectedDate) fd.set("expectedDate", expectedDate);
      if (reference) fd.set("reference", reference);
      if (notes) fd.set("notes", notes);
      const result = await createPayoutAction(fd);
      if (result.error) setError(result.error);
      else { setExpectedAmount(""); setReference(""); setNotes(""); setExpectedDate(""); setShowForm(false); }
    });
  }

  function handleMarkReceived(payoutId: string) {
    startTransition(async () => {
      const result = await markPayoutReceivedAction(payoutId, receivedAmount || stats?.expectedAmount, receivedDate);
      if (result.error) setError(result.error);
      else setConfirmingId(null);
    });
  }

  function handleDelete(payoutId: string) {
    startTransition(async () => { await deletePayoutAction(payoutId); });
  }

  const pending = payouts.filter((p) => p.status === "en_attente");
  const received = payouts.filter((p) => p.status === "recu");

  return (
    <>
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Virements</h1>
          <p className="text-zinc-500 mt-1 text-sm">
            {Number(stats?.totalExpected ?? 0) > 0 && (
              <span>
                {formatCurrency(Number(stats?.totalExpected ?? 0) - Number(stats?.totalReceived ?? 0))} en attente
              </span>
            )}
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-[var(--color-text-inverse)] bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors">
          <Plus size={14} />
          Nouveau virement
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">En attente</p>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center"><Clock size={16} className="text-amber-400" /></div>
          </div>
          <div className="mt-auto">
            <p className="text-[22px] font-bold tabular-nums text-amber-400">
              {formatCurrency(payouts.filter(p => p.status === "en_attente").reduce((s, p) => s + Number(p.expectedAmount), 0))}
            </p>
            <p className="text-[11px] text-zinc-600">{pending.length} virement{pending.length > 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Recu</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center"><CheckCircle2 size={16} className="text-emerald-400" /></div>
          </div>
          <p className="text-[22px] font-bold tabular-nums text-emerald-400 mt-auto">
            {formatCurrency(payouts.filter(p => p.status === "recu").reduce((s, p) => s + Number(p.receivedAmount ?? p.expectedAmount), 0))}
          </p>
        </div>
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Total attendu</p>
            <div className="w-8 h-8 rounded-xl bg-zinc-500/10 flex items-center justify-center"><Wallet size={16} className="text-zinc-400" /></div>
          </div>
          <p className="text-[22px] font-bold tabular-nums text-white mt-auto">{formatCurrency(stats?.totalExpected)}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="card-static p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {PLATFORMS.map((p) => (
              <button key={p} onClick={() => setPlatform(p)}
                className={`py-2 rounded-lg text-[12px] font-medium border transition-all ${
                  platform === p ? "border-rose-500/30 bg-rose-500/5 text-white" : "border-[var(--color-border)] text-zinc-500 hover:text-zinc-300"
                }`}>
                {PLATFORM_LABELS[p]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-zinc-500 block mb-1">Montant attendu (€)</label>
              <input type="number" step="0.01" placeholder="127.50" value={expectedAmount} onChange={(e) => setExpectedAmount(e.target.value)}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]" autoFocus />
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 block mb-1">Date prevue</label>
              <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]" />
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 block mb-1">Reference (optionnel)</label>
              <input type="text" placeholder="Ex: VIN-2026-05" value={reference} onChange={(e) => setReference(e.target.value)}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]" />
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 block mb-1">Notes</label>
              <input type="text" placeholder="Optionnel" value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-2 text-[13px] text-zinc-500 hover:text-zinc-300">Annuler</button>
            <button onClick={handleCreate} disabled={isPending || !expectedAmount.trim()}
              className="px-4 py-2 text-[13px] font-semibold text-[var(--color-text-inverse)] bg-rose-500 rounded-lg hover:bg-rose-400 transition disabled:opacity-50">
              {isPending ? "..." : "Creer"}
            </button>
          </div>
        </div>
      )}

      {/* Payouts list */}
      {payouts.length === 0 ? (
        <div className="card-static p-12 text-center">
          <Wallet size={40} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500 text-sm">Aucun virement</p>
          <p className="text-zinc-600 text-xs mt-1">Cree un virement pour chaque paiement plateforme attendu</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payouts.map((payout) => {
            const sc = STATUS_CONFIG[payout.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.en_attente;
            const isConfirming = confirmingId === payout.id;

            return (
              <div key={payout.id} className="card-static overflow-hidden">
                <div className="p-4 flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-zinc-500/10 flex items-center justify-center flex-shrink-0">
                    <Wallet size={18} className="text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-semibold text-white">{PLATFORM_LABELS[payout.platform] ?? payout.platform}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${sc.cl}`}>{sc.label}</span>
                      {payout.reference && <span className="text-[10px] text-zinc-600 font-mono">{payout.reference}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500">
                      <span className="text-white font-bold tabular-nums text-[13px]">{formatCurrency(payout.expectedAmount)}</span>
                      {payout.status === "recu" && payout.receivedAmount && Number(payout.receivedAmount) !== Number(payout.expectedAmount) && (
                        <span className="text-blue-400">→ recu {formatCurrency(payout.receivedAmount)}</span>
                      )}
                      {payout.expectedDate && <span>Prevu le {formatDate(payout.expectedDate)}</span>}
                      {payout.status === "recu" && payout.receivedDate && <span className="text-emerald-400">Recu le {formatDate(payout.receivedDate)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {payout.status === "en_attente" && !isConfirming && (
                      <button onClick={() => { setConfirmingId(payout.id); setReceivedAmount(String(payout.expectedAmount)); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-inverse)] bg-emerald-600 rounded-lg hover:bg-emerald-500 transition">
                        <Check size={12} /> Marquer recu
                      </button>
                    )}
                    <button onClick={() => handleDelete(payout.id)} disabled={isPending}
                      className="p-1.5 rounded hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Confirm received panel */}
                {isConfirming && (
                  <div className="border-t border-[var(--color-border)] p-4 bg-[var(--color-bg)]/30 flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <label className="text-[12px] text-zinc-500">Montant recu :</label>
                      <input type="number" step="0.01" value={receivedAmount} onChange={(e) => setReceivedAmount(e.target.value)}
                        className="w-28 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] text-right tabular-nums" />
                      <span className="text-zinc-500 text-sm">€</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[12px] text-zinc-500">Le :</label>
                      <input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)}
                        className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]" />
                    </div>
                    <div className="flex gap-2 ml-auto">
                      <button onClick={() => setConfirmingId(null)} className="px-3 py-1.5 text-[12px] text-zinc-500 hover:text-zinc-300">Annuler</button>
                      <button onClick={() => handleMarkReceived(payout.id)} disabled={isPending}
                        className="px-4 py-1.5 text-[12px] font-semibold text-[var(--color-text-inverse)] bg-emerald-600 rounded-lg hover:bg-emerald-500 transition disabled:opacity-50">
                        {isPending ? "..." : "Confirmer"}
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
