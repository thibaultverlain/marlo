import { TrendingUp, TrendingDown, Package, AlertTriangle, Search, Truck } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { db } from "@/lib/db/client";
import { sales, products } from "@/lib/db/schema";
import { sql, gte, lte, and, eq } from "drizzle-orm";
import {
  getMarginByChannel,
  getRecentSales,
  getPendingShipments,
} from "@/lib/db/queries/sales";
import { getStockStats } from "@/lib/db/queries/products";
import {
  getActiveSourcingCount,
  getUpcomingSourcingDeadlines,
} from "@/lib/db/queries/sourcing";
import { CHANNELS } from "@/lib/data";
import RevenueChart from "@/components/dashboard/revenue-chart";

export const dynamic = "force-dynamic";

async function getTodayStats() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const rows = await db
    .select({
      revenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
      margin: sql<number>`coalesce(sum(margin), 0)::numeric`,
      count: sql<number>`count(*)::int`,
      avgMarginPct: sql<number>`coalesce(avg(margin_pct), 0)::numeric`,
    })
    .from(sales)
    .where(and(gte(sales.soldAt, startOfDay), lte(sales.soldAt, endOfDay)));

  return {
    revenue: Number(rows[0]?.revenue ?? 0),
    margin: Number(rows[0]?.margin ?? 0),
    count: rows[0]?.count ?? 0,
    avgMarginPct: Number(rows[0]?.avgMarginPct ?? 0),
  };
}

async function getAllTimeStats() {
  const rows = await db
    .select({
      revenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
      margin: sql<number>`coalesce(sum(margin), 0)::numeric`,
      count: sql<number>`count(*)::int`,
    })
    .from(sales);

  return {
    revenue: Number(rows[0]?.revenue ?? 0),
    margin: Number(rows[0]?.margin ?? 0),
    count: rows[0]?.count ?? 0,
  };
}

function StatCard({ label, value, sub }: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5 hover:border-[var(--color-border-hover)] transition-colors">
      <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-semibold text-white tabular-nums mt-2">{value}</p>
      {sub && <p className="text-[11px] text-zinc-600 mt-1">{sub}</p>}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl text-white">Dashboard</h1>
        <p className="text-zinc-500 mt-1 text-sm">
          {new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}
        </p>
      </div>
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-12 text-center">
        <Package size={40} className="mx-auto text-zinc-700 mb-3" />
        <h2 className="text-xl text-white mb-2">Bienvenue sur Marlo</h2>
        <p className="text-zinc-500 mb-6 max-w-md mx-auto text-sm">Commence par ajouter tes articles en stock.</p>
        <Link href="/products/new" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors">Ajouter mon premier article</Link>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const [
    todayStats, allTimeStats, stockStats, marginByChannel,
    recentSales, pendingShipments, activeSourcing, upcomingDeadlines,
  ] = await Promise.all([
    getTodayStats(), getAllTimeStats(), getStockStats(),
    getMarginByChannel(), getRecentSales(5), getPendingShipments(),
    getActiveSourcingCount(), getUpcomingSourcingDeadlines(7),
  ]);

  const hasAnyData = stockStats.total > 0 || allTimeStats.count > 0;
  if (!hasAnyData) return <EmptyState />;

  const dormant = stockStats.dormant;
  const totalAlerts = dormant + pendingShipments + upcomingDeadlines;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-white">Dashboard</h1>
        <p className="text-zinc-500 mt-1 text-sm">
          {new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}
        </p>
      </div>

      {/* KPIs du jour */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="CA aujourd'hui"
          value={formatCurrency(todayStats.revenue)}
          sub={`${todayStats.count} vente${todayStats.count > 1 ? "s" : ""}`}
        />
        <StatCard
          label="Marge aujourd'hui"
          value={formatCurrency(todayStats.margin)}
        />
        <StatCard
          label="CA total"
          value={formatCurrency(allTimeStats.revenue)}
          sub={`${allTimeStats.count} vente${allTimeStats.count > 1 ? "s" : ""}`}
        />
        <StatCard
          label="Marge totale"
          value={formatCurrency(allTimeStats.margin)}
        />
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
                <span>{dormant} article{dormant > 1 ? "s" : ""} dormant{dormant > 1 ? "s" : ""}</span>
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
                <span>{upcomingDeadlines} sourcing deadline &lt; 7 jours</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Revenue chart - full width */}
      <RevenueChart />

      {/* Two columns: Marge par canal | Dernières ventes */}
      <div className="grid grid-cols-2 gap-6">
        {/* Margin by channel */}
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6">
          <h2 className="text-[15px] font-semibold text-white mb-5">Marge par canal</h2>
          {marginByChannel.length === 0 ? (
            <p className="text-sm text-zinc-600">Aucune vente</p>
          ) : (
            <div className="space-y-4">
              {marginByChannel.map((item) => {
                const channelLabel = CHANNELS.find((c) => c.value === item.channel)?.label ?? item.channel;
                const pct = Math.max(0, Math.min(Math.round(item.avgMarginPct), 100));
                return (
                  <div key={item.channel}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm text-zinc-400">{channelLabel}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-zinc-600">{item.count} vente{item.count > 1 ? "s" : ""}</span>
                        <span className="text-sm font-medium text-white tabular-nums w-12 text-right">
                          {formatPercent(item.avgMarginPct)}
                        </span>
                      </div>
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

        {/* Recent sales */}
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-semibold text-white">Dernières ventes</h2>
            <Link href="/sales" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">Voir tout</Link>
          </div>
          {recentSales.length === 0 ? (
            <p className="text-sm text-zinc-600">Aucune vente</p>
          ) : (
            <div>
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between py-3 border-b border-[var(--color-border)] last:border-0">
                  <div>
                    <p className="text-[13px] text-zinc-200">{sale.productTitle ?? "Supprimé"}</p>
                    <p className="text-[11px] text-zinc-600 mt-0.5">
                      {CHANNELS.find((c) => c.value === sale.channel)?.label ?? sale.channel}
                      {sale.soldAt && ` · ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(sale.soldAt))}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-medium text-white tabular-nums">{formatCurrency(sale.salePrice)}</p>
                    {sale.margin && (
                      <p className={`text-[11px] tabular-nums ${Number(sale.margin) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {Number(sale.margin) >= 0 ? "+" : ""}{formatCurrency(sale.margin)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
