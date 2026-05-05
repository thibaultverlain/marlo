import { TrendingUp, Package, AlertTriangle, Truck, ShoppingCart, Percent, BarChart3 } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { db } from "@/lib/db/client";
import { sales, products } from "@/lib/db/schema";
import { sql, gte, lte, and, eq } from "drizzle-orm";
import { getRecentSales, getPendingShipments } from "@/lib/db/queries/sales";
import { getStockStats } from "@/lib/db/queries/products";
import { getActiveSourcingCount } from "@/lib/db/queries/sourcing";
import { getAuthContext } from "@/lib/auth/require-role";
import RevenueChart from "@/components/dashboard/revenue-chart";

export const dynamic = "force-dynamic";

async function getChartDataMonth(shopId: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const rows = await db
    .select({
      day: sql<number>`extract(day from sold_at)::int`,
      revenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
    })
    .from(sales)
    .where(and(eq(sales.shopId, shopId), gte(sales.soldAt, new Date(year, month, 1)), lte(sales.soldAt, new Date(year, month + 1, 0, 23, 59, 59))))
    .groupBy(sql`extract(day from sold_at)`)
    .orderBy(sql`extract(day from sold_at)`);
  return Array.from({ length: daysInMonth }, (_, i) => {
    const row = rows.find((r) => r.day === i + 1);
    return { label: String(i + 1), revenue: Number(row?.revenue ?? 0) };
  });
}

/**
 * Single query that returns all sales stats: today, all-time, current month, previous month.
 * Replaces 4 separate queries.
 */
async function getAllSalesStats(shopId: string) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const curMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const rows = await db
    .select({
      totalRevenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
      totalMargin: sql<number>`coalesce(sum(margin), 0)::numeric`,
      totalCount: sql<number>`count(*)::int`,
      avgMarginPct: sql<number>`coalesce(avg(margin_pct), 0)::numeric`,
      todayRevenue: sql<number>`coalesce(sum(sale_price) filter (where sold_at >= ${startOfDay} and sold_at <= ${endOfDay}), 0)::numeric`,
      todayMargin: sql<number>`coalesce(sum(margin) filter (where sold_at >= ${startOfDay} and sold_at <= ${endOfDay}), 0)::numeric`,
      todayCount: sql<number>`count(*) filter (where sold_at >= ${startOfDay} and sold_at <= ${endOfDay})::int`,
      curMonthRevenue: sql<number>`coalesce(sum(sale_price) filter (where sold_at >= ${curMonthStart}), 0)::numeric`,
      curMonthMargin: sql<number>`coalesce(sum(margin) filter (where sold_at >= ${curMonthStart}), 0)::numeric`,
      curMonthCount: sql<number>`count(*) filter (where sold_at >= ${curMonthStart})::int`,
      prevMonthRevenue: sql<number>`coalesce(sum(sale_price) filter (where sold_at >= ${prevMonthStart} and sold_at < ${curMonthStart}), 0)::numeric`,
      prevMonthCount: sql<number>`count(*) filter (where sold_at >= ${prevMonthStart} and sold_at < ${curMonthStart})::int`,
    })
    .from(sales)
    .where(eq(sales.shopId, shopId));

  return rows[0];
}

