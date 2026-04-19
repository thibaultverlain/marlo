import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star, Mail, Phone, MapPin, AtSign } from "lucide-react";
import { getCustomerById } from "@/lib/db/queries/customers";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/customers" className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-zinc-500 hover:text-zinc-300 transition-colors"><ArrowLeft size={18} /></Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-semibold text-zinc-400">{customer.firstName[0]}{customer.lastName[0]}</div>
          <div>
            <div className="flex items-center gap-2"><h1 className="text-2xl text-white">{customer.firstName} {customer.lastName}</h1>{customer.vip && <Star size={16} className="text-amber-400 fill-amber-400" />}</div>
            {customer.city && <p className="text-sm text-zinc-500">{customer.city}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5"><p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Total dépensé</p><p className="text-2xl font-semibold text-white tabular-nums">{formatCurrency(customer.totalSpent)}</p></div>
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5"><p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Commandes</p><p className="text-2xl font-semibold text-white">{customer.totalOrders ?? 0}</p></div>
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5"><p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Dernier achat</p><p className="text-lg font-semibold text-white">{customer.lastPurchaseAt ? formatDate(customer.lastPurchaseAt) : "Jamais"}</p></div>
      </div>

      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6">
        <h2 className="text-[15px] font-semibold text-white mb-4">Contact</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {customer.email && <div className="flex items-center gap-2"><Mail size={14} className="text-zinc-600" /><span className="text-zinc-300">{customer.email}</span></div>}
          {customer.phone && <div className="flex items-center gap-2"><Phone size={14} className="text-zinc-600" /><span className="text-zinc-300">{customer.phone}</span></div>}
          {customer.instagram && <div className="flex items-center gap-2"><AtSign size={14} className="text-zinc-600" /><span className="text-zinc-300">{customer.instagram}</span></div>}
          {customer.address && <div className="flex items-center gap-2"><MapPin size={14} className="text-zinc-600" /><span className="text-zinc-300">{customer.address}</span></div>}
        </div>
      </div>

      {(customer.preferredBrands?.length || customer.preferredSizes || customer.budgetRange) && (
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6">
          <h2 className="text-[15px] font-semibold text-white mb-4">Préférences</h2>
          {customer.preferredBrands && customer.preferredBrands.length > 0 && (
            <div className="mb-4"><p className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider mb-2">Marques favorites</p>
              <div className="flex gap-1.5 flex-wrap">{customer.preferredBrands.map((b) => <span key={b} className="px-2.5 py-1 bg-zinc-800 rounded text-xs text-zinc-300">{b}</span>)}</div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {customer.preferredSizes && <div><p className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Tailles</p><p className="text-zinc-300 mt-0.5">{customer.preferredSizes}</p></div>}
            {customer.budgetRange && <div><p className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Budget</p><p className="text-zinc-300 mt-0.5">{customer.budgetRange}</p></div>}
          </div>
        </div>
      )}

      {customer.notes && (
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6">
          <h2 className="text-[15px] font-semibold text-white mb-3">Notes</h2>
          <p className="text-sm text-zinc-400 whitespace-pre-line">{customer.notes}</p>
        </div>
      )}
      <div className="pb-8" />
    </div>
  );
}
