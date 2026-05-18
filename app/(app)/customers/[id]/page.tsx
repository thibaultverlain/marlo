import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star, Mail, Phone, MapPin, AtSign, ShoppingCart, TrendingUp, Clock, Package } from "lucide-react";
import { getCustomerById } from "@/lib/db/queries/customers";
import { db } from "@/lib/db/client";
import { sales, products, sourcingRequests } from "@/lib/db/schema";
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CHANNELS } from "@/lib/data";
import CustomerActions from "@/components/customers/customer-actions";

export const revalidate = 30;

async function getCustomerSalesHistory(customerId: string) {
  return db
    .select({
      id: sales.id,
      salePrice: sales.salePrice,
      margin: sales.margin,
      channel: sales.channel,
      soldAt: sales.soldAt,
      productTitle: products.title,
      productBrand: products.brand,
    })
    .from(sales)
    .leftJoin(products, eq(sales.productId, products.id))
    .where(eq(sales.customerId, customerId))
    .orderBy(desc(sales.soldAt));
}

async function getCustomerMetrics(customerId: string) {
  const rows = await db
    .select({
      totalSpent: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
      avgBasket: sql<number>`coalesce(avg(sale_price), 0)::numeric`,
      count: sql<number>`count(*)::int`,
      firstPurchase: sql<string>`min(sold_at)`,
      lastPurchase: sql<string>`max(sold_at)`,
    })
    .from(sales)
    .where(eq(sales.customerId, customerId));

  const r = rows[0];
  const count = r?.count ?? 0;
  const firstDate = r?.firstPurchase ? new Date(r.firstPurchase) : null;
  const lastDate = r?.lastPurchase ? new Date(r.lastPurchase) : null;

  let frequencyDays: number | null = null;
  if (firstDate && lastDate && count > 1) {
    const diffMs = lastDate.getTime() - firstDate.getTime();
    frequencyDays = Math.round(diffMs / (1000 * 60 * 60 * 24) / (count - 1));
  }

  const brandRows = await db
    .select({
      brand: products.brand,
      count: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
    })
    .from(sales)
    .innerJoin(products, eq(sales.productId, products.id))
    .where(eq(sales.customerId, customerId))
    .groupBy(products.brand)
    .orderBy(desc(sql`count(*)`))
    .limit(5);

  return {
    totalSpent: Number(r?.totalSpent ?? 0),
    avgBasket: Number(r?.avgBasket ?? 0),
    count,
    frequencyDays,
    firstPurchase: firstDate,
    lastPurchase: lastDate,
    topBrands: brandRows.map((b) => ({ brand: b.brand, count: b.count, total: Number(b.total) })),
  };
}

