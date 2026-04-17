import Link from "next/link";
import { Plus, Upload, Package } from "lucide-react";
import { getAllProducts, getStockStats } from "@/lib/db/queries/products";
import { daysSince } from "@/lib/utils";
import ProductsList from "@/components/products/products-list";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [products, stats] = await Promise.all([getAllProducts(), getStockStats()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-white">Stock</h1>
          <p className="text-zinc-500 mt-1 text-sm">
            {stats.inStock} article{stats.inStock > 1 ? "s" : ""} en stock
            {stats.dormant > 0 && (
              <span className="text-amber-400 ml-2">
                · {stats.dormant} dormant{stats.dormant > 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/products/import"
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-zinc-400 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-hover)] hover:text-zinc-200 transition-colors"
          >
            <Upload size={14} />
            Importer
          </Link>
          <Link
            href="/products/new"
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors"
          >
            <Plus size={14} />
            Ajouter
          </Link>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-12 text-center">
          <Package size={40} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500 mb-4 text-sm">Aucun article dans ton stock</p>
          <Link
            href="/products/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors"
          >
            <Plus size={14} />
            Ajouter mon premier article
          </Link>
        </div>
      ) : (
        <ProductsList
          products={products.map((p) => ({
            id: p.id,
            sku: p.sku,
            title: p.title,
            brand: p.brand,
            size: p.size,
            status: p.status,
            listedOn: p.listedOn || [],
            purchasePrice: Number(p.purchasePrice),
            targetPrice: p.targetPrice ? Number(p.targetPrice) : null,
            daysInStock: daysSince(p.createdAt),
            isDormant: !["vendu", "livre", "retourne"].includes(p.status) && daysSince(p.createdAt) > 30,
            thumbnail: p.images && p.images.length > 0 ? p.images[0] : null,
          }))}
        />
      )}
    </div>
  );
}
