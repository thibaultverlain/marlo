import Link from "next/link";
import { Plus, Upload, Package, FileDown } from "lucide-react";
import { getInStockProducts, getAllProducts, getStockStats } from "@/lib/db/queries/products";
import { daysSince, formatCurrency } from "@/lib/utils";
import { getCurrentUserId } from "@/lib/auth/get-user";
import ProductsList from "@/components/products/products-list";

export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const sp = await searchParams;
  const showAll = sp.show === "all";
  const userId = await getCurrentUserId();
  const [products, stats] = await Promise.all([
    showAll ? getAllProducts(userId) : getInStockProducts(userId),
    getStockStats(userId),
  ]);

  const stockValue = Number(stats?.totalValue ?? 0);
  const targetValue = Number(stats?.targetValue ?? 0);
  const potentialMargin = targetValue - stockValue;
  const inStockCount = stats?.inStock ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl text-white">Stock</h1>
          <p className="text-zinc-500 mt-1 text-sm">
            {inStockCount} article{inStockCount > 1 ? "s" : ""} en stock
            {stats?.dormant && stats.dormant > 0 && (
              <span className="text-amber-400 ml-2">
                · {stats.dormant} dormant{stats.dormant > 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <a
            href="/api/stock/pdf?download=1"
            className="hidden sm:flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-zinc-400 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg row-hover hover:text-zinc-200 transition-colors"
          >
            <FileDown size={14} />
            PDF
          </a>
          <Link
            href="/products/import"
            className="hidden sm:flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-zinc-400 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg row-hover hover:text-zinc-200 transition-colors"
          >
            <Upload size={14} />
            Importer
          </Link>
          <Link
            href="/products/new"
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-[#0a0a0f] bg-cyan-500 font-semibold rounded-lg hover:bg-cyan-400 transition-colors"
          >
            <Plus size={14} />
            Ajouter
          </Link>
        </div>
      </div>

      {/* Stock value KPIs */}
      {inStockCount > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card-static p-4">
            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Articles en stock</p>
            <p className="text-xl font-semibold text-white">{inStockCount}</p>
          </div>
          <div className="card-static p-4">
            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Valeur d'achat</p>
            <p className="text-xl font-semibold text-white tabular-nums">{formatCurrency(stockValue)}</p>
          </div>
          <div className="card-static p-4">
            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Valeur visée</p>
            <p className="text-xl font-semibold text-white tabular-nums">{formatCurrency(targetValue)}</p>
          </div>
          <div className="card-static p-4">
            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Marge potentielle</p>
            <p className={`text-xl font-semibold tabular-nums ${potentialMargin >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatCurrency(potentialMargin)}</p>
          </div>
        </div>
      )}

      {/* Toggle in-stock / all */}
      <div className="flex items-center justify-between">
        <div className="flex bg-zinc-800/60 rounded-lg p-0.5 w-fit">
          <Link
            href="/products"
            className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${!showAll ? "bg-[rgba(56,189,248,0.12)] text-cyan-400" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            En stock ({inStockCount})
          </Link>
          <Link
            href="/products?show=all"
            className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${showAll ? "bg-[rgba(56,189,248,0.12)] text-cyan-400" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Tout ({stats?.total ?? 0})
          </Link>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="card-static p-12 text-center">
          <Package size={40} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500 mb-4 text-sm">
            {showAll ? "Aucun article" : "Aucun article en stock"}
          </p>
          <Link
            href="/products/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#0a0a0f] bg-cyan-500 font-semibold rounded-lg hover:bg-cyan-400 transition-colors"
          >
            <Plus size={14} />
            Ajouter
          </Link>
        </div>
      ) : (
        <ProductsList
          products={products.map((p) => ({
            id: p.id,
            sku: p.sku,
            title: p.title,
            brand: p.brand,
            category: p.category,
            purchasePrice: p.purchasePrice,
            targetPrice: p.targetPrice,
            status: p.status,
            daysInStock: daysSince(p.createdAt),
          }))}
        />
      )}
    </div>
  );
}
