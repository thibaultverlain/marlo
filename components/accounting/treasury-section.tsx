"use client";

import { useState, useTransition } from "react";
import {
  Wallet, Plus, X, Clock, TrendingUp, AlertTriangle, Check,
  Pencil, Trash2, Loader2, Package, Lock, ShoppingBag,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  updateCashBalanceAction,
  createPendingPayoutAction,
  deletePendingPayoutAction,
  markPayoutReceivedAction,
} from "@/lib/actions/treasury";
import type { PendingPayout } from "@/lib/db/schema";

const PLATFORMS = [
  { value: "vinted", label: "Vinted" },
  { value: "vestiaire", label: "Vestiaire" },
  { value: "stockx", label: "StockX" },
  { value: "prive", label: "Client prive" },
  { value: "autre", label: "Autre" },
];

const PLATFORM_LABELS: Record<string, string> = Object.fromEntries(PLATFORMS.map((p) => [p.value, p.label]));

type TreasuryProps = {
  cashBalance: number;
  cashUpdatedAt: Date | null;
  pendingPayouts: PendingPayout[];
  pendingTotal: number;
  stockValue: number;
  capitalTotal: number;
  lockedRatio: number;
  stopBuying: boolean;
  buyingBudget: number;
  buyingThreshold: number;
};

export default function TreasurySection(props: TreasuryProps) {
  return (
    <div className="space-y-4">
      {/* Stop achat banner (en premier si actif) */}
      {props.stopBuying && <StopBuyingBanner ratio={props.lockedRatio} />}

      {/* Cash + Pending : 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4">
        <CashCard balance={props.cashBalance} updatedAt={props.cashUpdatedAt} />
        <PendingCard payouts={props.pendingPayouts} total={props.pendingTotal} />
      </div>

      {/* Capital + ratio immobilise + budget max */}
      <CapitalSummary
        cash={props.cashBalance}
        stock={props.stockValue}
        pending={props.pendingTotal}
        capitalTotal={props.capitalTotal}
        lockedRatio={props.lockedRatio}
        stopBuying={props.stopBuying}
        buyingBudget={props.buyingBudget}
        buyingThreshold={props.buyingThreshold}
      />
    </div>
  );
}

/* ───── Stop achat banner ────────────────────────────────────── */
function StopBuyingBanner({ ratio }: { ratio: number }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
      <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
        <AlertTriangle size={22} className="text-red-400" />
      </div>
      <div className="flex-1">
        <p className="text-[14px] font-bold text-red-300 uppercase tracking-wide">
          Stop achat
        </p>
        <p className="text-[12px] text-red-200/80 mt-1">
          {(ratio * 100).toFixed(0)}% de ton capital est immobilise dans le stock (seuil critique : 65%).
          Liquide d'abord avant d'acheter de nouvelles pieces.
        </p>
      </div>
    </div>
  );
}

/* ───── Cash card ────────────────────────────────────────────── */
function CashCard({ balance, updatedAt }: { balance: number; updatedAt: Date | null }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(balance));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateCashBalanceAction(fd);
      if (result?.error) setError(result.error);
      else setEditing(false);
    });
  }

  const stalenessDays = updatedAt
    ? Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000)
    : null;

  return (
    <div className="card-static p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
            <Wallet size={18} className="text-rose-400" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Solde cash</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {updatedAt
                ? stalenessDays === 0
                  ? "Mis a jour aujourd'hui"
                  : stalenessDays === 1
                  ? "Mis a jour hier"
                  : stalenessDays !== null && stalenessDays > 7
                  ? <span className="text-amber-400">A jour il y a {stalenessDays}j — pense a actualiser</span>
                  : `A jour il y a ${stalenessDays}j`
                : "Jamais renseigne"}
            </p>
          </div>
        </div>
        {!editing && (
          <button
            onClick={() => { setValue(String(balance)); setEditing(true); }}
            className="text-zinc-500 hover:text-rose-400 p-1.5 rounded-md hover:bg-[var(--color-bg-hover)] transition-colors"
            title="Modifier"
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="space-y-3">
          <div className="relative">
            <input
              autoFocus
              type="number"
              step="0.01"
              name="amount"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full px-3 py-2.5 pr-8 text-[24px] font-bold tabular-nums bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-rose-500/50 text-white"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-lg">€</span>
          </div>
          {error && <p className="text-[11px] text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-3 py-2 text-[12px] font-semibold text-[var(--color-accent-inverse,#06150f)] bg-rose-500 rounded-lg hover:bg-rose-400 disabled:opacity-50"
            >
              {isPending ? <Loader2 size={12} className="inline animate-spin" /> : <Check size={12} className="inline" />} Enregistrer
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setError(null); }}
              className="px-3 py-2 text-[12px] font-medium text-zinc-400 hover:text-zinc-200"
            >
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <p className="text-[32px] font-bold tabular-nums tracking-tight gradient-text">
          {formatCurrency(balance)}
        </p>
      )}
    </div>
  );
}

