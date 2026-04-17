import { TrendingUp, TrendingDown, Package, AlertTriangle, Search, Truck } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatPercent } from "@/lib/utils";
import {
  getCurrentMonthStats,
  getMarginByChannel,
  getTopBrands,
  getRecentSales,
  getPendingShipments,
} from "@/lib/db/queries/sales";
import { getStockStats } from "@/lib/db/queries/products";
import {
  getActiveSourcingCount,
  getUpcomingSourcingDeadlines,
} from "@/lib/db/queries/sourcing";
import { CHANNELS } from "@/lib/data";

export const dynamic = "force-dynamic";

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function StatCard({ label, value, change }: {
  label: string;
  value: string;
  change?: number;
}) {
  return (
    <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5 hover:border-[var(--color-border-hover)] transition-colors">
      <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
      <div className="flex items-end gap-2 mt-2">
        <p className="text-2xl font-semibold text-white tabular-nums">{value}</p>
        {change !== undefined && change !== 0 && (
          <span className={`text-xs font-medium flex items-center gap-0.5 mb-1 ${
            change >= 0 ? "text-emerald-400" : "text-red-400"
          }`}>
            {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {change >= 0 ? "+" : ""}{change}%
          </span>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl text-white">Dashboard</h1>
        <p className="text-zinc-500 mt-1 text-sm">
          {new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date())}
        </p>
      </div>

      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-12 text-center">
        <Package size={40} className="mx-auto text-zinc-700 mb-3" />
        <h2 className="text-xl text-white mb-2">Bienvenue sur Marlo</h2>
        <p className="text-zinc-500 mb-6 max-w-md mx-auto text-sm">
          Aucune donnée pour le moment. Commence par ajouter tes articles en stock.
        </p>
        <Link
          href="/products/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors"
        >
          Ajouter mon premier article
        </Link>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const [
    monthStats, stockStats, marginByChannel, topBrands, recentSales,
    pendingShipments, activeSourcing, upcomingDeadlines,
  ] = await Promise.all([
    getCurrentMonthStats(), getStockStats(), getMarginByChannel(),
    getTopBrands(5), getRecentSales(5), getPendingShipments(),
    getActiveSourcingCount(), getUpcomingSourcingDeadlines(7),
  ]);

  const hasAnyData = stockStats.total > 0 || monthStats.current.count > 0;
  if (!hasAnyData) return <EmptyState />;

  const revenueChange = pctChange(monthStats.current.revenue, monthStats.previous.revenue);
  const marginChange = pctChange(monthStats.current.margin, monthStats.previous.margin);
  const salesChange = pctChange(monthStats.current.count, monthStats.previous.count);
  const dormant = stockStats.dormant;
  const totalAlerts = dormant + pendingShipments + upcomingDeadlines;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl text-white">Dashboard</h1>
        <p className="text-zinc-500 mt-1 text-sm">
          {new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date())}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Chiffre d'affaires" value={formatCurrency(monthStats.current.revenue)} change={revenueChange} />
        <StatCard label="Marge nette" value={formatCurrency(monthStats.current.margin)} change={marginChange} />
        <StatCard label="Ventes" value={String(monthStats.current.count)} change={salesChange} />
        <StatCard label="Marge moyenne" value={formatPercent(monthStats.current.avgMargin)} />
      </div>

      {/* Alerts */}
      {totalAlerts > 0 && (
        <div className="bg-amber-500/[0.08] border border-amber-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-amber-400" />
            <p className="text-sm font-medium text-amber-300">
              {totalAlerts} action{totalAlerts > 1 ? "s" : ""} en attente
            </p>
          </div>
          <div className="space-y-2">
            {dormant > 0 && (
              <Link href="/products" className="flex items-center gap-3 text-sm text-amber-400/80 hover:text-amber-300 transition-colors">
                <Package size={14} />
                <span>{dormant} article{dormant > 1 ? "s" : ""} dormant{dormant > 1 ? "s" : ""} depuis plus de 30 jours</span>
              </Link>
            )}
            {pendingShipments > 0 && (
              <Link href="/sales" className="flex items-center gap-3 text-sm text-amber-400/80 hover:text-amber-300 transition-colors">
                <Truck size={14} />
                <span>{pendingShipments} colis à expédier</span>
              </Link>
            )}
            {upcomingDeadlines > 0 && (
              <Link href="/sourcing" className="flex items-center gap-3 text-sm text-amber-400/80 hover:text-amber-300 transition-colors">
                <Search size={14} />
                <span>{upcomingDeadlines} sourcing avec deadline dans moins de 7 jours</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Two columns */}
      <div className="grid grid-cols-2 gap-6">
        {/* Margin by channel */}
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6">
          <h2 className="text-[15px] font-semibold text-white mb-5">Marge par canal</h2>
          {marginByChannel.length === 0 ? (
            <p className="text-sm text-zinc-600">Aucune vente enregistrée</p>
          ) : (
            <div className="space-y-4">
              {marginByChannel.map((item) => {
                const channelLabel = CHANNELS.find((c) => c.value === item.channel)?.label ?? item.channel;
                const pct = Math.max(0, Math.min(Math.round(item.avgMarginPct), 100));
                return (
                  <div key={item.channel}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm text-zinc-400">{channelLabel}</span>
                      <span className="text-sm font-medium text-white tabular-nums">
                        {formatPercent(item.avgMarginPct)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top brands */}
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6">
          <h2 className="text-[15px] font-semibold text-white mb-5">Top marques</h2>
          {topBrands.length === 0 ? (
            <p className="text-sm text-zinc-600">Aucune vente enregistrée</p>
          ) : (
            <div className="space-y-3">
              {topBrands.map((item, i) => (
                <div key={item.brand} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[11px] font-semibold text-zinc-400">
                      {i + 1}
                    </span>
                    <span className="text-sm text-zinc-300">{item.brand}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-zinc-600">{item.count} vente{item.count > 1 ? "s" : ""}</span>
                    <span className="text-sm font-medium text-emerald-400 tabular-nums">{formatPercent(item.avgMarginPct)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent sales */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-white">Dernières ventes</h2>
          <Link href="/sales" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">Voir tout</Link>
        </div>
        {recentSales.length === 0 ? (
          <p className="text-sm text-zinc-600">Aucune vente enregistrée</p>
        ) : (
          <div>
            {recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between py-3 border-b border-[var(--color-border)] last:border-0">
                <div>
                  <p className="text-sm text-zinc-200">{sale.productTitle ?? "Article supprimé"}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    {CHANNELS.find((c) => c.value === sale.channel)?.label ?? sale.channel}
                    {sale.soldAt && ` · ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(sale.soldAt))}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white tabular-nums">{formatCurrency(sale.salePrice)}</p>
                  {sale.margin && (
                    <p className="text-xs text-emerald-400 tabular-nums">+{formatCurrency(sale.margin)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