async function getActiveSourcings(customerId: string) {
  return db
    .select({
      id: sourcingRequests.id,
      description: sourcingRequests.description,
      brand: sourcingRequests.brand,
      status: sourcingRequests.status,
      targetBudget: sourcingRequests.targetBudget,
      deadline: sourcingRequests.deadline,
    })
    .from(sourcingRequests)
    .where(and(eq(sourcingRequests.customerId, customerId), inArray(sourcingRequests.status, ["ouvert", "en_recherche"])))
    .limit(10);
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [customer, salesHistory, metrics, activeSourcings] = await Promise.all([
    getCustomerById(id),
    getCustomerSalesHistory(id),
    getCustomerMetrics(id),
    getActiveSourcings(id),
  ]);
  if (!customer) notFound();

  const customerName = `${customer.firstName} ${customer.lastName}`;

  return (
    <div className="max-w-3xl mx-auto space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/customers" className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[var(--color-bg-hover)] flex items-center justify-center text-sm font-semibold text-zinc-400 flex-shrink-0">
              {customer.firstName[0]}{customer.lastName[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">{customerName}</h1>
                {customer.vip && <Star size={15} className="text-amber-400 fill-amber-400" />}
              </div>
              {customer.city && <p className="text-sm text-zinc-500 mt-0.5">{customer.city}</p>}
            </div>
          </div>
        </div>
        <CustomerActions customerId={customer.id} customerName={customerName} />
      </div>

      {/* KPIs (4 max) */}
      {metrics.count > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Total depense</p>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center"><TrendingUp size={15} className="text-emerald-400" /></div>
            </div>
            <p className="text-[20px] font-bold text-white tabular-nums mt-auto">{formatCurrency(metrics.totalSpent)}</p>
          </div>
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Commandes</p>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center"><ShoppingCart size={15} className="text-blue-400" /></div>
            </div>
            <p className="text-[20px] font-bold text-white mt-auto">{metrics.count}</p>
          </div>
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Panier moyen</p>
              <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center"><Package size={15} className="text-violet-400" /></div>
            </div>
            <p className="text-[20px] font-bold text-white tabular-nums mt-auto">{formatCurrency(metrics.avgBasket)}</p>
          </div>
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Frequence</p>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center"><Clock size={15} className="text-amber-400" /></div>
            </div>
            <div className="mt-auto">
              <p className="text-[20px] font-bold text-white">{metrics.frequencyDays ? `${metrics.frequencyDays}j` : "—"}</p>
              {metrics.frequencyDays && <p className="text-[10px] text-zinc-600 mt-0.5">entre chaque achat</p>}
            </div>
          </div>
        </div>
      )}

      {/* Active sourcings (if any) */}
      {activeSourcings.length > 0 && (
        <div className="card-static p-5">
          <h2 className="text-[14px] font-semibold text-white mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            Recherches en cours ({activeSourcings.length})
          </h2>
          <div className="space-y-2">
            {activeSourcings.map((s) => (
              <Link key={s.id} href={`/sourcing/${s.id}`} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-bg-hover)]/30 hover:bg-[var(--color-bg-hover)] transition-colors">
                <div>
                  <p className="text-[13px] text-zinc-200">{s.description}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {s.brand && <span>{s.brand} · </span>}
                    {s.status === "en_recherche" ? "En recherche" : "Ouvert"}
                    {s.deadline && ` · echeance ${formatDate(s.deadline)}`}
                  </p>
                </div>
                {s.targetBudget && <p className="text-[12px] text-zinc-400 tabular-nums">{formatCurrency(s.targetBudget)}</p>}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Two columns: Contact + Top brands */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-static p-6">
          <h2 className="text-[15px] font-semibold text-white mb-4">Contact</h2>
          <div className="space-y-2.5 text-sm">
            {customer.email && (
              <a href={`mailto:${customer.email}`} className="flex items-center gap-2.5 group">
                <Mail size={14} className="text-zinc-600 flex-shrink-0" />
                <span className="text-zinc-300 group-hover:text-rose-400 transition-colors truncate">{customer.email}</span>
              </a>
            )}
            {customer.phone && (
              <a href={`tel:${customer.phone}`} className="flex items-center gap-2.5 group">
                <Phone size={14} className="text-zinc-600 flex-shrink-0" />
                <span className="text-zinc-300 group-hover:text-rose-400 transition-colors">{customer.phone}</span>
              </a>
            )}
            {customer.instagram && (
              <a href={`https://instagram.com/${customer.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 group">
                <AtSign size={14} className="text-zinc-600 flex-shrink-0" />
                <span className="text-zinc-300 group-hover:text-rose-400 transition-colors">{customer.instagram}</span>
              </a>
            )}
            {customer.address && (
              <div className="flex items-start gap-2.5">
                <MapPin size={14} className="text-zinc-600 flex-shrink-0 mt-0.5" />
                <span className="text-zinc-300">{customer.address}</span>
              </div>
            )}
            {!customer.email && !customer.phone && !customer.instagram && !customer.address && (
              <p className="text-[12px] text-zinc-600">Aucun contact renseigne</p>
            )}
          </div>
        </div>

        {metrics.topBrands.length > 0 && (
          <div className="card-static p-6">
            <h2 className="text-[15px] font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp size={15} className="text-rose-400" />
              Marques achetees
            </h2>
            <div className="space-y-3">
              {metrics.topBrands.map((b) => (
                <div key={b.brand} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded bg-[var(--color-bg-hover)] flex items-center justify-center text-[10px] font-semibold text-zinc-400">{b.count}</span>
                    <span className="text-sm text-zinc-200">{b.brand}</span>
                  </div>
                  <span className="text-sm text-zinc-400 tabular-nums">{formatCurrency(b.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Preferences */}
      {((customer.preferredBrands?.length ?? 0) > 0 || customer.preferredSizes || customer.budgetRange) && (
        <div className="card-static p-6">
          <h2 className="text-[15px] font-semibold text-white mb-4">Preferences</h2>
          {customer.preferredBrands && customer.preferredBrands.length > 0 && (
            <div className="mb-4">
              <p className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider mb-2">Marques favorites</p>
              <div className="flex gap-1.5 flex-wrap">
                {customer.preferredBrands.map((b) => (
                  <span key={b} className="px-2.5 py-1 bg-[var(--color-bg-hover)] rounded text-xs text-zinc-300">{b}</span>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {customer.preferredSizes && (
              <div>
                <p className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Tailles</p>
                <p className="text-zinc-300 mt-0.5">{customer.preferredSizes}</p>
              </div>
            )}
            {customer.budgetRange && (
              <div>
                <p className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Budget</p>
                <p className="text-zinc-300 mt-0.5">{customer.budgetRange}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Purchase history */}
      <div className="card-static overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-[15px] font-semibold text-white flex items-center gap-2">
            <ShoppingCart size={15} className="text-zinc-500" />
            Historique d'achats
            <span className="text-[11px] text-zinc-600 font-normal ml-1">({salesHistory.length})</span>
          </h2>
        </div>

        {salesHistory.length === 0 ? (
          <div className="p-10 text-center">
            <Package size={32} className="mx-auto text-zinc-700 mb-2" />
            <p className="text-sm text-zinc-600 mb-4">Aucun achat enregistre</p>
            <Link href={`/sales/new?customerId=${customer.id}`} className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors">
              <ShoppingCart size={13} />
              Enregistrer une vente
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {salesHistory.map((sale) => {
              const channelLabel = CHANNELS.find((c) => c.value === sale.channel)?.label ?? sale.channel;
              return (
                <Link key={sale.id} href={`/sales/${sale.id}`} className="flex items-center justify-between px-6 py-3.5 hover:bg-[var(--color-bg-hover)] transition-colors">
                  <div className="min-w-0">
                    <p className="text-[13px] text-zinc-200 truncate">{sale.productTitle ?? "Article"}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {sale.productBrand && <span className="text-[11px] text-zinc-500">{sale.productBrand}</span>}
                      <span className="text-zinc-700">·</span>
                      <span className="text-[11px] text-zinc-500">{channelLabel}</span>
                      <span className="text-zinc-700">·</span>
                      <span className="text-[11px] text-zinc-600">{formatDate(sale.soldAt)}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[13px] font-medium text-white tabular-nums">{formatCurrency(sale.salePrice)}</p>
                    {sale.margin && (
                      <p className={`text-[11px] tabular-nums ${Number(sale.margin) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {Number(sale.margin) >= 0 ? "+" : ""}{formatCurrency(sale.margin)}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {customer.notes && (
        <div className="card-static p-6">
          <h2 className="text-[15px] font-semibold text-white mb-3">Notes</h2>
          <p className="text-sm text-zinc-400 whitespace-pre-line">{customer.notes}</p>
        </div>
      )}
      <div className="pb-8" />
    </div>
  );
}