/* ───── Pending payouts card ─────────────────────────────────── */
function PendingCard({ payouts, total }: { payouts: PendingPayout[]; total: number }) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const result = await createPendingPayoutAction(fd);
      if (result?.error) setError(result.error);
      else {
        setAdding(false);
        form.reset();
      }
    });
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      await deletePendingPayoutAction(id);
      setDeletingId(null);
    });
  }

  function handleReceived(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      await markPayoutReceivedAction(id);
      setDeletingId(null);
    });
  }

  return (
    <div className="card-static p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Clock size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">En cours</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {payouts.length === 0
                ? "Aucune vente en attente"
                : `${payouts.length} vente${payouts.length > 1 ? "s" : ""} en attente de credit`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[20px] font-bold tabular-nums text-amber-300">{formatCurrency(total)}</p>
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 flex items-center justify-center"
              title="Ajouter"
            >
              <Plus size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Form ajout */}
      {adding && (
        <form onSubmit={handleAdd} className="bg-[var(--color-bg-raised)] rounded-lg p-3 mb-3 space-y-2 border border-[var(--color-border)]">
          <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr] gap-2">
            <input
              type="text"
              name="label"
              required
              placeholder="Nom de la piece"
              className="px-2 py-1.5 text-[12px] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md text-zinc-200 placeholder-zinc-600"
            />
            <div className="relative">
              <input
                type="number"
                step="0.01"
                name="amount"
                required
                placeholder="Montant"
                className="w-full px-2 py-1.5 pr-6 text-[12px] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md text-zinc-200 placeholder-zinc-600 tabular-nums"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 text-[11px]">€</span>
            </div>
            <select
              name="platform"
              defaultValue="vestiaire"
              className="px-2 py-1.5 text-[12px] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md text-zinc-200"
            >
              {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          {error && <p className="text-[11px] text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="px-3 py-1.5 text-[11px] font-semibold text-[var(--color-accent-inverse,#06150f)] bg-rose-500 rounded-md hover:bg-rose-400 disabled:opacity-50"
            >
              {isPending ? "Ajout..." : "Ajouter"}
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setError(null); }}
              className="px-3 py-1.5 text-[11px] font-medium text-zinc-400 hover:text-zinc-200"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Liste */}
      {payouts.length > 0 && (
        <div className="space-y-1.5">
          {payouts.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 px-3 py-2 bg-[var(--color-bg-raised)]/50 rounded-lg group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-zinc-200 truncate">{p.label}</p>
                <p className="text-[10px] text-zinc-500">{PLATFORM_LABELS[p.platform] ?? p.platform}</p>
              </div>
              <p className="text-[13px] font-semibold tabular-nums text-amber-300">{formatCurrency(Number(p.amount))}</p>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleReceived(p.id)}
                  disabled={deletingId === p.id}
                  className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10"
                  title="Marquer comme recu (ajoute au cash)"
                >
                  {deletingId === p.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  disabled={deletingId === p.id}
                  className="p-1 rounded text-red-400 hover:bg-red-500/10"
                  title="Supprimer"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───── Capital total + ratio + budget max ──────────────────── */
function CapitalSummary({
  cash, stock, pending, capitalTotal, lockedRatio, stopBuying, buyingBudget, buyingThreshold,
}: {
  cash: number; stock: number; pending: number;
  capitalTotal: number; lockedRatio: number; stopBuying: boolean;
  buyingBudget: number; buyingThreshold: number;
}) {
  const pct = lockedRatio * 100;
  const thresholdPct = buyingThreshold * 100;
  const safe = pct < 50;
  const warning = pct >= 50 && pct <= thresholdPct;

  return (
    <div className="card-static p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
          <TrendingUp size={18} className="text-rose-400" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Capital total</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Cash + stock + ventes en cours</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* 1. Capital total (gradient hero) */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">Total</p>
          <p className="text-[28px] font-bold tabular-nums tracking-tight gradient-text leading-none">
            {formatCurrency(capitalTotal)}
          </p>
          <div className="flex flex-col gap-0.5 mt-3 text-[11px]">
            <span className="text-zinc-500">Cash <span className="text-zinc-300 font-semibold ml-1 tabular-nums">{formatCurrency(cash)}</span></span>
            <span className="text-zinc-500">+ Stock <span className="text-zinc-300 font-semibold ml-1 tabular-nums">{formatCurrency(stock)}</span></span>
            <span className="text-zinc-500">+ En cours <span className="text-zinc-300 font-semibold ml-1 tabular-nums">{formatCurrency(pending)}</span></span>
          </div>
        </div>

        {/* 2. Budget max disponible */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <ShoppingBag size={12} className={stopBuying ? "text-red-400" : "text-emerald-400"} />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Budget max achat</p>
          </div>
          <p className={`text-[28px] font-bold tabular-nums tracking-tight leading-none ${
            stopBuying ? "text-red-400" : "text-emerald-400"
          }`}>
            {stopBuying ? formatCurrency(0) : formatCurrency(buyingBudget)}
          </p>
          <p className="text-[11px] mt-3 leading-relaxed">
            {stopBuying ? (
              <span className="text-red-300">
                <span className="font-semibold">Stop achat.</span>{" "}
                {buyingBudget < 0
                  ? `Tu dois liquider ${formatCurrency(Math.abs(buyingBudget))} avant de racheter.`
                  : "Tu es au seuil critique."}
              </span>
            ) : (
              <span className="text-zinc-500">
                Tu peux acheter pour <span className="text-emerald-400 font-semibold">{formatCurrency(buyingBudget)}</span> sans depasser {thresholdPct.toFixed(0)}% d'immobilisation.
              </span>
            )}
          </p>
        </div>

        {/* 3. Ratio immobilise */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Lock size={12} className="text-zinc-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">% immobilise</span>
            </div>
            <span className={`text-[20px] font-bold tabular-nums ${
              stopBuying ? "text-red-400" : warning ? "text-amber-400" : "text-emerald-400"
            }`}>
              {pct.toFixed(0)}%
            </span>
          </div>

          <div className="relative h-2.5 bg-zinc-800/60 rounded-full overflow-hidden">
            <div
              className="absolute top-0 bottom-0 w-px bg-red-500/60 z-10"
              style={{ left: `${thresholdPct}%` }}
              title={`Seuil critique ${thresholdPct.toFixed(0)}%`}
            />
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(pct, 100)}%`,
                background: stopBuying
                  ? "linear-gradient(90deg, #ef4444 0%, #f87171 100%)"
                  : warning
                  ? "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)"
                  : "linear-gradient(90deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)",
              }}
            />
          </div>
          <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed">
            {safe && "Marge de manoeuvre confortable."}
            {warning && "Zone de prudence."}
            {stopBuying && `Au-dessus du seuil ${thresholdPct.toFixed(0)}%.`}
          </p>
        </div>
      </div>
    </div>
  );
}
