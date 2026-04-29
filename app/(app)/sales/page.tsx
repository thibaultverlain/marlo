import { getCurrentUserId } from "@/lib/auth/get-user";
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
  const styles: Record<string, { bg: string; dot: string }> = {
    vinted: { bg: "bg-teal-500/10 text-teal-400 border-teal-500/20", dot: "bg-teal-400" },
    vestiaire: { bg: "bg-orange-500/10 text-orange-400 border-orange-500/20", dot: "bg-orange-400" },
    stockx: { bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
    prive: { bg: "bg-violet-500/10 text-violet-400 border-violet-500/20", dot: "bg-violet-400" },
    autre: { bg: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20", dot: "bg-zinc-400" },
  };
  const labels: Record<string, string> = { vinted: "Vinted", vestiaire: "Vestiaire", stockx: "StockX", prive: "Privé", autre: "Autre" };
  const s = styles[channel] ?? styles.autre;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${s.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${s.dot}`} />
      {labels[channel] ?? channel}
    </span>
  );
}

async function getSalesForPeriod(userId: string, period: string) {
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

  const conditions = startDate 
    ? and(eq(sales.userId, userId), gte(sales.soldAt, startDate)) 
    : eq(sales.userId, userId);

  const rows = await db
    .select({
      id: sales.id, productId: sales.productId, channel: sales.channel,
      salePrice: sales.salePrice, netRevenue: sales.netRevenue, margin: sales.margin,
      marginPct: sales.marginPct, paymentStatus: sales.paymentStatus, soldAt: sales.soldAt,
      notes: sales.notes,
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
  const userId = await getCurrentUserId();
  const salesData = await getSalesForPeriod(userId, period);

  const totalRevenue = salesData.reduce((s, v) => s + (Number(v.salePrice) || 0), 0);
  const totalMargin = salesData.reduce((s, v) => s + (Number(v.margin) || 0), 0);

  const periodLabels: Record<string, string> = {
    all: "Toutes les ventes", year: `Ventes ${new Date().getFullYear()}`,
    month: `Ventes de ${new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(new Date())}`,
    week: "Ventes cette semaine",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl text-white">Ventes</h1>
          <p className="text-zinc-500 mt-1 text-sm">
            {salesData.length} vente{salesData.length > 1 ? "s" : ""} · CA {formatCurrency(totalRevenue)} · Marge {formatCurrency(totalMargin)}
          </p>
        </div>
        <Link href="/sales/new" className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-[#0a0a0f] bg-rose-500 font-semibold rounded-lg hover:bg-rose-400 transition-colors">
          <Plus size={14} />Enregistrer
        </Link>
      </div>

      <SalesFilters currentPeriod={period} />

      {salesData.length === 0 ? (
        <div className="card-static p-12 text-center">
          <ShoppingCart size={40} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500 mb-4 text-sm">Aucune vente sur cette période</p>
        </div>
      ) : (
        <div className="card-static overflow-hidden">
          <div className="divide-y divide-[var(--color-border)]">
            {salesData.map((sale) => (
              <Link key={sale.id} href={`/sales/${sale.id}`} className="flex items-start sm:items-center justify-between gap-3 px-5 py-3.5 row-hover transition-colors">
                <div>
                  <p className="text-[13px] font-medium text-zinc-200">{sale.productTitle ?? sale.notes ?? "Article"}</p>
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
