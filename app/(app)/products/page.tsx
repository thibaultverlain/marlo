import Link from "next/link";
import { Plus, Upload, Package, FileDown, ShoppingCart, TrendingUp, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { getInStockProducts, getAllProducts, getStockStats } from "@/lib/db/queries/products";
import { db } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { daysSince, formatCurrency } from "@/lib/utils";
import { getAuthContext } from "@/lib/auth/require-role";
import ProductsList from "@/components/products/products-list";

export const revalidate = 30;

async function getSoldProducts(shopId: string) {
  return db.select().from(products)
    .where(and(eq(products.shopId, shopId), inArray(products.status, ["vendu", "expedie", "livre", "retourne"])))
    .orderBy(desc(products.updatedAt))
    .limit(200);
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const sp = await searchParams;
  const view = (sp.view === "sold" || sp.view === "all") ? sp.view : "stock";
  const { shopId } = await getAuthContext();

  const [productList, stats] = await Promise.all([
    view === "stock"
      ? getInStockProducts(shopId)
      : view === "sold"
      ? getSoldProducts(shopId)
      : getAllProducts(shopId),
    getStockStats(shopId),
  ]);

  const stockValue = Number(stats?.totalValue ?? 0);
  const targetValue = Number(stats?.targetValue ?? 0);
  const potentialMargin = targetValue - stockValue;
  const inStockCount = stats?.inStock ?? 0;
  const dormantCount = stats?.dormant ?? 0;
  const totalCount = stats?.total ?? 0;
  const soldCount = totalCount - inStockCount;

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Stock</h1>
          <p className="text-zinc-500 mt-1 text-sm">
            {inStockCount} article{inStockCount > 1 ? "s" : ""} en stock
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <a
            href="/api/stock/excel"
            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-[13px] font-medium text-zinc-400 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg hover:text-zinc-200 transition-colors"
            title="Export Excel/CSV"
          >
            <FileSpreadsheet size={14} />
            <span className="hidden sm:inline">Excel</span>
          </a>
          <a
            href="/api/stock/pdf?download=1"
            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-[13px] font-medium text-zinc-400 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg hover:text-zinc-200 transition-colors"
            title="Export PDF"
          >
            <FileDown size={14} />
            <span className="hidden sm:inline">PDF</span>
          </a>
          <Link
            href="/products/import"
            className="hidden sm:flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-zinc-400 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg hover:text-zinc-200 transition-colors"
          >
            <Upload size={14} />
            Importer
          </Link>
          <Link
            href="/products/new"
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-[var(--color-text-inverse)] bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors"
          >
            <Plus size={14} />
            Ajouter
          </Link>
        </div>
      </div>

      {/* Dormants banner (cliquable) — pointe vers la vue dediee avec suggestions de baisse */}
      {dormantCount > 0 && view === "stock" && (
        <Link href="/products/dormants"
          className="flex items-center gap-3 bg-amber-500/[0.08] border border-amber-500/20 rounded-xl px-4 py-3 hover:bg-amber-500/[0.12] transition-colors">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={16} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-amber-300">{dormantCount} article{dormantCount > 1 ? "s" : ""} dormant{dormantCount > 1 ? "s" : ""}</p>
            <p className="text-[11px] text-amber-400/70 mt-0.5">En stock depuis plus de 30 jours — voir les suggestions de baisse</p>
          </div>
          <span className="text-[11px] text-amber-400">Voir →</span>
        </Link>
      )}

      {/* KPIs */}
      {inStockCount > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[110px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Articles</p>
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center"><Package size={17} className="text-rose-400" /></div>
            </div>
            <p className="text-[22px] font-bold tabular-nums text-white mt-auto">{inStockCount}</p>
          </div>
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[110px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Valeur d'achat</p>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center"><ShoppingCart size={17} className="text-emerald-400" /></div>
            </div>
            <p className="text-[22px] font-bold tabular-nums text-white mt-auto">{formatCurrency(stockValue)}</p>
          </div>
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[110px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Valeur visee</p>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center"><TrendingUp size={17} className="text-emerald-400" /></div>
            </div>
            <p className="text-[22px] font-bold tabular-nums text-white mt-auto">{formatCurrency(targetValue)}</p>
          </div>
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[110px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Marge potentielle</p>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${potentialMargin >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}><TrendingUp size={17} className={potentialMargin >= 0 ? "text-emerald-400" : "text-red-400"} /></div>
            </div>
            <p className={`text-[22px] font-bold tabular-nums mt-auto ${potentialMargin >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatCurrency(potentialMargin)}</p>
          </div>
        </div>
      )}

      {/* Toggle 3 etats */}
      <div className="flex bg-zinc-800/60 rounded-lg p-0.5 w-fit">
        <Link href="/products?view=stock"
          className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${view === "stock" ? "bg-[rgba(225,29,72,0.12)] text-rose-400" : "text-zinc-500 hover:text-zinc-300"}`}>
          En stock ({inStockCount})
        </Link>
        <Link href="/products?view=sold"
          className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${view === "sold" ? "bg-[rgba(225,29,72,0.12)] text-rose-400" : "text-zinc-500 hover:text-zinc-300"}`}>
          Vendus ({soldCount})
        </Link>
        <Link href="/products?view=all"
          className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${view === "all" ? "bg-[rgba(225,29,72,0.12)] text-rose-400" : "text-zinc-500 hover:text-zinc-300"}`}>
          Tout ({totalCount})
        </Link>
      </div>

      {productList.length === 0 ? (
        <div className="card-static p-12 text-center">
          <Package size={40} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500 mb-4 text-sm">
            {view === "stock" ? "Aucun article en stock" : view === "sold" ? "Aucun article vendu" : "Aucun article"}
          </p>
          <Link
            href="/products/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors"
          >
            <Plus size={14} />
            Ajouter
          </Link>
        </div>
      ) : (
        <ProductsList
          products={productList.map((p) => ({
            id: p.id,
            sku: p.sku,
            title: p.title,
            brand: p.brand,
            category: p.category,
            purchasePrice: p.purchasePrice,
            targetPrice: p.targetPrice,
            status: p.status,
            createdAt: p.createdAt,
            daysInStock: daysSince(p.createdAt),
          }))}
        />
      )}
    </div>
  );
}
