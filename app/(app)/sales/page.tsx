import { getAuthContext } from "@/lib/auth/require-role";
import Link from "next/link";
import { Plus, ShoppingCart, TrendingUp, Percent, FileSpreadsheet, Wallet } from "lucide-react";
import { db } from "@/lib/db/client";
import { sales, products, customers } from "@/lib/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { formatCurrency, formatPercent } from "@/lib/utils";
import SalesListClient from "@/components/sales/sales-list-client";

export const revalidate = 30;

async function getSalesForPeriod(shopId: string, period: string) {
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
    ? and(eq(sales.shopId, shopId), gte(sales.soldAt, startDate))
    : eq(sales.shopId, shopId);

  const rows = await db
    .select({
      id: sales.id,
      productId: sales.productId,
      channel: sales.channel,
      salePrice: sales.salePrice,
      netRevenue: sales.netRevenue,
      margin: sales.margin,
      marginPct: sales.marginPct,
      paymentStatus: sales.paymentStatus,
      shippingStatus: sales.shippingStatus,
      soldAt: sales.soldAt,
      notes: sales.notes,
      productTitle: products.title,
      productBrand: products.brand,
      productSku: products.sku,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
    })
    .from(sales)
    .leftJoin(products, eq(sales.productId, products.id))
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(conditions)
    .orderBy(desc(sales.soldAt));

  return rows.map((r) => ({
    id: r.id,
    channel: r.channel,
    salePrice: r.salePrice,
    netRevenue: r.netRevenue,
    margin: r.margin,
    marginPct: r.marginPct,
    paymentStatus: r.paymentStatus,
    shippingStatus: r.shippingStatus,
    soldAt: r.soldAt,
    notes: r.notes,
    productTitle: r.productTitle,
    productBrand: r.productBrand,
    productSku: r.productSku,
    customerName: r.customerFirstName && r.customerLastName ? `${r.customerFirstName} ${r.customerLastName}` : null,
  }));
}

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const sp = await searchParams;
  const period = sp.period ?? "all";
  const { shopId } = await getAuthContext();
  const salesData = await getSalesForPeriod(shopId, period);

  const totalRevenue = salesData.reduce((s, v) => s + (Number(v.salePrice) || 0), 0);
  const totalNetRevenue = salesData.reduce((s, v) => s + (Number(v.netRevenue) || 0), 0);
  const totalMargin = salesData.reduce((s, v) => s + (Number(v.margin) || 0), 0);
  const avgMarginPct = salesData.length > 0
    ? salesData.reduce((s, v) => s + (Number(v.marginPct) || 0), 0) / salesData.length
    : 0;
  const pendingPayment = salesData.filter((s) => s.paymentStatus === "en_attente").length;

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Ventes</h1>
          <p className="text-zinc-500 mt-1 text-sm">
            {salesData.length} vente{salesData.length > 1 ? "s" : ""} {period !== "all" && "sur la periode"}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <a
            href="/api/sales/excel"
            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-[13px] font-medium text-zinc-400 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg hover:text-zinc-200 transition-colors"
            title="Export Excel/CSV"
          >
            <FileSpreadsheet size={14} />
            <span className="hidden sm:inline">Excel</span>
          </a>
          <Link
            href="/sales/new"
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-[var(--color-text-inverse)] bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors"
          >
            <Plus size={14} />
            Enregistrer
          </Link>
        </div>
      </div>

      {/* KPIs */}
      {salesData.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[110px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Chiffre d'affaires</p>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center"><ShoppingCart size={17} className="text-emerald-400" /></div>
            </div>
            <p className="text-[22px] font-bold tabular-nums text-white mt-auto">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[110px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Revenu net</p>
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center"><Wallet size={17} className="text-rose-400" /></div>
            </div>
            <p className="text-[22px] font-bold tabular-nums text-white mt-auto">{formatCurrency(totalNetRevenue)}</p>
          </div>
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[110px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Marge totale</p>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${totalMargin >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}><TrendingUp size={17} className={totalMargin >= 0 ? "text-emerald-400" : "text-red-400"} /></div>
            </div>
            <p className={`text-[22px] font-bold tabular-nums mt-auto ${totalMargin >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatCurrency(totalMargin)}</p>
          </div>
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[110px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Marge moyenne</p>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Percent size={17} className="text-emerald-400" /></div>
            </div>
            <p className="text-[22px] font-bold tabular-nums text-white mt-auto">{formatPercent(avgMarginPct)}</p>
          </div>
        </div>
      )}

      {pendingPayment > 0 && (
        <div className="flex items-center gap-3 bg-amber-500/[0.08] border border-amber-500/20 rounded-xl px-4 py-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
            <Wallet size={16} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-amber-300">{pendingPayment} vente{pendingPayment > 1 ? "s" : ""} en attente de paiement</p>
          </div>
        </div>
      )}

      <SalesListClient sales={salesData} currentPeriod={period} />
    </div>
  );
}
