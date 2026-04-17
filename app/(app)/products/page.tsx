import Link from "next/link";
import { Plus, Upload, Package } from "lucide-react";
import { getAllProducts, getStockStats } from "@/lib/db/queries/products";
import { daysSince } from "@/lib/utils";
import ProductsList from "@/components/products/products-list";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [products, stats] = await Promise.all([
    getAllProducts(),
    getStockStats(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-stone-900">Stock</h1>
          <p className="text-stone-400 mt-1">
            {stats.inStock} article{stats.inStock > 1 ? "s" : ""} en stock
            {stats.dormant > 0 && (
              <span className="text-amber-600 ml-2">
                · {stats.dormant} dormant{stats.dormant > 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/products/import"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
          >
            <Upload size={16} />
            Importer
          </Link>
          <Link
            href="/products/new"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <Plus size={16} />
            Ajouter un article
          </Link>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200/60 p-12 text-center">
          <Package size={40} className="mx-auto text-stone-300 mb-3" />
          <p className="text-stone-500 mb-4">Aucun article dans ton stock</p>
          <Link
            href="/products/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors"
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
