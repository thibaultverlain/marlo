import {
  TrendingUp, Package, AlertTriangle, Truck, ShoppingCart, Percent,
  Plus, Flame, ListTodo, Search,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { db } from "@/lib/db/client";
import { sales, products, tasks, sourcingRequests } from "@/lib/db/schema";
import { sql, gte, lte, and, eq, inArray } from "drizzle-orm";
import { getRecentSales, getPendingShipments } from "@/lib/db/queries/sales";
import { getStockStats } from "@/lib/db/queries/products";
import { getActiveSourcingCount } from "@/lib/db/queries/sourcing";
import { getAuthContext } from "@/lib/auth/require-role";
import { CHANNELS } from "@/lib/data";
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

async function getAllSalesStats(shopId: string) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
  const curMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

  const rows = await db
    .select({
      totalRevenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
      totalMargin: sql<number>`coalesce(sum(margin), 0)::numeric`,
      totalCount: sql<number>`count(*)::int`,
      avgMarginPct: sql<number>`coalesce(avg(margin_pct), 0)::numeric`,
      todayRevenue: sql<number>`coalesce(sum(sale_price) filter (where sold_at >= ${startOfDay}::timestamptz and sold_at <= ${endOfDay}::timestamptz), 0)::numeric`,
      todayCount: sql<number>`count(*) filter (where sold_at >= ${startOfDay}::timestamptz and sold_at <= ${endOfDay}::timestamptz)::int`,
      curMonthRevenue: sql<number>`coalesce(sum(sale_price) filter (where sold_at >= ${curMonthStart}::timestamptz), 0)::numeric`,
      curMonthCount: sql<number>`count(*) filter (where sold_at >= ${curMonthStart}::timestamptz)::int`,
      prevMonthRevenue: sql<number>`coalesce(sum(sale_price) filter (where sold_at >= ${prevMonthStart}::timestamptz and sold_at < ${curMonthStart}::timestamptz), 0)::numeric`,
    })
    .from(sales)
    .where(eq(sales.shopId, shopId));

  return rows[0];
}

async function getTodayActions(shopId: string) {
  const today = new Date();
  const todayStr = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const in7days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Overdue tasks
  const [taskRow] = await db
    .select({
      overdue: sql<number>`count(*) filter (where due_date < ${todayStr}::timestamptz and status != 'fait')::int`,
      today: sql<number>`count(*) filter (where due_date >= ${todayStr}::timestamptz and due_date < (${todayStr}::timestamptz + interval '1 day') and status != 'fait')::int`,
    })
    .from(tasks)
    .where(eq(tasks.shopId, shopId));

  // Urgent sourcings (deadline < 7 days, status active)
  const [sourcingRow] = await db
    .select({ urgent: sql<number>`count(*)::int` })
    .from(sourcingRequests)
    .where(and(
      eq(sourcingRequests.shopId, shopId),
      inArray(sourcingRequests.status, ["ouvert", "en_recherche"]),
      sql`deadline IS NOT NULL`,
      sql`deadline < ${in7days}::timestamptz`,
    ));

  return {
    tasksOverdue: taskRow?.overdue ?? 0,
    tasksToday: taskRow?.today ?? 0,
    sourcingUrgent: sourcingRow?.urgent ?? 0,
  };
}

