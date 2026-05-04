import { getAuthContext } from "@/lib/auth/require-role";
import Link from "next/link";
import { Plus, Users, Star } from "lucide-react";
import { getAllCustomers, getCustomerStats } from "@/lib/db/queries/customers";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const { shopId } = await getAuthContext();
  const [customers, stats] = await Promise.all([getAllCustomers(shopId), getCustomerStats(shopId)]);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Clients</h1>
          <p className="text-zinc-500 mt-1 text-sm">{stats.total} client{stats.total > 1 ? "s" : ""}{stats.vipCount > 0 && ` · ${stats.vipCount} VIP`}</p>
        </div>
        <Link href="/customers/new" className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors"><Plus size={14} />Ajouter</Link>
      </div>

      {customers.length === 0 ? (
        <div className="card-static p-12 text-center">
          <Users size={40} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500 mb-4 text-sm">Aucun client</p>
          <Link href="/customers/new" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors"><Plus size={14} />Ajouter</Link>
        </div>
      ) : (
        <div className="card-static overflow-hidden">
          <div className="divide-y divide-[var(--color-border)]">
            {customers.map((c) => (
              <Link key={c.id} href={`/customers/${c.id}`} className="flex items-start sm:items-center justify-between gap-3 px-5 py-3.5 row-hover transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-bg-hover)] flex items-center justify-center text-sm font-semibold text-zinc-400">{c.firstName[0]}{c.lastName[0]}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium text-zinc-200">{c.firstName} {c.lastName}</p>
                      {c.vip && <Star size={12} className="text-amber-400 fill-amber-400" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {c.city && <span className="text-[11px] text-zinc-500">{c.city}</span>}
                      {c.instagram && <><span className="text-zinc-700">·</span><span className="text-[11px] text-zinc-500">{c.instagram}</span></>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-medium text-zinc-200 tabular-nums">{formatCurrency(c.totalSpent)}</p>
                  <p className="text-[11px] text-zinc-600">{c.totalOrders} cmd{(c.totalOrders ?? 0) > 1 ? "s" : ""}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
