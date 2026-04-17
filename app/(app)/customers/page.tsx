import Link from "next/link";
import { Plus, Users, Star } from "lucide-react";
import { getAllCustomers, getCustomerStats } from "@/lib/db/queries/customers";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const [customers, stats] = await Promise.all([
    getAllCustomers(),
    getCustomerStats(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-stone-900">Clients</h1>
          <p className="text-stone-400 mt-1">
            {stats.total} client{stats.total > 1 ? "s" : ""}
            {stats.vipCount > 0 && ` · ${stats.vipCount} VIP`}
          </p>
        </div>
        <Link
          href="/customers/new"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors"
        >
          <Plus size={16} />
          Ajouter un client
        </Link>
      </div>

      {customers.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200/60 p-12 text-center">
          <Users size={40} className="mx-auto text-stone-300 mb-3" />
          <p className="text-stone-500 mb-4">Aucun client enregistré</p>
          <Link
            href="/customers/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <Plus size={14} />
            Ajouter mon premier client
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200/60 overflow-hidden">
          <div className="divide-y divide-stone-100">
            {customers.map((customer) => (
              <Link
                key={customer.id}
                href={`/customers/${customer.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-stone-50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-sm font-semibold text-stone-500">
                    {customer.firstName[0]}{customer.lastName[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-stone-800">
                        {customer.firstName} {customer.lastName}
                      </p>
                      {customer.vip && <Star size={12} className="text-amber-500 fill-amber-500" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {customer.city && <span className="text-xs text-stone-400">{customer.city}</span>}
                      {customer.instagram && (
                        <>
                          <span className="text-stone-200">·</span>
                          <span className="text-xs text-stone-400">{customer.instagram}</span>
                        </>
                      )}
                    </div>
                    {customer.preferredBrands && customer.preferredBrands.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {customer.preferredBrands.slice(0, 3).map((b) => (
                          <span key={b} className="text-[10px] px-1.5 py-0.5 bg-stone-50 text-stone-400 rounded">{b}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-stone-800">{formatCurrency(customer.totalSpent)}</p>
                  <p className="text-xs text-stone-400">
                    {customer.totalOrders} commande{(customer.totalOrders ?? 0) > 1 ? "s" : ""}
                    {customer.lastPurchaseAt && ` · ${formatDate(customer.lastPurchaseAt)}`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
