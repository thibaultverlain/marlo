import {
  TrendingUp, Package, Truck, ShoppingCart,
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
import MonthlyGoalCard from "@/components/dashboard/monthly-goal-card";
import ActionBar, { type Action } from "@/components/dashboard/action-bar";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

async function getChartDataMonth(shopId: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Aout", "Sep", "Oct", "Nov", "Dec"][month];
  const rows = await db
    .select({
      day: sql<number>`extract(day from sold_at)::int`,
      revenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
      count: sql<number>`count(*)::int`,
    })
    .from(sales)
    .where(and(eq(sales.shopId, shopId), gte(sales.soldAt, new Date(year, month, 1)), lte(sales.soldAt, new Date(year, month + 1, 0, 23, 59, 59))))
    .groupBy(sql`extract(day from sold_at)`)
    .orderBy(sql`extract(day from sold_at)`);
  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const row = rows.find((r) => r.day === day);
    return {
      label: String(day),
      fullLabel: `${day} ${monthLabel}`,
      revenue: Number(row?.revenue ?? 0),
      count: Number(row?.count ?? 0),
    };
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

  // A faire — actions urgentes du jour, classees par gravite
  const actions: Action[] = [
    todayActions.tasksOverdue > 0 && {
      key: "tasks_overdue", icon: Flame, label: "Taches en retard",
      count: todayActions.tasksOverdue, href: "/tasks?filter=open", tone: "danger" as const,
    },
    pendingShipments > 0 && {
      key: "shipments", icon: Truck, label: "Colis a expedier",
      count: pendingShipments, href: "/orders?status=a_expedier", tone: "warning" as const,
    },
    todayActions.sourcingUrgent > 0 && {
      key: "sourcing_urgent", icon: Search, label: "Sourcings urgents",
      count: todayActions.sourcingUrgent, href: "/sourcing", tone: "warning" as const,
    },
    todayActions.tasksToday > 0 && {
      key: "tasks_today", icon: ListTodo, label: "Taches du jour",
      count: todayActions.tasksToday, href: "/tasks?filter=open", tone: "accent" as const,
    },
    dormant > 0 && {
      key: "dormant", icon: Package, label: "Articles dormants",
      count: dormant, href: "/products/dormants", tone: "neutral" as const,
    },
  ].filter((a): a is Action => Boolean(a));

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

      {/* ───────────────────────────────────────────
          HIERARCHIE :
          1. FOCUS principal — Objectif mensuel (la carte hero)
          2. A FAIRE — barre compacte avec les urgences du jour
          3. CHART — graphe CA (le second focus)
          4. KPIs secondaires — discrets, en bas
          5. Recent sales — recap
         ─────────────────────────────────────────── */}

      {/* 1. Focus : Objectif mensuel */}
      <MonthlyGoalCard
        currentMonthRevenue={currentMonthRevenue}
        previousMonthRevenue={prevMonthRevenue}
        monthCount={monthCount}
      />

      {/* 2. A faire — barre compacte */}
      <ActionBar actions={actions} />

      {/* 3. Chart — second focus */}
      <RevenueChart initialData={chartData} />

      {/* 4. KPIs secondaires — discrets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        <div className="card-static p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">CA total</p>
            <TrendingUp size={14} className="text-emerald-400" />
          </div>
          <p className="text-xl font-bold tabular-nums text-white">{formatCurrency(totalRevenue)}</p>
          <p className="text-[11px] text-zinc-500 mt-1">{totalCount} vente{totalCount > 1 ? "s" : ""} au total</p>
        </div>
        <div className="card-static p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Marge totale</p>
            <TrendingUp size={14} className="text-rose-400" />
          </div>
          <p className="text-xl font-bold tabular-nums text-emerald-400">{formatCurrency(totalMargin)}</p>
          <p className="text-[11px] text-zinc-500 mt-1">{avgMarginPct.toFixed(0)}% en moyenne</p>
        </div>
        <div className="card-static p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Stock</p>
            <Package size={14} className="text-zinc-400" />
          </div>
          <p className="text-xl font-bold tabular-nums text-white">{inStock}</p>
          <p className="text-[11px] text-zinc-500 mt-1">{formatCurrency(stockValue)} immobilises</p>
        </div>
        <div className="card-static p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Aujourd'hui</p>
            <ShoppingCart size={14} className="text-emerald-400" />
          </div>
          <p className="text-xl font-bold tabular-nums text-white">{formatCurrency(todayRevenue)}</p>
          <p className="text-[11px] text-zinc-500 mt-1">{todayCount} vente{todayCount > 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Recent sales */}
      <div className="card-static overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-[15px] font-semibold text-white">Dernieres ventes</h2>
          <Link href="/sales" className="text-[12px] font-medium text-rose-400 hover:text-rose-300 transition-colors">Voir tout</Link>
        </div>

        {recentSales.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Aucune vente enregistree"
            description="Enregistre ta premiere vente pour commencer a tracker ton chiffre d'affaires et tes marges."
            action={{ href: "/sales/new", label: "Nouvelle vente" }}
            variant="inline"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] data-table">
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