export default async function DashboardPage() {
  const { shopId } = await getAuthContext();
  const [stats, stockStats, recentSales, pendingShipments, activeSourcing, chartData, todayActions] = await Promise.all([
    getAllSalesStats(shopId),
    getStockStats(shopId),
    getRecentSales(shopId, 8),
    getPendingShipments(shopId),
    getActiveSourcingCount(shopId),
    getChartDataMonth(shopId),
    getTodayActions(shopId),
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

  const monthCount = Number(stats?.curMonthCount ?? 0);
  const totalCount = Number(stats?.totalCount ?? 0);
  const todayRevenue = Number(stats?.todayRevenue ?? 0);
  const todayCount = Number(stats?.todayCount ?? 0);

  const today = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

  // Today actions cards
  const actionCards = [
    {
      key: "tasks_overdue",
      show: todayActions.tasksOverdue > 0,
      icon: Flame,
      iconBg: "bg-red-500/10",
      iconColor: "text-red-400",
      label: "Taches en retard",
      count: todayActions.tasksOverdue,
      href: "/tasks?filter=open",
      borderColor: "border-red-500/15",
    },
    {
      key: "tasks_today",
      show: todayActions.tasksToday > 0,
      icon: ListTodo,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-400",
      label: "Taches aujourd'hui",
      count: todayActions.tasksToday,
      href: "/tasks?filter=open",
      borderColor: "border-amber-500/15",
    },
    {
      key: "shipments",
      show: pendingShipments > 0,
      icon: Truck,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-400",
      label: "Colis a expedier",
      count: pendingShipments,
      href: "/orders?status=a_expedier",
      borderColor: "border-amber-500/15",
    },
    {
      key: "sourcing_urgent",
      show: todayActions.sourcingUrgent > 0,
      icon: Search,
      iconBg: "bg-rose-500/10",
      iconColor: "text-rose-400",
      label: "Sourcings urgents",
      count: todayActions.sourcingUrgent,
      href: "/sourcing",
      borderColor: "border-rose-500/15",
    },
    {
      key: "dormant",
      show: dormant > 0,
      icon: Package,
      iconBg: "bg-zinc-500/10",
      iconColor: "text-zinc-400",
      label: "Articles dormants",
      count: dormant,
      href: "/products?status=en_vente",
      borderColor: "border-zinc-500/15",
    },
  ].filter((c) => c.show);

  return (
    <div className="space-y-5 page-enter">
      {/* Header avec quick actions */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-1 capitalize">{today}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href="/sales/new"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors"
            title="Nouvelle vente"
          >
            <Plus size={12} />
            <span className="hidden sm:inline">Nouvelle vente</span>
            <span className="sm:hidden">Vente</span>
          </Link>
          <Link
            href="/products/new"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-zinc-300 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg hover:text-white transition-colors"
            title="Ajouter au stock"
          >
            <Package size={12} />
            <span className="hidden sm:inline">Stock</span>
          </Link>
          <Link
            href="/tasks"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-zinc-300 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg hover:text-white transition-colors"
            title="Taches"
          >
            <ListTodo size={12} />
            <span className="hidden sm:inline">Tache</span>
          </Link>
        </div>
      </div>

      {/* Row 1: Featured CA + 3 KPIs */}
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
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Ce mois</p>
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
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Aujourd'hui</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-[14px] text-zinc-300 tabular-nums font-medium">{formatCurrency(todayRevenue)}</span>
                <span className="text-zinc-500 text-[12px]">{todayCount} vente{todayCount > 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 KPI cards principaux */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[120px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Marge totale</p>
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center"><TrendingUp size={18} className="text-rose-400" /></div>
            </div>
            <div className="mt-auto">
              <p className="text-[22px] font-bold tabular-nums text-white">{formatCurrency(totalMargin)}</p>
              <p className="text-[11px] text-zinc-500 mt-1">{avgMarginPct.toFixed(0)}% en moyenne</p>
            </div>
          </div>
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[120px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Stock</p>
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center"><Package size={18} className="text-rose-400" /></div>
            </div>
            <div className="mt-auto">
              <p className="text-[22px] font-bold tabular-nums text-white">{inStock}</p>
              <p className="text-[11px] text-zinc-500 mt-1">{formatCurrency(stockValue)}</p>
            </div>
          </div>
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[120px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Ventes ce mois</p>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center"><ShoppingCart size={18} className="text-emerald-400" /></div>
            </div>
            <div className="mt-auto">
              <p className="text-[22px] font-bold tabular-nums text-white">{monthCount}</p>
              <p className="text-[11px] text-zinc-500 mt-1">{formatCurrency(currentMonthRevenue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* A faire aujourd'hui - cards cliquables */}
      {actionCards.length > 0 && (
        <div>
          <h2 className="text-[13px] font-semibold text-zinc-400 mb-2.5 uppercase tracking-wider">
            A faire {actionCards.length > 0 && <span className="text-rose-400">({actionCards.length})</span>}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
            {actionCards.map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.key}
                  href={a.href}
                  className={`card-static p-3 hover:bg-[var(--color-bg-hover)] transition-all border ${a.borderColor} group`}
                >
                  <div className={`w-8 h-8 rounded-lg ${a.iconBg} flex items-center justify-center mb-2`}>
                    <Icon size={14} className={a.iconColor} />
                  </div>
                  <p className="text-[20px] font-bold text-white tabular-nums leading-none">{a.count}</p>
                  <p className="text-[10px] text-zinc-500 mt-1 truncate">{a.label}</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart */}
      <RevenueChart initialData={chartData} />

      {/* Recent sales */}
      <div className="card-static overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-[15px] font-semibold text-white">Dernieres ventes</h2>
          <Link href="/sales" className="text-[12px] font-medium text-rose-400 hover:text-rose-300 transition-colors">Voir tout</Link>
        </div>

        {recentSales.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-zinc-500 text-sm">Aucune vente enregistree</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[11px] text-zinc-500 uppercase tracking-wider border-b border-[var(--color-border)]">
                  <th className="text-left px-5 py-3 font-medium">Article</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Canal</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Statut</th>
                  <th className="text-right px-4 py-3 font-medium">Prix</th>
                  <th className="text-right px-5 py-3 font-medium">Marge</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((sale: any) => {
                  const margin = Number(sale.margin);
                  const channelLabel = CHANNELS.find((c) => c.value === sale.channel)?.label ?? sale.channel;
                  const shipStatus = sale.shippingStatus;
                  const payStatus = sale.paymentStatus;

                  return (
                    <tr key={sale.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-hover)] transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`/sales/${sale.id}`} className="block">
                          <p className="text-zinc-200 font-medium truncate max-w-[200px] sm:max-w-[300px]">{sale.productTitle ?? sale.notes ?? "Article"}</p>
                          <p className="text-[11px] text-zinc-500 mt-0.5">{new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(sale.soldAt))}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-zinc-400">
                        {channelLabel}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                          {shipStatus === "a_expedier" && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-400">A expedier</span>}
                          {shipStatus === "expedie" && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-300">Expedie</span>}
                          {shipStatus === "livre" && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-400">Livre</span>}
                          {shipStatus === "retourne" && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/15 text-red-400">Retourne</span>}
                          {payStatus === "en_attente" && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-500/15 text-rose-400">Paiement</span>}
                        </div>
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
