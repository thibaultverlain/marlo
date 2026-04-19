import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";
import { db } from "@/lib/db/client";
import { sales, products, customers } from "@/lib/db/schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { formatCurrency, formatPercent, formatDate } from "@/lib/utils";
import { CHANNELS } from "@/lib/data";
import SalesFilters from "@/components/sales/sales-filters";

export const dynamic = "force-dynamic";

function ChannelBadge({ channel }: { channel: string }) {
  const ch = CHANNELS.find((c) => c.value === channel);
  const colors: Record<string, string> = {
    vinted: "bg-teal-500/10 text-teal-400", vestiaire: "bg-orange-500/10 text-orange-400",
    stockx: "bg-emerald-500/10 text-emerald-400", prive: "bg-indigo-500/10 text-indigo-400",
    autre: "bg-zinc-500/10 text-zinc-400",
  };
  return <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium ${colors[channel] || colors.autre}`}>{ch?.label ?? channel}</span>;
}

async function getSalesForPeriod(period: string) {
  const now = new Date();
  let startDate: Date | null = null;

  if (period === "week") {
    const dow = now.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
  } else if (period === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === "year") {
    startDate = new Date(now.getFullYear(), 0, 1);
  }

  const conditions = startDate ? and(gte(sales.soldAt, startDate)) : undefined;

  const rows = await db
    .select({
      id: sales.id, productId: sales.productId, channel: sales.channel,
      salePrice: sales.salePrice, netRevenue: sales.netRevenue, margin: sales.margin,
      marginPct: sales.marginPct, paymentStatus: sales.paymentStatus, soldAt: sales.soldAt,
      productTitle: products.title,
      customerFirstName: customers.firstName, customerLastName: customers.lastName,
    })
    .from(sales)
    .leftJoin(products, eq(sales.productId, products.id))
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(conditions)
    .orderBy(desc(sales.soldAt));

  return rows.map((r) => ({
    ...r,
    customerName: r.customerFirstName && r.customerLastName ? `${r.customerFirstName} ${r.customerLastName}` : null,
  }));
}

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const sp = await searchParams;
  const period = sp.period ?? "all";
  const salesData = await getSalesForPeriod(period);

  const totalRevenue = salesData.reduce((s, v) => s + (Number(v.salePrice) || 0), 0);
  const totalMargin = salesData.reduce((s, v) => s + (Number(v.margin) || 0), 0);

  const periodLabels: Record<string, string> = {
    all: "Toutes les ventes", year: `Ventes ${new Date().getFullYear()}`,
    month: `Ventes de ${new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(new Date())}`,
    week: "Ventes cette semaine",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-white">Ventes</h1>
          <p className="text-zinc-500 mt-1 text-sm">
            {salesData.length} vente{salesData.length > 1 ? "s" : ""} · CA {formatCurrency(totalRevenue)} · Marge {formatCurrency(totalMargin)}
          </p>
        </div>
        <Link href="/sales/new" className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors">
          <Plus size={14} />Enregistrer
        </Link>
      </div>

      <SalesFilters currentPeriod={period} />

      {salesData.length === 0 ? (
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-12 text-center">
          <ShoppingCart size={40} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500 mb-4 text-sm">Aucune vente sur cette période</p>
        </div>
      ) : (
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="divide-y divide-[var(--color-border)]">
            {salesData.map((sale) => (
              <Link key={sale.id} href={`/sales/${sale.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-[var(--color-bg-hover)] transition-colors">
                <div>
                  <p className="text-[13px] font-medium text-zinc-200">{sale.productTitle ?? "Article supprimé"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <ChannelBadge channel={sale.channel} />
                    {sale.customerName && <span className="text-[11px] text-zinc-500">{sale.customerName}</span>}
                    <span className="text-[11px] text-zinc-600">{formatDate(sale.soldAt)}</span>
                  </div>
                </div>
                <div className="text-right w-28">
                  <p className="text-[13px] font-medium text-white tabular-nums">{formatCurrency(sale.salePrice)}</p>
                  {sale.margin && (
                    <p className={`text-[11px] tabular-nums ${Number(sale.margin) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {Number(sale.margin) >= 0 ? "+" : ""}{formatCurrency(sale.margin)}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
