import { getAuthContext } from "@/lib/auth/require-role";
import { Plus, Users, Star, TrendingUp, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { getAllCustomers, getCustomerStats } from "@/lib/db/queries/customers";
import { formatCurrency } from "@/lib/utils";
import CustomersListClient from "@/components/customers/customers-list-client";

export const revalidate = 30;

export default async function CustomersPage() {
  const { shopId } = await getAuthContext();
  const [customers, stats] = await Promise.all([
    getAllCustomers(shopId),
    getCustomerStats(shopId),
  ]);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Clients</h1>
          <p className="text-zinc-500 mt-1 text-sm">{stats.total} client{stats.total > 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <a
            href="/api/customers/excel"
            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-[13px] font-medium text-zinc-400 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg hover:text-zinc-200 transition-colors"
            title="Export Excel/CSV"
          >
            <FileSpreadsheet size={14} />
            <span className="hidden sm:inline">Excel</span>
          </a>
          <Link href="/customers/new" className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors">
            <Plus size={14} />
            Ajouter
          </Link>
        </div>
      </div>

      {/* KPIs */}
      {customers.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Total clients</p>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Users size={16} className="text-emerald-400" /></div>
            </div>
            <p className="text-[22px] font-bold tabular-nums text-white mt-auto">{stats.total}</p>
          </div>
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">VIP</p>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center"><Star size={16} className="text-amber-400" /></div>
            </div>
            <p className="text-[22px] font-bold tabular-nums text-amber-400 mt-auto">{stats.vipCount}</p>
          </div>
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">CA cumule</p>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center"><TrendingUp size={16} className="text-emerald-400" /></div>
            </div>
            <p className="text-[22px] font-bold tabular-nums text-white mt-auto">{formatCurrency(stats.totalCA)}</p>
          </div>
        </div>
      )}

      {customers.length === 0 ? (
        <div className="card-static p-12 text-center">
          <Users size={40} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500 mb-4 text-sm">Aucun client</p>
          <Link href="/customers/new" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors">
            <Plus size={14} />
            Ajouter
          </Link>
        </div>
      ) : (
        <CustomersListClient customers={customers.map((c) => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          phone: c.phone,
          instagram: c.instagram,
          city: c.city,
          vip: c.vip,
          totalSpent: c.totalSpent,
          totalOrders: c.totalOrders,
          createdAt: c.createdAt,
        }))} />
      )}
    </div>
  );
}
