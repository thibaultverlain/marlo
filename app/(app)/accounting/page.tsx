import Link from "next/link";
import { getAuthContext } from "@/lib/auth/require-role";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { getAccountingStats } from "@/lib/db/queries/accounting";
import { getTreasuryState } from "@/lib/db/queries/treasury";
import { formatCurrency } from "@/lib/utils";
import TreasurySection from "@/components/accounting/treasury-section";

export const revalidate = 30;

export default async function AccountingPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const sp = await searchParams;
  const year = sp.year ? parseInt(sp.year, 10) : 2026;
  const { shopId } = await getAuthContext();

  const [stats, treasury] = await Promise.all([
    getAccountingStats(shopId, year),
    getTreasuryState(shopId),
  ]);

  const yearOptions = [2026];

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Comptabilite</h1>
        <p className="text-zinc-500 mt-1 text-sm">Tresorerie operationnelle et compte de resultat.</p>
      </div>

      {/* TRESORERIE (operationnel) */}
      <TreasurySection
        cashBalance={treasury.cashBalance}
        cashUpdatedAt={treasury.cashUpdatedAt}
        pendingPayouts={treasury.pendingPayouts}
        pendingTotal={treasury.pendingTotal}
        stockValue={treasury.stockValue}
        capitalTotal={treasury.capitalTotal}
        lockedRatio={treasury.lockedRatio}
        stopBuying={treasury.stopBuying}
        buyingBudget={treasury.buyingBudget}
        buyingThreshold={treasury.buyingThreshold}
        movements={treasury.movements}
        monthApports={treasury.monthApports}
        monthPrelevements={treasury.monthPrelevements}
      />

      {/* COMPTE DE RESULTAT */}
      <div className="pt-2 border-t border-[var(--color-border-subtle)]">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mt-4 mb-3">
          Compte de resultat — Exercice {year}
        </p>
      </div>

      {/* Selecteur annee */}
      <div className="flex bg-zinc-800/60 rounded-lg p-0.5 w-fit overflow-x-auto">
        {yearOptions.map((y) => (
          <Link
            key={y}
            href={`/accounting?year=${y}`}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all whitespace-nowrap ${
              year === y
                ? "bg-[var(--color-accent-muted)] text-rose-400"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {y}
          </Link>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[110px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Recettes</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center"><TrendingUp size={15} className="text-emerald-400" /></div>
          </div>
          <div className="mt-auto">
            <p className="text-[22px] font-bold text-white tabular-nums">{formatCurrency(stats.revenueTTC)}</p>
            <p className="text-[11px] text-zinc-500">{stats.salesCount} vente{stats.salesCount > 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="kpi-card p-4 flex flex-col justify-between min-h-[110px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Depenses</p>
            <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center"><TrendingDown size={15} className="text-red-400" /></div>
          </div>
          <div className="mt-auto">
            <p className="text-[22px] font-bold text-white tabular-nums">{formatCurrency(stats.expensesTTC)}</p>
            <p className="text-[11px] text-zinc-500">{stats.expensesCount} ligne{stats.expensesCount > 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="kpi-card p-4 flex flex-col justify-between min-h-[110px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Resultat</p>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${stats.resultBeforeTax >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
              <BarChart3 size={15} className={stats.resultBeforeTax >= 0 ? "text-emerald-400" : "text-red-400"} />
            </div>
          </div>
          <div className="mt-auto">
            <p className={`text-[22px] font-bold tabular-nums ${stats.resultBeforeTax >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatCurrency(stats.resultBeforeTax)}
            </p>
            <p className="text-[11px] text-zinc-500">Marge {stats.marginPct.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* COMPTE DE RESULTAT SIMPLIFIE */}
      <div className="bg-[var(--color-bg-card)] rounded-[14px] border border-[var(--color-border)] shadow-[var(--shadow-card)] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-center gap-2">
          <BarChart3 size={15} className="text-rose-400" />
          <p className="text-[13px] font-semibold text-white">Compte de resultat simplifie</p>
        </div>
        <div className="p-5 space-y-2.5 text-[13px]">
          <ResultRow label="Recettes" value={stats.revenueTTC} />
          <ResultRow label="Depenses" value={-stats.expensesTTC} />
          <Divider />
          <ResultRow label="Resultat" value={stats.resultBeforeTax} bold accent={stats.resultBeforeTax >= 0 ? "emerald" : "red"} big />
        </div>
      </div>

      <div className="pb-8" />
    </div>
  );
}

function ResultRow({ label, value, bold, big, accent }: { label: string; value: number; bold?: boolean; big?: boolean; accent?: "emerald" | "red" }) {
  const colorClass =
    accent === "emerald" ? "text-emerald-400" :
    accent === "red" ? "text-red-400" :
    "text-zinc-200";
  return (
    <div className="flex items-center justify-between">
      <span className={`${bold ? "font-semibold text-white" : "text-zinc-400"} ${big ? "text-[15px]" : ""}`}>{label}</span>
      <span className={`tabular-nums ${big ? "text-[18px] font-bold" : bold ? "font-semibold" : ""} ${colorClass}`}>
        {value >= 0 ? "" : "-"}{formatCurrency(Math.abs(value))}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-[var(--color-border-subtle)] my-1" />;
}