export default async function DashboardPage() {
  const { shopId } = await getAuthContext();
  const [stats, stockStats, recentSales, pendingShipments, activeSourcing, chartData] = await Promise.all([
    getAllSalesStats(shopId),
    getStockStats(shopId),
    getRecentSales(shopId, 8),
    getPendingShipments(shopId),
    getActiveSourcingCount(shopId),
    getChartDataMonth(shopId),
  ]);

  const totalRevenue = Number(stats?.totalRevenue ?? 0);
  const totalMargin = Number(stats?.totalMargin ?? 0);
  const avgMarginPct = Number(stats?.avgMarginPct ?? 0);
  const inStock = stockStats?.inStock ?? 0;
  const stockValue = Number(stockStats?.totalValue ?? 0);
  const dormant = stockStats?.dormant ?? 0;

  const currentMonthRevenue = Number(stats?.curMonthRevenue ?? 0);
  const prevMonthRevenue = Number(stats?.prevMonthRevenue ?? 0);
  const monthChange = prevMonthRevenue > 0 ? ((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0;

  const alertCount = dormant + pendingShipments + activeSourcing;

  const todayStats = {
    revenue: Number(stats?.todayRevenue ?? 0),
    margin: Number(stats?.todayMargin ?? 0),
    count: Number(stats?.todayCount ?? 0),
  };
  const monthCount = Number(stats?.curMonthCount ?? 0);
  const totalCount = Number(stats?.totalCount ?? 0);

  const today = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

  return (
    <div className="space-y-5 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-1">{today}</p>
        </div>
      </div>

      {/* Row 1: Featured + 3 KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Featured CA total */}
        <div className="lg:col-span-5 kpi-featured p-6">
          <div className="flex items-start justify-between">
            <p className="text-[13px] font-medium text-zinc-400">Chiffre d'affaires total</p>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp size={20} className="text-emerald-400" />
            </div>
          </div>
          <p className="text-[40px] font-bold tabular-nums tracking-tight leading-none gradient-text mt-3">{formatCurrency(totalRevenue)}</p>
          <p className="text-[12px] text-zinc-500 mt-2">{totalCount} vente{totalCount > 1 ? "s" : ""}</p>
          <div className="flex gap-8 mt-5 pt-4 border-t border-white/[0.04]">
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Ce mois</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-[14px] text-zinc-300 tabular-nums font-medium">{formatCurrency(currentMonthRevenue)}</span>
                {prevMonthRevenue > 0 && (
                  <span className={monthChange >= 0 ? "text-emerald-400 text-[12px] font-semibold" : "text-red-400 text-[12px] font-semibold"}>
                    {monthChange >= 0 ? "+" : ""}{monthChange.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Aujourd'hui</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-[14px] text-zinc-300 tabular-nums font-medium">{formatCurrency(todayStats.revenue)}</span>
                <span className="text-zinc-600 text-[12px]">{todayStats.count} vente{Number(todayStats.count) > 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 KPI cards */}
        <div className="lg:col-span-7 grid grid-cols-2 lg:grid-cols-3 gap-3">
          <KpiCard icon={<TrendingUp size={18} />} iconClass="bg-rose-500/10 text-rose-400" label="Marge totale" value={formatCurrency(totalMargin)} sub={`~${avgMarginPct.toFixed(0)}% moy.`} />
          <KpiCard icon={<Package size={18} />} iconClass="bg-violet-500/10 text-violet-400" label="Stock" value={`${inStock} articles`} sub={formatCurrency(stockValue)} />
          <KpiCard icon={<ShoppingCart size={18} />} iconClass="bg-cyan-500/10 text-cyan-400" label="Ventes ce mois" value={String(monthCount)} sub={formatCurrency(currentMonthRevenue)} />
          <KpiCard icon={<Percent size={18} />} iconClass="bg-emerald-500/10 text-emerald-400" label="Marge aujourd'hui" value={formatCurrency(todayStats.margin)} sub={`${todayStats.count} vente${Number(todayStats.count) > 1 ? "s" : ""}`} />
          <KpiCard icon={<AlertTriangle size={18} />} iconClass="bg-amber-500/10 text-amber-400" label="Dormants" value={String(dormant)} sub={dormant > 0 ? "> 30 jours" : "Aucun"} warning={dormant > 0} />
          <KpiCard icon={<Truck size={18} />} iconClass="bg-orange-500/10 text-orange-400" label="A expédier" value={String(pendingShipments)} sub={pendingShipments > 0 ? "En attente" : "Tout envoyé"} warning={pendingShipments > 0} />
        </div>
      </div>

      {/* Alerts */}
      {alertCount > 0 && (
        <div className="card-static p-4" style={{ borderColor: "rgba(245, 158, 11, 0.15)", background: "rgba(245, 158, 11, 0.04)" }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={15} className="text-amber-400" />
            <span className="text-[13px] font-semibold text-amber-400">{alertCount} action{alertCount > 1 ? "s" : ""} en attente</span>
          </div>
          <div className="flex flex-wrap gap-4 text-[12px]">
            {dormant > 0 && <Link href="/products" className="flex items-center gap-1.5 text-amber-400/80 hover:text-amber-300 transition-colors"><Package size={12} />{dormant} article{dormant > 1 ? "s" : ""} dormant{dormant > 1 ? "s" : ""}</Link>}
            {pendingShipments > 0 && <Link href="/sales" className="flex items-center gap-1.5 text-amber-400/80 hover:text-amber-300 transition-colors"><Truck size={12} />{pendingShipments} colis à expédier</Link>}
            {activeSourcing > 0 && <Link href="/sourcing" className="flex items-center gap-1.5 text-amber-400/80 hover:text-amber-300 transition-colors"><BarChart3 size={12} />{activeSourcing} sourcing actif{activeSourcing > 1 ? "s" : ""}</Link>}
          </div>
        </div>
      )}

      {/* Chart */}
      <RevenueChart initialData={chartData} />

      {/* Recent sales table */}
      <div className="card-static overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-[15px] font-semibold text-white">Dernières ventes</h2>
          <Link href="/sales" className="text-[12px] font-medium text-rose-400 hover:text-rose-300 transition-colors">Voir tout</Link>
        </div>

        {recentSales.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-zinc-600 text-sm">Aucune vente enregistrée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[11px] text-zinc-600 uppercase tracking-wider border-b border-[var(--color-border)]">
                  <th className="text-left px-5 py-3 font-medium">Article</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Canal</th>
                  <th className="text-right px-4 py-3 font-medium">Prix</th>
                  <th className="text-right px-5 py-3 font-medium">Marge</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((sale: any, i: number) => {
                  const margin = Number(sale.margin);
                  const channelColors: Record<string, string> = {
                    vinted: "text-teal-400", vestiaire: "text-orange-400", stockx: "text-emerald-400", prive: "text-violet-400", autre: "text-zinc-500"
                  };
                  const channelLabels: Record<string, string> = {
                    vinted: "Vinted", vestiaire: "Vestiaire", stockx: "StockX", prive: "Privé", autre: "Autre"
                  };
                  return (
                    <tr key={sale.id} className="border-b border-[var(--color-border)] last:border-0 row-hover">
                      <td className="px-5 py-3">
                        <p className="text-zinc-200 font-medium truncate max-w-[200px]">{sale.productTitle ?? sale.notes ?? "Article"}</p>
                        <p className="text-[11px] text-zinc-600 mt-0.5">{new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(sale.soldAt))}</p>
                      </td>
                      <td className={`px-4 py-3 hidden sm:table-cell font-medium ${channelColors[sale.channel] ?? "text-zinc-500"}`}>
                        {channelLabels[sale.channel] ?? sale.channel}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-zinc-200 font-medium">{formatCurrency(sale.salePrice)}</td>
                      <td className={`px-5 py-3 text-right tabular-nums font-semibold ${margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {margin >= 0 ? "+" : ""}{formatCurrency(margin)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon, iconClass, label, value, sub, warning }: {
  icon: React.ReactNode; iconClass: string; label: string; value: string; sub?: string; warning?: boolean;
}) {
  return (
    <div className="kpi-card p-4 flex flex-col justify-between min-h-[120px]">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider leading-tight">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconClass}`}>{icon}</div>
      </div>
      <div className="mt-auto">
        <p className={`text-[22px] font-bold tabular-nums tracking-tight leading-none ${warning ? "text-amber-400" : "text-white"}`}>{value}</p>
        {sub && <p className="text-[11px] text-zinc-600 mt-1">{sub}</p>}
      </div>
    </div>
  );
}
